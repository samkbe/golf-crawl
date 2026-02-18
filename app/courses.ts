import type { TeeTime } from "@/app/types";
import { scrapeCrystalFalls } from "@/app/scrape/courses/crystal-falls";
import { scrapeShadowGlen } from "@/app/scrape/courses/shadow-glen";
import { scrapeHarveyPenick } from "@/app/scrape/courses/harvey-penick";
import { scrapeFalconhead } from "@/app/scrape/courses/falconhead";
import { scrapeAveryRanch } from "@/app/scrape/courses/avery-ranch";
import { scrapeTeravista } from "@/app/scrape/courses/teravista";
import { scrapeRiverside } from "@/app/scrape/courses/riverside";
import { golfAtxResults } from "@/app/scrape/courses/golf-atx";
import type { Browser } from "puppeteer";

export type Platform = "teeitup" | "foreup" | "golfatx";

type course = {
	key: string;
	title: string;
	platform: Platform;
	fetchFunction: (date: string, browser: Browser, golfAtxcourse?: string) => Promise<TeeTime[] | undefined>;
};

export const courses: course[] = [
	{ title: "Crystal Falls", key: "crystalFalls", platform: "teeitup", fetchFunction: scrapeCrystalFalls },
	{ title: "Shadowglen", key: "shadowGlen", platform: "teeitup", fetchFunction: scrapeShadowGlen },
	{ title: "Harvey Penick", key: "harveyPenick", platform: "teeitup", fetchFunction: scrapeHarveyPenick },
	{ title: "Falconhead", key: "falconhead", platform: "foreup", fetchFunction: scrapeFalconhead },
	{ title: "Avery Ranch", key: "averyRanch", platform: "foreup", fetchFunction: scrapeAveryRanch },
	{ title: "Teravista", key: "teravista", platform: "foreup", fetchFunction: scrapeTeravista },
	{ title: "Riverside", key: "riverside", platform: "foreup", fetchFunction: scrapeRiverside },
	{ title: "Lions", key: "lions", platform: "golfatx", fetchFunction: golfAtxResults },
	{ title: "Jimmy Clay", key: "jimmyClay", platform: "golfatx", fetchFunction: golfAtxResults },
	{ title: "Roy Kizer", key: "royKizer", platform: "golfatx", fetchFunction: golfAtxResults },
	{ title: "Morris Williams", key: "morrisWilliams", platform: "golfatx", fetchFunction: golfAtxResults },
];
