export type FetchTeeTimesState = {
	teeTimes: TeeTime[];
	error: string;
	isLoading: boolean;
};

export interface TeeTime {
	date: Date;
	courseName: string;
	openSlots: string;
	bookingLink?: string;
	price?: number;
	golfAtxKey?: string;
}

export type Platform = "teeitup" | "foreup" | "chronogolf" | "golfatx" | "ezlinks" | "clubprophet";