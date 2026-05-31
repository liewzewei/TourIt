"use client";

import { useState, useEffect } from "react";
import createClient from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AddToItineraryButton({ listingId }: { listingId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [itineraries, setItineraries] = useState<any[]>([]);
  const [selectedItineraryId, setSelectedItineraryId] = useState("");
  
  // Form state
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const supabase = createClient();
  const router = useRouter();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let targetItineraryId = selectedItineraryId;
    // 1. If no itinerary exists, automatically create a default one!
    if (!targetItineraryId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return alert("You must be logged in!");

      const { data: newItinerary, error: createError } = await supabase
        .from("itineraries")
        .insert({
          itinerary_name: "My First Itinerary",
          profile_id: user.id
        })
        .select()
        .single();

      if (createError || !newItinerary) {
        console.error(createError);
        return alert("Failed to auto-create an itinerary.");
      }

      targetItineraryId = newItinerary.id;
      
      // Update state so it uses this ID for any future clicks without recreating
      setSelectedItineraryId(newItinerary.id); 
    }
    
    // Check for overlapping timings before insertion
    if (startDate && startTime && endTime) {
      const { data: existingActivities } = await supabase
        .from("itinerary_listings")
        .select("start_time, end_time")
        .eq("itinerary_id", targetItineraryId)
        .eq("start_date", startDate);

      if (existingActivities && existingActivities.length > 0) {
        const hasOverlap = existingActivities.some(activity => {
          if (!activity.start_time || !activity.end_time) return false;
          // String comparison works perfectly for "HH:MM" format
          return (startTime < activity.end_time && endTime > activity.start_time);
        });

        if (hasOverlap) {
          alert("This timing overlaps with an existing activity in your itinerary!");
          return; // Stop the submission
        }
      }
    }

    // 2. Insert the schedule using the valid itinerary ID
    const { error } = await supabase
      .from("itinerary_listings")
      .insert({
        itinerary_id: targetItineraryId, // Uses our checked ID
        listing_id: listingId,
        start_date: startDate || null,
        start_time: startTime || null,
        end_time: endTime || null,
      });

    if (error) {
      console.error(error);
      alert("Failed to add to itinerary.");
    } else {
      alert("Successfully added!");
      setIsOpen(false);
      router.refresh();
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-black text-white px-4 py-2 rounded hover:bg-neutral-800 transition"
      >
        Add to Itinerary
      </button>

      {/* Simple Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Schedule Visit</h2>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              <div>
                <label className="block text-sm font-medium mb-1">Select Itinerary</label>
                <select
                  value={selectedItineraryId}
                  onChange={(e) => setSelectedItineraryId(e.target.value)}
                  className="w-full border rounded p-2 bg-white"
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
              
              <div>
                <label className="block text-sm font-medium mb-1">Visit Date</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border rounded p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Time</label>
                  <input 
                    type="time" 
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full border rounded p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Time</label>
                  <input 
                    type="time" 
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full border rounded p-2"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-black text-white rounded hover:bg-neutral-800 transition"
                >
                  Save Schedule
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </>
  );
}