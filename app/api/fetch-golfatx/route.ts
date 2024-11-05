import puppeteer from "puppeteer";

interface TeeTime {
  date: string;
  time: string;
  status: string;
  openSlots: string;
}

interface CourseData {
  courseName: string;
  teeTimes: TeeTime[];
}

export async function GET(request: Request) {
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
    )}&begintime=07:00+am&numberofplayers=4&numberofholes=18&_csrf_token=${csrfToken}&module=GR`;

    // Step 3: Navigate to the booking page URL
    await page.goto(bookingUrl);

    // Step 4: Select and process elements directly
    const courseElements = await page.$$(".result-content");

    const teeTimesData: CourseData[] = [];

    for (const courseElement of courseElements) {
      // Get course name
      const courseName = await courseElement.$eval(
        "h2 span",
        (el) => el.textContent?.trim() || ""
      );

      // Get each tee time row
      const teeTimeRows = await courseElement.$$("tbody tr");

      const teeTimes: TeeTime[] = [];

      for (const row of teeTimeRows) {
        // Extract each cell's data for the tee time
        const date = await row.$eval(
          'td[data-title="Date"]',
          (el) => el.textContent?.trim() || ""
        );
        const time = await row.$eval(
          'td[data-title="Time"]',
          (el) => el.textContent?.trim() || ""
        );
        const status = await row.$eval(
          'td[data-title="Status"] .itemstatus',
          (el) => el.textContent?.trim() || ""
        );
        const openSlots = await row.$eval(
          'td[data-title="Open Slots"]',
          (el) => el.textContent?.trim() || ""
        );

        teeTimes.push({ date, time, status, openSlots });
      }

      teeTimesData.push({
        courseName,
        teeTimes,
      });
    }

    console.log("Tee Times Data:", teeTimesData);

    // Close the browser
    await browser.close();

    return Response.json(teeTimesData);
  } catch (e) {
    return Response.json("Sam");
  }
}
