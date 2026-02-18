"use client";
import { fetchTeeTimes } from "@/app/actions";
import { useActionState, useEffect } from "react";
import { useState } from "react";
import { TeeTimeTable } from "@/app/components/teeTimeTable";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { ErrorBoundary } from "@/app/components/errorBoundary";
import { format } from "date-fns";
import { ChevronDownIcon } from "lucide-react";

const courses = [
	{
		title: "Crystal Falls",
		key: "crystalFalls",
	},
	{
		title: "Shadow Glen",
		key: "shadowGlen",
	},
	{
		title: "Harvey Penick",
		key: "harveyPenick",
	},
	{
		title: "Falconhead",
		key: "falconhead",
	},
	{
		title: "Avery Ranch",
		key: "averyRanch",
	},
	{
		title: "Teravista",
		key: "teravista",
	},
	{
		title: "Lions",
		key: "lions",
	},
	{
		title: "Morris Williams",
		key: "morrisWilliams",
	},
	{
		title: "Roy Kizer",
		key: "royKizer",
	},
	{
		title: "Jimmy Clay",
		key: "jimmyClay",
	},
	{
		title: "Riverside",
		key: "riverside",
	}
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

	useEffect(() => {
		if (state.error) {
			if (state.teeTimes.length > 0) {
				toast.warning(state.error);
			} else {
				toast.error(state.error);
			}
		}
	}, [state.error, state.teeTimes]);

	return (
		<div className="flex flex-col items-center p-2 min-h-screen justify-center">
			<h1 className="mt-4 text-4xl font-bold">ATX Tee Times</h1>
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
				className="max-w-2xl rounded-lg p-4 mt-4 md:mx-auto bg-white/50 backdrop-blur-md text-md"
			>
				<div className="flex items-center gap-2 justify-center">
					<input type="hidden" name="date" value={date ? format(date, "yyyy-MM-dd") : ""} />
					<Popover>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								type="button"
								data-empty={!date}
								className="data-[empty=true]:text-muted-foreground w-[212px] justify-between text-left font-normal"
							>
								{date ? format(date, "PPP") : <span>Pick a date</span>}
								<ChevronDownIcon />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-0" align="start">
							<Calendar
								mode="single"
								selected={date}
								onSelect={setDate}
								defaultMonth={date}
							/>
						</PopoverContent>
					</Popover>
				</div>
				<div className={`flex flex-wrap my-4 gap-y-3 ${allSelected ? "opacity-25" : ""}`}>
					{courses.map(({ title, key }) => {
						return (
							<div
								className="basis-1/2 md:basis-1/3 flex items-center gap-2"
								key={key}
							>
								<Checkbox
									id={key}
									value={key}
									name="courses"
									disabled={allSelected}
									className="h-6 w-6 md:h-4 md:w-4"
									/>
								<Label htmlFor={key} className="text-md text-nowrap cursor-pointer">
									{title}
								</Label>
							</div>
						);
					})}
				</div>
				<div className="my-4 flex items-center justify-center gap-2">
					<Checkbox
						id="all"
						name="all"
						className="h-6 w-6 md:h-4 md:w-4"
						onCheckedChange={(checked) => setAllSelected(checked === true)}
					/>
					<Label htmlFor="all" className="text-md cursor-pointer">
						All Courses
					</Label>
				</div>
				<Button className="w-full text-md" disabled={pending} type="submit">
					{pending ? "Fetching Tee Times..." : "Find Tee Times"}
				</Button>
			</form>
			{hasSubmitted && (
				<ErrorBoundary>
					<TeeTimeTable
						data={state.teeTimes}
						pending={pending}
						courseNames={selectedCourseNames}
					/>
				</ErrorBoundary>
			)}
		</div>
	);
}
