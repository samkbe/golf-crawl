import scrapeForeUp from "../scrapeForeUp";

export async function scrapeTeravista(date: string) {
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
