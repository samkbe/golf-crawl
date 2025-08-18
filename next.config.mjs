/** @type {import('next').NextConfig} */
const nextConfig = {
	serverComponentsExternalPackages: [
		"puppeteer",
		"puppeteer-extra",
		"puppeteer-extra-plugin-stealth",
	],
	webpack: (config, { isServer }) => {
		if (isServer) {
			// Ensure Node can resolve the full module folder at runtime
			const externals = Array.isArray(config.externals) ? config.externals : [];
			config.externals = [
				...externals,
				"puppeteer",
				"puppeteer-extra",
				"puppeteer-extra-plugin-stealth",
			];
		}
		return config;
	},
};

export default nextConfig;
