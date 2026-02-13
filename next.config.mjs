/** @type {import('next').NextConfig} */
const nextConfig = {
	serverExternalPackages: [
	  "puppeteer",
	  "puppeteer-extra",
	  "puppeteer-extra-plugin",
	  "puppeteer-extra-plugin-stealth",
	  "puppeteer-extra-plugin-user-preferences",
	  "puppeteer-extra-plugin-user-data-dir",
	  "fs-extra",
	],
	// outputFileTracingIncludes: {
	// 	"/": [
	// 	  "./node_modules/puppeteer-extra/**",
	// 	  "./node_modules/puppeteer-extra-plugin/**",
	// 	  "./node_modules/puppeteer-extra-plugin-stealth/**",
	// 	  "./node_modules/puppeteer-extra-plugin-user-preferences/**",
	// 	  "./node_modules/puppeteer-extra-plugin-user-data-dir/**",
	// 	  "./node_modules/fs-extra/**",
	// 	  "./node_modules/universalify/**",
	// 	  "./node_modules/graceful-fs/**",
	// 	  "./node_modules/jsonfile/**",
	// 	],
	//   },
	outputFileTracingIncludes: {
		"/": [
		  "./node_modules/**",
		],
	  },
  };
  
  export default nextConfig;