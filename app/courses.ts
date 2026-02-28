import type { TeeTime } from "@/app/types";
import { scrapeCrystalFalls } from "@/app/scrape/courses/crystal-falls";
import { scrapeShadowGlen } from "@/app/scrape/courses/shadow-glen";
import { scrapeHarveyPenick } from "@/app/scrape/courses/harvey-penick";
import { scrapeFalconhead } from "@/app/scrape/courses/falconhead";
import { scrapeAveryRanch } from "@/app/scrape/courses/avery-ranch";
import { scrapeTeravista } from "@/app/scrape/courses/teravista";
import { scrapeRiverside } from "@/app/scrape/courses/riverside";
import { scrapeColovista } from "@/app/scrape/courses/colovista";
import { scrapeForestCreek } from "@/app/scrape/courses/forest-creek";
import { golfAtxResults } from "@/app/scrape/courses/golf-atx";
import { scrapeStarRanch } from "./scrape/courses/star-ranch";
import { scrapeDoubleJRanch } from "./scrape/courses/double-j-ranch";
import { scrapeKissingTree } from "./scrape/courses/kissing-tree";
import { scrapeGreyRock } from "./scrape/courses/grey-rock";
import { scrapeLostPines } from "./scrape/courses/lost-pines";
import { scrapePlumCreek } from "./scrape/courses/plum-creek";
import type { Platform } from "./types";
import type { Browser } from "puppeteer";

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
	{ title: "Colovista", key: "colovista", platform: "foreup", fetchFunction: scrapeColovista },
	{ title: "Forest Creek", key: "forestCreek", platform: "chronogolf", fetchFunction: scrapeForestCreek },
	{ title: "Lions", key: "lions", platform: "golfatx", fetchFunction: golfAtxResults },
	{ title: "Jimmy Clay", key: "jimmyClay", platform: "golfatx", fetchFunction: golfAtxResults },
	{ title: "Roy Kizer", key: "royKizer", platform: "golfatx", fetchFunction: golfAtxResults },
	{ title: "Morris Williams", key: "morrisWilliams", platform: "golfatx", fetchFunction: golfAtxResults },
	{ title: "Star Ranch", key: "starRanch", platform: "ezlinks", fetchFunction: scrapeStarRanch },
	{ title: "Double J Ranch", key: "doubleJRanch", platform: "clubprophet", fetchFunction: scrapeDoubleJRanch },
	{ title: "Kissing Tree", key: "kissingTree", platform: "golfwithaccess", fetchFunction: scrapeKissingTree },
	{ title: "Grey Rock", key: "greyRock", platform: "ezlinks", fetchFunction: scrapeGreyRock },
	{ title: "Lost Pines", key: "lostPines", platform: "ezlinks", fetchFunction: scrapeLostPines },
	{ title: "Plum Creek", key: "plumCreek", platform: "clubprophet", fetchFunction: scrapePlumCreek },
];
