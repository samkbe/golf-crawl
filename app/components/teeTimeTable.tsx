"use client";
import {
	useReactTable,
	getCoreRowModel,
	getSortedRowModel,
	flexRender,
	createColumnHelper,
	getFilteredRowModel,
	Row,
} from "@tanstack/react-table";
import { useState, useEffect } from "react";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import type { TeeTime } from "../types";
import type { SortingState, ColumnFiltersState } from "@tanstack/react-table";

const columnHelper = createColumnHelper<TeeTime>();

const columns = [
	columnHelper.accessor("courseName", {
		header: "Course",
		filterFn: (row: Row<TeeTime>, columnId: string, filterValue: string[]) => {
			if (!Array.isArray(filterValue)) return true;
			return filterValue.includes(row.getValue(columnId));
		},
	}),
	columnHelper.accessor("date", {
		header: "Date",
		cell: (info) => formatDate(info.getValue()),
		sortingFn: (a, b) =>
			new Date(a.original.date).getTime() - new Date(b.original.date).getTime(),
	}),
	columnHelper.accessor("openSlots", {
		header: "Open Slots",
	}),
	columnHelper.accessor("price", {
		header: "Price",
		cell: (info) => {
			const value = info.getValue();
			return typeof value === "number" ? `$${value}` : "N/A";
		},
		filterFn: (row: Row<TeeTime>, columnId: string, filterValue: [number, number]) => {
			if (!Array.isArray(filterValue) || filterValue.length !== 2) return true;
			const price = row.getValue(columnId);
			if (typeof price !== "number") return false;
			return price >= filterValue[0] && price <= filterValue[1];
		},
	}),
	columnHelper.accessor("bookingLink", {
		header: "Booking Link",
		enableSorting: false,
		cell: (info) => {
			const href = info.getValue<string | null | undefined>();
			if (!href) return <span className="text-gray-400">N/A</span>;

			return (
				<a
					href={href}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2"
				>
					Book
				</a>
			);
		},
	}),
];

export function TeeTimeTable({
	data,
	pending,
	courseNames,
}: {
	data: TeeTime[];
	pending: boolean;
	courseNames: string[];
}) {
	const [activeCourses, setActiveCourses] = useState<string[]>([]);
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);

	useEffect(() => {
		const unique = [...new Set(data.map((t) => t.courseName))];
		setActiveCourses(unique);
		setColumnFilters([{ id: "courseName", value: unique }]);
	}, [data]);

	function handleCourseToggle(values: string[]) {
		setActiveCourses(values);
		setColumnFilters((prev) => {
			const others = prev.filter((f) => f.id !== "courseName");
			return [...others, { id: "courseName", value: values }];
		});
	}

	function updatePriceFilter(range: [number, number]) {
		setPriceRange(range);
		setColumnFilters((prev) => {
			const others = prev.filter((f) => f.id !== "price");
			return [...others, { id: "price", value: range }];
		});
	}

	const table = useReactTable({
		data,
		columns,
		state: {
			sorting,
			columnFilters,
		},
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
	});

	return (
		<>
			{pending ? (
				<div className="rounded-md my-4 w-full mx-auto max-w-2xl p-4 bg-white/50 backdrop-blur-md animate-pulse-scale min-h-80 flex flex-col justify-center items-center gap-2">
					<h2 className="text-center font-bold">
						Loading Course Data. This may take a bit.
					</h2>
					<p className="text-center text-sm text-gray-600">
						Fetching: {courseNames.join(", ")}
					</p>
				</div>
			) : (
				<>
					<div className="rounded-md my-4 w-full mx-auto max-w-2xl p-4 bg-white/50 backdrop-blur-md">
						<h2 className="font-bold">Courses:</h2>
						<ToggleGroup
							type="multiple"
							variant="outline"
							value={activeCourses}
							onValueChange={handleCourseToggle}
							className="flex flex-wrap gap-2 my-4 justify-start"
						>
							{courseNames.map((course) => (
								<ToggleGroupItem
									key={course}
									value={course}
									className="rounded-xl px-4 py-2 font-bold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
								>
									{course}
								</ToggleGroupItem>
							))}
						</ToggleGroup>
						<div>
							<h2 className="font-bold">Filters:</h2>
							<Label className="block mt-2 mb-3">
								Price: ${priceRange[0]} &ndash; ${priceRange[1]}
							</Label>
							<Slider
								min={0}
								max={500}
								step={5}
								value={priceRange}
								onValueChange={(value) =>
									updatePriceFilter(value as [number, number])
								}
							/>
						</div>
					</div>
					<div className="overflow-x-auto max-h-80 border rounded-md mb-8 max-w-2xl w-full bg-white/50 backdrop-blur-md">
						<table className="min-w-full text-sm text-left border-collapse">
							<thead className="bg-gray-200 sticky top-0 z-10">
								{table.getHeaderGroups().map((headerGroup) => (
									<tr key={headerGroup.id}>
										{headerGroup.headers.map((header) => (
											<th
												key={header.id}
												className="p-2 cursor-pointer"
												onClick={header.column.getToggleSortingHandler()}
											>
												<div className="flex items-center gap-1">
													{flexRender(
														header.column.columnDef.header,
														header.getContext()
													)}
													{{
														asc: <ArrowUpIcon className="size-4" />,
														desc: <ArrowDownIcon className="size-4" />,
													}[header.column.getIsSorted() as string] ??
														null}
												</div>
											</th>
										))}
									</tr>
								))}
							</thead>
							<tbody>
								{table.getRowModel().rows.map((row) => (
									<tr key={row.id} className="border-t">
										{row.getVisibleCells().map((cell) => (
											<td key={cell.id} className="p-2">
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext()
												)}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</>
			)}
		</>
	);
}

function formatDate(date: Date | string): string {
	return new Intl.DateTimeFormat("en-US", {
		timeZone: "America/Chicago",
		month: "long",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	}).format(new Date(date));
}
