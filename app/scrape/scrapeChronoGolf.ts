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
const MAX_ATTEMPTS = 4;
const BASE_BACKOFF_MS = 1000;

// A request with no User-Agent is an obvious bot signal to ChronoGolf's WAF.
// Sending browser-like headers significantly reduces 403 blocks.
const BROWSER_HEADERS = {
	"User-Agent":
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
	Accept: "application/json, text/plain, */*",
	"Accept-Language": "en-US,en;q=0.9",
	Referer: "https://www.chronogolf.com/",
};

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

async function fetchTeeTimesJson(url: string, courseName: string): Promise<unknown> {
	let lastError: unknown;

	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
		// Fresh proxy IP on every attempt.
		const dispatcher = getDecodoProxyDispatcherOnPort(getRandomProxyPort());
		const requestInit: RequestInit & { dispatcher?: Dispatcher } = { headers: BROWSER_HEADERS };
		if (dispatcher) requestInit.dispatcher = dispatcher;

		try {
			const res = await fetch(url, requestInit as RequestInit);

			// Retryable: WAF/rate-limit/transient → rotate IP and try again.
			if (res.status === 403 || res.status === 429 || res.status === 503) {
				throw new Error(`ChronoGolf returned ${res.status}`);
			}
			// Other non-OK (e.g. 400/404) won't fix on retry.
			if (!res.ok) {
				throw new ParseError(`ChronoGolf API returned ${res.status}`, {
					courseName,
					field: "apiResponse",
				});
			}

			return await res.json();
		} catch (error) {
			lastError = error;
			// Genuine 4xx (ParseError) is not worth retrying.
			if (error instanceof ParseError) throw error;

			if (attempt < MAX_ATTEMPTS) {
				const backoff = BASE_BACKOFF_MS * 2 ** (attempt - 1) + Math.floor(Math.random() * 400);
				await delay(backoff);
			}
		}
	}

	throw new ParseError(`ChronoGolf API blocked after ${MAX_ATTEMPTS} attempts`, {
		courseName,
		field: "apiResponse",
		cause: lastError instanceof Error ? lastError : undefined,
	});
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

		let json: unknown;
		try {
			json = await fetchTeeTimesJson(`${API_BASE}/${clubId}/teetimes?${params}`, courseName);
		} catch (error) {
			if (i === 0) throw error;
			continue;
		}

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
