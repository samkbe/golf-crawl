import "server-only";
import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";
import type { Dispatcher } from "undici";
import type { TeeTime } from "@/app/types";
import { ParseError } from "@/app/errors";
import { getDecodoProxyDispatcherOnPort, getRandomProxyPort } from "@/app/scrape/proxy";

const API_BASE = "https://www.chronogolf.com/marketplace/clubs";
const TZ = "America/Chicago";
const PLAYER_COUNTS = [4, 3, 2, 1] as const;
const DELAY_MS = 750;

const GreenFeeSchema = z.object({
	green_fee: z.number(),
	subtotal: z.number(),
});

const ChronoEntrySchema = z.object({
	start_time: z.string(),
	date: z.string(),
	out_of_capacity: z.boolean(),
	green_fees: z.array(GreenFeeSchema).optional(),
});

const ChronoResponseSchema = z.array(ChronoEntrySchema);

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function buildParams(date: string, courseId: string, affiliationTypeId: string, playerCount: number) {
	const params = new URLSearchParams({
		date,
		course_id: courseId,
		nb_holes: "18",
	});
	for (let i = 0; i < playerCount; i++) {
		params.append("affiliation_type_ids[]", affiliationTypeId);
	}
	return params;
}

export default async function scrapeChronoGolf(
	date: string,
	clubId: string,
	courseId: string,
	affiliationTypeId: string,
	courseName: string,
	bookingLink?: string
) {
	const resolvedBookingLink =
		bookingLink ??
		`https://www.chronogolf.com/club/${clubId}/widget?medium=widget&source=club#?course_id=${courseId}&nb_holes=18&date=${date}`;

	const slotsByTime = new Map<string, { slots: number; price: number }>();

	for (let i = 0; i < PLAYER_COUNTS.length; i++) {
		const playerCount = PLAYER_COUNTS[i];
		const params = buildParams(date, courseId, affiliationTypeId, playerCount);

		const dispatcher = getDecodoProxyDispatcherOnPort(getRandomProxyPort());
		const requestInit: RequestInit & { dispatcher?: Dispatcher } = {};
		if (dispatcher) requestInit.dispatcher = dispatcher;

		const res = await fetch(
			`${API_BASE}/${clubId}/teetimes?${params}`,
			requestInit as RequestInit
		);

		if (!res.ok) {
			if (i === 0) {
				throw new ParseError(`ChronoGolf API returned ${res.status}`, {
					courseName,
					field: "apiResponse",
				});
			}
			continue;
		}

		const json = await res.json();
		const result = ChronoResponseSchema.safeParse(json);

		if (!result.success) {
			if (i === 0) {
				throw new ParseError("ChronoGolf API response shape changed", {
					courseName,
					field: "apiResponse",
					cause: result.error,
				});
			}
			continue;
		}

		for (const entry of result.data) {
			if (entry.out_of_capacity) continue;

			const key = `${entry.date} ${entry.start_time}`;
			if (slotsByTime.has(key)) continue;

			const price = entry.green_fees?.[0]?.subtotal;
			if (price == null) continue;

			slotsByTime.set(key, { slots: playerCount, price });
		}

		if (i < PLAYER_COUNTS.length - 1) await delay(DELAY_MS);
	}

	const teeTimes: TeeTime[] = [];

	for (const [key, { slots, price }] of slotsByTime) {
		teeTimes.push({
			date: fromZonedTime(key, TZ),
			courseName,
			openSlots: String(slots),
			price,
			bookingLink: resolvedBookingLink,
		});
	}

	return teeTimes;
}
