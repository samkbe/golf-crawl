import "server-only";
import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";
import type { TeeTime } from "@/app/types";
import { ParseError } from "@/app/errors";

const TZ = "America/Chicago";

const EzLinksSlotSchema = z.object({
    r08: z.number(),
    r15: z.string(),
});

const EzLinksResponseSchema = z.object({
    r06: z.array(EzLinksSlotSchema),
});

export default async function scrapeEzLinks(
    date: string,
    facilityUrl: string,
    courseName: string,
    bookingLink?: string
) {
    const { connect } = await import("puppeteer-real-browser");

    const { browser, page } = await connect({
        headless: false,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        turnstile: true,
        connectOption: {},
    });

    try {
        const apiResponsePromise = new Promise<unknown>((resolve, reject) => {
            const timeout = setTimeout(
                () => reject(new ParseError("Timed out waiting for EzLinks teetimes API response", {
                    courseName,
                    field: "apiResponse",
                })),
                60_000
            );

            page.on("response", async (response: any) => {
                if (response.url().includes("/api/search/search")) {
                    clearTimeout(timeout);
                    try {
                        resolve(await response.json());
                    } catch (e) {
                        reject(e);
                    }
                }
            });
        });

        await page.goto(`${facilityUrl}/index.html#/search`, {
            waitUntil: "networkidle0",
            timeout: 60_000,
        });

        const json = await apiResponsePromise;
        const result = EzLinksResponseSchema.safeParse(json);

        if (!result.success) {
            throw new ParseError("EzLinks API response shape changed", {
                courseName,
                field: "apiResponse",
                cause: result.error,
            });
        }

        const teeTimes: TeeTime[] = [];

        for (const entry of result.data.r06) {
            const teeTimeDate = fromZonedTime(entry.r15, TZ);
            teeTimes.push({
                date: teeTimeDate,
                courseName,
                openSlots: "2-4",
                price: entry.r08,
                bookingLink: bookingLink ?? `${facilityUrl}/index.html#/search`,
            });
        }

        return teeTimes;
    } finally {
        await browser.close();
    }
}