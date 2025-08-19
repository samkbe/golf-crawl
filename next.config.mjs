/** @type {import('next').NextConfig} */
const nextConfig = {
	serverExternalPackages: [
		'puppeteer',
		'puppeteer-extra',
		'puppeteer-extra-plugin-stealth',
		'puppeteer-extra-plugin-user-preferences',
		'puppeteer-extra-plugin-user-data-dir',
	  ],
	  webpack: (config, { isServer }) => {
		if (isServer) {
		  const externals = Array.isArray(config.externals) ? config.externals : [];
		  config.externals = [
			...externals,
			({ request }, cb) => {
			  if (
				request &&
				(request.startsWith('puppeteer-extra-plugin-stealth') ||
				 request.startsWith('puppeteer-extra-plugin-user-preferences') ||
				 request.startsWith('puppeteer-extra-plugin-user-data-dir'))
			  ) {
				return cb(null, 'commonjs ' + request); // load via Node at runtime
			  }
			  cb();
			},
		  ];
		}
		return config;
	  },
};

export default nextConfig;
