import scrapeForeUp from "@/app/scrape/scrapeForeUp";
import { captureError } from "@/app/lib/logger";
import { ScrapeError } from "@/app/errors";
import { cacheGet, cacheSet, reviveTeeTimes } from "@/app/cache";
import type { TeeTime } from "@/app/types";
import type { Browser } from "puppeteer";

export async function scrapeFalconhead(date: string, browser: Browser) {
	const cacheKey = `${date}::falconhead`;
	const cached = await cacheGet<TeeTime[]>(cacheKey);
	if (cached) return reviveTeeTimes(cached);

	try {
		const result = await scrapeForeUp(
			date,
			"https://foreupsoftware.com/index.php/booking/23031/10177#/teetimes",
			"Falconhead",
			browser,
			"https://foreupsoftware.com/index.php/booking/23031/10177#/teetimes"
		);
		await cacheSet(cacheKey, result);
		return result;
	} catch (error) {
		const wrapped = new ScrapeError("Failed to scrape Falconhead", {
			courseName: "Falconhead",
			scrapeDate: date,
			scraperType: "foreup",
			cause: error,
		});
		captureError(wrapped);
		throw wrapped;
	}
}
