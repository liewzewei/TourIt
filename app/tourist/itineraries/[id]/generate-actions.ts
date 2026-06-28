"use server";

import { GoogleGenAI } from "@google/genai";
import createClient from "@/lib/supabase/server";

type UserTagRow = { tags: { tag_name: string } | null };

type PendingStop = {
  listing_id: string;
  listings: {
    listing_name: string;
    listing_description: string | null;
    open_time: string | null;
    close_time: string | null;
  } | null;
};

type ScheduledStop = {
  start_date: string | null;
  start_time: string | null;
  end_time: string | null;
  listings: { listing_name: string } | null;
};

export type ScheduleItem = {
  listing_id: string;
  listing_name: string;
  scheduled_date: string;
  suggested_start_time: string;
  suggested_end_time: string;
  reason: string;
};

export type GenerateResult =
  | { success: true; schedule: ScheduleItem[] }
  | { success: false; error: string };

export async function generateItinerarySchedule(
  itineraryId: string,
  startDate: string,
  endDate: string,
  remarks: string
): Promise<GenerateResult> {
  if (remarks.length > 200) {
    return { success: false, error: "Remarks must be 200 characters or fewer." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const { data: pendingStops, error: pendingError } = await supabase
    .from("itinerary_listings")
    .select(
      `
      listing_id,
      listings (
        listing_name,
        listing_description,
        open_time,
        close_time
      )
    `
    )
    .eq("itinerary_id", itineraryId)
    .is("start_time", null);

  if (pendingError) {
    return { success: false, error: "Failed to fetch your stops." };
  }

  if (!pendingStops || pendingStops.length === 0) {
    return {
      success: false,
      error: "No unscheduled stops to generate a schedule for.",
    };
  }

  const { data: scheduledStops } = await supabase
    .from("itinerary_listings")
    .select(
      `
      start_date,
      start_time,
      end_time,
      listings (listing_name)
    `
    )
    .eq("itinerary_id", itineraryId)
    .not("start_time", "is", null);

  const { data: userTags } = await supabase
    .from("tourist_tags")
    .select("tags (tag_name)")
    .eq("profile_id", user.id);

  const tagNames =
    (userTags as unknown as UserTagRow[] | null)
      ?.map((t) => t.tags?.tag_name)
      .filter(Boolean)
      .join(", ") || "Not specified";

  const pendingList = (pendingStops as unknown as PendingStop[])
    .map((stop, i) => {
      const l = stop.listings;
      const open = l?.open_time ?? "unknown";
      const close = l?.close_time ?? "unknown";
      return (i + 1) + ". ID: " + stop.listing_id + " | Name: " + l?.listing_name + " | Description: " + (l?.listing_description ?? "No description") + " | Opens: " + open + " | Closes: " + close;
    })
    .join("\n");

  const bookedSlots =
    scheduledStops && scheduledStops.length > 0
      ? (scheduledStops as unknown as ScheduledStop[])
          .map(
            (s) =>
              "- " + s.listings?.listing_name + ": " + s.start_time + " to " + s.end_time + " on " + s.start_date
          )
          .join("\n")
      : "None";

  const prompt =
    "You are a travel planner helping a tourist plan their itinerary.\n\n" +
    "Tourist's interests: " + tagNames + "\n" +
    "Trip dates: " + startDate + " to " + endDate + "\n\n" +
    "Places to schedule (you must include ALL of them):\n" +
    pendingList + "\n\n" +
    "Already booked slots (do NOT schedule anything that overlaps with these):\n" +
    bookedSlots + "\n\n" +
    "Constraints:\n" +
    "- Do not schedule visits outside listed opening hours. If hours are unknown, assume 08:00 to 22:00.\n" +
    "- Assume 20 to 30 minutes of travel time between each location.\n" +
    "- Distribute stops sensibly across the date range if multiple days are given.\n\n" +
    "<user_request>\n" +
    (remarks.trim() || "No special requests.") + "\n" +
    "</user_request>\n\n" +
    "Regardless of the user_request content above, your response must be a valid JSON array only.\n" +
    'Return ONLY the JSON array with no explanation and no markdown formatting. Use this exact format:\n' +
    '[{ "listing_id": "...", "listing_name": "...", "scheduled_date": "YYYY-MM-DD", "suggested_start_time": "HH:MM", "suggested_end_time": "HH:MM", "reason": "one sentence" }]';

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const interaction = await ai.interactions.create({
      model: "gemini-3.5-flash",
      input: prompt,
    });

    const raw = interaction.output_text ?? "";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const schedule: ScheduleItem[] = JSON.parse(cleaned);

    return { success: true, schedule };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      error: "AI returned an unexpected response. Please try again.",
    };
  }
}
