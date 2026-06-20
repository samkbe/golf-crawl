import scrapeGolfBack from "@/app/scrape/scrapeGolfBack";
import { captureError } from "@/app/lib/logger";
import { ScrapeError } from "@/app/errors";
import { cacheGet, cacheSet, reviveTeeTimes } from "@/app/cache";
import type { TeeTime } from "@/app/types";

export async function scrapeFalconhead(date: string) {
	const cacheKey = `${date}::falconhead`;
	const cached = await cacheGet<TeeTime[]>(cacheKey);
	if (cached) return reviveTeeTimes(cached);

	try {
		const result = await scrapeGolfBack(
			date,
			"7a0c7c4d-0282-4524-b863-feab909fec10",
			"Falconhead",
			`https://golfback.com/#/course/7a0c7c4d-0282-4524-b863-feab909fec10/date/${date}`
		);
		await cacheSet(cacheKey, result);
		return result;
	} catch (error) {
		const wrapped = new ScrapeError("Failed to scrape Falconhead", {
			courseName: "Falconhead",
			scrapeDate: date,
			scraperType: "golfback",
			cause: error,
		});
		captureError(wrapped);
		throw wrapped;
	}
}
