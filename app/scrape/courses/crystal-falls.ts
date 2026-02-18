import scrapeTeeItUp from "@/app/scrape/scrapeTeeItUp";
import { captureError } from "@/app/lib/logger";
import { ScrapeError } from "@/app/errors";
import { cacheGet, cacheSet, reviveTeeTimes } from "@/app/cache";
import type { TeeTime } from "@/app/types";

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
