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
import { useState } from "react";
import { ArrowUpIcon, ArrowDownIcon, Loader2Icon } from "lucide-react";
import { Slider } from "@/components/ui/slider";

import { Label } from "@/components/ui/label";
import type { TeeTime } from "@/app/types";
import type { SortingState, ColumnFiltersState } from "@tanstack/react-table";

const columnHelper = createColumnHelper<TeeTime>();

const columns = [
	columnHelper.accessor("courseName", {
		header: "Course",
	}),
	columnHelper.accessor("date", {
		header: "Date",
		cell: (info) => formatDate(info.getValue()),
		sortingFn: (a, b) =>
			new Date(a.original.date).getTime() - new Date(b.original.date).getTime(),
		filterFn: (row: Row<TeeTime>, _columnId: string, filterValue: [number, number]) => {
			if (!Array.isArray(filterValue) || filterValue.length !== 2) return true;
			const minutes = dateToChicagoMinutes(new Date(row.original.date));
			return minutes >= filterValue[0] && minutes <= filterValue[1];
		},
	}),
	columnHelper.accessor("openSlots", {
		header: "Open Slots",
		filterFn: (row: Row<TeeTime>, columnId: string, filterValue: [number, number]) => {
			if (!Array.isArray(filterValue) || filterValue.length !== 2) return true;
			const raw = row.getValue(columnId);
			const num = openSlotsToNumber(raw);
			return num >= filterValue[0] && num <= filterValue[1];
		},
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
}: {
	data: TeeTime[];
	pending: boolean;
}) {
	const [sorting, setSorting] = useState<SortingState>([{ id: "date", desc: false }]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [priceRange, setPriceRange] = useState<[number, number]>([0, 300]);
	const TIME_MIN = 5 * 60;
	const TIME_MAX = 21 * 60;
	const [timeRange, setTimeRange] = useState<[number, number]>([TIME_MIN, TIME_MAX]);
	const [openSlotsRange, setOpenSlotsRange] = useState<[number, number]>([1, 4]);

	function updatePriceFilter(range: [number, number]) {
		setPriceRange(range);
		setColumnFilters((prev) => {
			const others = prev.filter((f) => f.id !== "price");
			return [...others, { id: "price", value: range }];
		});
	}

	function updateTimeFilter(range: [number, number]) {
		setTimeRange(range);
		setColumnFilters((prev) => {
			const others = prev.filter((f) => f.id !== "date");
			if (range[0] === TIME_MIN && range[1] === TIME_MAX) return others;
			return [...others, { id: "date", value: range }];
		});
	}

	function updateOpenSlotsFilter(range: [number, number]) {
		setOpenSlotsRange(range);
		setColumnFilters((prev) => {
			const others = prev.filter((f) => f.id !== "openSlots");
			if (range[0] === 1 && range[1] === 4) return others;
			return [...others, { id: "openSlots", value: range }];
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
				<TableSkeleton />
			) : (
				<>
					<div className="rounded-md mb-4 w-full p-4 bg-white/50 backdrop-blur-md">
					<div>
						<h2 className="font-bold">Filters:</h2>
						<div className="flex flex-col sm:flex-row gap-6 mt-2">
							<div className="w-full sm:flex-1 sm:min-w-0 sm:basis-0">
								<Label className="block mb-3">
									Price: ${priceRange[0]} &ndash; ${priceRange[1]}
								</Label>
								<Slider
									min={0}
									max={300}
									step={5}
									value={priceRange}
									onValueChange={(value) =>
										updatePriceFilter(value as [number, number])
									}
								/>
							</div>
							<div className="w-full sm:flex-1 sm:min-w-0 sm:basis-0">
								<Label className="block mb-3">
									Time: {minutesToLabel(timeRange[0])} &ndash; {minutesToLabel(timeRange[1])}
								</Label>
								<Slider
									min={TIME_MIN}
									max={TIME_MAX}
									step={30}
									value={timeRange}
									onValueChange={(value) =>
										updateTimeFilter(value as [number, number])
									}
								/>
							</div>
							<div className="w-full sm:flex-1 sm:min-w-0 sm:basis-0">
								<Label className="block mb-3">
									Open Slots: {openSlotsRange[0]} &ndash; {openSlotsRange[1]}
								</Label>
								<Slider
									min={1}
									max={4}
									step={1}
									value={openSlotsRange}
									onValueChange={(value) =>
										updateOpenSlotsFilter(value as [number, number])
									}
								/>
							</div>
						</div>
					</div>
					</div>
					<div className="overflow-x-auto max-h-[70vh] border rounded-md w-full bg-white/50 backdrop-blur-md">
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

const SKELETON_HEADERS = ["Course", "Date", "Open Slots", "Price", "Booking Link"];
const SKELETON_ROWS = 8;
const SKELETON_WIDTHS = [
	["w-32", "w-36", "w-8", "w-10"],
	["w-40", "w-32", "w-6", "w-12"],
	["w-28", "w-36", "w-10", "w-10"],
	["w-36", "w-28", "w-8", "w-8"],
];

function TableSkeleton() {
	return (
		<div role="status" aria-live="polite">
			<div className="flex items-center gap-2 mb-3 px-1 text-sm font-medium text-gray-700">
				<Loader2Icon className="size-4 animate-spin text-primary" />
				<span>Loading course data</span>
			</div>
			<div className="overflow-x-auto border rounded-md w-full bg-white/50 backdrop-blur-md">
				<table className="min-w-full text-sm text-left border-collapse">
					<thead className="bg-gray-200">
						<tr>
							{SKELETON_HEADERS.map((header) => (
								<th key={header} className="p-2 text-gray-500">
									{header}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="animate-pulse">
						{Array.from({ length: SKELETON_ROWS }, (_, i) => {
							const widths = SKELETON_WIDTHS[i % SKELETON_WIDTHS.length];
							return (
								<tr key={i} className="border-t">
									{widths.map((width, j) => (
										<td key={j} className="p-2">
											<div className={`h-4 rounded bg-gray-300/70 ${width}`} />
										</td>
									))}
									<td className="p-2">
										<div className="h-8 w-14 rounded-md bg-gray-300/70" />
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
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

function minutesToLabel(minutes: number): string {
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	const period = h >= 12 ? "PM" : "AM";
	const h12 = h % 12 || 12;
	return m === 0 ? `${h12} ${period}` : `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function dateToChicagoMinutes(date: Date): number {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: "America/Chicago",
		hour: "numeric",
		minute: "2-digit",
		hour12: false,
	}).formatToParts(date);
	const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
	const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
	return hour * 60 + minute;
}

function openSlotsToNumber(value: unknown): number {
	if (value == null) return 0;
	const s = String(value).trim();
	const n = parseInt(s, 10);
	if (!Number.isNaN(n)) return n;
	const first = parseInt(s.replace(/[^0-9].*$/, ""), 10);
	return Number.isNaN(first) ? 0 : first;
}
