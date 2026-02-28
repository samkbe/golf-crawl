import scrapeClubProphet from "@/app/scrape/scrapeClubProphet";
import { captureError } from "@/app/lib/logger";
import { ScrapeError } from "@/app/errors";
import { cacheGet, cacheSet, reviveTeeTimes } from "@/app/cache";
import type { TeeTime } from "@/app/types";

const SITE_HOST = "https://foresightplumcreek.cps.golf";
const WEBSITE_ID = "0ad3857d-1704-43be-9703-08da6f83475a";
const COURSE_IDS = "25";
const BOOKING_LINK = "https://foresightplumcreek.cps.golf/onlineresweb/search-teetime";

export async function scrapePlumCreek(date: string) {
	const cacheKey = `${date}::plumCreek`;
	const cached = await cacheGet<TeeTime[]>(cacheKey);
	if (cached) return reviveTeeTimes(cached);

	try {
		const result = await scrapeClubProphet(
			date,
			SITE_HOST,
			WEBSITE_ID,
			COURSE_IDS,
			"Plum Creek",
			BOOKING_LINK
		);
		await cacheSet(cacheKey, result);
		return result;
	} catch (error) {
		const wrapped = new ScrapeError("Failed to scrape Plum Creek", {
			courseName: "Plum Creek",
			scrapeDate: date,
			scraperType: "clubprophet",
			cause: error,
		});
		captureError(wrapped);
		throw wrapped;
	}
}
