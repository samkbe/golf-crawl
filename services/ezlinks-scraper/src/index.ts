import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { z } from "zod";
import { scrapeEzLinks } from "./scrape.js";
// #region agent log
import { dbg, incInflight, decInflight, getInflight } from "./debug.js";
// #endregion

const app = new Hono();

const ScrapeRequestSchema = z.object({
	date: z.string(),
	facilityUrl: z.string().url(),
	facilityId: z.number(),
	courseName: z.string(),
	bookingLink: z.string().url().optional(),
});

app.get("/health", (c) => c.json({ status: "ok" }));

app.use("/scrape", async (c, next) => {
	const apiKey = c.req.header("Authorization")?.replace("Bearer ", "");
	if (!apiKey || apiKey !== process.env.API_KEY) {
		return c.json({ error: "Unauthorized" }, 401);
	}
	await next();
});

app.post("/scrape", async (c) => {
	const body = await c.req.json();
	const parsed = ScrapeRequestSchema.safeParse(body);

	if (!parsed.success) {
		return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
	}

	const { date, facilityUrl, facilityId, courseName, bookingLink } = parsed.data;

	// #region agent log
	const inflight = incInflight();
	const reqStart = Date.now();
	dbg("index.ts:/scrape:enter", "scrape request received", { courseName, facilityId, inflight }, "H3");
	// #endregion
	try {
		const teeTimes = await scrapeEzLinks(date, facilityUrl, facilityId, courseName, bookingLink);
		// #region agent log
		dbg("index.ts:/scrape:success", "scrape succeeded", { courseName, durationMs: Date.now() - reqStart, teeTimeCount: teeTimes.length, inflightAfter: getInflight() - 1 });
		// #endregion
		return c.json({ teeTimes });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		// #region agent log
		dbg("index.ts:/scrape:error", "scrape failed", {
			courseName,
			durationMs: Date.now() - reqStart,
			inflightAfter: getInflight() - 1,
			errorMessage: message,
			errorName: error instanceof Error ? error.name : undefined,
			errorStack: error instanceof Error ? error.stack : undefined,
			errorCode: (error as NodeJS.ErrnoException)?.code,
			errorErrno: (error as NodeJS.ErrnoException)?.errno,
		}, "H1,H2,H3,H4,H5");
		// #endregion
		console.error(`Scrape failed for ${courseName}:`, message);
		return c.json({ error: "Scrape failed", message }, 500);
	} finally {
		// #region agent log
		decInflight();
		// #endregion
	}
});

const port = parseInt(process.env.PORT || "3001", 10);

serve({ fetch: app.fetch, port }, (info) => {
	console.log(`EzLinks scraper service running on port ${info.port}`);
	// #region agent log
	dbg("index.ts:startup", "service started", { port: info.port, nodeVersion: process.version, chromePath: process.env.CHROME_PATH, display: process.env.DISPLAY });
	// #endregion
});
