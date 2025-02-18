import puppeteer from "puppeteer";
import type { TeeTime } from "../types";

export async function scrapeCrystalFalls(date: Date) {
    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        const formattedDate = date.toISOString().split("T")[0];

        await page.goto(`https://crystal-falls-golf-club-2.book.teeitup.com/?course=5741&date=${formattedDate}&max=9999`);

        const bookingPanels = await page.$$(
            'div[role="group"]:has(> div button[data-testid="teetimes_book_now_button"], > div button[data-testid="teetimes_choose_rate_button"])'
        );
        
        const teeTimes: TeeTime[] = [];

        for (const bookingPanel of bookingPanels) {

            // 
            // Time = data-testid="teetimes-tile-time"
            // Available Slots = data-testid="teetimes-tile-available-players"
        }
        
        await browser.close();
        return teeTimes;

    } catch(e) {
        console.log(e);
        throw new Error("Failed");
    }
}