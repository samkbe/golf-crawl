import scrapeForeUp from "../scrapeForeUp";

export async function scrapeRiverside(date: Date) {
	try {
		return await scrapeForeUp(
			date,
			"https://foreupsoftware.com/index.php/booking/21469/7880#/teetimes",
			"Riverside"
		);
	} catch (e) {
		console.log(e);
		throw new Error("Failed");
	}
}
