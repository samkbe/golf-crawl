/** @type {import('next').NextConfig} */
const nextConfig = {
	serverExternalPackages: ["puppeteer", "puppeteer-extra", "puppeteer-extra-plugin-stealth"],
	outputFileTracingIncludes: {
		"/": ["node_modules/puppeteer-extra-plugin-stealth/**"],
		// add more if other pages also call scrapers, e.g.:
		// '/courses': ['node_modules/puppeteer-extra-plugin-stealth/**'],
	},
};

export default nextConfig;
