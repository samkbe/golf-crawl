import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";
// #region agent log
import { dbg } from "./debug.js";
// #endregion

const TZ = "America/Chicago";
const PLAYER_COUNTS = [2, 1] as const;
const DELAY_MS = 750;

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

export async function scrapeEzLinks(
	date: string,
	facilityUrl: string,
	facilityId: number,
	courseName: string,
	bookingLink?: string
): Promise<TeeTime[]> {
	const { connect } = await import("puppeteer-real-browser");

	// #region agent log
	dbg("scrape.ts:beforeConnect", "about to call puppeteer-real-browser connect()", { courseName }, "H1,H2,H5");
	const connectStart = Date.now();
	// #endregion

	let browser: any, page: any;
	try {
		({ browser, page } = await connect({
			headless: false,
			args: ["--no-sandbox", "--disable-setuid-sandbox"],
			turnstile: true,
			connectOption: {},
		}));
	} catch (err) {
		// #region agent log
		dbg("scrape.ts:connectError", "connect() threw", {
			courseName,
			durationMs: Date.now() - connectStart,
			errorMessage: err instanceof Error ? err.message : String(err),
			errorName: err instanceof Error ? err.name : undefined,
			errorStack: err instanceof Error ? err.stack : undefined,
			errorCode: (err as NodeJS.ErrnoException)?.code,
		}, "H1,H2,H5");
		// #endregion
		throw err;
	}
	// #region agent log
	dbg("scrape.ts:afterConnect", "connect() returned", { courseName, durationMs: Date.now() - connectStart });
	// #endregion

	try {
		let capturedHeaders: Record<string, string> = {};

		const pageReadyPromise = new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(
				() => reject(new Error(`Timed out waiting for EzLinks page to load for ${courseName}`)),
				60_000
			);

			page.on("request", (request: any) => {
				if (request.url().includes("/api/search/search") && request.method() === "POST") {
					capturedHeaders = request.headers();
				}
			});

			page.on("response", async (response: any) => {
				if (response.url().includes("/api/search/search")) {
					clearTimeout(timeout);
					resolve();
				}
			});
		});

		await page.goto(`${facilityUrl}/index.html#/search`, {
			waitUntil: "networkidle0",
			timeout: 60_000,
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

			const json = await page.evaluate(
				async (url: string, body: Record<string, unknown>, headers: Record<string, string>) => {
					const res = await fetch(url, {
						method: "POST",
						headers,
						body: JSON.stringify(body),
						credentials: "same-origin",
					});
					return res.json();
				},
				searchUrl,
				payload,
				replayHeaders
			);

			const result = EzLinksResponseSchema.safeParse(json);
			if (!result.success) {
				if (i === 0) {
					throw new Error(`EzLinks API response shape changed for ${courseName}: ${result.error.message}`);
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
		// #region agent log
		dbg("scrape.ts:beforeClose", "about to call browser.close()", { courseName }, "H1,H4");
		const closeStart = Date.now();
		// #endregion
		try {
			await browser.close();
			// #region agent log
			dbg("scrape.ts:afterClose", "browser.close() resolved", { courseName, durationMs: Date.now() - closeStart });
			// Wait briefly to let the async disconnected handler run xvfb/chrome cleanup, then snapshot
			await new Promise((r) => setTimeout(r, 1500));
			dbg("scrape.ts:afterCloseSettle", "post-close settle snapshot", { courseName }, "H1,H4");
			// #endregion
		} catch (closeErr) {
			// #region agent log
			dbg("scrape.ts:closeError", "browser.close() threw", {
				courseName,
				durationMs: Date.now() - closeStart,
				errorMessage: closeErr instanceof Error ? closeErr.message : String(closeErr),
				errorStack: closeErr instanceof Error ? closeErr.stack : undefined,
			}, "H1,H4");
			// #endregion
		}
	}
}
