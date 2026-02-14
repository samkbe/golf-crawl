import "server-only";
import type { TeeTime } from "../../types";
import { cache } from "../../cache";
import { toMmDdYyyy } from "../helpers";
import { launchBrowser } from "../browser";
import { ParseError, ScrapeError } from "@/app/errors";
import { captureError } from "@/app/lib/logger";

const courseKeyMap: { [key: string]: string } = {
	"Jimmy Clay Golf Course": "jimmyClay",
	"Morris Williams Golf Course": "morrisWilliams",
	"Roy Kizer Golf Course": "royKizer",
	"Lions Municipal Golf Course": "lions",
};

export async function scrapeGolfAtx(targetDate: string) {
	const browser = await launchBrowser();
	try {
		const page = await browser.newPage();

		// Step 1: Go to the main page to retrieve the CSRF token
		await page.goto(
			"https://txaustinweb.myvscloud.com/webtrac/web/search.html?display=detail&module=GR&secondarycode=1"
		);

		// Extract the CSRF token using Puppeteer's built-in methods
		const csrfTokenElement = await page.$('input[name="_csrf_token"]');
		const csrfToken = csrfTokenElement
			? await csrfTokenElement.evaluate((el) => (el as HTMLInputElement).value)
			: null;

		if (!csrfToken) {
			throw new ParseError(
				"CSRF token not found — Golf ATX page structure may have changed",
				{
					courseName: "Golf ATX",
					field: "csrfToken",
				}
			);
		}

		const bookingUrl = new URL("https://txaustinweb.myvscloud.com/webtrac/web/search.html");
		bookingUrl.search = new URLSearchParams({
			Action: "Start",
			begindate: toMmDdYyyy(targetDate),
			begintime: "07:00 am",
			numberofplayers: "1",
			numberofholes: "18",
			_csrf_token: csrfToken,
			module: "GR",
		}).toString();

		// Step 3: Navigate to the booking page URL
		await page.goto(bookingUrl.toString());

		// Step 4: Select and process elements directly

		const teeTimes: TeeTime[] = [];

		const totalPages = (
			await page.$$(`[data-click-set-value]:not([data-icon-secondary='ui-icon-seek-end'])`)
		).length;

		let hasNextPage = totalPages > 0;
		let pageNumber = 1;

		do {
			if (pageNumber >= totalPages) {
				hasNextPage = false;
			}

			const courseElements = await page.$$(".result-content");

			for (const courseElement of courseElements) {
				// Get course name
				const courseName = await courseElement.$eval(
					"h2 span",
					(el) => el.textContent?.trim() || ""
				);

				if (!courseName) {
					throw new ParseError("Couldn't extract course name from result element", {
						courseName: "Golf ATX",
						field: "courseName",
					});
				}

				const courseKey = courseKeyMap[courseName];

				if (!courseKey) {
					throw new ParseError(`Unknown Golf ATX course name: "${courseName}"`, {
						courseName: "Golf ATX",
						field: "courseKey",
					});
				}

				// Get each tee time row
				const teeTimeRows = await courseElement.$$("tbody tr");

				for (const row of teeTimeRows) {
					// Extract each cell's data for the tee time
					let day = await row.$eval('td[data-title="Date"]', (el) => el.textContent);
					if (!day)
						throw new ParseError("Couldn't scrape date value", {
							courseName,
							field: "date",
						});
					day = day.trim();

					let time = await row.$eval('td[data-title="Time"]', (el) => el.textContent);
					if (!time)
						throw new ParseError("Couldn't scrape time value", {
							courseName,
							field: "time",
						});
					time = time.trim();

					const date = new Date(`${day} ${time}`);

					if (isNaN(date.getTime())) {
						throw new ParseError(`Couldn't parse date/time: "${day} ${time}"`, {
							courseName,
							field: "date",
						});
					}

					const openSlots = await row.$eval(
						'td[data-title="Open Slots"]',
						(el) => el.textContent?.trim() || ""
					);

					teeTimes.push({
						date,
						openSlots,
						courseName,
						golfAtxKey: courseKey,
						price: 60,
					});
				}
			}

			if (hasNextPage) {
				pageNumber += 1;
				await new Promise((r) => setTimeout(r, 2000)); // 1 second delay
				await page.goto(bookingUrl + `&page=${pageNumber}`);
				try {
					await page.waitForSelector(".result-content", { timeout: 10000 });
				} catch (error) {
					throw new ParseError(`Results not found on page ${pageNumber} of Golf ATX`, {
						courseName: "Golf ATX",
						field: "pagination",
						cause: error,
					});
				}
			}
		} while (hasNextPage);
		return teeTimes;
	} finally {
		await browser.close();
	}
}

export async function golfAtxResults(targetDate: string, key?: string) {
	const cacheKey = `${targetDate}::golfAtx`;
	const cached = cache.get(cacheKey) as TeeTime[] | undefined;

	if (cached) {
		return cached.filter((item) => item.golfAtxKey === key);
	}

	try {
		const result = await scrapeGolfAtx(targetDate);
		cache.set(cacheKey, result);
		return result.filter((item) => item.golfAtxKey === key);
	} catch (error) {
		const wrapped = new ScrapeError("Failed to scrape Golf ATX", {
			courseName: "Golf ATX",
			scrapeDate: targetDate,
			scraperType: "golfatx",
			cause: error,
		});
		captureError(wrapped);
		throw wrapped;
	}
}
