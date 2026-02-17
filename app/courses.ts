import type { TeeTime } from "@/app/types";
import { scrapeCrystalFalls } from "@/app/scrape/courses/crystal-falls";
import { scrapeShadowGlen } from "@/app/scrape/courses/shadow-glen";
import { scrapeHarveyPenick } from "@/app/scrape/courses/harvey-penick";
import { scrapeFalconhead } from "@/app/scrape/courses/falconhead";
import { scrapeAveryRanch } from "@/app/scrape/courses/avery-ranch";
import { scrapeTeravista } from "@/app/scrape/courses/teravista";
import { golfAtxResults } from "@/app/scrape/courses/golf-atx";
import type { Browser } from "puppeteer";

type course = {
	key: string;
	title: string;
	fetchFunction: (date: string, browser: Browser, golfAtxcourse?: string) => Promise<TeeTime[] | undefined>;
	golfAtxCourse?: boolean;
};

export const courses: course[] = [
	{ title: "Crystal Falls", key: "crystalFalls", fetchFunction: scrapeCrystalFalls },
	{ title: "Shadowglen", key: "shadowGlen", fetchFunction: scrapeShadowGlen },
	{ title: "Harvey Penick", key: "harveyPenick", fetchFunction: scrapeHarveyPenick },
	{ title: "Falconhead", key: "falconhead", fetchFunction: scrapeFalconhead },
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
