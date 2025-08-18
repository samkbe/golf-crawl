import { fromZonedTime, toZonedTime, formatInTimeZone } from "date-fns-tz";

const TZ = "America/Chicago";

function parseTime12h(input: string): { hour: number; minute: number } {
	const m = input
		.trim()
		.toUpperCase()
		.match(/^(\d{1,2})(?::(\d{2}))?\s*([AP]M)$/);
	if (!m) throw new Error(`Invalid time: ${input}`);
	let [, hStr, minStr = "00", mer] = m;
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

// export function mergeDateWithTime(dateString: string, timeString: string): Date {
// 	const [y, m, d] = dateString.split("-").map(Number);

// 	const [t, mer] = timeString.trim().split(" ");
// 	const [hhStr, mmStr] = t.split(":");
// 	let h = parseInt(hhStr, 10) % 12;
// 	if (mer.toUpperCase() === "PM") h += 12;

// 	const date = new Date(y, m - 1, d, h, parseInt(mmStr, 10), 0, 0);
// 	return date;
// }

// export function mergeDateWithTimeAlt(date: string, timeString: string): Date {
// 	// Parse the time string ("2:36pm") into hours and minutes

// 	const modifier = timeString.slice(-2).toUpperCase(); // Extracts "AM" or "PM"
// 	const time = timeString.slice(0, -2); // Removes the AM/PM part

// 	const [hoursStr, minutesStr] = time.split(":");
// 	let hours = parseInt(hoursStr, 10);
// 	const minutes = parseInt(minutesStr, 10);

// 	// Convert to 24-hour format
// 	if (modifier === "PM" && hours !== 12) {
// 		hours += 12;
// 	} else if (modifier === "AM" && hours === 12) {
// 		hours = 0;
// 	}

// 	// Create new Date object based on the provided date argument
// 	const newDate = new Date(date);
// 	newDate.setHours(hours, minutes, 0, 0); // Set hours, minutes, reset seconds & milliseconds

// 	return newDate;
// }
