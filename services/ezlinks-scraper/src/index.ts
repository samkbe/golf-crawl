import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { z } from "zod";
import { scrapeEzLinks } from "./scrape.js";

const app = new Hono();

const ScrapeRequestSchema = z.object({
	date: z.string(),
	facilityUrl: z.string().url(),
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

	const { date, facilityUrl, courseName, bookingLink } = parsed.data;

	try {
		const teeTimes = await scrapeEzLinks(date, facilityUrl, courseName, bookingLink);
		return c.json({ teeTimes });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		console.error(`Scrape failed for ${courseName}:`, message);
		return c.json({ error: "Scrape failed", message }, 500);
	}
});

const port = parseInt(process.env.PORT || "3001", 10);

serve({ fetch: app.fetch, port }, (info) => {
	console.log(`EzLinks scraper service running on port ${info.port}`);
});
