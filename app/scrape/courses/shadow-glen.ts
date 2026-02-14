import scrapeTeeItUp from "../scrapeTeeItUp";
import { captureError } from "../../lib/logger";
import { ScrapeError } from "../../errors";

export async function scrapeShadowGlen(date: string) {
	try {
		return await scrapeTeeItUp(
			date,
			"https://shadowglen-golf-club.book.teeitup.com/?course=591",
			"Shadowglen"
		);
	} catch (error) {
		const wrapped = new ScrapeError("Failed to scrape Shadow Glen", {
			courseName: "Shadow Glen",
			scrapeDate: date,
			scraperType: "teeitup",
			cause: error,
		});
		captureError(wrapped);
		throw wrapped;
	}
}
