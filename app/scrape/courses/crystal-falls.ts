import scrapeTeeItUp from "../scrapeTeeItUp";
import { captureError } from "../../lib/logger";
import { ScrapeError } from "../../errors";
import { cacheGet, cacheSet, reviveTeeTimes } from "../../cache";
import type { TeeTime } from "../../types";

export async function scrapeCrystalFalls(date: string) {
	const cacheKey = `${date}::crystalFalls`;
	const cached = await cacheGet<TeeTime[]>(cacheKey);
	if (cached) return reviveTeeTimes(cached);

	try {
		const result = await scrapeTeeItUp(
			date,
			"https://crystal-falls-golf-club-2.book.teeitup.com/?course=5741",
			"Crystal Falls"
		);
		await cacheSet(cacheKey, result);
		return result;
	} catch (error) {
		const wrapped = new ScrapeError("Failed to scrape Crystal Falls", {
			courseName: "Crystal Falls",
			scrapeDate: date,
			scraperType: "teeitup",
			cause: error,
		});
		captureError(wrapped);
		throw wrapped;
	}
}
