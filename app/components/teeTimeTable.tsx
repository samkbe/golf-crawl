'use client';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { useState } from 'react';
import type { TeeTime } from '../types';
import type { SortingState } from '@tanstack/react-table';

const columnHelper = createColumnHelper<any>();

const columns = [
  columnHelper.accessor('courseName', {
    header: 'Course',
  }),
  columnHelper.accessor('date', {
    header: 'Date',
    cell: info => formatDate(info.getValue()),
    sortingFn: (a, b) => new Date(a.original.date).getTime() - new Date(b.original.date).getTime(),
  }),
  columnHelper.accessor('openSlots', {
    header: 'Open Slots',
  }),
  columnHelper.accessor('price', {
    header: 'Price',
    cell: info => info.getValue() ?? 'N/A',
  }),
];

export function TeeTimeTable({ data }: { data: TeeTime[] }) {
    
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
  });

  return (
    <div className="overflow-x-auto border rounded-md mt-4 mb-8 mx-2 md:mx-auto max-w-2xl">
      <table className="min-w-full text-sm text-left border-collapse">
        <thead className="bg-gray-200">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th
                  key={header.id}
                  className="p-2 cursor-pointer"
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {{
                    asc: ' 🔼',
                    desc: ' 🔽',
                  }[header.column.getIsSorted() as string] ?? null}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="border-t">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="p-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
}
