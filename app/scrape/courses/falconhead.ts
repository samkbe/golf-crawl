import scrapeForeUp from "../scrapeForeUp";

export async function scrapeFalconhead(date: Date) {
	try {
		return await scrapeForeUp(
			date,
			"https://foreupsoftware.com/index.php/booking/22221/10177#/teetimes",
			"Falconhead"
		);
	} catch (e) {
		console.log(e);
		throw new Error("Failed");
	}
}
