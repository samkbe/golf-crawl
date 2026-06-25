import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";

const TZ = "America/Chicago";
const PLAYER_COUNTS = [4, 3, 2, 1] as const;
const DELAY_MS = 750;

const MAX_ATTEMPTS = 4;
const BASE_BACKOFF_MS = 1500;
const SESSION_TTL_MS = 15 * 60_000;
const NAV_TIMEOUT_MS = 60_000;
// ChronoGolf's SPA keeps long-lived connections open, so networkidle never
// settles. We navigate with domcontentloaded and give Cloudflare's JS challenge
// a moment to finalize the cf_clearance cookie before replaying the API.
const CF_SETTLE_MS = 2500;

// Decodo residential proxy: rotating sticky-session ports. cf_clearance is bound
// to the egress IP, so a warm browser pins to one port for its whole lifetime.
const PROXY_PORTS = [14001, 14002, 14003, 14004, 14005, 14006, 14007, 14008, 14009, 14010];

const API_BASE = "https://www.chronogolf.com/marketplace/clubs";

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

const GreenFeeSchema = z.object({
	green_fee: z.number(),
	subtotal: z.number(),
});

const ChronoEntrySchema = z.object({
	start_time: z.string(),
	date: z.string(),
	out_of_capacity: z.boolean(),
	green_fees: z.array(GreenFeeSchema).optional(),
});

const ChronoResponseSchema = z.array(ChronoEntrySchema);

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
		console.log(`Launching ChronoGolf browser via Decodo proxy port ${proxy.port}`);
	} else {
		console.warn(
			"DECODO_PROXY_* env vars not fully set; launching ChronoGolf browser without a proxy"
		);
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

function buildQuery(
	date: string,
	courseId: string,
	affiliationTypeId: string,
	playerCount: number
): string {
	const params = new URLSearchParams({
		date,
		course_id: courseId,
		nb_holes: "18",
	});
	for (let i = 0; i < playerCount; i++) {
		params.append("affiliation_type_ids[]", affiliationTypeId);
	}
	return params.toString();
}

async function runScrape(
	page: any,
	date: string,
	clubId: string,
	courseId: string,
	affiliationTypeId: string,
	courseName: string,
	bookingLink?: string
): Promise<TeeTime[]> {
	const widgetUrl =
		bookingLink ??
		`https://www.chronogolf.com/club/${clubId}/widget?medium=widget&source=club#?course_id=${courseId}&nb_holes=18&date=${date}`;

	// Navigating the widget page solves the Cloudflare challenge and pins the
	// cf_clearance cookie to this session's egress IP. The teetimes API is on the
	// same origin, so subsequent same-origin fetches inherit that cookie.
	await page.goto(widgetUrl, {
		waitUntil: "domcontentloaded",
		timeout: NAV_TIMEOUT_MS,
	});

	await delay(CF_SETTLE_MS);

	const slotsByTime = new Map<string, { slots: number; price: number }>();

	for (let i = 0; i < PLAYER_COUNTS.length; i++) {
		const playerCount = PLAYER_COUNTS[i];
		const query = buildQuery(date, courseId, affiliationTypeId, playerCount);
		const url = `${API_BASE}/${clubId}/teetimes?${query}`;

		const { status, contentType, body } = await page.evaluate(async (u: string) => {
			const res = await fetch(u, {
				headers: { Accept: "application/json, text/plain, */*" },
				credentials: "same-origin",
			});
			const text = await res.text();
			return {
				status: res.status,
				contentType: res.headers.get("content-type") ?? "",
				body: text,
			};
		}, url);

		if (looksBlocked(status, contentType, body)) {
			// First request feeds every later one; if it's blocked the whole
			// session is tainted, so bail and let the caller re-solve Turnstile.
			if (i === 0) {
				throw new BlockedError(
					`Cloudflare block for ${courseName} (status ${status}, content-type "${contentType}")`
				);
			}
			continue;
		}

		let json: unknown;
		try {
			json = JSON.parse(body);
		} catch {
			if (i === 0) {
				throw new BlockedError(`Non-JSON response for ${courseName} (status ${status})`);
			}
			continue;
		}

		const result = ChronoResponseSchema.safeParse(json);
		if (!result.success) {
			if (i === 0) {
				throw new SchemaChangedError(
					`ChronoGolf API response shape changed for ${courseName}: ${result.error.message}`
				);
			}
			continue;
		}

		for (const entry of result.data) {
			if (entry.out_of_capacity) continue;

			const key = `${entry.date} ${entry.start_time}`;
			if (slotsByTime.has(key)) continue;

			const price = entry.green_fees?.[0]?.subtotal;
			if (price == null) continue;

			slotsByTime.set(key, { slots: playerCount, price });
		}

		if (i < PLAYER_COUNTS.length - 1) await delay(DELAY_MS);
	}

	const teeTimes: TeeTime[] = [];
	for (const [key, { slots, price }] of slotsByTime) {
		teeTimes.push({
			date: fromZonedTime(key, TZ).toISOString(),
			courseName,
			openSlots: String(slots),
			price,
			bookingLink: widgetUrl,
		});
	}

	return teeTimes;
}

export async function scrapeChronoGolf(
	date: string,
	clubId: string,
	courseId: string,
	affiliationTypeId: string,
	courseName: string,
	bookingLink?: string
): Promise<TeeTime[]> {
	return runExclusive(async () => {
		let lastError: unknown;

		for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
			try {
				const { page } = await getWarmSession();
				return await runScrape(
					page,
					date,
					clubId,
					courseId,
					affiliationTypeId,
					courseName,
					bookingLink
				);
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
						`ChronoGolf scrape attempt ${attempt}/${MAX_ATTEMPTS} failed for ${courseName}: ${message}. Retrying in ${backoff + jitter}ms`
					);
					await delay(backoff + jitter);
				}
			}
		}

		throw lastError instanceof Error
			? lastError
			: new Error(`ChronoGolf scrape failed for ${courseName} after ${MAX_ATTEMPTS} attempts`);
	});
}
