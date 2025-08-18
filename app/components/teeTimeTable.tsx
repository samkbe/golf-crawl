"use client";
import {
	useReactTable,
	getCoreRowModel,
	getSortedRowModel,
	flexRender,
	createColumnHelper,
	getFilteredRowModel,
} from "@tanstack/react-table";
import { useState, useEffect } from "react";
import type { TeeTime } from "../types";
import type { SortingState, ColumnFiltersState } from "@tanstack/react-table";

const columnHelper = createColumnHelper<TeeTime>();

const columns = [
	columnHelper.accessor("courseName", {
		header: "Course",
		filterFn: (row: any, columnId: string, filterValue: string[]) => {
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
		filterFn: (row: any, columnId: string, filterValue: string[]) => {
			if (typeof filterValue !== "number") return true;
			const price = row.getValue(columnId);
			if (typeof price !== "number") return false;
			return price <= filterValue;
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

export function TeeTimeTable({ data, pending }: { data: TeeTime[]; pending: boolean }) {
	console.log("data: ", data);
	useEffect(() => {
		const map: { [key: string]: boolean } = {};
		for (let course of data) {
			if (!map[course.courseName]) {
				map[course.courseName] = true;
			}
		}
		const newArr = Object.keys(map).map((course) => {
			return {
				course: course,
				active: true,
			};
		});
		setSelectedCourses(newArr);

		setColumnFilters([
			{
				id: "courseName",
				value: Object.keys(map),
			},
		]);
	}, [data]);

	const [selectedCourses, setSelectedCourses] = useState<{ active: boolean; course: string }[]>(
		[]
	);
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [maxPrice, setMaxPrice] = useState(500);

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

	function updatePriceFilter(max: number) {
		setColumnFilters((prev) => {
			const others = prev.filter((f) => f.id !== "price");
			return [
				...others,
				{
					id: "price",
					value: max,
				},
			];
		});
	}

	return (
		<>
			{pending ? (
				<div className="rounded-md my-4 w-full mx-auto max-w-2xl p-4 bg-white/50 backdrop-blur-md animate-pulse-scale min-h-80 flex justify-center items-center">
					<h2 className="text-center font-bold">
						Loading Course Data. This may take a bit.
					</h2>
				</div>
			) : (
				<>
					<div className="rounded-md my-4 w-full mx-auto max-w-2xl p-4 bg-white/50 backdrop-blur-md">
						<h2 className="font-bold">Courses:</h2>
						<div className="flex my-4 flex-wrap gap-2">
							{selectedCourses.map(({ course, active }) => {
								return (
									<div
										onClick={() => {
											setSelectedCourses((prevArr) => {
												const newArr = prevArr.map((item) =>
													item.course === course
														? { ...item, active: !item.active }
														: item
												);

												const activeCourses = newArr
													.filter((item) => item.active)
													.map((item) => item.course);

												setColumnFilters([
													{
														id: "courseName",
														value: activeCourses,
													},
												]);

												return newArr;
											});
										}}
										key={course}
										className={`cursor-pointer py-2 px-4 font-bold rounded-xl border inline-block ${
											active
												? "bg-green-700 text-white"
												: "bg-transparent text-black"
										}`}
									>
										{course}
									</div>
								);
							})}
						</div>
						<div>
							<h2 className="font-bold">Filters:</h2>
							<label className="pr-5" htmlFor="maxPrice">
								Max Price: ${maxPrice}
							</label>
							<input
								className="pl-5 block accent-green-700"
								id="maxPrice"
								type="range"
								min="0"
								max="500"
								value={maxPrice}
								onChange={(e) => {
									const newMax = Number(e.target.value);
									setMaxPrice(newMax);
									updatePriceFilter(newMax);
								}}
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
												{flexRender(
													header.column.columnDef.header,
													header.getContext()
												)}
												{{
													asc: " 🔼",
													desc: " 🔽",
												}[header.column.getIsSorted() as string] ?? null}
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
