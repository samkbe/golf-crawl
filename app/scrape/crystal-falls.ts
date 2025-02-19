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
                '1-3': '3',
                '1-4': '4',
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

            const openSlots = slotsMap[slotsString as keyof typeof slotsMap]

            teeTimes.push({ date: time, courseName: "Crystal Falls", openSlots })
        }

        await browser.close();
        return teeTimes;
    } catch(e) {
        console.log(e);
        throw new Error("Failed");
    }
}

function mergeDateWithTime(date: Date, timeString: string): Date {
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