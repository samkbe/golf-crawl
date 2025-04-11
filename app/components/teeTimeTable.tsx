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

const includesFilterFn = (row: any, columnId: string, filterValue: string[]) => {
	if (!Array.isArray(filterValue)) return true;
	return filterValue.includes(row.getValue(columnId));
};

const columnHelper = createColumnHelper<TeeTime>();

const columns = [
	columnHelper.accessor("courseName", {
		header: "Course",
		filterFn: includesFilterFn, // <-- use the string name you registered
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
		cell: (info) => info.getValue() ?? "N/A",
	}),
];

export function TeeTimeTable({ data, pending }: { data: TeeTime[]; pending: boolean }) {
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
				value: Object.keys(courseMap),
			},
		]);
	}, [data]);

	const [selectedCourses, setSelectedCourses] = useState<{ active: boolean; course: string }[]>(
		[]
	);
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState([]);

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
		filterFns: {
			includes: includesFilterFn,
		},
	});

	return (
		<>
			<div className="border rounded-md my-4 mx-2 md:mx-auto max-w-2xl p-4">
				<h2 className="text-center bold">Filters</h2>
				<div>
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
								className={`cursor-pointer p-2 rounded-xl border inline-block ${
									active ? "bg-teal-300" : "bg-teal-50"
								}`}
							>
								{course}
							</div>
						);
					})}
				</div>
				<div>
					<label htmlFor="priceRange">Price</label>
					<input id="priceRange" type="range" min="0" max="500" />
				</div>
			</div>
			<div className="overflow-x-auto border rounded-md mt-4 mb-8 mx-2 md:mx-auto max-w-2xl">
				<table className="min-w-full text-sm text-left border-collapse">
					<thead className="bg-gray-200">
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
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
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
