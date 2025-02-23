"use server";
import { scrapeGolfAtx } from "../app/scrape/golf-atx"
import { FetchTeeTimesState } from "./types";

export async function fetchTeeTimes(
    prevState: FetchTeeTimesState,
    formData: FormData,
) : Promise<FetchTeeTimesState> {
    
    for (const [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
    }

    const dateString = formData.get("date");
    if (!dateString || typeof dateString !== 'string') return { ...prevState, error: "Date is required" };

    const date = new Date(dateString);

    if (isNaN(date.getTime())) return { ...prevState, error: "Invalid date format" };

    try {
        const teeTimes = await scrapeGolfAtx(date);
        if (!teeTimes) return { ...prevState,  error: "Scrape Function Failed" };
        return { teeTimes, error: "", isLoading: false };
    }
    catch(e) {
        return { ...prevState, error: "Failed to scrape Tee Times" }
    }
}