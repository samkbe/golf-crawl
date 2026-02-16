"use server";
import { FetchTeeTimesState } from "./types";
import { courses } from "./courses";
import { captureError } from "./lib/logger";

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

	const failedCourses: string[] = [];

	try {
		const teeTimes = (
			await Promise.allSettled(
				selectedCourses.map(async (item) => {
					if (item) {
						if (item.golfAtxCourse) return item.fetchFunction(dateString, item.key);
						return await item.fetchFunction(dateString);
					}
				})
			)
		)
			.map((result, i) => {
				if (result.status === "fulfilled") {
					return result.value;
				} else {
					const courseKey = selectedCourses[i]?.key ?? "unknown";
					failedCourses.push(courseKey);
					return undefined;
				}
			})
			.flat()
			.filter((teeTime) => teeTime !== undefined);

		// Every course failed
		if (teeTimes.length === 0 && failedCourses.length > 0) {
			return {
				...prevState,
				teeTimes: [],
				error: `Failed to fetch tee times for: ${failedCourses.join(", ")}`,
			};
		}

		// No results but nothing failed
		if (teeTimes.length === 0) {
			return {
				...prevState,
				teeTimes: [],
				error: "No tee times found for the selected courses",
			};
		}

		// Partial success
		return {
			teeTimes,
			error: failedCourses.length > 0 ? `Could not load: ${failedCourses.join(", ")}` : "",
			isLoading: false,
		};
	} catch (error) {
		captureError(error, { scrapeDate: dateString }, "fatal");
		return {
			...prevState,
			teeTimes: [],
			error: "An unexpected error occurred. Please try again.",
		};
	}
}
