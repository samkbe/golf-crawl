/** @type {import('next').NextConfig} */
const nextConfig = {
	serverExternalPackages: ["puppeteer", "puppeteer-extra", "puppeteer-extra-plugin-stealth"],

	// Copy the plugin folder into the same lambda as the root page/action.
	// If you later move scraping to an API route, change the key to '/api/scrape'.
	outputFileTracingIncludes: {
		"/": ["node_modules/puppeteer-extra-plugin-stealth/**"],
	},

	// Ensure *any* request for the plugin (or its subpaths) is loaded by Node at runtime.
	webpack: (config, { isServer }) => {
		if (isServer) {
			const externals = Array.isArray(config.externals) ? config.externals : [];
			config.externals = [
				...externals,
				({ request }, cb) => {
					if (request && request.startsWith("puppeteer-extra-plugin-stealth")) {
						return cb(null, "commonjs " + request);
					}
					cb();
				},
			];
		}
		return config;
	},
};

export default nextConfig;
