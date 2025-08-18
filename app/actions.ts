"use server";
import { FetchTeeTimesState, TeeTime } from "./types";
import { courses } from "./courses";
import { cache } from "./cache";

// export const runtime = "nodejs";

export async function fetchTeeTimes(
	prevState: FetchTeeTimesState,
	formData: FormData
): Promise<FetchTeeTimesState> {
	const dateString = formData.get("date");
	if (!dateString || typeof dateString !== "string")
		return { ...prevState, error: "Date is required" };

	const date = new Date(dateString);

	if (isNaN(date.getTime())) return { ...prevState, error: "Invalid date format" };

	const allSelected = formData.get("all") === "on";

	let selectedCourses;

	if (allSelected) {
		selectedCourses = courses.map(({ fetchFunction, key, golfAtxCourse }) => {
			return {
				fetchFunction,
				key,
				golfAtxCourse,
			};
		});
	} else {
		selectedCourses = [...formData.getAll("courses")]
			.map((val) => {
				const fn = courses.find((course) => course.key === val);
				if (fn)
					return {
						fetchFunction: fn.fetchFunction,
						key: fn.key,
						golfAtxCourse: fn.golfAtxCourse,
					};
			})
			.filter(Boolean);
	}

	try {
		const teeTimes = (
			await Promise.allSettled(
				selectedCourses.map(async (item) => {
					if (item) {
						if (item.golfAtxCourse) return item.fetchFunction(dateString, item.key);

						const cacheKey = `${dateString}::${item.key}`;
						const cached = cache.get(cacheKey) as TeeTime[] | undefined;

						if (cached) return cached;

						const result = await item.fetchFunction(dateString);
						cache.set(cacheKey, result);
						return result;
					}
				})
			)
		)
			.map((result) => {
				if (result.status === "fulfilled") {
					return result.value;
				} else {
					console.log("Course scraping failed:", result.reason);
					return undefined;
				}
			})
			.flat()
			.filter((teeTime) => teeTime !== undefined);

		if (!teeTimes || teeTimes.length === 0) {
			return { ...prevState, error: "No tee times found for the selected courses" };
		}
		return { teeTimes, error: "", isLoading: false };
	} catch (e) {
		console.log("Error when fetching", e);
		return { ...prevState, error: "Failed to scrape Tee Times" };
	}
}
