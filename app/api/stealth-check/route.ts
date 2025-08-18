export async function GET() {
	try {
		const r: NodeRequire = eval("require");
		const p = r.resolve("puppeteer-extra-plugin-stealth/evasions/chrome.app");
		return new Response(`ok: ${p}`); // should be a filesystem path like /var/task/node_modules/...
	} catch (e) {
		return new Response(`fail: ${JSON.stringify(e)}`, { status: 500 });
	}
}
