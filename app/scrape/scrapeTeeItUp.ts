import "server-only";
import type { TeeTime } from "../types";
import { mergeDateWithTime } from "./helpers";
import { launchBrowser } from "./browser";
import { ParseError } from "../errors";

export default async function scrapeTeeItUp(date: string, url: string, courseName: string) {
	// READ: url must not contain any url params besides 'course'
	// Example: https://crystal-falls-golf-club-2.book.teeitup.com/?course=5741`

	const browser = await launchBrowser();

	try {
		const page = await browser.newPage();

		const u = new URL(url);
		u.searchParams.set("date", date);
		u.searchParams.set("max", "9999");

		await page.goto(u.toString());

		const bookingPanelSelector =
			'div[role="group"]:has(> div button[data-testid="teetimes_book_now_button"], > div button[data-testid="teetimes_choose_rate_button"])';

		try {
			await page.waitForSelector(bookingPanelSelector, { timeout: 10000 });
		} catch (error) {
			throw new ParseError("Tee time booking panels not found — page structure may have changed", {
				courseName,
				field: "bookingPanels",
				cause: error,
			});
		}

		const bookingPanels = await page.$$(bookingPanelSelector);

		const teeTimes: TeeTime[] = [];

		for (const bookingPanel of bookingPanels) {
			let timeString = await bookingPanel.$eval(
				"[data-testid='teetimes-tile-time']",
				(el) => el.textContent
			);
			if (!timeString) throw new ParseError("Couldn't parse time text content", {
				courseName,
				field: "time",
			});

			timeString = timeString.trim();

			const time = mergeDateWithTime(date, timeString);

			// Available Slots = data-testid="teetimes-tile-available-players"
			// Either 1, 1-3, 2, 1-4

			const slotsMap = {
				"1": "1",
				"2": "2",
				"1 or 2": "2",
				"1 - 3": "3",
				"1 - 4": "4",
				"2 - 4": "4",
			};
			let slotsString = await bookingPanel.$eval(
				"[data-testid='teetimes-tile-available-players']",
				(el) => el.textContent
			);

			if (!slotsString) throw new ParseError("Couldn't parse open slots content", {
				courseName,
				field: "openSlots",
			});

			slotsString = slotsString.trim();

			if (!(slotsString in slotsMap)) {
				throw new ParseError(`Unexpected slots format: ${slotsString}`, {
				  courseName,
				  field: "openSlots",
				});
			  }

			const openSlots = slotsMap[slotsString as keyof typeof slotsMap];

			const price = await bookingPanel.$$eval(
				"p.MuiTypography-root.MuiTypography-body1",
				(elements) => {
					for (const el of elements) {
						if (el.textContent?.includes("$")) {
							return parseFloat(el.textContent.replace(/[$,]/g, ""));
						}
					}
					return null;
				}
			);

			if (!price) throw new ParseError("Couldn't parse price", {
				courseName,
				field: "price",
			  });

			teeTimes.push({
				date: time,
				courseName,
				openSlots,
				price,
				bookingLink: u.toString(),
			});
		}
		return teeTimes;
	} finally {
		await browser.close();
	}
}
