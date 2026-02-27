import "server-only";
import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";
import type { TeeTime } from "@/app/types";
import { ParseError } from "@/app/errors";

const API_BASE = "https://www.chronogolf.com/marketplace/clubs";
const TZ = "America/Chicago";

const GreenFeeSchema = z.object({
	green_fee: z.number(),
});

const ChronoEntrySchema = z.object({
	start_time: z.string(),
	date: z.string(),
	out_of_capacity: z.boolean(),
	green_fees: z.array(GreenFeeSchema).optional(),
});

const ChronoResponseSchema = z.array(ChronoEntrySchema);

export default async function scrapeChronoGolf(
	date: string,
	clubId: string,
	courseId: string,
	affiliationTypeId: string,
	courseName: string,
	bookingLink?: string
) {
	const params = new URLSearchParams({
		date,
		course_id: courseId,
		"affiliation_type_ids[]": affiliationTypeId,
		nb_holes: "18",
	});

	const res = await fetch(`${API_BASE}/${clubId}/teetimes?${params}`);

	if (!res.ok) {
		throw new ParseError(`ChronoGolf API returned ${res.status}`, {
			courseName,
			field: "apiResponse",
		});
	}

	const json = await res.json();
	const result = ChronoResponseSchema.safeParse(json);

	if (!result.success) {
		throw new ParseError("ChronoGolf API response shape changed", {
			courseName,
			field: "apiResponse",
			cause: result.error,
		});
	}

	const teeTimes: TeeTime[] = [];

	for (const entry of result.data) {
		if (entry.out_of_capacity) continue;
		if (!entry.green_fees || entry.green_fees.length === 0) continue;

		const teeTimeDate = fromZonedTime(`${entry.date} ${entry.start_time}`, TZ);

		teeTimes.push({
			date: teeTimeDate,
			courseName,
			openSlots: String(entry.green_fees.length),
			price: entry.green_fees[0].green_fee,
			bookingLink: bookingLink ?? `https://www.chronogolf.com/club/${clubId}/widget?medium=widget&source=club#?course_id=${courseId}&nb_holes=18&date=${date}`,
		});
	}

	return teeTimes;
}
