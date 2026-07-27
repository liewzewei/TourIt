"use client";

import { useState, useEffect } from "react";
import createClient from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { hasTimeOverlap } from "@/lib/itinerary-overlap";
import { isValidTimeRange, isWithinOperatingHours } from "@/lib/time-constraints";
import { Button } from "@/components/ui/button";
import DateField from "@/components/ui/date-field";
import TimeRangeField from "@/components/ui/time-range-field";
import { useToast } from "@/context/toast-context";

type ItineraryOption = { id: string; itinerary_name: string };

export default function AddToItineraryButton({ listingId }: { listingId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [itineraries, setItineraries] = useState<ItineraryOption[]>([]);
  const [selectedItineraryId, setSelectedItineraryId] = useState("");

  // Form state
  const [letAiDecide, setLetAiDecide] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useToast();

  // Fetch the user's existing itineraries when the modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchItineraries = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("itineraries")
          .select("id, itinerary_name")
          .eq("profile_id", user.id)
          .order("created_at", { ascending: false });

        if (data) {
          setItineraries(data);
          if (data.length > 0) setSelectedItineraryId(data[0].id);
        }
      };
      fetchItineraries();
    }
  }, [isOpen]);

  // Instant feedback for an invalid range; the same rule is re-checked on submit
  // and enforced by the DB.
  const rangeInvalid =
    !letAiDecide && startTime !== "" && endTime !== "" && !isValidTimeRange(startTime, endTime);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let targetItineraryId = selectedItineraryId;
    // 1. If no itinerary exists, automatically create a default one.
    if (!targetItineraryId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ variant: "destructive", description: "You must be logged in to add to an itinerary." });
        return;
      }

      const { data: newItinerary, error: createError } = await supabase
        .from("itineraries")
        .insert({ itinerary_name: "My First Itinerary", profile_id: user.id })
        .select()
        .single();

      if (createError || !newItinerary) {
        console.error(createError);
        toast({ variant: "destructive", description: "Couldn't create an itinerary. Please try again." });
        return;
      }

      targetItineraryId = newItinerary.id;
      setSelectedItineraryId(newItinerary.id);
    }

    // 2. When scheduling manually, validate the visit before inserting.
    if (!letAiDecide) {
      if (!startDate || !startTime || !endTime) {
        toast({ variant: "destructive", description: "Please provide a date, start time, and end time." });
        return;
      }
      if (!isValidTimeRange(startTime, endTime)) {
        toast({ variant: "destructive", description: "End time must be after start time." });
        return;
      }

      // Visit must fall within the venue's opening hours (inclusive).
      const { data: listing } = await supabase
        .from("listings")
        .select("is_24_hours, open_time, close_time")
        .eq("id", listingId)
        .single();

      if (listing) {
        const open = listing.open_time ? listing.open_time.slice(0, 5) : null;
        const close = listing.close_time ? listing.close_time.slice(0, 5) : null;
        const withinHours = isWithinOperatingHours({
          is24h: listing.is_24_hours,
          open,
          close,
          enter: startTime,
          exit: endTime,
        });
        if (!withinHours) {
          toast({
            variant: "destructive",
            description: `This visit is outside the venue's opening hours (${open}–${close}).`,
          });
          return;
        }
      }

      // No overlap with another activity on the same day. Existing times come back
      // as "HH:MM:SS"; normalize to "HH:MM" to match the form values.
      const { data: existingActivities } = await supabase
        .from("itinerary_listings")
        .select("start_time, end_time")
        .eq("itinerary_id", targetItineraryId)
        .eq("start_date", startDate);

      const normalized = (existingActivities ?? []).map((a) => ({
        start_time: a.start_time ? a.start_time.slice(0, 5) : null,
        end_time: a.end_time ? a.end_time.slice(0, 5) : null,
      }));

      if (hasTimeOverlap(normalized, startTime, endTime)) {
        toast({ variant: "destructive", description: "This timing overlaps with an existing activity in this itinerary." });
        return;
      }
    }

    // 3. Insert the stop. end_date mirrors start_date (single-day visits); a
    // "let AI decide" stop is stored with null date/time for later scheduling.
    const { error } = await supabase
      .from("itinerary_listings")
      .insert({
        itinerary_id: targetItineraryId,
        listing_id: listingId,
        start_date: letAiDecide ? null : startDate,
        end_date: letAiDecide ? null : startDate,
        start_time: letAiDecide ? null : startTime,
        end_time: letAiDecide ? null : endTime,
      });

    if (error) {
      console.error(error);
      if (error.code === '23505') {
        toast({ variant: "destructive", description: "This place is already in your itinerary!" });
      } else if (error.message?.includes('operating hours')) {
        toast({ variant: "destructive", description: "Selected time is outside the venue's operating hours!" });
      } else {
        toast({ variant: "destructive", description: error.message || "Failed to add to itinerary." });
      }
    } else {
      toast({ variant: "success", description: "Added to your itinerary." });
      setIsOpen(false);
      router.refresh();
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        Add to Itinerary
      </Button>

      {/* Simple Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-popover p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Schedule Visit</h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              <div>
                <label className="block text-sm font-medium mb-1">Select Itinerary</label>
                <select
                  value={selectedItineraryId}
                  onChange={(e) => setSelectedItineraryId(e.target.value)}
                  className="w-full border rounded p-2 bg-background"
                >
                  {/* Default placeholder option */}
                  <option value="" disabled>Select one...</option>

                  {/* If they have NO itineraries */}
                  {itineraries.length === 0 && (
                    <option value="" disabled>No itinerary is created yet</option>
                  )}

                  {/* List out their itineraries if they have them */}
                  {itineraries.map((itinerary) => (
                    <option key={itinerary.id} value={itinerary.id}>
                      {itinerary.itinerary_name}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={letAiDecide}
                  onChange={(e) => setLetAiDecide(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                Add now, let AI decide the timings
              </label>

              {letAiDecide ? (
                <p className="text-sm text-muted-foreground">
                  This stop will be added without a time. The AI scheduler slots it in
                  later based on opening hours and your other activities.
                </p>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Visit Date</label>
                    <DateField value={startDate} onChange={setStartDate} />
                  </div>

                  <TimeRangeField
                    startValue={startTime}
                    endValue={endTime}
                    onStartChange={setStartTime}
                    onEndChange={setEndTime}
                    startLabel="Start Time"
                    endLabel="End Time"
                  />
                </>
              )}

              <div className="flex justify-end gap-2 mt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={rangeInvalid}>
                  Save Schedule
                </Button>
              </div>
            </form>

          </div>
        </div>
      )}
    </>
  );
}
