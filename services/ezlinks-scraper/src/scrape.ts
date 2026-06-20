import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";

const TZ = "America/Chicago";
const PLAYER_COUNTS = [2, 1] as const;
const DELAY_MS = 750;

const MAX_ATTEMPTS = 4;
const BASE_BACKOFF_MS = 1500;
const SESSION_TTL_MS = 15 * 60_000;
const NAV_TIMEOUT_MS = 60_000;
const READY_TIMEOUT_MS = 60_000;

// Decodo residential proxy: rotating sticky-session ports. cf_clearance is bound
// to the egress IP, so a warm browser pins to one port for its whole lifetime.
const PROXY_PORTS = [14001, 14002, 14003, 14004, 14005, 14006, 14007, 14008, 14009, 14010];

interface ProxyConfig {
	host: string;
	port: number;
	username: string;
	password: string;
}

function getProxyConfig(): ProxyConfig | undefined {
	const host = process.env.DECODO_PROXY_HOST?.trim();
	const username = process.env.DECODO_PROXY_USERNAME?.trim();
	const password = process.env.DECODO_PROXY_PASSWORD?.trim();

	if (!host || !username || !password) return undefined;

	const port = PROXY_PORTS[Math.floor(Math.random() * PROXY_PORTS.length)];
	return { host, port, username, password };
}

const EzLinksSlotSchema = z.object({
	r08: z.number(),
	r11: z.number(),
	r15: z.string(),
});

const EzLinksResponseSchema = z.object({
	r06: z.array(EzLinksSlotSchema),
});

type EzLinksSlot = z.infer<typeof EzLinksSlotSchema>;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface TeeTime {
	date: string;
	courseName: string;
	openSlots: string;
	price: number;
	bookingLink: string;
}

/** Thrown when Cloudflare (or any non-JSON challenge/error page) blocks a request. Retryable. */
class BlockedError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "BlockedError";
	}
}

/** Thrown when the API returns valid JSON in an unexpected shape. Not retryable. */
class SchemaChangedError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SchemaChangedError";
	}
}

const BLOCK_MARKERS = [
	"just a moment",
	"challenge-platform",
	"cf-mitigated",
	"attention required",
	"cf_chl",
	"cloudflare",
	"<!doctype",
	"<html",
];

function looksBlocked(status: number, contentType: string, body: string): boolean {
	if (status === 403 || status === 429 || status === 503) return true;
	if (contentType.toLowerCase().includes("text/html")) return true;
	const sample = body.slice(0, 4000).toLowerCase();
	return BLOCK_MARKERS.some((marker) => sample.includes(marker));
}

interface WarmSession {
	browser: any;
	page: any;
	createdAt: number;
}

let warmSession: WarmSession | null = null;

// Serializes all access to the single shared browser so concurrent requests
// don't trample the same page or trigger overlapping navigations.
let lock: Promise<unknown> = Promise.resolve();

function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
	const result = lock.then(fn, fn);
	lock = result.then(
		() => undefined,
		() => undefined
	);
	return result;
}

function isAlive(browser: any): boolean {
	try {
		if (typeof browser.isConnected === "function") return browser.isConnected();
		return browser.connected !== false;
	} catch {
		return false;
	}
}

async function closeWarmSession(): Promise<void> {
	const session = warmSession;
	warmSession = null;
	if (session) {
		try {
			await session.browser.close();
		} catch {
			// ignore close errors; tini will reap any stragglers
		}
	}
}

async function getWarmSession(): Promise<WarmSession> {
	if (warmSession) {
		const expired = Date.now() - warmSession.createdAt > SESSION_TTL_MS;
		if (!expired && isAlive(warmSession.browser)) return warmSession;
		await closeWarmSession();
	}

	const proxy = getProxyConfig();
	if (proxy) {
		console.log(`Launching EzLinks browser via Decodo proxy port ${proxy.port}`);
	} else {
		console.warn("DECODO_PROXY_* env vars not fully set; launching EzLinks browser without a proxy");
	}

	const { connect } = await import("puppeteer-real-browser");
	const { browser, page } = await connect({
		headless: false,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
		turnstile: true,
		connectOption: {},
		...(proxy ? { proxy } : {}),
	});

	warmSession = { browser, page, createdAt: Date.now() };
	return warmSession;
}

