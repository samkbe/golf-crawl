import * as Sentry from "@sentry/nextjs";
import { ScrapeError, BrowserLaunchError, ParseError } from "@/app/errors";

type Severity = "info" | "warning" | "error" | "fatal";

interface LogContext {
	courseName?: string;
	scrapeDate?: string;
	scraperType?: string;
	[key: string]: unknown;
}

export function captureError(error: unknown, context?: LogContext, severity: Severity = "error") {
	console.error(error);

	Sentry.withScope((scope) => {
		scope.setLevel(severity);

		if (context?.courseName) scope.setTag("course", context.courseName);
		if (context?.scraperType) scope.setTag("scraper_type", context.scraperType);
		if (context?.scrapeDate) scope.setTag("scrape_date", context.scrapeDate);

		if (error instanceof ScrapeError) {
			scope.setTag("course", error.courseName);
			scope.setTag("scraper_type", error.scraperType);
			scope.setExtra("scrape_date", error.scrapeDate);
		} else if (error instanceof ParseError) {
			scope.setTag("course", error.courseName);
			scope.setExtra("failed_field", error.field);
		} else if (error instanceof BrowserLaunchError) {
			scope.setTag("component", "browser");
		}

		if (context) {
			scope.setExtras(context);
		}

		Sentry.captureException(error);
	});
}

export function captureMessage(message: string, context?: LogContext, severity: Severity = "info") {
	Sentry.withScope((scope) => {
		scope.setLevel(severity);
		if (context) {
			scope.setExtras(context);
			if (context.courseName) scope.setTag("course", context.courseName);
		}
		Sentry.captureMessage(message);
	});
}
