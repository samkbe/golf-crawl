import { scrapeCrystalFalls } from "./scrape/crystal-falls";
import { scrapeShadowGlen } from "./scrape/shadow-glen";

export const courses = [
    { title: "Crystal Falls", key: "crystalFalls", fetchFunction: scrapeCrystalFalls },
    { title: "Shadowglen", key: "shadowGlen", fetchFunction: scrapeShadowGlen },
];