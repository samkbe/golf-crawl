import "server-only";
import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";
import type { TeeTime } from "@/app/types";
import { ParseError } from "@/app/errors";
import type { Browser } from "puppeteer";

const TZ = "America/Chicago";

const GreenFeeSchema = z.object({
	green_fee: z.number(),
});

const ChronoEntrySchema = z.object({
	start_time: z.string(),
	date: z.string(),
	out_of_capacity: z.boolean(),
	green_fees: z.array(GreenFeeSchema).optional(),
});

const ChronoResponseSchema = z.array(ChronoEntrySchema);

export default async function scrapeChronoGolf(
	date: string,
	clubId: string,
	courseId: string,
	affiliationTypeId: string,
	courseName: string,
	browser: Browser,
	bookingLink?: string
) {
	const widgetUrl =
		`https://www.chronogolf.com/club/${clubId}/widget?medium=widget&source=club#?course_id=${courseId}&nb_holes=18&date=${date}`;

	const page = await browser.newPage();

	try {
		const apiResponsePromise = new Promise<unknown>((resolve, reject) => {
			const timeout = setTimeout(
				() => reject(new ParseError("Timed out waiting for ChronoGolf teetimes API response", {
					courseName,
					field: "apiResponse",
				})),
				30_000
			);

			page.on("response", async (response) => {
				if (response.url().includes(`/marketplace/clubs/${clubId}/teetimes`)) {
					clearTimeout(timeout);
					try {
						resolve(await response.json());
					} catch (e) {
						reject(e);
					}
				}
			});
		});

		await page.goto(widgetUrl, { waitUntil: "networkidle0", timeout: 30_000 });

		// Select number of players — click the "4" button
		await page.waitForSelector(".toggler-heading", { timeout: 10_000 });
		const playerButtons = await page.$$(".toggler-heading");
		const lastButton = playerButtons[playerButtons.length - 1];
		if (lastButton) await lastButton.click();

		// Click the "Continue" button to trigger the teetimes API call
		await page.waitForSelector('button[ng-click="confirmStep()"]', { timeout: 10_000 });
		await page.click('button[ng-click="confirmStep()"]');

		const json = await apiResponsePromise;
		const result = ChronoResponseSchema.safeParse(json);

		if (!result.success) {
			throw new ParseError("ChronoGolf API response shape changed", {
				courseName,
				field: "apiResponse",
				cause: result.error,
			});
		}

		const teeTimes: TeeTime[] = [];

		for (const entry of result.data) {
			if (entry.out_of_capacity) continue;
			if (!entry.green_fees || entry.green_fees.length === 0) continue;

			const teeTimeDate = fromZonedTime(`${entry.date} ${entry.start_time}`, TZ);

			teeTimes.push({
				date: teeTimeDate,
				courseName,
				openSlots: String(entry.green_fees.length),
				price: entry.green_fees[0].green_fee,
				bookingLink: bookingLink ?? widgetUrl,
			});
		}

		return teeTimes;
	} finally {
		await page.close();
	}
}
