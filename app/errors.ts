type ScraperType = "foreup" | "teeitup" | "golfatx";

export class ScrapeError extends Error {
	public courseName: string;
	public scrapeDate: string;
	public scraperType: ScraperType;

	constructor(
		message: string,
		options: {
			courseName: string;
			scrapeDate: string;
			scraperType: ScraperType;
			cause?: unknown;
		}
	) {
		super(message, { cause: options.cause });
		this.name = "ScrapeError";
		this.courseName = options.courseName;
		this.scrapeDate = options.scrapeDate;
		this.scraperType = options.scraperType;
	}
}

export class BrowserLaunchError extends Error {
	constructor(message: string, options?: { cause?: unknown }) {
		super(message, { cause: options?.cause });
		this.name = "BrowserLaunchError";
	}
}

export class ParseError extends Error {
	public courseName: string;
	public field: string;

	constructor(message: string, options: { courseName: string; field: string; cause?: unknown }) {
		super(message, { cause: options.cause });
		this.name = "ParseError";
		this.courseName = options.courseName;
		this.field = options.field;
	}
}
