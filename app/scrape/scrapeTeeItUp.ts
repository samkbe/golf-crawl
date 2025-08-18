import type { TeeTime } from "../types";
import { mergeDateWithTime } from "./helpers";
import type { PuppeteerExtraPlugin } from "puppeteer-extra-plugin";

export default async function scrapeTeeItUp(date: string, url: string, courseName: string) {
	// READ: url must not contain any url params besides 'course'
	// Example: https://crystal-falls-golf-club-2.book.teeitup.com/?course=5741`

	const { default: puppeteer } = await import("puppeteer-extra");
	const r: NodeRequire = eval("require");
	const mod = r("puppeteer-extra-plugin-stealth");
	const stealthFactory = (mod.default ?? mod) as (
		opts?: Record<string, unknown>
	) => PuppeteerExtraPlugin;

	puppeteer.use(stealthFactory());

	try {
		const browser = await puppeteer.launch({ headless: true });
		const page = await browser.newPage();

		const u = new URL(url);
		u.searchParams.set("date", date);
		u.searchParams.set("max", "9999");

		await page.goto(u.toString());

		const bookingPanelSelector =
			'div[role="group"]:has(> div button[data-testid="teetimes_book_now_button"], > div button[data-testid="teetimes_choose_rate_button"])';

		await page.waitForSelector(bookingPanelSelector);

		const bookingPanels = await page.$$(bookingPanelSelector);

		const teeTimes: TeeTime[] = [];

		for (const bookingPanel of bookingPanels) {
			let timeString = await bookingPanel.$eval(
				"[data-testid='teetimes-tile-time']",
				(el) => el.textContent
			);
			if (!timeString) throw new Error("Couldn't parse time text content");

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

			if (!slotsString) throw new Error("Couldn't parse open slots content");

			slotsString = slotsString.trim();

			if (!(slotsString in slotsMap)) {
				throw new Error(`Invalid slots string: ${slotsString}`);
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

			if (!price) throw new Error("Couldn't parse price");

			teeTimes.push({
				date: time,
				courseName,
				openSlots,
				price,
				bookingLink: u.toString(),
			});
		}

		await browser.close();
		return teeTimes;
	} catch (e) {
		console.log(e);
		throw new Error("Failed");
	}
}
