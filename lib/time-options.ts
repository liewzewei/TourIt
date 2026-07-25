// Pure helpers for the custom time picker. Times are zero-padded 24h "HH:MM"
// strings, matching lib/time-constraints, so lexicographic order stays
// chronological.

/** Every "HH:MM" time of the day at `stepMinutes` intervals, starting at 00:00. */
export function generateTimeOptions(stepMinutes = 15): string[] {
  if (!Number.isInteger(stepMinutes) || stepMinutes <= 0) {
    throw new Error("stepMinutes must be a positive integer");
  }
  const out: string[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += stepMinutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return out;
}

/**
 * "HH:MM" (24h) -> friendly 12-hour label, e.g. "09:00" -> "9:00 AM",
 * "00:15" -> "12:15 AM", "13:30" -> "1:30 PM". Returns the input unchanged if it
 * isn't a valid HH:MM, so odd stored values still display.
 */
export function formatTime12(value: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return value;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return value;
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${match[2]} ${period}`;
}
