import scrapeChronoGolf from "@/app/scrape/scrapeChronoGolf";
import { captureError } from "@/app/lib/logger";
import { ScrapeError } from "@/app/errors";
import { cacheGet, cacheSet, reviveTeeTimes } from "@/app/cache";
import type { TeeTime } from "@/app/types";

export async function scrapeForestCreek(date: string) {
	const cacheKey = `${date}::forestCreek`;
	const cached = await cacheGet<TeeTime[]>(cacheKey);
	if (cached) return reviveTeeTimes(cached);

	try {
		const result = await scrapeChronoGolf(
			date,
			"13600",
			"15579",
			"139028",
			"Forest Creek",
			`https://www.chronogolf.com/club/13600/widget?medium=widget&source=club#?course_id=15579&nb_holes=18&date=${date}`
		);
		await cacheSet(cacheKey, result);
		return result;
	} catch (error) {
		const wrapped = new ScrapeError("Failed to scrape Forest Creek", {
			courseName: "Forest Creek",
			scrapeDate: date,
			scraperType: "chronogolf",
			cause: error,
		});
		captureError(wrapped);
		throw wrapped;
	}
}
