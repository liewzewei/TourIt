'use client';

import { useEffect, useState, use } from 'react';
import createClient from '@/lib/supabase/client';
import Link from 'next/link';
import { generateItinerarySchedule, ScheduleItem } from './generate-actions';

type ItineraryListing = {
  itinerary_id: string;
  listing_id: string;
  start_date: string | null;
  start_time: string | null;
  end_date: string | null;
  end_time: string | null;
  listings: {
    listing_name: string;
    listing_address: string;
  };
};

type Itinerary = {
  id: string;
  itinerary_name: string;
};

export default function ItineraryViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [activities, setActivities] = useState<ItineraryListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // New State for Day Navigation
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  
  // AI Generation State
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [genStartDate, setGenStartDate] = useState("");
  const [genEndDate, setGenEndDate] = useState("");
  const [genRemarks, setGenRemarks] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSchedule, setGeneratedSchedule] = useState<ScheduleItem[] | null>(null);
  const [genError, setGenError] = useState("");
  
  const supabase = createClient();

  // Group by unique dates (handling null dates as "Unscheduled")
  const uniqueDates = Array.from(new Set(activities.map(a => a.start_date || "Unscheduled")));
  
  // Filter activities to only show ones for the current selected day
  const currentActivities = activities.filter(a => (a.start_date || "Unscheduled") === uniqueDates[currentDateIndex]);

  const handleGenerate = async () => {
    if (!genStartDate || !genEndDate) {
      setGenError("Please select start and end dates.");
      return;
    }
    setGenError("");
    setIsGenerating(true);
    setGeneratedSchedule(null);
    
    const result = await generateItinerarySchedule(id, genStartDate, genEndDate, genRemarks);
    
    setIsGenerating(false);
    if (result.success) {
      setGeneratedSchedule(result.schedule);
    } else {
      setGenError(result.error);
    }
  };

  const handleSaveSchedule = async () => {
    if (!generatedSchedule) return;
    setIsSaving(true);
    
    let hasError = false;

    // Loop through the AI schedule and update each listing
    for (const item of generatedSchedule) {
      const { error } = await supabase
        .from('itinerary_listings')
        .update({
          start_date: item.scheduled_date,
          end_date: item.scheduled_date, // Assuming activities end on the same day
          start_time: item.suggested_start_time,
          end_time: item.suggested_end_time,
        })
        .eq('itinerary_id', id)
        .eq('listing_id', item.listing_id);
        
      if (error) {
        console.error("Failed to update listing:", item.listing_id, error);
        hasError = true;
      }
    }
    
    setIsSaving(false);
    
    if (hasError) {
      alert("Some items failed to save. Check console for details.");
    } else {
      alert("Schedule saved successfully!");
      setShowGenerateModal(false);
      setGeneratedSchedule(null);
      // Refresh the page so the newly scheduled activities appear in the list!
      window.location.reload(); 
    }
  };

  // Remove Activity Function
  const handleRemoveActivity = async (listingId: string) => {
    if (!confirm("Are you sure you want to remove this activity?")) return;

    const { error } = await supabase
      .from('itinerary_listings')
      .delete()
      .eq('itinerary_id', id)
      .eq('listing_id', listingId);

    if (!error) {
      setActivities(prev => prev.filter(a => a.listing_id !== listingId));
    } else {
      alert("Failed to remove activity");
    }
  };

  useEffect(() => {
    const fetchItineraryData = async () => {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }
      
      // 1. Fetch Itinerary Details
      const { data: itineraryData } = await supabase
        .from('itineraries')
        .select('*')
        .eq('id', id)
        .single();
        
      if (itineraryData) {
        setItinerary(itineraryData);
      }

      // 2. Fetch Activities (Itinerary Listings) ordered by time
      const { data: activitiesData, error } = await supabase
        .from('itinerary_listings')
        .select('*, listings(listing_name, listing_address)')
        .eq('itinerary_id', id)
        .order('start_date', { ascending: true })
        .order('start_time', { ascending: true });
        
      if (!error && activitiesData) {
        setActivities(activitiesData as ItineraryListing[]); 
      }
      
      setLoading(false);
    };
    
    fetchItineraryData();
  }, [id, supabase]);

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading itinerary...</div>;
  if (!itinerary) return <div className="p-8 text-center text-red-500">Itinerary not found.</div>;

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-900">{itinerary.itinerary_name}</h1>
        <div className="flex gap-4 items-center">
          <button
            onClick={() => setShowGenerateModal(true)}
            className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition font-medium"
          >
            ✨ Generate AI Schedule
          </button>
          <Link 
            href="/tourist/itineraries" 
            className="text-sm text-blue-600 hover:underline"
          >
            &larr; Back to all itineraries
          </Link>
        </div>
      </div>
      
      {activities.length === 0 ? (
        <div className="p-12 bg-gray-50 rounded-lg text-center border border-dashed">
          <p className="text-gray-500 mb-6">No activities have been added to this itinerary yet.</p>
          <Link 
            href="/tourist/explore" 
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition"
          >
            Explore Listings to Add
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Day Navigation Controls */}
          {uniqueDates.length > 1 && (
            <div className="flex items-center justify-between bg-white p-3 rounded-md shadow-sm border">
              <button 
                disabled={currentDateIndex === 0}
                onClick={() => setCurrentDateIndex(i => i - 1)}
                className="px-4 py-2 text-sm font-medium rounded hover:bg-gray-100 disabled:opacity-50"
              >
                &larr; Previous Day
              </button>
              
              <span className="font-bold text-gray-700">
                {uniqueDates[currentDateIndex] !== "Unscheduled" 
                  ? new Date(uniqueDates[currentDateIndex]).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric'})
                  : "Unscheduled"}
              </span>

              <button 
                disabled={currentDateIndex === uniqueDates.length - 1}
                onClick={() => setCurrentDateIndex(i => i + 1)}
                className="px-4 py-2 text-sm font-medium rounded hover:bg-gray-100 disabled:opacity-50"
              >
                Next Day &rarr;
              </button>
            </div>
          )}

          {/* Activity List */}
          <div className="space-y-4">
            {currentActivities.map((activity) => (
              <div 
                key={`${activity.itinerary_id}-${activity.listing_id}`}
                className="relative pr-16 p-6 border rounded-lg bg-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">
                    {activity.listings?.listing_name}
                  </h3>
                  <p className="text-gray-500 text-sm mt-1">
                    📍 {activity.listings?.listing_address || 'No address provided'}
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-left md:text-right bg-blue-50/50 p-4 rounded-md min-w-[200px]">
                    {activity.start_date ? (
                      <p className="text-blue-900 font-medium">
                        📅 {new Date(activity.start_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric'})}
                      </p>
                    ) : (
                      <p className="text-gray-500 text-sm italic">Date not set</p>
                    )}
                    
                    {activity.start_time && (
                      <p className="text-blue-800 text-sm mt-2">
                        🕒 {activity.start_time.slice(0, 5)} 
                        {activity.end_time ? ` - ${activity.end_time.slice(0, 5)}` : ''}
                      </p>
                    )}
                  </div>
                  
                  {/* Delete Button */}
                  <button 
                    onClick={() => handleRemoveActivity(activity.listing_id)}
                    className="p-3 text-neutral-400 hover:text-red-700 hover:bg-red-50 rounded-md transition"
                    title="Remove from itinerary"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Generate AI Schedule</h2>
            
            {!generatedSchedule ? (
              <div className="space-y-4">
                <p className="text-gray-600 text-sm">
                  Let AI optimize your unscheduled stops. It will consider your interests, opening hours, and travel time!
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input type="date" value={genStartDate} onChange={e => setGenStartDate(e.target.value)} className="w-full border rounded p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input type="date" value={genEndDate} onChange={e => setGenEndDate(e.target.value)} className="w-full border rounded p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (optional)</label>
                  <textarea 
                    value={genRemarks} 
                    onChange={e => setGenRemarks(e.target.value)} 
                    placeholder="E.g., I prefer a relaxed pace."
                    className="w-full border rounded p-2 h-24"
                    maxLength={200}
                  />
                </div>
                
                {genError && <p className="text-red-600 text-sm">{genError}</p>}
                
                <div className="flex justify-end gap-3 mt-6">
                  <button onClick={() => setShowGenerateModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                  <button 
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isGenerating ? "Generating..." : "Generate Schedule"}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold text-green-700 mb-3">✨ Generated Successfully!</h3>
                <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2">
                  {generatedSchedule.map((item, i) => (
                    <div key={i} className="p-3 border rounded bg-gray-50 text-sm">
                      <p className="font-bold">{item.listing_name}</p>
                      <p className="text-gray-600">📅 {item.scheduled_date} 🕒 {item.suggested_start_time} - {item.suggested_end_time}</p>
                      <p className="text-gray-500 italic mt-1">&quot;{item.reason}&quot;</p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <button 
                    onClick={() => { setGeneratedSchedule(null); setShowGenerateModal(false); }} 
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition"
                  >
                    Discard
                  </button>
                  <button 
                    onClick={handleSaveSchedule} 
                    disabled={isSaving}
                    className="px-4 py-2 bg-black text-white font-medium rounded hover:bg-gray-800 transition disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save to Itinerary"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}