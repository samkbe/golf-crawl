import type { Platform, TeeTimeStreamEvent } from "@/app/types";
import { courses } from "@/app/courses";
import { captureError } from "@/app/lib/logger";
import { launchBrowser } from "@/app/scrape/browser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAME_PLATFORM_DELAY_MS = 1500;

export async function POST(req: Request) {
	const body = await req.json().catch(() => null);
	const dateString: unknown = body?.date;
	const courseKeys: unknown = body?.courses;

	if (!dateString || typeof dateString !== "string") {
		return Response.json({ error: "Date is required" }, { status: 400 });
	}
	if (isNaN(new Date(dateString).getTime())) {
		return Response.json({ error: "Invalid date format" }, { status: 400 });
	}
	if (!Array.isArray(courseKeys) || courseKeys.length === 0) {
		return Response.json({ error: "Select at least one course" }, { status: 400 });
	}

	const selectedCourses = courses.filter((course) => courseKeys.includes(course.key));

	// Groups courses by platform to avoid rate limits on the same domain
	const groups = new Map<Platform, typeof selectedCourses>();
	for (const course of selectedCourses) {
		const group = groups.get(course.platform) ?? [];
		group.push(course);
		groups.set(course.platform, group);
	}

	const encoder = new TextEncoder();

	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			let closed = false;
			const send = (event: TeeTimeStreamEvent) => {
				if (closed || req.signal.aborted) return;
				try {
					controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
				} catch {
					closed = true;
				}
			};

			let browser: Awaited<ReturnType<typeof launchBrowser>> | undefined;
			try {
				browser = await launchBrowser();
				const activeBrowser = browser;

				// Runs each platform group in parallel, but serialize within each group
				await Promise.allSettled(
					[...groups.values()].map(async (group) => {
						for (let i = 0; i < group.length; i++) {
							if (req.signal.aborted) return;
							const course = group[i];

							if (i > 0) {
								await new Promise((r) => setTimeout(r, SAME_PLATFORM_DELAY_MS));
							}

							try {
								const result =
									course.platform === "golfatx"
										? await course.fetchFunction(dateString, activeBrowser, course.key)
										: await course.fetchFunction(dateString, activeBrowser);
								send({ type: "course", key: course.key, status: "done", teeTimes: result ?? [] });
							} catch {
								send({ type: "course", key: course.key, status: "failed" });
							}
						}
					})
				);

				send({ type: "complete" });
			} catch (error) {
				captureError(error, { scrapeDate: dateString }, "fatal");
				send({ type: "fatal", error: "An unexpected error occurred. Please try again." });
			} finally {
				await browser?.close().catch(() => {});
				closed = true;
				try {
					controller.close();
				} catch {
					// Stream was already cancelled by the client
				}
			}
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "application/x-ndjson; charset=utf-8",
			"Cache-Control": "no-store",
		},
	});
}
