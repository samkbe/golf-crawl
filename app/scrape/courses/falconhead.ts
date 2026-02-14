import scrapeForeUp from "../scrapeForeUp";
import { captureError } from "../../lib/logger";
import { ScrapeError } from "../../errors";

export async function scrapeFalconhead(date: string) {
	try {
		return await scrapeForeUp(
			date,
			"https://foreupsoftware.com/index.php/booking/23031/10177#/teetimes",
			"Falconhead",
			"https://foreupsoftware.com/index.php/booking/23031/10177#/teetimes"
		);
	} catch (error) {
		const wrapped = new ScrapeError("Failed to scrape Falconhead", {
			courseName: "Falconhead",
			scrapeDate: date,
			scraperType: "foreup",
			cause: error,
		});
		captureError(wrapped);
		throw wrapped;
	}
}
