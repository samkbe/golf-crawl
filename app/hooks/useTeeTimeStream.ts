"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CourseStatus, TeeTime, TeeTimeStreamEvent } from "@/app/types";

type StreamState = {
	teeTimes: TeeTime[];
	statuses: Record<string, CourseStatus>;
	counts: Record<string, number>;
	pending: boolean;
	error: string;
};

const initialState: StreamState = {
	teeTimes: [],
	statuses: {},
	counts: {},
	pending: false,
	error: "",
};

export function useTeeTimeStream() {
	const [state, setState] = useState<StreamState>(initialState);
	const abortRef = useRef<AbortController | null>(null);

	useEffect(() => () => abortRef.current?.abort(), []);

	const start = useCallback(async (date: string, courseKeys: string[]) => {
		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;

		setState({
			teeTimes: [],
			statuses: Object.fromEntries(courseKeys.map((key) => [key, "loading" as const])),
			counts: {},
			pending: true,
			error: "",
		});

		const applyEvent = (event: TeeTimeStreamEvent) => {
			setState((prev) => {
				switch (event.type) {
					case "course":
						return {
							...prev,
							statuses: { ...prev.statuses, [event.key]: event.status },
							counts:
								event.status === "done"
									? { ...prev.counts, [event.key]: event.teeTimes.length }
									: prev.counts,
							teeTimes:
								event.status === "done"
									? [
											...prev.teeTimes,
											...event.teeTimes.map((tt) => ({
												...tt,
												date: new Date(tt.date),
												courseKey: event.key,
											})),
										]
									: prev.teeTimes,
						};
					case "fatal":
						return { ...prev, error: event.error };
					case "complete":
						return prev;
				}
			});
		};

		let completed = false;
		try {
			const res = await fetch("/api/tee-times", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ date, courses: courseKeys }),
				signal: controller.signal,
			});

			if (!res.ok || !res.body) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error || "Failed to fetch tee times");
			}

			const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
			let buffer = "";

			while (true) {
				const { value, done } = await reader.read();
				if (done) break;
				buffer += value;

				const lines = buffer.split("\n");
				buffer = lines.pop() ?? "";
				for (const line of lines) {
					if (!line.trim()) continue;
					const event = JSON.parse(line) as TeeTimeStreamEvent;
					if (event.type === "complete" || event.type === "fatal") completed = true;
					applyEvent(event);
				}
			}

			if (!completed) throw new Error("Connection lost before all courses finished");
		} catch (error) {
			if (controller.signal.aborted) return;
			setState((prev) => ({
				...prev,
				error: error instanceof Error ? error.message : "Failed to fetch tee times",
			}));
		} finally {
			if (abortRef.current === controller) {
				setState((prev) => ({
					...prev,
					pending: false,
					statuses: Object.fromEntries(
						Object.entries(prev.statuses).map(([key, status]) => [
							key,
							status === "loading" ? "failed" : status,
						])
					),
				}));
			}
		}
	}, []);

	return { ...state, start };
}
