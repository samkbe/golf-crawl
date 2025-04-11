import { scrapeForeUp } from "./helpers";

export async function scrapeTeravista(date: Date) {
	try {
		return await scrapeForeUp(
			date,
			"https://foreupsoftware.com/index.php/booking/22220/10176#/teetimes",
			"Teravista"
		);
	} catch (e) {
		console.log(e);
		throw new Error("Failed");
	}
}
