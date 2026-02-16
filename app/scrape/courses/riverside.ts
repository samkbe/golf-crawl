import scrapeForeUp from "@/app/scrape/scrapeForeUp";
import { captureError } from "@/app/lib/logger";
import { ScrapeError } from "@/app/errors";
import { cacheGet, cacheSet, reviveTeeTimes } from "@/app/cache";
import type { TeeTime } from "@/app/types";

export async function scrapeRiverside(date: string) {
	const cacheKey = `${date}::riverside`;
	const cached = await cacheGet<TeeTime[]>(cacheKey);
	if (cached) return reviveTeeTimes(cached);
	try {
		const result = await scrapeForeUp(
			date,
			"https://foreupsoftware.com/index.php/booking/21469/7880#/teetimes",
			"Riverside",
			"https://foreupsoftware.com/index.php/booking/21469/7880#/teetimes"
		);
		await cacheSet(cacheKey, result);
		return result;
	} catch (error) {
		const wrapped = new ScrapeError("Failed to scrape Riverside", {
			courseName: "Riverside",
			scrapeDate: date,
			scraperType: "foreup",
			cause: error,
		});
		captureError(wrapped);
		throw wrapped;
	}
}
