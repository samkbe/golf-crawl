import scrapeTeeItUp from "@/app/scrape/scrapeTeeItUp";
import { captureError } from "@/app/lib/logger";
import { ScrapeError } from "@/app/errors";
import { cacheGet, cacheSet, reviveTeeTimes } from "@/app/cache";
import type { TeeTime } from "@/app/types";

export async function scrapeShadowGlen(date: string) {
	const cacheKey = `${date}::shadowGlen`;
	const cached = await cacheGet<TeeTime[]>(cacheKey);
	if (cached) return reviveTeeTimes(cached);
	try {
		const result = await scrapeTeeItUp(
			date,
			"https://shadowglen-golf-club.book.teeitup.com/?course=591",
			"Shadowglen"
		);
		await cacheSet(cacheKey, result);
		return result;
	} catch (error) {
		const wrapped = new ScrapeError("Failed to scrape Shadow Glen", {
			courseName: "Shadow Glen",
			scrapeDate: date,
			scraperType: "teeitup",
			cause: error,
		});
		captureError(wrapped);
		throw wrapped;
	}
}
