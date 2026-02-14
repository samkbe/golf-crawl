import scrapeForeUp from "../scrapeForeUp";
import { captureError } from "../../lib/logger";
import { ScrapeError } from "../../errors";

export async function scrapeAveryRanch(date: string) {
	try {
		return await scrapeForeUp(
			date,
			"https://foreupsoftware.com/index.php/booking/23032/10175#/teetimes",
			"Avery Ranch",
			"https://foreupsoftware.com/index.php/booking/23032/10175#/teetimes"
		);
	} catch (error) {
		const wrapped = new ScrapeError("Failed to scrape Avery Ranch", {
			courseName: "Avery Ranch",
			scrapeDate: date,
			scraperType: "foreup",
			cause: error,
		});
		captureError(wrapped);
		throw wrapped;
	}
}
