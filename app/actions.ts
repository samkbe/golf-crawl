"use server";
import type { TeeTime, FetchTeeTimesState, Platform } from "@/app/types";
import { courses } from "@/app/courses";
import { captureError } from "@/app/lib/logger";
import { launchBrowser } from "@/app/scrape/browser";

const SAME_PLATFORM_DELAY_MS = 1500;

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
		selectedCourses = courses.map(({ fetchFunction, key, platform }) => ({
			fetchFunction,
			key,
			platform,
		}));
	} else {
		selectedCourses = [...formData.getAll("courses")]
			.map((val) => {
				const fn = courses.find((course) => course.key === val);
				if (fn)
					return {
						fetchFunction: fn.fetchFunction,
						key: fn.key,
						platform: fn.platform,
					};
			})
			.filter(Boolean);
	}

	const failedCourses: string[] = [];
	const browser = await launchBrowser();

	try {
		// Groups courses by platform to avoid rate limits on the same domain
		const groups = new Map<Platform, typeof selectedCourses>();
		for (const item of selectedCourses) {
			if (!item) continue;
			const group = groups.get(item.platform) ?? [];
			group.push(item);
			groups.set(item.platform, group);
		}

		// Runs each platform group in parallel, but serialize within each group
		const groupResults = await Promise.allSettled(
			[...groups.values()].map(async (group) => {
				const results: (TeeTime[] | undefined)[] = [];
				for (let i = 0; i < group.length; i++) {
					const item = group[i];
					if (!item) continue;

					if (i > 0) {
						await new Promise((r) => setTimeout(r, SAME_PLATFORM_DELAY_MS));
					}

					try {
						const result =
							item.platform === "golfatx"
								? await item.fetchFunction(dateString, browser, item.key)
								: await item.fetchFunction(dateString, browser);
						results.push(result);
					} catch {
						failedCourses.push(item.key);
					}
				}
				return results;
			})
		);

		const teeTimes = groupResults
			.flatMap((result) => (result.status === "fulfilled" ? result.value : []))
			.flat()
			.filter((teeTime): teeTime is TeeTime => teeTime !== undefined);

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
	} finally {
		await browser.close();
	}
}
