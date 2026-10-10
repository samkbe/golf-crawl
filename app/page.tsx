"use client";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { TeeTimeTable } from "@/app/components/teeTimeTable";
import { CourseProgress } from "@/app/components/courseProgress";
import { useTeeTimeStream } from "@/app/hooks/useTeeTimeStream";
import logo from "@/app/logo.png";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { ErrorBoundary } from "@/app/components/errorBoundary";
import { format } from "date-fns";
import { CheckIcon } from "lucide-react";

const courses = [
	{ title: "Crystal Falls", key: "crystalFalls" },
	{ title: "Shadow Glen", key: "shadowGlen" },
	{ title: "Harvey Penick", key: "harveyPenick" },
	{ title: "Falconhead", key: "falconhead" },
	{ title: "Avery Ranch", key: "averyRanch" },
	{ title: "Teravista", key: "teravista" },
	{ title: "Lions", key: "lions" },
	{ title: "Morris Williams", key: "morrisWilliams" },
	{ title: "Roy Kizer", key: "royKizer" },
	{ title: "Jimmy Clay", key: "jimmyClay" },
	{ title: "Riverside", key: "riverside" },
	{ title: "Colovista", key: "colovista" },
	{ title: "Star Ranch", key: "starRanch" },
	{ title: "Double J Ranch", key: "doubleJRanch" },
	{ title: "Kissing Tree", key: "kissingTree" },
	{ title: "Forest Creek", key: "forestCreek" },
	{ title: "Grey Rock", key: "greyRock" },
	{ title: "Lost Pines", key: "lostPines" },
	{ title: "Plum Creek", key: "plumCreek" },
];

