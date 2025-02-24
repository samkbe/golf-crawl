import { scrapeCrystalFalls } from "./scrape/crystal-falls";

export const courses = [
    { title: "Crystal Falls", key: "crystalFalls", fetchFunction: scrapeCrystalFalls },
    // { name: "Shadow Glen", value: "shadowGlen", fetchFunction: fetchShadowGlen },
  ];