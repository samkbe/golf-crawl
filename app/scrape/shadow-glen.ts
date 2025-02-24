import { scrapeTeeItUp } from "./helpers";

export async function scrapeShadowGlen(date: Date) {
    try {
        return await scrapeTeeItUp(date, "https://shadowglen-golf-club.book.teeitup.com/?course=591", "Shadowglen");
    } catch(e) {
        console.log(e);
        throw new Error("Failed");
    }
}