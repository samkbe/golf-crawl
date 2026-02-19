import "server-only";
import { z } from "zod";
import type { TeeTime } from "@/app/types";
import { ParseError } from "@/app/errors";

const API_BASE = "https://phx-api-be-east-1b.kenna.io/v2/tee-times";

const RateSchema = z.object({
	greenFeeCart: z.number().optional(),
	allowedPlayers: z.array(z.number()),
});

const TeeTimeEntrySchema = z.object({
	teetime: z.string(),
	maxPlayers: z.number(),
	bookedPlayers: z.number(),
	rates: z.array(RateSchema).min(1),
});

const TeeItUpResponseSchema = z.array(
	z.object({
		teetimes: z.array(TeeTimeEntrySchema),
	})
);

export default async function scrapeTeeItUp(
	date: string,
	url: string,
	courseName: string
) {
	const parsed = new URL(url);
	const alias = parsed.hostname.split(".")[0];
	const facilityId = parsed.searchParams.get("course");

	if (!facilityId) {
		throw new ParseError("Missing course param in TeeItUp URL", {
			courseName,
			field: "facilityId",
		});
	}

	const apiUrl = `${API_BASE}?date=${date}&facilityIds=${facilityId}`;

	const res = await fetch(apiUrl, {
		headers: { "x-be-alias": alias },
	});

	if (!res.ok) {
		throw new ParseError(`TeeItUp API returned ${res.status}`, {
			courseName,
			field: "apiResponse",
		});
	}

	const json = await res.json();
	const result = TeeItUpResponseSchema.safeParse(json);

	if (!result.success) {
		throw new ParseError("TeeItUp API response shape changed", {
			courseName,
			field: "apiResponse",
			cause: result.error,
		});
	}

	const bookingUrl = new URL(url);
	bookingUrl.searchParams.set("date", date);
	bookingUrl.searchParams.set("max", "999999");
	const bookingLink = bookingUrl.toString();
	const teeTimes: TeeTime[] = [];

	for (const group of result.data) {
		for (const entry of group.teetimes) {
			const maxAllowed = Math.max(...entry.rates.flatMap((r) => r.allowedPlayers));
			if (maxAllowed <= 0) continue;
			const greenFee = entry.rates.find((r) => r.greenFeeCart != null)?.greenFeeCart;
			const price = greenFee != null ? greenFee / 100 : undefined;

			teeTimes.push({
				date: new Date(entry.teetime),
				courseName,
				openSlots: String(maxAllowed),
				price,
				bookingLink,
			});
		}
	}

	return teeTimes;
}
