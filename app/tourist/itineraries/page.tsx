'use client';

import { useEffect, useState } from 'react';
import createClient from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Itinerary = {
  id: string;
  itinerary_name: string;
  created_at: string;
};

export default function ItinerariesPage() {
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [newItineraryName, setNewItineraryName] = useState('');
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchItineraries();
  }, []);

  const fetchItineraries = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setItineraries(data);
      }
    }
    setLoading(false);
  };

  const handleCreateItinerary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItineraryName.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data, error } = await supabase
        .from('itineraries')
        .insert([{ profile_id: user.id, itinerary_name: newItineraryName }])
        .select()
        .single();

      if (!error && data) {
        setNewItineraryName('');
        fetchItineraries();
      }
    }
  };

  const handleDeleteItinerary = async (e: React.MouseEvent, itineraryId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this itinerary? This action cannot be undone.')) return;

    await supabase.from('itinerary_listings').delete().eq('itinerary_id', itineraryId);
    const { error } = await supabase.from('itineraries').delete().eq('id', itineraryId);

    if (!error) {
      setItineraries(prev => prev.filter(it => it.id !== itineraryId));
    } else {
      alert("Failed to delete itinerary.");
    }
  };

  return (
    <main className="p-8 max-w-7xl mx-auto">
      
      {/* Header and Form Section */}
      <div className="flex flex-col items-center text-center">
        <h1 className="text-3xl font-bold text-neutral-900 mb-0">My Itineraries</h1>
<p className="text-neutral-500 mb-12 mt-1">Plan, organize, and manage your upcoming adventures.</p>
        
        <form onSubmit={handleCreateItinerary} className="flex gap-4 w-full md:w-1/3 min-w-[420px]">
          <input 
            type="text" 
            value={newItineraryName}
            onChange={(e) => setNewItineraryName(e.target.value)}
            placeholder="Name your next trip..." 
            className="flex-1 px-4 py-2.5 border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
            required
          />
          <button 
            type="submit"
            className="bg-black text-white px-10 py-2.5 rounded-md hover:bg-neutral-800 transition whitespace-nowrap font-medium"
          >
            Create
          </button>
        </form>
      </div>

      {/* Grid Section */}
      <div className="mt-32">
        {loading ? (
          <div className="flex justify-center p-12">
            <p className="text-neutral-500 animate-pulse">Loading your itineraries...</p>
          </div>
        ) : itineraries.length === 0 ? (
          <div className="p-16 text-center border border-dashed border-neutral-300 rounded-lg">
            <p className="text-neutral-500">You haven't created any itineraries yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
            {itineraries.map((itinerary) => (
              <div 
                key={itinerary.id} 
                className="relative flex flex-col border border-neutral-200 rounded-lg p-6 bg-white hover:border-neutral-400 transition-colors h-48 shadow-sm group"
              >
                
                {/* Title Container */}
                <div className="mb-4 pr-12">
                  <h2 className="text-lg font-semibold text-neutral-900 relative z-10 pointer-events-none line-clamp-2">
                    {itinerary.itinerary_name}
                  </h2>
                  
                  {/* Delete Button */}
                  <button 
                    onClick={(e) => handleDeleteItinerary(e, itinerary.id)}
                    className="absolute top-3 right-3 z-50 flex items-center justify-center p-1.5 text-neutral-400 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                    aria-label="Delete Itinerary"
                  >
                    <span>🗑️</span>
                  </button>
                </div>

                <Link 
                  href={`/tourist/itineraries/${itinerary.id}`}
                  className="mt-auto text-sm text-neutral-500 relative z-10 font-medium group-hover:text-black transition-colors"
                >
                  View schedule &rarr;
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}