export default function Home() {
	const { teeTimes, statuses, counts, pending, error, start } = useTeeTimeStream();

	const [date, setDate] = useState<Date>();
	const [hasSubmitted, setHasSubmitted] = useState(false);
	const [openSteps, setOpenSteps] = useState<string[]>(["date"]);
	const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set());
	const [hiddenCourseKeys, setHiddenCourseKeys] = useState<Set<string>>(new Set());

	const selectedCount = checkedKeys.size;

	const visibleTeeTimes = useMemo(
		() => teeTimes.filter((t) => !t.courseKey || !hiddenCourseKeys.has(t.courseKey)),
		[teeTimes, hiddenCourseKeys]
	);

	function toggleCourseVisibility(key: string) {
		setHiddenCourseKeys((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	}

	const wasPending = useRef(false);
	useEffect(() => {
		const justFinished = wasPending.current && !pending;
		wasPending.current = pending;
		if (!justFinished) return;

		const failedTitles = courses
			.filter((c) => statuses[c.key] === "failed")
			.map((c) => c.title);

		if (error) {
			toast.error(error);
		} else if (teeTimes.length === 0 && failedTitles.length > 0) {
			toast.error(`Failed to fetch tee times for: ${failedTitles.join(", ")}`);
		} else if (teeTimes.length === 0) {
			toast.error("No tee times found for the selected courses");
		} else if (failedTitles.length > 0) {
			toast.warning(`Could not load: ${failedTitles.join(", ")}`);
		}
	}, [pending, error, statuses, teeTimes.length]);

	function handleCheckChange(key: string, checked: boolean) {
		setCheckedKeys((prev) => {
			const next = new Set(prev);
			if (checked) next.add(key);
			else next.delete(key);
			return next;
		});
	}

	return (
		<div className="min-h-screen flex flex-col p-2 md:p-4 max-w-7xl mx-auto">
			<div className="flex justify-center md:justify-start mt-4 mb-4">
				<Image
					src={logo}
					alt="ATX Tee Times"
					className="h-12 md:h-20 w-auto object-contain"
					priority
				/>
			</div>
			<div className="flex flex-col md:flex-row md:gap-4 md:items-start">
				<form
					onSubmit={(e) => {
						e.preventDefault();
						const formData = new FormData(e.currentTarget);
						const dateValue = formData.get("date");
						const selectedKeys = formData.getAll("courses") as string[];

						if (typeof dateValue !== "string" || !dateValue) {
							toast.error("Date is required");
							return;
						}
						if (selectedKeys.length === 0) {
							toast.error("Select at least one course");
							return;
						}

						setHasSubmitted(true);
						setHiddenCourseKeys(new Set());
						start(dateValue, selectedKeys);
					}}
					className="w-full md:w-1/4 md:min-w-[280px] shrink-0 rounded-lg p-4 bg-white/50 backdrop-blur-md text-md"
				>
					<input
						type="hidden"
						name="date"
						value={date ? format(date, "yyyy-MM-dd") : ""}
					/>

					<Accordion
						type="multiple"
						value={openSteps}
						onValueChange={setOpenSteps}
					>
						<AccordionItem value="date">
							<AccordionTrigger className="text-base font-semibold hover:no-underline">
								<div className="flex items-center gap-2">
									<span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
										{date ? <CheckIcon className="h-3.5 w-3.5" /> : "1"}
									</span>
									<span>{date ? format(date, "PPP") : "Pick a Date"}</span>
								</div>
							</AccordionTrigger>
							<AccordionContent>
								<div className="flex justify-center pt-2">
								<Calendar
									mode="single"
									selected={date}
									onSelect={setDate}
									defaultMonth={date}
									disabled={{ before: new Date() }}
								/>
								</div>
							</AccordionContent>
						</AccordionItem>

						<AccordionItem value="courses" className="border-b-0">
							<AccordionTrigger className="text-base font-semibold hover:no-underline">
								<div className="flex items-center gap-2">
									<span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
										{selectedCount > 0 ? <CheckIcon className="h-3.5 w-3.5" /> : "2"}
									</span>
									<span>
										Select Courses
										{selectedCount > 0 && (
											<span className="ml-1 font-normal text-muted-foreground">
												({selectedCount})
											</span>
										)}
									</span>
								</div>
							</AccordionTrigger>
							<AccordionContent>
								<div className="flex flex-wrap gap-y-3 pt-2">
									{courses.map(({ title, key }) => (
										<div
											className="basis-1/2 flex items-center gap-2"
											key={key}
										>
											<Checkbox
												id={key}
												value={key}
												name="courses"
												checked={checkedKeys.has(key)}
												onCheckedChange={(checked) =>
													handleCheckChange(key, checked === true)
												}
												className="h-6 w-6 md:h-4 md:w-4"
											/>
											<Label htmlFor={key} className="text-md text-nowrap cursor-pointer">
												{title}
											</Label>
										</div>
									))}
								</div>
								<div className="mt-4 flex justify-center">
									<button
										type="button"
										onClick={() => setCheckedKeys((prev) =>
											prev.size === courses.length ? new Set() : new Set(courses.map((c) => c.key))
										)}
										className="text-xs px-3 py-1 rounded border font-medium hover:bg-gray-100"
									>
										Select All
									</button>
								</div>
							</AccordionContent>
						</AccordionItem>
					</Accordion>

					<Button className="w-full text-md mt-4" disabled={pending} type="submit">
						{pending ? "Fetching Tee Times..." : "Find Tee Times"}
					</Button>
				</form>

				<div className="w-full md:w-3/4 mt-4 md:mt-0">
					{hasSubmitted ? (
						<ErrorBoundary>
							<CourseProgress
								courses={courses}
								statuses={statuses}
								counts={counts}
								pending={pending}
								hiddenKeys={hiddenCourseKeys}
								onToggle={toggleCourseVisibility}
							/>
							<TeeTimeTable
								data={visibleTeeTimes}
								pending={pending && teeTimes.length === 0}
							/>
						</ErrorBoundary>
					) : (
						<div className="hidden md:flex items-center justify-center rounded-lg bg-white/50 backdrop-blur-md min-h-[400px]">
							<p className="text-muted-foreground">
								Select a date and courses to find tee times
							</p>
						</div>
					)}
				</div>
			</div>
			<footer className="mt-auto pt-8 mb-4 text-center text-sm text-muted-foreground space-y-1">
				<p>
					Built by Sam B &middot;{" "}
					<a href="mailto:atxteetimessupport@gmail.com" className="underline hover:text-foreground">
						atxteetimessupport@gmail.com
					</a>
				</p>
				<p>
					<a
						href="https://buymeacoffee.com/samkbe"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-1 underline hover:text-foreground"
					>
						☕ Buy Me a Coffee
					</a>
				</p>
			</footer>
		</div>
	);
}
