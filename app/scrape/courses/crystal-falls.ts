import scrapeTeeItUp from "../scrapeTeeItUp";

export async function scrapeCrystalFalls(date: string) {
	try {
		return await scrapeTeeItUp(
			date,
			"https://crystal-falls-golf-club-2.book.teeitup.com/?course=5741",
			"Crystal Falls"
		);
	} catch (e) {
		console.log(e);
		throw new Error("Failed");
	}
}
