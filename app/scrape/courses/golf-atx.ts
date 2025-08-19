import type { TeeTime } from "../../types";
import { cache } from "../../cache";
import { toMmDdYyyy } from "../helpers";
import type { PuppeteerExtraPlugin } from "puppeteer-extra-plugin";

const courseKeyMap: { [key: string]: string } = {
	"Jimmy Clay Golf Course": "jimmyClay",
	"Morris Williams Golf Course": "morrisWilliams",
	"Roy Kizer Golf Course": "royKizer",
	"Lions Municipal Golf Course": "lions",
};

export async function scrapeGolfAtx(targetDate: string) {
	const { default: puppeteer } = await import("puppeteer-extra");
	// ⬇️ Load the plugin via Node's require (not ESM import)
	const r: NodeRequire = eval("require");
	const mod = r("puppeteer-extra-plugin-stealth") as
		| { default: (opts?: Record<string, unknown>) => PuppeteerExtraPlugin }
		| ((opts?: Record<string, unknown>) => PuppeteerExtraPlugin);

	const stealthFactory = (typeof mod === "function" ? mod : mod.default) as (
		opts?: Record<string, unknown>
	) => PuppeteerExtraPlugin;

	puppeteer.use(stealthFactory());

	try {
		const browser = await puppeteer.launch({ headless: true });
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
			console.error("CSRF token not found!");
			await browser.close();
			return;
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
				const courseKey = courseKeyMap[courseName];

				// Get each tee time row
				const teeTimeRows = await courseElement.$$("tbody tr");

				for (const row of teeTimeRows) {
					// Extract each cell's data for the tee time
					let day = await row.$eval('td[data-title="Date"]', (el) => el.textContent);
					if (!day) throw new Error("Couldn't scrape date value");
					day = day.trim();

					let time = await row.$eval('td[data-title="Time"]', (el) => el.textContent);
					if (!time) throw new Error("Couldn't scrape time value");
					time = time.trim();

					const date = new Date(`${day} ${time}`);

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
				await page.waitForSelector(".result-content", { timeout: 10000 });
			}
		} while (hasNextPage);

		// Close the browser
		await browser.close();

		return teeTimes;
	} catch (e) {
		console.log(e);
		throw new Error("Failed");
	}
}

export async function golfAtxResults(targetDate: string, key?: string) {
	const cacheKey = `${targetDate}::golfAtx`;
	const cached = cache.get(cacheKey) as TeeTime[] | undefined;

	if (cached) {
		return cached.filter((item) => item.golfAtxKey === key);
	}

	const result = await scrapeGolfAtx(targetDate);

	cache.set(cacheKey, result);

	if (result) return result.filter((item) => item.golfAtxKey === key);

	return undefined;
}
