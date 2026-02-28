import scrapeEzLinks from "@/app/scrape/scrapeEzLinks";
import { captureError } from "@/app/lib/logger";
import { ScrapeError } from "@/app/errors";
import { cacheGet, cacheSet, reviveTeeTimes } from "@/app/cache";
import type { TeeTime } from "@/app/types";

const FACILITY_URL = "https://lostpines.ezlinksgolf.com/";
const FACILITY_ID = 4704;

export async function scrapeLostPines(date: string) {
    const cacheKey = `${date}::lostPines`;
    const cached = await cacheGet<TeeTime[]>(cacheKey);
    if (cached) return reviveTeeTimes(cached);

    try {
        const result = await scrapeEzLinks(
            date,
            FACILITY_URL,
            FACILITY_ID,
            "Lost Pines",
            `${FACILITY_URL}/index.html#/search`
        );
        await cacheSet(cacheKey, result);
        return result;
    } catch (error) {
        const wrapped = new ScrapeError("Failed to scrape Lost Pines", {
            courseName: "Lost Pines",
            scrapeDate: date,
            scraperType: "ezlinks",
            cause: error,
        });
        captureError(wrapped);
        throw wrapped;
    }
}