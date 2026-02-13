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
	  "@sparticuz/chromium",
	],
	outputFileTracingIncludes: {
	  "/": [
		// Core puppeteer-extra ecosystem
		"./node_modules/puppeteer-extra/**",
		"./node_modules/puppeteer-extra-plugin/**",
		"./node_modules/puppeteer-extra-plugin-stealth/**",
		"./node_modules/puppeteer-extra-plugin-user-preferences/**",
		"./node_modules/puppeteer-extra-plugin-user-data-dir/**",
		// fs-extra (top-level + nested in user-data-dir)
		"./node_modules/fs-extra/**",
		"./node_modules/universalify/**",
		"./node_modules/graceful-fs/**",
		"./node_modules/jsonfile/**",
		// rimraf + its nested glob v7
		"./node_modules/rimraf/**",
		// glob v7 deps (resolved from top-level node_modules)
		"./node_modules/fs.realpath/**",
		"./node_modules/inflight/**",
		"./node_modules/inherits/**",
		"./node_modules/minimatch/**",
		"./node_modules/brace-expansion/**",
		"./node_modules/balanced-match/**",
		"./node_modules/concat-map/**",
		"./node_modules/once/**",
		"./node_modules/wrappy/**",
		"./node_modules/path-is-absolute/**",
		// debug (used by multiple plugins)
		"./node_modules/debug/**",
		"./node_modules/ms/**",
		// deepmerge (used by puppeteer-extra & user-preferences)
		"./node_modules/deepmerge/**",
		// merge-deep (used by puppeteer-extra-plugin)
		"./node_modules/merge-deep/**",
		"./node_modules/arr-union/**",
		"./node_modules/clone-deep/**",
		"./node_modules/kind-of/**",
		"./node_modules/is-buffer/**",
		"./node_modules/for-own/**",
		"./node_modules/for-in/**",
		"./node_modules/is-plain-object/**",
		"./node_modules/isobject/**",
		"./node_modules/lazy-cache/**",
		"./node_modules/shallow-clone/**",
		"./node_modules/is-extendable/**",
		"./node_modules/mixin-object/**",
		"./node_modules/@sparticuz/chromium/**",
	  ],
	},
  };
  
  export default nextConfig;