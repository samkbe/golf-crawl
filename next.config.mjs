/** @type {import('next').NextConfig} */
const nextConfig = {
	serverExternalPackages: ["puppeteer", "puppeteer-extra", "puppeteer-extra-plugin-stealth"],

	// 👇 force-copy the plugin folder into specific server functions
	outputFileTracingIncludes: {
		// If your scraper runs in an API route:
		"/api/scrape": ["node_modules/puppeteer-extra-plugin-stealth/**"],

		// If you run it inside a page/server action instead, point to that segment's file:
		// e.g. '/(app)/page': ['node_modules/puppeteer-extra-plugin-stealth/**']
		//      '/courses/page': ['node_modules/puppeteer-extra-plugin-stealth/**']
	},
};

export default nextConfig;
