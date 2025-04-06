"use server";
import { scrapeGolfAtx } from "../app/scrape/golf-atx"
import { FetchTeeTimesState, TeeTime } from "./types";
import { courses } from "./courses";
import { cache } from "./cache";

export async function fetchTeeTimes(
    prevState: FetchTeeTimesState,
    formData: FormData,
) : Promise<FetchTeeTimesState> {

    const dateString = formData.get("date");
    if (!dateString || typeof dateString !== 'string') return { ...prevState, error: "Date is required" };

    const date = new Date(dateString);

    if (isNaN(date.getTime())) return { ...prevState, error: "Invalid date format" };

    const allSelected = formData.get("all") === "on";

    let selectedCourses;

    if (allSelected) {
        selectedCourses = courses.map(({ fetchFunction, key }) => {
            return {
                fetchFunction,
                key
            }
        });
    } else {
        selectedCourses = [...formData.getAll("courses")]
            .map((val) => {
                const fn = courses.find((course) => course.key === val);
                if (fn) return {
                    fetchFunction: fn.fetchFunction,
                    key: fn.key
                };
            })
            .filter(Boolean);
    }

    try {
        const teeTimes = (await Promise.all(selectedCourses.map( async (item) => {
            //Caching Logic here
            if (item && item.fetchFunction) {

                const cacheKey = date.toISOString().split("T")[0] + item.key;
                const cached = cache.get(cacheKey) as TeeTime[] | undefined;

                if (cached) {
                    console.log("Returned cached function for: ", item.key);
                    return cached;
                } else {
                    console.log("Fetching fresh result for: ", item.key);
                    const result = item.fetchFunction(date);
                    cache.set(cacheKey, result);
                    return result;
                }
            }
        })))
            .flat()
            .filter((teeTime) => teeTime !== undefined);

        if (!teeTimes) return { ...prevState,  error: "Scrape Function Failed" };
        return { teeTimes, error: "", isLoading: false };
    }
    catch(e) {
        console.log("Error when fetching", e);
        return { ...prevState, error: "Failed to scrape Tee Times" }
    }
}