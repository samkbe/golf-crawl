import { serve } from "@hono/node-server";
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { z } from "zod";
import { scrapeEzLinks } from "./scrape.js";
import { scrapeChronoGolf } from "./scrapeChronoGolf.js";

const app = new Hono();

const ScrapeRequestSchema = z.object({
	date: z.string(),
	facilityUrl: z.string().url(),
	facilityId: z.number(),
	courseName: z.string(),
	bookingLink: z.string().url().optional(),
});

const ChronoScrapeRequestSchema = z.object({
	date: z.string(),
	clubId: z.string(),
	courseId: z.string(),
	affiliationTypeId: z.string(),
	courseName: z.string(),
	bookingLink: z.string().url().optional(),
});

const requireApiKey: MiddlewareHandler = async (c, next) => {
	const apiKey = c.req.header("Authorization")?.replace("Bearer ", "");
	if (!apiKey || apiKey !== process.env.API_KEY) {
		return c.json({ error: "Unauthorized" }, 401);
	}
	await next();
};

app.get("/health", (c) => c.json({ status: "ok" }));

app.use("/scrape", requireApiKey);
app.use("/scrape-chronogolf", requireApiKey);

app.post("/scrape", async (c) => {
	const body = await c.req.json();
	const parsed = ScrapeRequestSchema.safeParse(body);

	if (!parsed.success) {
		return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
	}

	const { date, facilityUrl, facilityId, courseName, bookingLink } = parsed.data;

	try {
		const teeTimes = await scrapeEzLinks(date, facilityUrl, facilityId, courseName, bookingLink);
		return c.json({ teeTimes });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		console.error(`Scrape failed for ${courseName}:`, message);
		return c.json({ error: "Scrape failed", message }, 500);
	}
});

app.post("/scrape-chronogolf", async (c) => {
	const body = await c.req.json();
	const parsed = ChronoScrapeRequestSchema.safeParse(body);

	if (!parsed.success) {
		return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
	}

	const { date, clubId, courseId, affiliationTypeId, courseName, bookingLink } = parsed.data;

	try {
		const teeTimes = await scrapeChronoGolf(
			date,
			clubId,
			courseId,
			affiliationTypeId,
			courseName,
			bookingLink
		);
		return c.json({ teeTimes });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		console.error(`ChronoGolf scrape failed for ${courseName}:`, message);
		return c.json({ error: "Scrape failed", message }, 500);
	}
});

const port = parseInt(process.env.PORT || "3001", 10);

serve({ fetch: app.fetch, port }, (info) => {
	console.log(`EzLinks scraper service running on port ${info.port}`);
});
