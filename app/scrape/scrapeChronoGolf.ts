import "server-only";
import type { TeeTime } from "@/app/types";
import { ParseError } from "@/app/errors";

const EZLINKS_SERVICE_URL = process.env.EZLINKS_SERVICE_URL;
const EZLINKS_SERVICE_API_KEY = process.env.EZLINKS_SERVICE_API_KEY;

export default async function scrapeChronoGolf(
	date: string,
	clubId: string,
	courseId: string,
	affiliationTypeId: string,
	courseName: string,
	bookingLink?: string
): Promise<TeeTime[]> {
	if (!EZLINKS_SERVICE_URL || !EZLINKS_SERVICE_API_KEY) {
		throw new Error("EZLINKS_SERVICE_URL and EZLINKS_SERVICE_API_KEY must be set");
	}

	const response = await fetch(`${EZLINKS_SERVICE_URL}/scrape-chronogolf`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${EZLINKS_SERVICE_API_KEY}`,
		},
		body: JSON.stringify({ date, clubId, courseId, affiliationTypeId, courseName, bookingLink }),
	});

	if (!response.ok) {
		const body = await response.json().catch(() => ({}));
		throw new ParseError(body.message || `ChronoGolf service returned ${response.status}`, {
			courseName,
			field: "serviceResponse",
		});
	}

	const { teeTimes } = await response.json();

	return (
		teeTimes as Array<{
			date: string;
			courseName: string;
			openSlots: string;
			price: number;
			bookingLink: string;
		}>
	).map((tt) => ({
		date: new Date(tt.date),
		courseName: tt.courseName,
		openSlots: tt.openSlots,
		price: tt.price,
		bookingLink: tt.bookingLink,
	}));
}
