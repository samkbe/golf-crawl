import "server-only";
import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";
import type { TeeTime } from "@/app/types";
import { ParseError } from "@/app/errors";

const TZ = "America/Chicago";
const TOKEN_CLIENT_ID = "onlinereswebshortlived";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const ShItemPriceSchema = z.object({
	shItemCode: z.string(),
	price: z.number(),
});

const ClubProphetEntrySchema = z.object({
	startTime: z.string(),
	courseName: z.string(),
	playersDisplay: z.string(),
	minPlayer: z.number(),
	maxPlayer: z.number(),
	shItemPrices: z.array(ShItemPriceSchema),
});

const ClubProphetResponseSchema = z.object({
	isSuccess: z.boolean(),
	content: z.union([
		z.array(ClubProphetEntrySchema),
		z.object({ messageKey: z.string() }),
	]),
});

const TokenResponseSchema = z.object({
	access_token: z.string(),
});

function toClubProphetDate(isoDate: string): string {
	const d = new Date(`${isoDate}T00:00:00`);
	const day = DAYS[d.getDay()];
	const month = MONTHS[d.getMonth()];
	const date = d.getDate().toString().padStart(2, "0");
	const year = d.getFullYear();
	return `${day} ${month} ${date} ${year}`;
}

function makeHeaders(token: string, websiteId: string): Record<string, string> {
	return {
		Accept: "application/json",
		"Content-Type": "application/json",
		Authorization: `Bearer ${token}`,
		"x-productid": "1",
		"x-componentid": "1",
		"x-siteid": "1",
		"x-terminalid": "3",
		"x-websiteid": websiteId,
		"x-requestid": crypto.randomUUID(),
	};
}

export default async function scrapeClubProphet(
	date: string,
	siteHost: string,
	websiteId: string,
	courseName: string,
	bookingLink?: string
) {
	const tokenRes = await fetch(`${siteHost}/identityapi/myconnect/token/short`, {
		method: "POST",
		body: new URLSearchParams({ client_id: TOKEN_CLIENT_ID }),
	});

	if (!tokenRes.ok) {
		throw new ParseError(`Club Prophet token endpoint returned ${tokenRes.status}`, {
			courseName,
			field: "token",
		});
	}

	const tokenJson = await tokenRes.json();
	const tokenResult = TokenResponseSchema.safeParse(tokenJson);

	if (!tokenResult.success) {
		throw new ParseError("Club Prophet token response shape changed", {
			courseName,
			field: "token",
			cause: tokenResult.error,
		});
	}

	const token = tokenResult.data.access_token;
	const headers = makeHeaders(token, websiteId);
	const transactionId = crypto.randomUUID();

	const registerRes = await fetch(
		`${siteHost}/onlineres/onlineapi/api/v1/onlinereservation/RegisterTransactionId`,
		{
			method: "POST",
			headers,
			body: JSON.stringify({ transactionId }),
		}
	);

	if (!registerRes.ok) {
		throw new ParseError(`Club Prophet register transaction returned ${registerRes.status}`, {
			courseName,
			field: "transactionId",
		});
	}

	const searchDate = toClubProphetDate(date);
	const params = new URLSearchParams({
		searchDate,
		holes: "0",
		numberOfPlayer: "0",
		courseIds: "1",
		searchTimeType: "0",
		transactionId,
		teeOffTimeMin: "0",
		teeOffTimeMax: "23",
		isChangeTeeOffTime: "true",
		teeSheetSearchView: "5",
		classCode: "R",
		defaultOnlineRate: "N",
		isUseCapacityPricing: "false",
		memberStoreId: "1",
		searchType: "1",
	});

	const teeTimesRes = await fetch(
		`${siteHost}/onlineres/onlineapi/api/v1/onlinereservation/TeeTimes?${params}`,
		{ headers }
	);

	if (!teeTimesRes.ok) {
		throw new ParseError(`Club Prophet TeeTimes API returned ${teeTimesRes.status}`, {
			courseName,
			field: "apiResponse",
		});
	}

	const json = await teeTimesRes.json();
	const result = ClubProphetResponseSchema.safeParse(json);

	if (!result.success) {
		throw new ParseError("Club Prophet API response shape changed", {
			courseName,
			field: "apiResponse",
			cause: result.error,
		});
	}

	if (!Array.isArray(result.data.content)) {
		return [];
	}

	const teeTimes: TeeTime[] = [];

	for (const entry of result.data.content) {
		const greenFee18 = entry.shItemPrices.find((p) => p.shItemCode === "GreenFee18");
		const price = greenFee18?.price ?? entry.shItemPrices[0]?.price;
		const teeTimeDate = fromZonedTime(entry.startTime, TZ);

		teeTimes.push({
			date: teeTimeDate,
			courseName,
			openSlots: `${entry.minPlayer}-${entry.maxPlayer}`,
			price,
			bookingLink,
		});
	}

	return teeTimes;
}
