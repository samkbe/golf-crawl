import scrapeGolfBack from "@/app/scrape/scrapeGolfBack";
import { captureError } from "@/app/lib/logger";
import { ScrapeError } from "@/app/errors";
import { cacheGet, cacheSet, reviveTeeTimes } from "@/app/cache";
import type { TeeTime } from "@/app/types";

export async function scrapeTeravista(date: string) {
	const cacheKey = `${date}::teravista`;
	const cached = await cacheGet<TeeTime[]>(cacheKey);
	if (cached) return reviveTeeTimes(cached);

	try {
		const result = await scrapeGolfBack(
			date,
			"609b3b52-0b5f-4cd5-a68b-9fdfcb7c6676",
			"Teravista",
			`https://golfback.com/#/course/609b3b52-0b5f-4cd5-a68b-9fdfcb7c6676/date/${date}`
		);
		await cacheSet(cacheKey, result);
		return result;
	} catch (error) {
		const wrapped = new ScrapeError("Failed to scrape Teravista", {
			courseName: "Teravista",
			scrapeDate: date,
			scraperType: "golfback",
			cause: error,
		});
		captureError(wrapped);
		throw wrapped;
	}
}
