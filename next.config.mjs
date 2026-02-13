/** @type {import('next').NextConfig} */
const nextConfig = {
	serverExternalPackages: [
		"puppeteer",
		"puppeteer-extra",
		"puppeteer-extra-plugin-stealth",
		"puppeteer-extra-plugin-user-preferences",
		"puppeteer-extra-plugin-user-data-dir",
		"fs-extra",
	],
	outputFileTracingIncludes: {
		"/app/page": [
			"node_modules/puppeteer-extra-plugin-stealth/**",
			"node_modules/puppeteer-extra-plugin-user-preferences/**",
			"node_modules/puppeteer-extra-plugin-user-data-dir/**",
			"node_modules/fs-extra/**",
		],
	},
	webpack: (config, { isServer }) => {
		if (isServer) {
			const externals = Array.isArray(config.externals) ? config.externals : [];
			config.externals = [
				...externals,
				({ request }, cb) => {
					if (
						request &&
						(request.startsWith("puppeteer-extra-plugin-stealth") ||
							request.startsWith("puppeteer-extra-plugin-user-preferences") ||
							request.startsWith("puppeteer-extra-plugin-user-data-dir") ||
							request === "fs-extra")
					)
						return cb(null, "commonjs " + request);
					cb();
				},
			];
		}
		return config;
	},
};

export default nextConfig;
