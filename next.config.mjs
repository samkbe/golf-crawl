/** @type {import('next').NextConfig} */
const nextConfig = {
	serverExternalPackages: ["puppeteer", "puppeteer-extra", "puppeteer-extra-plugin-stealth"],

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
