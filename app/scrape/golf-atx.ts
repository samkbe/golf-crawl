import puppeteer from "puppeteer";
import type { TeeTime } from "../types";

export async function scrapeGolfAtx(targetDate: Date) {
    try {
        // Launch Puppeteer
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
    
        // Step 1: Go to the main page to retrieve the CSRF token
        await page.goto(
          "https://txaustinweb.myvscloud.com/webtrac/web/search.html?display=detail&module=GR&secondarycode=1"
        );
    
        // Extract the CSRF token using Puppeteer's built-in methods
        const csrfTokenElement = await page.$('input[name="_csrf_token"]');
        const csrfToken = csrfTokenElement
          ? await csrfTokenElement.evaluate((el) => (el as HTMLInputElement).value)
          : null;
    
        if (!csrfToken) {
          console.error("CSRF token not found!");
          await browser.close();
          return;
        }
    
        // Step 2: Prepare the booking URL with CSRF token and dynamic date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const formattedDate = `${
          tomorrow.getMonth() + 1
        }/${tomorrow.getDate()}/${tomorrow.getFullYear()}`;
    
        const bookingUrl = `https://txaustinweb.myvscloud.com/webtrac/web/search.html?Action=Start&begindate=${encodeURIComponent(
          formattedDate
        )}&begintime=07:00+am&numberofplayers=1&numberofholes=18&_csrf_token=${csrfToken}&module=GR`;
    
        // Step 3: Navigate to the booking page URL
        await page.goto(bookingUrl);
    
        // Step 4: Select and process elements directly
        const courseElements = await page.$$(".result-content");
    
        const teeTimes: TeeTime[] = [];
    
        for (const courseElement of courseElements) {
          // Get course name
          const courseName = await courseElement.$eval(
            "h2 span",
            (el) => el.textContent?.trim() || ""
          );
    
          // Get each tee time row
          const teeTimeRows = await courseElement.$$("tbody tr");
    
          for (const row of teeTimeRows) {
    
            // Extract each cell's data for the tee time
            let day = await row.$eval(
              'td[data-title="Date"]',
              (el) => el.textContent
            );
            if (!day) throw new Error("Couldn't scrape date value");
            day = day.trim();
            
            let time = await row.$eval(
              'td[data-title="Time"]',
              (el) => el.textContent
            );
            if (!time) throw new Error("Couldn't scrape time value");
            time = time.trim();
    
            const date = new Date(`${day} ${time}`);
    
            const openSlots = await row.$eval(
              'td[data-title="Open Slots"]',
              (el) => el.textContent?.trim() || ""
            );
    
            teeTimes.push({ date, openSlots, courseName });
          }
        }
        // Close the browser
        await browser.close();
        return teeTimes;
      } catch (e) {
        console.log(e);
        throw new Error("Failed");
      }
}