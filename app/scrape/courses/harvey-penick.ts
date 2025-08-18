import scrapeTeeItUp from "../scrapeTeeItUp";

export async function scrapeHarveyPenick(date: string) {
	try {
		return await scrapeTeeItUp(
			date,
			"https://harvey-penick-golf-campus.book.teeitup.golf/?course=1020",
			"Harvey Penick"
		);
	} catch (e) {
		console.log(e);
		throw new Error("Failed");
	}
}
