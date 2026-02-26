import scrapeGolfWithAccess from "@/app/scrape/scrapeGolfWithAccess";
import { captureError } from "@/app/lib/logger";
import { ScrapeError } from "@/app/errors";
import { cacheGet, cacheSet, reviveTeeTimes } from "@/app/cache";
import type { TeeTime } from "@/app/types";

const COURSE_ID = "5244ceab-e41e-410f-9dfa-ad6023a30159";
const UTM_SOURCE = "kissing-tree-golf-club";

export async function scrapeKissingTree(date: string) {
	const cacheKey = `${date}::kissingTree`;
	const cached = await cacheGet<TeeTime[]>(cacheKey);
	if (cached) return reviveTeeTimes(cached);

	try {
		const bookingLink = `https://golfwithaccess.com/course/kissing-tree-golf-club/reserve-tee-time?utm_campaign=course-booking-link&utm_source=${UTM_SOURCE}&utm_medium=referral&utm_content=&date=${date}&endAt=24&players=2&startAt=0&view=time&payMode=dollars`;
		const result = await scrapeGolfWithAccess(
			date,
			COURSE_ID,
			UTM_SOURCE,
			"Kissing Tree",
			bookingLink
		);
		await cacheSet(cacheKey, result);
		return result;
	} catch (error) {
		const wrapped = new ScrapeError("Failed to scrape Kissing Tree", {
			courseName: "Kissing Tree",
			scrapeDate: date,
			scraperType: "golfwithaccess",
			cause: error,
		});
		captureError(wrapped);
		throw wrapped;
	}
}
