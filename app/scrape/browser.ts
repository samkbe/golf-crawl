import "server-only";
import { captureError } from "../lib/logger";
import { BrowserLaunchError } from "../errors";

export async function launchBrowser() {
	try {
		const { default: puppeteer } = await import("puppeteer-extra");
		const { default: stealthFactory } = await import("puppeteer-extra-plugin-stealth");
		puppeteer.use(stealthFactory());

		const isDev = process.env.NODE_ENV === "development";

		let executablePath: string | undefined;
		let args = ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1366,768"];

		if (!isDev) {
			const chromium = (await import("@sparticuz/chromium")).default;
			executablePath = await chromium.executablePath();
			args = [...chromium.args, "--window-size=1366,768"];
		}

		const browser = await puppeteer.launch({
			headless: true,
			executablePath,
			args,
			defaultViewport: { width: 1366, height: 768 },
		});

		return browser;
	} catch (error) {
		const wrapped = new BrowserLaunchError("Failed to launch headless browser", {
			cause: error,
		});
		captureError(wrapped);
		throw wrapped;
	}
}
