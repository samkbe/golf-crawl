import "server-only";
import type { TeeTime } from "@/app/types";
import type { ElementHandle, Browser } from "puppeteer";
import { mergeDateWithTimeAlt, toMmDdYyyyDash } from "@/app/scrape/helpers";
import { captureMessage } from "@/app/lib/logger";
import { ParseError } from "@/app/errors";

const RESULTS_SEL = ".time-tile, .time-tile-ob-no-details";
const DATE_INPUT = "input[name='date']";
const TIMES_PATH = "/index.php/api/booking/times";

export default async function scrapeForeUp(
	date: string,
	url: string,
	courseName: string,
	browser: Browser,
	bookingLink?: string
) {
	// READ: url must not contain any url params
	// Example: https://foreupsoftware.com/index.php/booking/22221/10177#/teetimes`

	const page = await browser.newPage();
	try {
		await page.goto(url, { waitUntil: "domcontentloaded" });

		// Click "Public" if present
		await page
			.waitForSelector(".online-booking-content button.btn.btn-primary", { timeout: 10000 })
			.catch(() => {
				captureMessage(
					`Public button not found for ${courseName}`,
					{
						courseName,
						scrapeDate: date,
					},
					"info"
				);
			});
		for (const btn of await page.$$(".online-booking-content button.btn.btn-primary")) {
			const text = await page.evaluate((el) => el.textContent?.trim().toLowerCase(), btn);
			if (text === "public") {
				await btn.click();
				break;
			}
		}

		const mmddyyyy = toMmDdYyyyDash(date);

		try {
			await page.waitForSelector(DATE_INPUT, { visible: true, timeout: 10000 });
		} catch (error) {
			throw new ParseError("Date input not found — page structure may have changed", {
				courseName,
				field: "dateInput",
				cause: error,
			});
		}

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

		try {
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
		} catch (error) {
			throw new ParseError("Tee times API response not received after date change", {
				courseName,
				field: "apiResponse",
				cause: error,
			});
		}

		try {
			await page.waitForSelector(RESULTS_SEL, { timeout: 20000 });
		} catch (error) {
			throw new ParseError("Tee time result tiles not rendered after API response", {
				courseName,
				field: "resultTiles",
				cause: error,
			});
		}

		// ---- Parse either layout (use your existing parsers) ----
		let teeTimes: TeeTime[] = [];
		const oldPanels = await page.$$(".time-tile");
		if (oldPanels.length > 0) {
			teeTimes = await parseForeUpTiles(oldPanels, date, courseName, bookingLink);
		} else {
			const newPanels = await page.$$(".time-tile-ob-no-details");
			if (newPanels.length === 0) {
				throw new ParseError("No tee time elements found after date change", {
					courseName,
					field: "resultTiles",
				});
			}
			teeTimes = await parseForeUpRows(newPanels, date, courseName, bookingLink);
		}
		return teeTimes;
	} finally {
		await page.close();
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
		if (!timeString)
			throw new ParseError("Couldn't parse time text content", {
				courseName,
				field: "time",
			});

		timeString = timeString.trim();

		const time = mergeDateWithTimeAlt(date, timeString);

		let slotsString = await bookingPanel.$eval(
			".booking-slot-players > span",
			(el) => el.textContent
		);

		if (!slotsString)
			throw new ParseError("Couldn't parse open slots content", {
				courseName,
				field: "openSlots",
			});

		slotsString = slotsString.trim();

		if (!slotsString)
			throw new ParseError("Couldn't parse number of open slots", {
				courseName,
				field: "openSlots",
			});

		let priceStr = await bookingPanel.$eval(".js-booking-green-fee", (el) => el.textContent);

		if (!priceStr)
			throw new ParseError("Couldn't parse price", {
				courseName,
				field: "price",
			});

		priceStr = priceStr?.trim();

		const price = parseFloat(priceStr.replace(/[$,]/g, ""));
		if (isNaN(price))
			throw new ParseError(`Couldn't parse price value from: "${priceStr}"`, {
				courseName,
				field: "price",
			});

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
		if (!timeString)
			throw new ParseError("Couldn't parse time text content", {
				courseName,
				field: "time",
			});

		timeString = timeString.trim();

		const time = mergeDateWithTimeAlt(date, timeString);

		let slotsString = await bookingPanel.$eval(
			".time-summary-ob-player-count",
			(el) => el.textContent?.split("Players")[0]
		);

		if (!slotsString)
			throw new ParseError("Couldn't parse open slots content", {
				courseName,
				field: "openSlots",
			});

		slotsString = slotsString.trim();

		if (!slotsString)
			throw new ParseError("Couldn't parse number of open slots", {
				courseName,
				field: "openSlots",
			});

		let priceStr = await bookingPanel.$eval(".js-booking-green-fee", (el) => el.textContent);
		if (!priceStr)
			throw new ParseError("Couldn't parse price", {
				courseName,
				field: "price",
			});

		priceStr = priceStr?.trim();

		const price = parseFloat(priceStr.replace(/[$,]/g, ""));
		if (isNaN(price))
			throw new ParseError(`Couldn't parse price value from: "${priceStr}"`, {
				courseName,
				field: "price",
			});

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
