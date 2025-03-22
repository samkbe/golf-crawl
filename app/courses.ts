import { scrapeCrystalFalls } from "./scrape/crystal-falls";
import { scrapeShadowGlen } from "./scrape/shadow-glen";
import { scrapeHarveyPenick } from "./scrape/harvey-penick";

export const courses = [
    { title: "Crystal Falls", key: "crystalFalls", fetchFunction: scrapeCrystalFalls },
    { title: "Shadowglen", key: "shadowGlen", fetchFunction: scrapeShadowGlen },
    { title: "Harvey Penick", key: "harveyPenick", fetchFunction: scrapeHarveyPenick }
];