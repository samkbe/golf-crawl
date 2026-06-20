import scrapeGolfBack from "@/app/scrape/scrapeGolfBack";
import { captureError } from "@/app/lib/logger";
import { ScrapeError } from "@/app/errors";
import { cacheGet, cacheSet, reviveTeeTimes } from "@/app/cache";
import type { TeeTime } from "@/app/types";

export async function scrapeAveryRanch(date: string) {
	const cacheKey = `${date}::averyRanch`;
	const cached = await cacheGet<TeeTime[]>(cacheKey);
	if (cached) return reviveTeeTimes(cached);

	try {
		const result = await scrapeGolfBack(
			date,
			"f06840ec-1229-4d06-b1d9-435573939990",
			"Avery Ranch",
			`https://golfback.com/#/course/f06840ec-1229-4d06-b1d9-435573939990/date/${date}`
		);
		await cacheSet(cacheKey, result);
		return result;
	} catch (error) {
		const wrapped = new ScrapeError("Failed to scrape Avery Ranch", {
			courseName: "Avery Ranch",
			scrapeDate: date,
			scraperType: "golfback",
			cause: error,
		});
		captureError(wrapped);
		throw wrapped;
	}
}
