"use server";
import { scrapeGolfAtx } from "../app/scrape/golf-atx"
import { FetchTeeTimesState } from "./types";
import { courses } from "./courses";

export async function fetchTeeTimes(
    prevState: FetchTeeTimesState,
    formData: FormData,
) : Promise<FetchTeeTimesState> {
    
    console.log([...formData.entries()]);
    console.log(formData.getAll("courses"));

    const dateString = formData.get("date");
    if (!dateString || typeof dateString !== 'string') return { ...prevState, error: "Date is required" };

    const date = new Date(dateString);

    if (isNaN(date.getTime())) return { ...prevState, error: "Invalid date format" };

    const allSelected = formData.get("all") === "on";

    let selectedCourses;

    if (allSelected) {
        selectedCourses = courses.map(({ fetchFunction }) => fetchFunction);
    } else {
        selectedCourses = [...formData.getAll("courses")]
            .map((val) => {
                const fn = courses.find((course) => course.key === val);
                if (fn) return fn.fetchFunction;
            })
            .filter(Boolean);
    }

    try {
        const teeTimes = (await Promise.all(selectedCourses.map( async fn => {
            if (fn) {
                return fn(date);
            }
        })))
            .flat()
            .filter((teeTime) => teeTime !== undefined);

        console.log('TEETIMES: ', teeTimes);
        if (!teeTimes) return { ...prevState,  error: "Scrape Function Failed" };
        return { teeTimes, error: "", isLoading: false };
    }
    catch(e) {
        console.log("Error when fetching", e);
        return { ...prevState, error: "Failed to scrape Tee Times" }
    }
}