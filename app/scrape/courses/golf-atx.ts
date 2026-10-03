import "server-only";
import type { TeeTime } from "@/app/types";
import { cacheGet, cacheSet, reviveTeeTimes } from "@/app/cache";
import { toMmDdYyyy, mergeDateWithTime } from "@/app/scrape/helpers";
import { ParseError, ScrapeError } from "@/app/errors";
import { captureError } from "@/app/lib/logger";
import type { Browser } from "puppeteer";

const courseKeyMap: { [key: string]: string } = {
	"Jimmy Clay Golf Course": "jimmyClay",
	"Morris Williams Golf Course": "morrisWilliams",
	"Roy Kizer Golf Course": "royKizer",
	"Lions Municipal Golf Course": "lions",
};

const inflightRequests = new Map<string, Promise<TeeTime[]>>();

async function scrapeGolfAtx(targetDate: string, browser: Browser) {
	const page = await browser.newPage();

	try {
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
					// Each cell is prefixed with a hidden <span class="mobile-column-header"> label
					const cells: Record<string, string> = await row.$$eval("td", (tds) =>
						Object.fromEntries(
							tds.map((td) => {
								const header = td.querySelector(".mobile-column-header");
								const label = header?.textContent?.trim() ?? "";
								const value = Array.from(td.childNodes)
									.filter((node) => node !== header)
									.map((node) => node.textContent ?? "")
									.join("")
									.trim();
								return [label, value];
							})
						)
					);

					const day = cells["Date"];
					if (!day)
						throw new ParseError("Couldn't scrape date value", {
							courseName,
							field: "date",
						});

					const time = cells["Time"];
					if (!time)
						throw new ParseError("Couldn't scrape time value", {
							courseName,
							field: "time",
						});

					const [mm, dd, yyyy] = day.split("/");
					const date = mergeDateWithTime(`${yyyy}-${mm}-${dd}`, time);

					if (isNaN(date.getTime())) {
						throw new ParseError(`Couldn't parse date/time: "${day} ${time}"`, {
							courseName,
							field: "date",
						});
					}

					const openSlots = cells["Open Slots"] ?? "";

					teeTimes.push({
						date,
						openSlots,
						courseName,
						golfAtxKey: courseKey,
						price: 60,
						bookingLink: "https://txaustinweb.myvscloud.com/webtrac/web/search.html?display=detail&module=GR",
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
		await page.close();
	}
}

export async function golfAtxResults(targetDate: string, browser: Browser, key?: string) {
	const cacheKey = `${targetDate}::golfAtx`;
	const cached = await cacheGet<TeeTime[]>(cacheKey);

	if (cached) {
		return reviveTeeTimes(cached).filter((item) => item.golfAtxKey === key);
	}

	// Deduplicate concurrent requests within the same invocation
	if (!inflightRequests.has(cacheKey)) {
		const promise = scrapeGolfAtx(targetDate, browser)
			.then(async (result) => {
				await cacheSet(cacheKey, result);
				inflightRequests.delete(cacheKey);
				return result;
			})
			.catch((error) => {
				inflightRequests.delete(cacheKey);
				const wrapped = new ScrapeError("Failed to scrape Golf ATX", {
					courseName: "Golf ATX",
					scrapeDate: targetDate,
					scraperType: "golfatx",
					cause: error,
				});
				captureError(wrapped);
				throw wrapped;
			});
		inflightRequests.set(cacheKey, promise);
	}

	const result = await inflightRequests.get(cacheKey)!;
	return result.filter((item) => item.golfAtxKey === key);
}
