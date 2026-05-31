'use client';

import { useEffect, useState, use } from 'react';
import createClient from '@/lib/supabase/client';
import Link from 'next/link';

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

  // New State for Day Navigation
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  
  const supabase = createClient();

  // Group by unique dates (handling null dates as "Unscheduled")
  const uniqueDates = Array.from(new Set(activities.map(a => a.start_date || "Unscheduled")));
  
  // Filter activities to only show ones for the current selected day
  const currentActivities = activities.filter(a => (a.start_date || "Unscheduled") === uniqueDates[currentDateIndex]);

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
  }, [id]);

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading itinerary...</div>;
  if (!itinerary) return <div className="p-8 text-center text-red-500">Itinerary not found.</div>;

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-900">{itinerary.itinerary_name}</h1>
        <Link 
          href="/tourist/itineraries" 
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; Back to all itineraries
        </Link>
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
    </main>
  );
}