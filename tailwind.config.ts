import type { Config } from "tailwindcss";

const config: Config = {
	content: [
		"./pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./components/**/*.{js,ts,jsx,tsx,mdx}",
		"./app/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			colors: {
				background: "var(--background)",
				foreground: "var(--foreground)",
			},
			keyframes: {
				pulseScale: {
					"0%, 100%": { opacity: "1", transform: "scale(1)" },
					"50%": { opacity: "0.8", transform: "scale(1.01)" },
				},
			},
			animation: {
				"pulse-scale": "pulseScale 1.5s ease-in-out infinite",
			},
		},
	},
	plugins: [],
};
export default config;
