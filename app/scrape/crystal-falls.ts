// import puppeteer from "puppeteer";
// import type { TeeTime } from "../types";
import { scrapeTeeItUp } from "./helpers";

export async function scrapeCrystalFalls(date: Date) {
    try {
        return await scrapeTeeItUp(date, "https://crystal-falls-golf-club-2.book.teeitup.com/?course=5741", "Crystal Falls");
    } catch(e) {
        console.log(e);
        throw new Error("Failed");
    }

    // try {
    //     const browser = await puppeteer.launch({ headless: true });
    //     const page = await browser.newPage();

    //     const formattedDate = date.toISOString().split("T")[0];

    //     await page.goto(`https://crystal-falls-golf-club-2.book.teeitup.com/?course=5741&date=${formattedDate}&max=9999`);

    //     const bookingPanelSelector = 'div[role="group"]:has(> div button[data-testid="teetimes_book_now_button"], > div button[data-testid="teetimes_choose_rate_button"])';

    //     await page.waitForSelector(bookingPanelSelector);

    //     const bookingPanels = await page.$$(
    //         bookingPanelSelector
    //     );

    //     const teeTimes: TeeTime[] = [];

    //     for (const bookingPanel of bookingPanels) {

    //         let timeString = await bookingPanel.$eval(
    //             "[data-testid='teetimes-tile-time']",
    //             (el) => el.textContent
    //         )
    //         if (!timeString) throw new Error("Couldn't parse time text content");

    //         timeString = timeString.trim();

    //         const time = mergeDateWithTime(date, timeString);

    //         // Available Slots = data-testid="teetimes-tile-available-players"
    //         // Either 1, 1-3, 2, 1-4

    //         const slotsMap = {
    //             '1': '1',
    //             '2': '2',
    //             '1 or 2': '2',
    //             '1 - 3': '3',
    //             '1 - 4': '4',
    //         }
    //         let slotsString = await bookingPanel.$eval(
    //             "[data-testid='teetimes-tile-available-players']",
    //             (el) => el.textContent
    //         )
            
    //         if (!slotsString) throw new Error("Couldn't parse open slots content");

    //         slotsString = slotsString.trim();

    //         if (!(slotsString in slotsMap)) {
    //             throw new Error(`Invalid slots string: ${slotsString}`);
    //         }

    //         const openSlots = slotsMap[slotsString as keyof typeof slotsMap];

    //         teeTimes.push({ date: time, courseName: "Crystal Falls", openSlots })
    //     }

    //     await browser.close();
    //     return teeTimes;
    // } catch(e) {
    //     console.log(e);
    //     throw new Error("Failed");
    // }
}