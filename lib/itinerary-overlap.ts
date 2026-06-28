// Pure time-overlap check for itinerary scheduling. Extracted from
// AddToItineraryButton so it can be unit-tested without rendering the modal.

type Activity = { start_time: string | null; end_time: string | null };

// True if [start, end) overlaps any existing activity on the same date.
// Activities with unknown (null) times can't conflict, so they're skipped.
// String comparison works because times are zero-padded "HH:MM".
export function hasTimeOverlap(
  existing: Activity[],
  start: string,
  end: string,
): boolean {
  return existing.some((activity) => {
    if (!activity.start_time || !activity.end_time) return false;
    return start < activity.end_time && end > activity.start_time;
  });
}
