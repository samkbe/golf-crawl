import scrapeForeUp from "@/app/scrape/scrapeForeUp";
import { captureError } from "@/app/lib/logger";
import { ScrapeError } from "@/app/errors";
import { cacheGet, cacheSet, reviveTeeTimes } from "@/app/cache";
import type { TeeTime } from "@/app/types";

export async function scrapeColovista(date: string) {
	const cacheKey = `${date}::colovista`;
	const cached = await cacheGet<TeeTime[]>(cacheKey);
	if (cached) return reviveTeeTimes(cached);

	try {
		const result = await scrapeForeUp(
			date,
			"5414",
			"6283",
			"Colovista",
			"https://foreupsoftware.com/index.php/booking/20676/5414#/teetimes"
		);
		await cacheSet(cacheKey, result);
		return result;
	} catch (error) {
		const wrapped = new ScrapeError("Failed to scrape Colovista", {
			courseName: "Colovista",
			scrapeDate: date,
			scraperType: "foreup",
			cause: error,
		});
		captureError(wrapped);
		throw wrapped;
	}
}
