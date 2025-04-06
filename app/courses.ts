import { scrapeCrystalFalls } from "./scrape/crystal-falls";
import { scrapeShadowGlen } from "./scrape/shadow-glen";
import { scrapeHarveyPenick } from "./scrape/harvey-penick";
import { scrapeFalconhead } from "./scrape/falconhead";
import { scrapeRiverside } from "./scrape/riverside";
import { scrapeAveryRanch } from "./scrape/avery-ranch";
import { scrapeTeravista } from "./scrape/teravista";
import { scrapeGolfAtx } from "./scrape/golf-atx";

export const courses = [
    { title: "Crystal Falls", key: "crystalFalls", fetchFunction: scrapeCrystalFalls },
    { title: "Shadowglen", key: "shadowGlen", fetchFunction: scrapeShadowGlen },
    { title: "Harvey Penick", key: "harveyPenick", fetchFunction: scrapeHarveyPenick },
    { title: "Falconhead", key: "falconhead", fetchFunction: scrapeFalconhead },
    { title: "Riverside", key: "riverside", fetchFunction: scrapeRiverside },
    { title: "Avery Ranch", key: "averyRanch", fetchFunction: scrapeAveryRanch },
    { title: "Teravista", key: "teravista", fetchFunction: scrapeTeravista },
    { title: "Golf ATX", key: "golfAtx", fetchFunction: scrapeGolfAtx }
];