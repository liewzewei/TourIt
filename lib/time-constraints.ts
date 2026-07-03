// Pure, unit-testable time-constraint helpers shared by client-side form
// validation and server actions (and mirrored by the DB constraints). Times are
// zero-padded "HH:MM"/"HH:MM:SS" strings, so lexicographic order equals
// chronological order and plain string comparison is safe.

// A time range is valid only when the start is strictly before the end.
export function isValidTimeRange(start: string, end: string): boolean {
  return start < end;
}

// A listing's operating hours are valid when it is open 24 hours, or it has both
// an opening and closing time that form a valid range (close strictly after open).
export function isValidListingHours({
  is24h,
  open,
  close,
}: {
  is24h: boolean;
  open: string | null;
  close: string | null;
}): boolean {
  if (is24h) return true;
  if (!open || !close) return false;
  return isValidTimeRange(open, close);
}
