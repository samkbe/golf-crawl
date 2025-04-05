import { scrapeForeUp } from "./helpers";

export async function scrapeAveryRanch(date: Date) {
    try {
        return await scrapeForeUp(date, "https://foreupsoftware.com/index.php/booking/22219/10175#/teetimes", "Avery Ranch");
    } catch(e) {
        console.log(e);
        throw new Error("Failed");
    }
}