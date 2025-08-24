import "server-only";
import type { TeeTime } from "../types";
import { mergeDateWithTime } from "./helpers";

import "puppeteer-extra-plugin-stealth/evasions/chrome.app";
import "puppeteer-extra-plugin-stealth/evasions/chrome.csi";
import "puppeteer-extra-plugin-stealth/evasions/chrome.loadTimes";
import "puppeteer-extra-plugin-stealth/evasions/chrome.runtime";
import "puppeteer-extra-plugin-stealth/evasions/iframe.contentWindow";
import "puppeteer-extra-plugin-stealth/evasions/media.codecs";
import "puppeteer-extra-plugin-stealth/evasions/navigator.hardwareConcurrency";
import "puppeteer-extra-plugin-stealth/evasions/navigator.languages";
import "puppeteer-extra-plugin-stealth/evasions/navigator.permissions";
import "puppeteer-extra-plugin-stealth/evasions/navigator.plugins";
import "puppeteer-extra-plugin-stealth/evasions/navigator.vendor";
import "puppeteer-extra-plugin-stealth/evasions/navigator.webdriver";
import "puppeteer-extra-plugin-stealth/evasions/sourceurl";
import "puppeteer-extra-plugin-stealth/evasions/user-agent-override";
import "puppeteer-extra-plugin-stealth/evasions/webgl.vendor";
import "puppeteer-extra-plugin-stealth/evasions/window.outerdimensions";
import "puppeteer-extra-plugin-stealth/evasions/defaultArgs";

export default async function scrapeTeeItUp(date: string, url: string, courseName: string) {
	// READ: url must not contain any url params besides 'course'
	// Example: https://crystal-falls-golf-club-2.book.teeitup.com/?course=5741`

	// Dynamic imports to avoid module loading timing issues
	// const puppeteer = (await import("puppeteer-extra")).default;
	// const StealthPlugin = (await import("puppeteer-extra-plugin-stealth")).default;
	// puppeteer.use(StealthPlugin());

	const { default: puppeteer } = await import("puppeteer-extra");
	const { default: stealthFactory } = await import("puppeteer-extra-plugin-stealth");
	puppeteer.use(stealthFactory());

	// ⬇️ Use Node require at runtime for the two problem plugins
	const r: NodeJS.Require = eval("require");

	type PluginFactory = (
		opts?: Record<string, unknown>
	) => import("puppeteer-extra-plugin").PuppeteerExtraPlugin;

	// user-preferences
	const prefMod = r("puppeteer-extra-plugin-user-preferences") as
		| { default: PluginFactory }
		| PluginFactory;
	const PrefPlugin: PluginFactory = typeof prefMod === "function" ? prefMod : prefMod.default;

	// user-data-dir
	const dirMod = r("puppeteer-extra-plugin-user-data-dir") as
		| { default: PluginFactory }
		| PluginFactory;
	const DirPlugin: PluginFactory = typeof dirMod === "function" ? dirMod : dirMod.default;

	puppeteer.use(PrefPlugin());
	puppeteer.use(DirPlugin());

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
