export async function GET() {
	try {
		const r: NodeRequire = eval("require");
		const p = r.resolve("puppeteer-extra-plugin-stealth/evasions/chrome.app");
		return new Response(`ok: ${p}`); // should be a filesystem path like /var/task/node_modules/...
	} catch (e: any) {
		return new Response(`fail: ${e?.message}`, { status: 500 });
	}
}
