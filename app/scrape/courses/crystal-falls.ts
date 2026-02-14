import scrapeTeeItUp from "../scrapeTeeItUp";
import { captureError } from "../../lib/logger";
import { ScrapeError } from "../../errors";

export async function scrapeCrystalFalls(date: string) {
	try {
		return await scrapeTeeItUp(
			date,
			"https://crystal-falls-golf-club-2.book.teeitup.com/?course=5741",
			"Crystal Falls"
		);
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
