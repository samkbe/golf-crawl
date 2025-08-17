import scrapeForeUp from "../scrapeForeUp";

export async function scrapeAveryRanch(date: Date) {
	try {
		return await scrapeForeUp(
			date,
			"https://foreupsoftware.com/index.php/booking/22219/10175#/teetimes",
			"Avery Ranch"
		);
	} catch (e) {
		console.log(e);
		throw new Error("Failed");
	}
}
