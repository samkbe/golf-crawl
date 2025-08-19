/** @type {import('next').NextConfig} */
const nextConfig = {
	serverExternalPackages: ["puppeteer", "puppeteer-extra", "puppeteer-extra-plugin-stealth", "puppeteer-extra-plugin-user-preferences"],
};

export default nextConfig;
