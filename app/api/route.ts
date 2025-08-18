import { scrapeGolfAtx } from "../scrape/courses/golf-atx";

export async function GET(request: Request) {
	try {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);

		const teeTimes = await scrapeGolfAtx("08-29-2025");

		return new Response(JSON.stringify(teeTimes), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		return new Response("Error scraping data", { status: 500 });
	}
}
