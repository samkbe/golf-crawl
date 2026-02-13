"use client";
import { fetchTeeTimes } from "./actions";
import { useActionState } from "react";
import { useState } from "react";
import { TeeTimeTable } from "./components/teeTimeTable";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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
];

export default function Home() {
	const [state, formAction, pending] = useActionState(fetchTeeTimes, {
		teeTimes: [],
		error: "",
		isLoading: false,
	});

	const [allSelected, setAllSelected] = useState(false);

	return (
		<div className="flex flex-col items-center p-2 min-h-screen justify-center">
			<h1 className="mt-4 text-4xl font-bold">ATX Tee Times</h1>
			<form
				action={formAction}
				className="max-w-2xl rounded-lg p-4 mt-4 md:mx-auto bg-white/50 backdrop-blur-md"
			>
				<div className="flex items-center gap-2">
					<Label htmlFor="date">Date:</Label>
					<Input id="date" name="date" type="date" required className="w-auto" />
				</div>
				<div
					className={`flex flex-wrap my-4 gap-y-3 ${allSelected ? "opacity-25" : ""}`}
				>
					{courses.map(({ title, key }) => {
						return (
							<div className="basis-1/2 md:basis-1/3 flex items-center gap-2" key={key}>
								<Checkbox
									id={key}
									value={key}
									name="courses"
									disabled={allSelected}
								/>
								<Label htmlFor={key} className="text-nowrap cursor-pointer">
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
						onCheckedChange={(checked) => setAllSelected(checked === true)}
					/>
					<Label htmlFor="all" className="cursor-pointer">All Courses</Label>
				</div>
				<Button
					className="w-full"
					disabled={pending}
					type="submit"
				>
					{pending ? "Fetching Tee Times..." : "Find Tee Times"}
				</Button>
			</form>
			<TeeTimeTable data={state.teeTimes} pending={pending} />
		</div>
	);
}