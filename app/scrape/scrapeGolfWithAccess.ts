import "server-only";
import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";
import type { Dispatcher } from "undici";
import type { TeeTime } from "@/app/types";
import { ParseError } from "@/app/errors";
import { getDecodoProxyDispatcher } from "@/app/scrape/proxy";

const API_BASE = "https://golfwithaccess.com/api/v1/tee-times";
const TZ = "America/Chicago";

const DayTimeSchema = z.object({
	year: z.number(),
	month: z.number(),
	day: z.number(),
	hour: z.number(),
	minute: z.number(),
	second: z.number(),
});

const PriceValueSchema = z.object({
	value: z.string(),
});

const RateSchema = z.object({
	rateType: z.string(),
	price: z.object({
		dollars: PriceValueSchema.nullable(),
	}),
});

const TeeTimeEntrySchema = z.object({
	dayTime: DayTimeSchema,
	players: z.object({
		min: z.number(),
		max: z.number(),
	}),
	holesOption: z.string(),
	rates: z.array(RateSchema),
});

const GolfWithAccessResponseSchema = z.object({
	teeTimes: z.array(TeeTimeEntrySchema),
});

export default async function scrapeGolfWithAccess(
	date: string,
	courseId: string,
	utmSource: string,
	courseName: string,
	bookingLink?: string
) {
	const params = new URLSearchParams({
		courseIds: courseId,
		players: "2",
		startAt: "00:00:00",
		endAt: "23:59:59",
		day: date,
		utmCampaign: "course-booking-link",
		utmSource,
		utmContent: "",
		utmMedium: "referral",
	});

	const dispatcher = getDecodoProxyDispatcher();
	const requestInit: RequestInit & { dispatcher?: Dispatcher } = {};
	if (dispatcher) {
		requestInit.dispatcher = dispatcher;
	}

	const res = await fetch(`${API_BASE}?${params}`, requestInit as RequestInit);

	if (!res.ok) {
		throw new ParseError(`GolfWithAccess API returned ${res.status}`, {
			courseName,
			field: "apiResponse",
		});
	}

	const json = await res.json();
	const result = GolfWithAccessResponseSchema.safeParse(json);

	if (!result.success) {
		throw new ParseError("GolfWithAccess API response shape changed", {
			courseName,
			field: "apiResponse",
			cause: result.error,
		});
	}

	const teeTimes: TeeTime[] = [];

	for (const entry of result.data.teeTimes) {
		const publicRate = entry.rates.find((r) => r.rateType === "PUBLIC");
		const priceStr = publicRate?.price.dollars?.value ?? entry.rates[0]?.price.dollars?.value;
		const price = priceStr ? parseFloat(priceStr) : undefined;

		const { year, month, day, hour, minute } = entry.dayTime;
		const localISO = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
		const teeTimeDate = fromZonedTime(localISO, TZ);

		teeTimes.push({
			date: teeTimeDate,
			courseName,
			openSlots: `${entry.players.min}-${entry.players.max}`,
			price,
			bookingLink,
		});
	}

	return teeTimes;
}
