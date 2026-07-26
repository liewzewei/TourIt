'use client';

import { useEffect, useState, use } from 'react';
import createClient from '@/lib/supabase/client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
const ItineraryDayMap = dynamic(() => import('@/components/itinerary-day-map'), { ssr: false });
import { generateItinerarySchedule, ScheduleItem } from './generate-actions';
import { Button } from '@/components/ui/button';
import BackLink from '@/components/back-link';
import DateField from '@/components/ui/date-field';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/context/toast-context';
import { useConfirm } from '@/context/confirm-context';

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
    latitude?: number | null;
    longitude?: number | null;
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

  const supabase = createClient();
  const { toast } = useToast();
  const { confirm } = useConfirm();

  // Group by unique dates (handling null dates as "Unscheduled")
  const uniqueDates = Array.from(new Set(activities.map(a => a.start_date || "Unscheduled")));
  
  // Filter activities to only show ones for the current selected day
  const currentActivities = activities.filter(a => (a.start_date || "Unscheduled") === uniqueDates[currentDateIndex]);
  // --- Calculate numbered map pins for this day ---
  const mapStops = currentActivities
    .filter(a => a.listings?.latitude != null && a.listings?.longitude != null)
    .map((a, idx) => ({
      id: a.listing_id,
      name: a.listings?.listing_name || "Unknown",
      address: a.listings?.listing_address,
      latitude: a.listings.latitude!,
      longitude: a.listings.longitude!,
      number: idx + 1,
    }));

  const handleGenerate = async () => {
    if (!genStartDate || !genEndDate) {
      toast({ variant: "destructive", description: "Please select start and end dates." });
      return;
    }
    if (genEndDate < genStartDate) {
      toast({ variant: "destructive", description: "End date must be on or after the start date." });
      return;
    }
    setIsGenerating(true);
    setGeneratedSchedule(null);

    const result = await generateItinerarySchedule(id, genStartDate, genEndDate, genRemarks);

    setIsGenerating(false);
    if (result.success) {
      setGeneratedSchedule(result.schedule);
    } else {
      toast({ variant: "destructive", description: result.error });
    }
  };

  const handleSaveSchedule = async () => {
    if (!generatedSchedule) return;
    setIsSaving(true);
    
    let hasError = false;

    // Loop through the AI schedule and update each listing. Single-day visits:
    // end_date mirrors start_date (this also keeps the valid_itinerary_time CHECK
    // active). The operating-hours DB trigger is the final backstop here.
    for (const item of generatedSchedule) {
      const { error } = await supabase
        .from('itinerary_listings')
        .update({
          start_date: item.scheduled_date,
          end_date: item.scheduled_date,
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
      toast({ variant: "destructive", description: "Some stops couldn't be saved. Please try again." });
    } else {
      toast({ variant: "success", description: "Schedule saved to your itinerary." });
      setShowGenerateModal(false);
      setGeneratedSchedule(null);
      // Refresh the page so the newly scheduled activities appear in the list!
      window.location.reload();
    }
  };

  // Remove Activity — confirm via the shared dialog, then delete.
  const handleRemoveActivity = async (listingId: string) => {
    const confirmed = await confirm({
      title: "Remove activity?",
      description: "This removes the activity from your itinerary. You can add it again from Explore.",
      confirmText: "Remove",
      variant: "destructive",
    });
    if (!confirmed) return;

    const { error } = await supabase
      .from('itinerary_listings')
      .delete()
      .eq('itinerary_id', id)
      .eq('listing_id', listingId);

    if (!error) {
      setActivities(prev => prev.filter(a => a.listing_id !== listingId));
      toast({ variant: "success", description: "Activity removed." });
    } else {
      toast({ variant: "destructive", description: "Failed to remove activity." });
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
        .select('*, listings(listing_name, listing_address, latitude, longitude)')
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

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading itinerary...</div>;
  if (!itinerary) return <div className="p-8 text-center text-destructive">Itinerary not found.</div>;

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <div className="mb-8 border-b pb-4">
        <BackLink href="/tourist/itineraries">Back to all itineraries</BackLink>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-foreground">{itinerary.itinerary_name}</h1>
          <Button onClick={() => setShowGenerateModal(true)}>
            Generate AI Schedule
          </Button>
        </div>
      </div>
      
      {activities.length === 0 ? (
        <div className="p-12 bg-muted rounded-lg text-center border border-dashed">
          <p className="text-muted-foreground mb-6">No activities have been added to this itinerary yet.</p>
          <Button asChild>
            <Link href="/tourist/explore">Explore Listings to Add</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Day Navigation Controls */}
          {uniqueDates.length > 1 && (
            <div className="flex items-center justify-between bg-card p-3 rounded-md shadow-sm border">
              <button 
                disabled={currentDateIndex === 0}
                onClick={() => setCurrentDateIndex(i => i - 1)}
                className="px-4 py-2 text-sm font-medium rounded hover:bg-muted disabled:opacity-50"
              >
                &larr; Previous Day
              </button>
              
              <span className="font-bold text-foreground">
                {uniqueDates[currentDateIndex] !== "Unscheduled" 
                  ? new Date(uniqueDates[currentDateIndex]).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric'})
                  : "Unscheduled"}
              </span>

              <button 
                disabled={currentDateIndex === uniqueDates.length - 1}
                onClick={() => setCurrentDateIndex(i => i + 1)}
                className="px-4 py-2 text-sm font-medium rounded hover:bg-muted disabled:opacity-50"
              >
                Next Day &rarr;
              </button>
            </div>
          )}

          {/* Side-by-Side Schedule and Map Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            
            {/* Left Column: Numbered Activity List */}
            <div className="space-y-4">
              {currentActivities.map((activity, idx) => (
                <div 
                  key={`${activity.itinerary_id}-${activity.listing_id}`}
                  className="relative p-5 border rounded-lg bg-card shadow-sm flex items-start justify-between gap-3 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-grow">
                    {/* Matching Step Number Badge */}
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-xs mt-0.5 shadow">
                      {idx + 1}
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-foreground leading-tight">
                        {activity.listings?.listing_name}
                      </h3>
                      <p className="text-muted-foreground text-xs mt-1">
                        📍 {activity.listings?.listing_address || 'No address provided'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right bg-accent/40 px-3 py-2 rounded text-xs">
                      {activity.start_time ? (
                        <p className="text-accent-foreground font-semibold">
                          🕒 {activity.start_time.slice(0, 5)} 
                          {activity.end_time ? ` - ${activity.end_time.slice(0, 5)}` : ''}
                        </p>
                      ) : (
                        <p className="text-muted-foreground italic">Time not set</p>
                      )}
                    </div>
                    
                    {/* Delete Button */}
                    <button
                      onClick={() => handleRemoveActivity(activity.listing_id)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition"
                      title="Remove from itinerary"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column: Sticky Day Map */}
            <div className="sticky top-6">
              <ItineraryDayMap stops={mapStops} />
            </div>

          </div>
        </div>
      )}

      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-popover rounded-lg shadow-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Generate AI Schedule</h2>
            
            {!generatedSchedule ? (
              <div className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  Let AI optimize your unscheduled stops. It will consider your interests, opening hours, and travel time!
                </p>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Start Date</label>
                  <DateField value={genStartDate} onChange={setGenStartDate} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">End Date</label>
                  <DateField value={genEndDate} onChange={setGenEndDate} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Remarks (optional)</label>
                  <Textarea
                    value={genRemarks}
                    onChange={e => setGenRemarks(e.target.value)}
                    placeholder="E.g., I prefer a relaxed pace."
                    maxLength={200}
                  />
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                  <Button variant="ghost" onClick={() => setShowGenerateModal(false)}>Cancel</Button>
                  <Button onClick={handleGenerate} disabled={isGenerating}>
                    {isGenerating ? "Generating..." : "Generate Schedule"}
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold text-success mb-3">✨ Generated Successfully!</h3>
                <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2">
                  {generatedSchedule.map((item, i) => (
                    <div key={i} className="p-3 border rounded bg-muted text-sm">
                      <p className="font-bold">{item.listing_name}</p>
                      <p className="text-muted-foreground">📅 {item.scheduled_date} 🕒 {item.suggested_start_time} - {item.suggested_end_time}</p>
                      <p className="text-muted-foreground italic mt-1">&quot;{item.reason}&quot;</p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <Button variant="ghost" onClick={() => { setGeneratedSchedule(null); setShowGenerateModal(false); }}>
                    Discard
                  </Button>
                  <Button onClick={handleSaveSchedule} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save to Itinerary"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}