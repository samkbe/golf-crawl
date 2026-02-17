import { cacheGet, cacheSet, reviveTeeTimes } from "@/app/cache";
import scrapeTeeItUp from "@/app/scrape/scrapeTeeItUp";
import { ScrapeError } from "@/app/errors";
import { captureError } from "@/app/lib/logger";
import type { TeeTime } from "@/app/types";
import type { Browser } from "puppeteer";

export async function scrapeHarveyPenick(date: string, browser: Browser) {
	const cacheKey = `${date}::harveyPenick`;
	const cached = await cacheGet<TeeTime[]>(cacheKey);
	if (cached) return reviveTeeTimes(cached);

	try {
		const result = await scrapeTeeItUp(
			date,
			"https://harvey-penick-golf-campus.book.teeitup.golf/?course=1020",
			"Harvey Penick",
			browser
		);
		await cacheSet(cacheKey, result);
		return result;
	} catch (error) {
		const wrapped = new ScrapeError("Failed to scrape Harvey Penick", {
			courseName: "Harvey Penick",
			scrapeDate: date,
			scraperType: "teeitup",
			cause: error,
		});
		captureError(wrapped);
		throw wrapped;
	}
}
