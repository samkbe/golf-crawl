"use client";
import { fetchTeeTimes } from "@/app/actions";
import { useActionState, useEffect } from "react";
import { useState } from "react";
import { TeeTimeTable } from "@/app/components/teeTimeTable";
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
	{ title: "Forest Creek", key: "forestCreek" },
];

export default function Home() {
	const [state, formAction, pending] = useActionState(fetchTeeTimes, {
		teeTimes: [],
		error: "",
		isLoading: false,
	});

	const [date, setDate] = useState<Date>();
	const [allSelected, setAllSelected] = useState(false);
	const [hasSubmitted, setHasSubmitted] = useState(false);
	const [selectedCourseNames, setSelectedCourseNames] = useState<string[]>([]);
	const [openSteps, setOpenSteps] = useState<string[]>(["date", "courses"]);
	const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set());

	const selectedCount = allSelected ? courses.length : checkedKeys.size;

	useEffect(() => {
		if (state.error) {
			if (state.teeTimes.length > 0) {
				toast.warning(state.error);
			} else {
				toast.error(state.error);
			}
		}
	}, [state.error, state.teeTimes]);

	function handleCheckChange(key: string, checked: boolean) {
		setCheckedKeys((prev) => {
			const next = new Set(prev);
			if (checked) next.add(key);
			else next.delete(key);
			return next;
		});
	}

	return (
		<div className="min-h-screen p-2 md:p-4 max-w-7xl mx-auto">
			<h1 className="text-4xl font-bold text-center mt-4 mb-4">ATX Tee Times</h1>
			<div className="flex flex-col md:flex-row md:gap-4 md:items-start">
				<form
					action={formAction}
					onSubmit={(e) => {
						setHasSubmitted(true);
						const formData = new FormData(e.currentTarget);
						if (formData.get("all") === "on") {
							setSelectedCourseNames(courses.map((c) => c.title));
						} else {
							const selectedKeys = formData.getAll("courses") as string[];
							setSelectedCourseNames(
								courses.filter((c) => selectedKeys.includes(c.key)).map((c) => c.title)
							);
						}
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
								<div className={`flex flex-wrap gap-y-3 pt-2 ${allSelected ? "opacity-25" : ""}`}>
									{courses.map(({ title, key }) => (
										<div
											className="basis-1/2 flex items-center gap-2"
											key={key}
										>
											<Checkbox
												id={key}
												value={key}
												name="courses"
												disabled={allSelected}
												checked={allSelected || checkedKeys.has(key)}
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
								<div className="mt-4 flex items-center justify-center gap-2">
								<Checkbox
									id="all"
									name="all"
									checked={allSelected}
									className="h-6 w-6 md:h-4 md:w-4"
									onCheckedChange={(checked) => setAllSelected(checked === true)}
								/>
									<Label htmlFor="all" className="text-md cursor-pointer">
										All Courses
									</Label>
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
							<TeeTimeTable
								data={state.teeTimes}
								pending={pending}
								courseNames={selectedCourseNames}
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
		</div>
	);
}
