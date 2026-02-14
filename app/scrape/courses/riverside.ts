import scrapeForeUp from "../scrapeForeUp";
import { captureError } from "../../lib/logger";
import { ScrapeError } from "../../errors";

export async function scrapeRiverside(date: string) {
	try {
		return await scrapeForeUp(
			date,
			"https://foreupsoftware.com/index.php/booking/21469/7880#/teetimes",
			"Riverside",
			"https://foreupsoftware.com/index.php/booking/21469/7880#/teetimes"
		);
	} catch (error) {
		const wrapped = new ScrapeError("Failed to scrape Riverside", {
			courseName: "Riverside",
			scrapeDate: date,
			scraperType: "foreup",
			cause: error,
		});
		captureError(wrapped);
		throw wrapped;
	}
}
