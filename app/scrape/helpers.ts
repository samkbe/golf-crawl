import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { TeeTime } from "../types";

export async function scrapeTeeItUp(date: Date, url: string, courseName: string) {
    // READ: url must not contain any url params besides 'course'
    // Example: https://crystal-falls-golf-club-2.book.teeitup.com/?course=5741`

    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        const formattedDate = date.toISOString().split("T")[0];

        await page.goto(`${url}&date=${formattedDate}&max=9999`);

        const bookingPanelSelector = 'div[role="group"]:has(> div button[data-testid="teetimes_book_now_button"], > div button[data-testid="teetimes_choose_rate_button"])';

        await page.waitForSelector(bookingPanelSelector);

        const bookingPanels = await page.$$(
            bookingPanelSelector
        );

        const teeTimes: TeeTime[] = [];

        for (const bookingPanel of bookingPanels) {

            let timeString = await bookingPanel.$eval(
                "[data-testid='teetimes-tile-time']",
                (el) => el.textContent
            )
            if (!timeString) throw new Error("Couldn't parse time text content");

            timeString = timeString.trim();

            const time = mergeDateWithTime(date, timeString);

            // Available Slots = data-testid="teetimes-tile-available-players"
            // Either 1, 1-3, 2, 1-4

            const slotsMap = {
                '1': '1',
                '2': '2',
                '1 or 2': '2',
                '1 - 3': '3',
                '1 - 4': '4',
            }
            let slotsString = await bookingPanel.$eval(
                "[data-testid='teetimes-tile-available-players']",
                (el) => el.textContent
            )
            
            if (!slotsString) throw new Error("Couldn't parse open slots content");

            slotsString = slotsString.trim();

            if (!(slotsString in slotsMap)) {
                throw new Error(`Invalid slots string: ${slotsString}`);
            }

            const openSlots = slotsMap[slotsString as keyof typeof slotsMap];

            teeTimes.push({ date: time, courseName, openSlots })
        }

        await browser.close();
        return teeTimes;
    } catch(e) {
        console.log(e);
        throw new Error("Failed");
    }
}

export function mergeDateWithTime(date: Date, timeString: string): Date {
    // Parse the time string ("2:36 PM") into hours and minutes
    const [time, modifier] = timeString.split(" ");
    const [hoursStr, minutesStr] = time.split(":");
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
  
    // Convert to 24-hour format
    if (modifier === "PM" && hours !== 12) {
        hours += 12;
    } else if (modifier === "AM" && hours === 12) {
        hours = 0;
    }
  
    // Create new Date object based on the provided date argument
    const newDate = new Date(date);
    newDate.setHours(hours, minutes, 0, 0); // Set hours, minutes, reset seconds & milliseconds
  
    return newDate;
}

export async function scrapeForeUp(date: Date, url: string, courseName: string) {
        // READ: url must not contain any url params
        // Example: https://foreupsoftware.com/index.php/booking/22221/10177#/teetimes`
        puppeteer.use(StealthPlugin());
    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        await page.goto(url, { waitUntil: 'domcontentloaded' });

        await page.waitForSelector('.online-booking-content button.btn.btn-primary');

        const buttons = await page.$$('.online-booking-content button.btn.btn-primary');

        console.log('Buttons: ',  buttons.length);

        for (const button of buttons) {
            const text = await page.evaluate(el => el.textContent?.trim(), button);
    
            if (text === "Public") {
                await button.click();
                break;
            }
        }
        const bookingPanelSelector = '.time-tile';

        await page.waitForSelector(bookingPanelSelector);

        const bookingPanels = await page.$$(
            bookingPanelSelector
        );

        const teeTimes: TeeTime[] = [];

        for (const bookingPanel of bookingPanels) {

            let timeString = await bookingPanel.$eval(
                ".booking-start-time-label",
                (el) => el.textContent
            )
            if (!timeString) throw new Error("Couldn't parse time text content");

            timeString = timeString.trim();

            const time = mergeDateWithTimeAlt(date, timeString);

            let slotsString = await bookingPanel.$eval(
                ".booking-slot-players > span",
                (el) => el.textContent
            )
            
            if (!slotsString) throw new Error("Couldn't parse open slots content");

            slotsString = slotsString.trim();

            if (!slotsString) throw new Error(`Couldn'y parse number of open slots`);

            teeTimes.push({ date: time, courseName, openSlots: slotsString })
        }

        await browser.close();
        return teeTimes;
    } catch(e) {
        console.log(e);
        throw new Error("Failed");
    }
}

function mergeDateWithTimeAlt(date: Date, timeString: string): Date {
    // Parse the time string ("2:36pm") into hours and minutes
    
    const modifier = timeString.slice(-2).toUpperCase(); // Extracts "AM" or "PM"
    const time = timeString.slice(0, -2); // Removes the AM/PM part

    const [hoursStr, minutesStr] = time.split(":");
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
  
    // Convert to 24-hour format
    if (modifier === "PM" && hours !== 12) {
        hours += 12;
    } else if (modifier === "AM" && hours === 12) {
        hours = 0;
    }
  
    // Create new Date object based on the provided date argument
    const newDate = new Date(date);
    newDate.setHours(hours, minutes, 0, 0); // Set hours, minutes, reset seconds & milliseconds
  
    return newDate;
}