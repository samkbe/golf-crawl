import { scrapeFalconhead } from "../scrape/falconhead"; // your scraping function
import { scrapeCrystalFalls } from "../scrape/crystal-falls";
import { scrapeGolfAtx } from "../scrape/golf-atx";

export async function GET(request: Request) {
    try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const teeTimes = await scrapeGolfAtx(tomorrow);

        return new Response(JSON.stringify(teeTimes), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        return new Response("Error scraping data", { status: 500 });
    }
}