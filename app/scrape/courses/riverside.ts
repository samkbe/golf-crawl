import scrapeForeUp from "../scrapeForeUp";

export async function scrapeRiverside(date: string) {
	try {
		return await scrapeForeUp(
			date,
			"https://foreupsoftware.com/index.php/booking/21469/7880#/teetimes",
			"Riverside",
			"https://foreupsoftware.com/index.php/booking/21469/7880#/teetimes"
		);
	} catch (e) {
		console.log(e);
		throw new Error("Failed");
	}
}
