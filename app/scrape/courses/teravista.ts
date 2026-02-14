import scrapeForeUp from "../scrapeForeUp";
import { captureError } from "../../lib/logger";
import { ScrapeError } from "../../errors";

export async function scrapeTeravista(date: string) {
	try {
		return await scrapeForeUp(
			date,
			"https://foreupsoftware.com/index.php/booking/23033/10176#/teetimes",
			"Teravista",
			"https://foreupsoftware.com/index.php/booking/23033/10176#/teetimes"
		);
	} catch (error) {
		const wrapped = new ScrapeError("Failed to scrape Teravista", {
			courseName: "Teravista",
			scrapeDate: date,
			scraperType: "foreup",
			cause: error,
		});
		captureError(wrapped);
		throw wrapped;
	}
}
