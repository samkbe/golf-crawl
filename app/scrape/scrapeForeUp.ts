import "server-only";
import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";
import type { TeeTime } from "@/app/types";
import { toMmDdYyyyDash } from "@/app/scrape/helpers";
import { ParseError } from "@/app/errors";

const API_BASE = "https://foreupsoftware.com/index.php/api/booking/times";
const TZ = "America/Chicago";

const ForeUpEntrySchema = z.object({
	time: z.string(),
	available_spots: z.number(),
	green_fee: z.number(),
});

const ForeUpResponseSchema = z.array(ForeUpEntrySchema);

export default async function scrapeForeUp(
	date: string,
	scheduleId: string,
	bookingClass: string | undefined,
	courseName: string,
	bookingLink?: string
) {
	const mmddyyyy = toMmDdYyyyDash(date);

	const params = new URLSearchParams({
		time: "all",
		date: mmddyyyy,
		holes: "all",
		players: "0",
		schedule_id: scheduleId,
		"schedule_ids[]": scheduleId,
		specials_only: "0",
		api_key: "no_limits",
	});

	if (bookingClass) {
		params.set("booking_class", bookingClass);
	}

	const res = await fetch(`${API_BASE}?${params}`);

	if (!res.ok) {
		throw new ParseError(`ForeUp API returned ${res.status}`, {
			courseName,
			field: "apiResponse",
		});
	}

	const json = await res.json();
	const result = ForeUpResponseSchema.safeParse(json);

	if (!result.success) {
		throw new ParseError("ForeUp API response shape changed", {
			courseName,
			field: "apiResponse",
			cause: result.error,
		});
	}

	const teeTimes: TeeTime[] = [];

	for (const entry of result.data) {
		if (entry.available_spots <= 0) continue;

		const teeTimeDate = fromZonedTime(entry.time, TZ);

		teeTimes.push({
			date: teeTimeDate,
			courseName,
			openSlots: String(entry.available_spots),
			price: entry.green_fee,
			bookingLink,
		});
	}

	return teeTimes;
}
