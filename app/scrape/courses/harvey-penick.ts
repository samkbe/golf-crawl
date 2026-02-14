import scrapeTeeItUp from "../scrapeTeeItUp";
import { ScrapeError } from "@/app/errors";
import { captureError } from "@/app/lib/logger";

export async function scrapeHarveyPenick(date: string) {
	try {
		return await scrapeTeeItUp(
			date,
			"https://harvey-penick-golf-campus.book.teeitup.golf/?course=1020",
			"Harvey Penick"
		);
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
