export function mergeDateWithTime(date: Date, timeString: string): Date {
	// Parse the time string ("2:36 PM") into hours and minutes
	const [time, modifier] = timeString.split(" ");
	const [hoursStr, minutesStr] = time.split(":");
	let hours = parseInt(hoursStr, 10);
	const minutes = parseInt(minutesStr, 10);

	// Convert to 24-hour format
	if (modifier === "PM" && hours !== 12) {
		hours += 12;
	} else if (modifier === "AM" && hours === 12) {
		hours = 0;
	}

	// Create new Date object based on the provided date argument
	const newDate = new Date(date);
	newDate.setHours(hours, minutes, 0, 0); // Set hours, minutes, reset seconds & milliseconds

	return newDate;
}

export function mergeDateWithTimeAlt(date: Date, timeString: string): Date {
	// Parse the time string ("2:36pm") into hours and minutes

	const modifier = timeString.slice(-2).toUpperCase(); // Extracts "AM" or "PM"
	const time = timeString.slice(0, -2); // Removes the AM/PM part

	const [hoursStr, minutesStr] = time.split(":");
	let hours = parseInt(hoursStr, 10);
	const minutes = parseInt(minutesStr, 10);

	// Convert to 24-hour format
	if (modifier === "PM" && hours !== 12) {
		hours += 12;
	} else if (modifier === "AM" && hours === 12) {
		hours = 0;
	}

	// Create new Date object based on the provided date argument
	const newDate = new Date(date);
	newDate.setHours(hours, minutes, 0, 0); // Set hours, minutes, reset seconds & milliseconds

	return newDate;
}
