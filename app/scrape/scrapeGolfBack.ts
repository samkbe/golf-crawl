import "server-only";
import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";
import type { TeeTime } from "@/app/types";
import { ParseError } from "@/app/errors";

const API_BASE = "https://api.golfback.com/api/v1/courses";
const TZ = "America/Chicago";

const RateSchema = z.object({
	isPrimary: z.boolean(),
	price: z.number(),
});

const GolfBackEntrySchema = z.object({
	localDateTime: z.string(),
	rates: z.array(RateSchema),
	isAvailable: z.boolean(),
	playersMin: z.number(),
	playersMax: z.number(),
});

const GolfBackResponseSchema = z.object({
	data: z.array(GolfBackEntrySchema),
});

export default async function scrapeGolfBack(
	date: string,
	courseId: string,
	courseName: string,
	bookingLink?: string
) {
	const res = await fetch(`${API_BASE}/${courseId}/date/${date}/teetimes`, {
		method: "POST",
		headers: {
			"content-type": "application/json;charset=UTF-8",
		},
		body: JSON.stringify({ sessionId: null }),
	});

	if (!res.ok) {
		throw new ParseError(`GolfBack API returned ${res.status}`, {
			courseName,
			field: "apiResponse",
		});
	}

	const json = await res.json();
	const result = GolfBackResponseSchema.safeParse(json);

	if (!result.success) {
		throw new ParseError("GolfBack API response shape changed", {
			courseName,
			field: "apiResponse",
			cause: result.error,
		});
	}

	const teeTimes: TeeTime[] = [];

	for (const entry of result.data.data) {
		if (!entry.isAvailable) continue;

		const primaryRate = entry.rates.find((rate) => rate.isPrimary);
		const price = primaryRate?.price ?? entry.rates[0]?.price;
		const teeTimeDate = fromZonedTime(entry.localDateTime, TZ);

		teeTimes.push({
			date: teeTimeDate,
			courseName,
			openSlots:
				entry.playersMin === entry.playersMax
					? String(entry.playersMin)
					: `${entry.playersMin}-${entry.playersMax}`,
			price,
			bookingLink,
		});
	}

	return teeTimes;
}
