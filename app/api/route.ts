// import { json } from "stream/consumers";

export const runtime = "nodejs";

export async function GET() {
	try {
		// If this resolves, the plugin’s subpath files are on disk at runtime
		const path = require.resolve("puppeteer-extra-plugin-stealth/evasions/chrome.app");
		return new Response(`ok: ${path}`);
	} catch (e) {
		return new Response(`fail: ${JSON.stringify(e)}`, { status: 500 });
	}
}
