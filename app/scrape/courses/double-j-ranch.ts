import scrapeClubProphet from "@/app/scrape/scrapeClubProphet";
import { captureError } from "@/app/lib/logger";
import { ScrapeError } from "@/app/errors";
import { cacheGet, cacheSet, reviveTeeTimes } from "@/app/cache";
import type { TeeTime } from "@/app/types";

const SITE_HOST = "https://doublejranch.cps.golf";
const WEBSITE_ID = "0c68af11-ba27-4d32-c550-08daf8b161e6";
const COURSE_IDS = "1";
const BOOKING_LINK = "https://doublejranch.cps.golf/onlineresweb/search-teetime";

export async function scrapeDoubleJRanch(date: string) {
	const cacheKey = `${date}::doubleJRanch`;
	const cached = await cacheGet<TeeTime[]>(cacheKey);
	if (cached) return reviveTeeTimes(cached);

	try {
		const result = await scrapeClubProphet(
			date,
			SITE_HOST,
			WEBSITE_ID,
			COURSE_IDS,
			"Double J Ranch",
			BOOKING_LINK
		);
		await cacheSet(cacheKey, result);
		return result;
	} catch (error) {
		const wrapped = new ScrapeError("Failed to scrape Double J Ranch", {
			courseName: "Double J Ranch",
			scrapeDate: date,
			scraperType: "clubprophet",
			cause: error,
		});
		captureError(wrapped);
		throw wrapped;
	}
}