async function runScrape(
	page: any,
	date: string,
	facilityUrl: string,
	facilityId: number,
	courseName: string,
	bookingLink?: string
): Promise<TeeTime[]> {
	let capturedHeaders: Record<string, string> = {};

	const onRequest = (request: any) => {
		if (request.url().includes("/api/search/search") && request.method() === "POST") {
			capturedHeaders = request.headers();
		}
	};

	let onResponse: ((response: any) => void) | undefined;
	const pageReadyPromise = new Promise<void>((resolve, reject) => {
		const timeout = setTimeout(
			() => reject(new Error(`Timed out waiting for EzLinks page to load for ${courseName}`)),
			READY_TIMEOUT_MS
		);

		onResponse = (response: any) => {
			if (response.url().includes("/api/search/search")) {
				clearTimeout(timeout);
				resolve();
			}
		};
		page.on("response", onResponse);
	});

	page.on("request", onRequest);

	try {
		await page.goto(`${facilityUrl}/index.html#/search`, {
			waitUntil: "networkidle0",
			timeout: NAV_TIMEOUT_MS,
		});

		await pageReadyPromise;

		const [year, month, day] = date.split("-");
		const formattedDate = `${month}/${day}/${year}`;

		const searchUrl = `${facilityUrl.replace(/\/$/, "")}/api/search/search`;
		const basePayload = {
			p01: [facilityId],
			p02: formattedDate,
			p03: "6:30 AM",
			p04: "6:00 PM",
			p05: 0,
			p07: false,
		};

		const replayHeaders: Record<string, string> = { ...capturedHeaders, "content-type": "application/json" };
		delete replayHeaders["content-length"];

		const allSlots: EzLinksSlot[] = [];

		for (let i = 0; i < PLAYER_COUNTS.length; i++) {
			const payload = { ...basePayload, p06: PLAYER_COUNTS[i] };

			const { status, contentType, body } = await page.evaluate(
				async (url: string, requestBody: Record<string, unknown>, headers: Record<string, string>) => {
					const res = await fetch(url, {
						method: "POST",
						headers,
						body: JSON.stringify(requestBody),
						credentials: "same-origin",
					});
					const text = await res.text();
					return {
						status: res.status,
						contentType: res.headers.get("content-type") ?? "",
						body: text,
					};
				},
				searchUrl,
				payload,
				replayHeaders
			);

			if (looksBlocked(status, contentType, body)) {
				throw new BlockedError(
					`Cloudflare block for ${courseName} (status ${status}, content-type "${contentType}")`
				);
			}

			let json: unknown;
			try {
				json = JSON.parse(body);
			} catch {
				// Valid responses are always JSON; anything else is a disguised block/error page.
				throw new BlockedError(`Non-JSON response for ${courseName} (status ${status})`);
			}

			const result = EzLinksResponseSchema.safeParse(json);
			if (!result.success) {
				if (i === 0) {
					throw new SchemaChangedError(
						`EzLinks API response shape changed for ${courseName}: ${result.error.message}`
					);
				}
				continue;
			}

			allSlots.push(...result.data.r06);

			if (i < PLAYER_COUNTS.length - 1) await delay(DELAY_MS);
		}

		const grouped = new Map<string, { maxPrice: number; openSlots: number }>();
		for (const entry of allSlots) {
			const existing = grouped.get(entry.r15);
			if (existing) {
				existing.maxPrice = Math.max(existing.maxPrice, entry.r08);
				existing.openSlots = Math.max(existing.openSlots, entry.r11);
			} else {
				grouped.set(entry.r15, { maxPrice: entry.r08, openSlots: entry.r11 });
			}
		}

		const resolvedBookingLink = bookingLink ?? `${facilityUrl}/index.html#/search`;
		const teeTimes: TeeTime[] = [];
		for (const [timeKey, { maxPrice, openSlots }] of grouped) {
			teeTimes.push({
				date: fromZonedTime(timeKey, TZ).toISOString(),
				courseName,
				openSlots: String(openSlots),
				price: maxPrice,
				bookingLink: resolvedBookingLink,
			});
		}

		return teeTimes;
	} finally {
		page.off("request", onRequest);
		if (onResponse) page.off("response", onResponse);
	}
}

export async function scrapeEzLinks(
	date: string,
	facilityUrl: string,
	facilityId: number,
	courseName: string,
	bookingLink?: string
): Promise<TeeTime[]> {
	return runExclusive(async () => {
		let lastError: unknown;

		for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
			try {
				const { page } = await getWarmSession();
				return await runScrape(page, date, facilityUrl, facilityId, courseName, bookingLink);
			} catch (error) {
				lastError = error;

				// A genuine API shape change won't fix itself on retry.
				if (error instanceof SchemaChangedError) throw error;

				// Block/timeout/transient: discard the (likely tainted) session so the
				// next attempt launches a fresh browser and re-solves Turnstile.
				await closeWarmSession();

				if (attempt < MAX_ATTEMPTS) {
					const backoff = BASE_BACKOFF_MS * 2 ** (attempt - 1);
					const jitter = Math.floor(Math.random() * 500);
					const message = error instanceof Error ? error.message : String(error);
					console.warn(
						`EzLinks scrape attempt ${attempt}/${MAX_ATTEMPTS} failed for ${courseName}: ${message}. Retrying in ${backoff + jitter}ms`
					);
					await delay(backoff + jitter);
				}
			}
		}

		throw lastError instanceof Error
			? lastError
			: new Error(`EzLinks scrape failed for ${courseName} after ${MAX_ATTEMPTS} attempts`);
	});
}
