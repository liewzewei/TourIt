"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Initialize client-side Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function AddToItineraryButton({ listingId }: { listingId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [itineraries, setItineraries] = useState<any[]>([]);
  const [selectedItineraryId, setSelectedItineraryId] = useState("");
  
  // Form state
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // Fetch the user's existing itineraries when the modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchItineraries = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("itineraries")
          .select("id, itinerary_name")
          .eq("profile_id", user.id);
        
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
    if (!selectedItineraryId) return alert("Please select or create an itinerary first.");

    const { error } = await supabase
      .from("itinerary_listings")
      .insert({
        itinerary_id: selectedItineraryId,
        listing_id: listingId,
        start_date: startDate || null,
        start_time: startTime || null,
        end_time: endTime || null,
        // end_date can be added similarly if you want multi-day events
      });

    if (error) {
      console.error(error);
      alert("Failed to add to itinerary.");
    } else {
      alert("Successfully added!");
      setIsOpen(false);
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