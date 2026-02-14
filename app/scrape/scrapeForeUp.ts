import "server-only";
import type { TeeTime } from "../types";
import type { ElementHandle } from "puppeteer";
import { mergeDateWithTimeAlt, toMmDdYyyyDash } from "./helpers";
import { launchBrowser } from "./browser";

const RESULTS_SEL = ".time-tile, .time-tile-ob-no-details";
const DATE_INPUT = "input[name='date']";
const TIMES_PATH = "/index.php/api/booking/times";

export default async function scrapeForeUp(
	date: string,
	url: string,
	courseName: string,
	bookingLink?: string
) {
	// READ: url must not contain any url params
	// Example: https://foreupsoftware.com/index.php/booking/22221/10177#/teetimes`
	
	const browser = await launchBrowser();
	const page = await browser.newPage();
	try {
		await page.goto(url, { waitUntil: "domcontentloaded" });

		// Click "Public" if present
		await page
			.waitForSelector(".online-booking-content button.btn.btn-primary", { timeout: 10000 })
			.catch(() => {});
		for (const btn of await page.$$(".online-booking-content button.btn.btn-primary")) {
			const text = await page.evaluate((el) => el.textContent?.trim().toLowerCase(), btn);
			if (text === "public") {
				await btn.click();
				break;
			}
		}

		const mmddyyyy = toMmDdYyyyDash(date);

		await page.waitForSelector(DATE_INPUT, { visible: true });
		await page.$eval(
			DATE_INPUT,
			(el, value) => {
				const input = el as HTMLInputElement;
				input.value = value as string;
				input.dispatchEvent(new Event("input", { bubbles: true }));
				input.dispatchEvent(new Event("change", { bubbles: true }));
			},
			mmddyyyy
		);

		// focus then press Enter while we wait for the exact XHR for that date
		await page.focus(DATE_INPUT);
		await Promise.all([
			page.keyboard.press("Enter"),
			page.waitForResponse(
				(res) => {
					if (!res.ok()) return false;
					try {
						const u = new URL(res.url());
						return (
							u.pathname.endsWith(TIMES_PATH) &&
							u.searchParams.get("date") === mmddyyyy
						);
					} catch {
						return false;
					}
				},
				{ timeout: 20000 }
			),
		]);

		// Ensure results are rendered (if you’re parsing the DOM instead of the JSON)
		await page.waitForSelector(RESULTS_SEL, { timeout: 20000 });

		// ---- Parse either layout (use your existing parsers) ----
		let teeTimes: TeeTime[] = [];
		const oldPanels = await page.$$(".time-tile");
		if (oldPanels.length > 0) {
			teeTimes = await parseForeUpTiles(oldPanels, date, courseName, bookingLink);
		} else {
			const newPanels = await page.$$(".time-tile-ob-no-details");
			if (newPanels.length === 0)
				throw new Error("No tee time elements found after date change.");
			teeTimes = await parseForeUpRows(newPanels, date, courseName, bookingLink);
		}
		return teeTimes;
	} finally {
		await browser.close();
	}
}

async function parseForeUpTiles(
	elements: ElementHandle<Element>[],
	date: string,
	courseName: string,
	bookingLink?: string
): Promise<TeeTime[]> {
	const teeTimes: TeeTime[] = [];
	for (const bookingPanel of elements) {
		let timeString = await bookingPanel.$eval(
			".booking-start-time-label",
			(el) => el.textContent
		);
		if (!timeString) throw new Error("Couldn't parse time text content");

		timeString = timeString.trim();

		const time = mergeDateWithTimeAlt(date, timeString);

		let slotsString = await bookingPanel.$eval(
			".booking-slot-players > span",
			(el) => el.textContent
		);

		if (!slotsString) throw new Error("Couldn't parse open slots content");

		slotsString = slotsString.trim();

		if (!slotsString) throw new Error(`Couldn't parse number of open slots`);

		let priceStr = await bookingPanel.$eval(".js-booking-green-fee", (el) => el.textContent);
		if (!priceStr) throw new Error(`Couldn't parse price`);

		priceStr = priceStr?.trim();

		const price = parseFloat(priceStr.replace(/[$,]/g, ""));

		teeTimes.push({
			date: time,
			openSlots: slotsString,
			courseName,
			price,
			bookingLink,
		});
	}
	return teeTimes;
}

async function parseForeUpRows(
	elements: ElementHandle<Element>[],
	date: string,
	courseName: string,
	bookingLink?: string
): Promise<TeeTime[]> {
	const teeTimes: TeeTime[] = [];
	for (const bookingPanel of elements) {
		let timeString = await bookingPanel.$eval(
			".times-booking-start-time-label",
			(el) => el.textContent
		);
		if (!timeString) throw new Error("Couldn't parse time text content");

		timeString = timeString.trim();

		const time = mergeDateWithTimeAlt(date, timeString);

		let slotsString = await bookingPanel.$eval(
			".time-summary-ob-player-count",
			(el) => el.textContent?.split("Players")[0]
		);

		if (!slotsString) throw new Error("Couldn't parse open slots content");

		slotsString = slotsString.trim();

		if (!slotsString) throw new Error(`Couldn't parse number of open slots`);

		let priceStr = await bookingPanel.$eval(".js-booking-green-fee", (el) => el.textContent);
		if (!priceStr) throw new Error(`Couldn't parse price`);

		priceStr = priceStr?.trim();

		const price = parseFloat(priceStr.replace(/[$,]/g, ""));

		teeTimes.push({
			date: time,
			openSlots: slotsString,
			courseName,
			price,
			bookingLink,
		});
	}
	return teeTimes;
}
