import type { TeeTime } from "./types";
import { scrapeCrystalFalls } from "./scrape/crystal-falls";
import { scrapeShadowGlen } from "./scrape/shadow-glen";
import { scrapeHarveyPenick } from "./scrape/harvey-penick";
import { scrapeFalconhead } from "./scrape/falconhead";
import { scrapeRiverside } from "./scrape/riverside";
import { scrapeAveryRanch } from "./scrape/avery-ranch";
import { scrapeTeravista } from "./scrape/teravista";
import { golfAtxResults } from "./scrape/golf-atx";

type course = {
	key: string;
	title: string;
	fetchFunction: (date: Date, golfAtxcourse?: string) => Promise<TeeTime[] | undefined>;
	golfAtxCourse?: boolean;
};

export const courses: course[] = [
	{ title: "Crystal Falls", key: "crystalFalls", fetchFunction: scrapeCrystalFalls },
	{ title: "Shadowglen", key: "shadowGlen", fetchFunction: scrapeShadowGlen },
	{ title: "Harvey Penick", key: "harveyPenick", fetchFunction: scrapeHarveyPenick },
	{ title: "Falconhead", key: "falconhead", fetchFunction: scrapeFalconhead },
	{ title: "Riverside", key: "riverside", fetchFunction: scrapeRiverside },
	{ title: "Avery Ranch", key: "averyRanch", fetchFunction: scrapeAveryRanch },
	{ title: "Teravista", key: "teravista", fetchFunction: scrapeTeravista },
	{ title: "Lions", key: "lions", golfAtxCourse: true, fetchFunction: golfAtxResults },
	{ title: "Jimmy Clay", key: "jimmyClay", golfAtxCourse: true, fetchFunction: golfAtxResults },
	{ title: "Roy Kizer", key: "royKizer", golfAtxCourse: true, fetchFunction: golfAtxResults },
	{
		title: "Morris Williams",
		key: "morrisWilliams",
		golfAtxCourse: true,
		fetchFunction: golfAtxResults,
	},
];
