"use client";
import { CheckIcon, Loader2Icon, XIcon } from "lucide-react";
import type { CourseStatus } from "@/app/types";

const chipBase = "flex items-center gap-1.5 rounded-xl border px-3 py-1 text-sm";

export function CourseProgress({
	courses,
	statuses,
	counts,
	pending,
	hiddenKeys,
	onToggle,
}: {
	courses: { title: string; key: string }[];
	statuses: Record<string, CourseStatus>;
	counts: Record<string, number>;
	pending: boolean;
	hiddenKeys: Set<string>;
	onToggle: (key: string) => void;
}) {
	const tracked = courses.filter((course) => statuses[course.key]);
	if (tracked.length === 0) return null;

	const finished = tracked.filter((course) => statuses[course.key] !== "loading").length;

	return (
		<div className="rounded-md mb-4 w-full p-4 bg-white/50 backdrop-blur-md">
			<h2 className="font-bold">
				{pending ? `Checking courses (${finished}/${tracked.length})` : "Courses"}
			</h2>
			<ul className="flex flex-wrap gap-2 mt-3">
				{tracked.map(({ title, key }) => {
					const status = statuses[key];
					const count = counts[key] ?? 0;

					if (status === "done" && count > 0) {
						const visible = !hiddenKeys.has(key);
						return (
							<li key={key}>
								<button
									type="button"
									aria-pressed={visible}
									onClick={() => onToggle(key)}
									className={`${chipBase} font-bold transition-colors ${
										visible
											? "border-primary bg-primary text-primary-foreground"
											: "border-gray-300 bg-white/60 text-gray-500 hover:bg-gray-100"
									}`}
								>
									<span>{title}</span>
									<span className="font-normal opacity-80">({count})</span>
								</button>
							</li>
						);
					}

					return (
						<li
							key={key}
							className={`${chipBase} ${
								status === "failed"
									? "border-red-300 text-red-700"
									: status === "done"
										? "border-gray-300 text-gray-500"
										: "border-gray-200 text-gray-500"
							}`}
						>
							{status === "loading" && <Loader2Icon className="size-3.5 animate-spin" />}
							{status === "done" && <CheckIcon className="size-3.5" />}
							{status === "failed" && <XIcon className="size-3.5" />}
							<span>{title}</span>
							{status === "done" && <span>(0)</span>}
						</li>
					);
				})}
			</ul>
		</div>
	);
}
