import scrapeForeUp from "@/app/scrape/scrapeForeUp";
import { captureError } from "@/app/lib/logger";
import { ScrapeError } from "@/app/errors";
import { cacheGet, cacheSet, reviveTeeTimes } from "@/app/cache";
import type { TeeTime } from "@/app/types";
import type { Browser } from "puppeteer";

export async function scrapeAveryRanch(date: string, browser: Browser) {
	const cacheKey = `${date}::averyRanch`;
	const cached = await cacheGet<TeeTime[]>(cacheKey);
	if (cached) return reviveTeeTimes(cached);

	try {
		const result = await scrapeForeUp(
			date,
			"https://foreupsoftware.com/index.php/booking/23032/10175#/teetimes",
			"Avery Ranch",
			browser,
			"https://foreupsoftware.com/index.php/booking/23032/10175#/teetimes"
		);
		await cacheSet(cacheKey, result);
		return result;
	} catch (error) {
		const wrapped = new ScrapeError("Failed to scrape Avery Ranch", {
			courseName: "Avery Ranch",
			scrapeDate: date,
			scraperType: "foreup",
			cause: error,
		});
		captureError(wrapped);
		throw wrapped;
	}
}
