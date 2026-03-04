import scrapeEzLinks from "@/app/scrape/scrapeEzLinks";
import { captureError } from "@/app/lib/logger";
import { ScrapeError } from "@/app/errors";
import { cacheGet, cacheSet, reviveTeeTimes } from "@/app/cache";
import type { TeeTime } from "@/app/types";

const FACILITY_URL = "https://starranchgolf.ezlinksgolf.com";
const FACILITY_ID = 1682;

export async function scrapeStarRanch(date: string) {
    const cacheKey = `${date}::starRanch`;
    const cached = await cacheGet<TeeTime[]>(cacheKey);
    if (cached) return reviveTeeTimes(cached);

    try {
        const result = await scrapeEzLinks(
            date,
            FACILITY_URL,
            FACILITY_ID,
            "Star Ranch",
            `${FACILITY_URL}/index.html#/search`
        );
        await cacheSet(cacheKey, result);
        return result;
    } catch (error) {
        const wrapped = new ScrapeError("Failed to scrape Star Ranch", {
            courseName: "Star Ranch",
            scrapeDate: date,
            scraperType: "ezlinks",
            cause: error,
        });
        captureError(wrapped);
        throw wrapped;
    }
}