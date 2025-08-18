import { fromZonedTime } from "date-fns-tz";

const TZ = "America/Chicago";

function parseTime12h(input: string): { hour: number; minute: number } {
	const m = input
		.trim()
		.toUpperCase()
		.match(/^(\d{1,2})(?::(\d{2}))?\s*([AP]M)$/);
	if (!m) throw new Error(`Invalid time: ${input}`);
	const [, hStr, minStr = "00", mer] = m;
	let hour = parseInt(hStr, 10) % 12;
	if (mer === "PM") hour += 12;
	const minute = parseInt(minStr, 10);
	return { hour, minute };
}

export function mergeDateWithTime(dateString: string, timeString: string): Date {
	const { hour, minute } = parseTime12h(timeString); // handles "2:36 PM"
	const localISO = `${dateString}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
	return fromZonedTime(localISO, TZ); // returns a UTC Date representing Chicago wall time
}

export function mergeDateWithTimeAlt(dateString: string, timeString: string): Date {
	// works for "2:36pm" / "2pm" too — same parser covers it
	return mergeDateWithTime(dateString, timeString);
}

export function toMmDdYyyy(isoDate: string): string {
	// isoDate expected: "YYYY-MM-DD"
	const m = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!m) throw new Error(`Invalid date: ${isoDate}`);
	const [, y, mm, dd] = m;
	return `${mm}/${dd}/${y}`;
}

export function toMmDdYyyyDash(s: string): string {
	// Accept "YYYY-MM-DD", "MM-DD-YYYY", or "MM/DD/YYYY" and output "MM-DD-YYYY"
	let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/); // ISO
	if (m) return `${m[2]}-${m[3]}-${m[1]}`;

	m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/); // already dashed
	if (m) return `${m[1]}-${m[2]}-${m[3]}`;

	m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); // slashed
	if (m) return `${m[1]}-${m[2]}-${m[3]}`;

	throw new Error(`Unexpected date format: ${s}`);
}
