export type CourseStatus = "loading" | "done" | "failed";

export type TeeTimeStreamEvent =
	| { type: "course"; key: string; status: "done"; teeTimes: TeeTime[] }
	| { type: "course"; key: string; status: "failed" }
	| { type: "complete" }
	| { type: "fatal"; error: string };

export interface TeeTime {
	date: Date;
	courseName: string;
	openSlots: string;
	bookingLink?: string;
	price?: number;
	golfAtxKey?: string;
	courseKey?: string;
}

export type Platform =
	| "teeitup"
	| "foreup"
	| "chronogolf"
	| "golfatx"
	| "ezlinks"
	| "clubprophet"
	| "golfwithaccess"
	| "golfback";