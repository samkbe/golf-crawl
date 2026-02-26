import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";

const TZ = "America/Chicago";

const EzLinksSlotSchema = z.object({
	r08: z.number(),
	r15: z.string(),
});

const EzLinksResponseSchema = z.object({
	r06: z.array(EzLinksSlotSchema),
});

export interface TeeTime {
	date: string;
	courseName: string;
	openSlots: string;
	price: number;
	bookingLink: string;
}

export async function scrapeEzLinks(
	date: string,
	facilityUrl: string,
	courseName: string,
	bookingLink?: string
): Promise<TeeTime[]> {
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
				() => reject(new Error(`Timed out waiting for EzLinks API response for ${courseName}`)),
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
			throw new Error(`EzLinks API response shape changed for ${courseName}: ${result.error.message}`);
		}

		const teeTimes: TeeTime[] = [];

		for (const entry of result.data.r06) {
			const teeTimeDate = fromZonedTime(entry.r15, TZ);
			teeTimes.push({
				date: teeTimeDate.toISOString(),
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
