'use client';

import { useEffect, useState } from 'react';
import createClient from '@/lib/supabase/client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/context/toast-context';
import { useConfirm } from '@/context/confirm-context';

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
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const fetchItineraries = async () => {
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchItineraries(); // setState calls inside are async (after await), not synchronous
  }, []);

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

    const confirmed = await confirm({
      title: 'Delete itinerary?',
      description: 'This permanently deletes the itinerary and everything scheduled in it. This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;

    await supabase.from('itinerary_listings').delete().eq('itinerary_id', itineraryId);
    const { error } = await supabase.from('itineraries').delete().eq('id', itineraryId);

    if (!error) {
      setItineraries(prev => prev.filter(it => it.id !== itineraryId));
      toast({ variant: 'success', description: 'Itinerary deleted.' });
    } else {
      toast({ variant: 'destructive', description: 'Failed to delete itinerary.' });
    }
  };

  return (
    <main className="p-8 max-w-7xl mx-auto">
      
      {/* Header and Form Section */}
      <div className="flex flex-col items-center text-center">
        <h1 className="text-3xl font-bold text-foreground mb-0">My Itineraries</h1>
        <p className="text-muted-foreground mb-12 mt-1">Plan, organize, and manage your upcoming adventures.</p>
        
        <form onSubmit={handleCreateItinerary} className="flex items-stretch gap-4 w-full md:w-1/3 min-w-[420px]">
          <Input
            type="text"
            aria-label="Itinerary name"
            value={newItineraryName}
            onChange={(e) => setNewItineraryName(e.target.value)}
            placeholder="Name your next trip..."
            className="flex-1"
            required
          />
          <Button type="submit" className="px-8 whitespace-nowrap">
            Create
          </Button>
        </form>
      </div>

      {/* Grid Section */}
      <div className="mt-32">
        {loading ? (
          <div className="flex justify-center p-12">
            <p className="text-muted-foreground animate-pulse">Loading your itineraries...</p>
          </div>
        ) : itineraries.length === 0 ? (
          <div className="p-16 text-center border border-dashed border-input rounded-lg">
            <p className="text-muted-foreground">You have not created any itineraries yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
            {itineraries.map((itinerary) => (
              <div
                key={itinerary.id}
                className="group relative flex h-48 flex-col rounded-lg border border-border bg-card p-6 shadow-sm transition-all lift"
              >
                {/* Whole-card click target. It paints above the static content
                    (which is click-through) but below the delete button, so the
                    card navigates while the delete corner stays independent. */}
                <Link
                  href={`/tourist/itineraries/${itinerary.id}`}
                  aria-label={`View ${itinerary.itinerary_name}`}
                  className="absolute inset-0 z-0 rounded-lg"
                />

                {/* Title Container */}
                <div className="mb-4 pr-12">
                  <h2 className="text-lg font-semibold text-foreground relative z-10 pointer-events-none line-clamp-2">
                    {itinerary.itinerary_name}
                  </h2>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDeleteItinerary(e, itinerary.id)}
                    className="absolute top-3 right-3 z-50 flex items-center justify-center p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                    aria-label="Delete Itinerary"
                  >
                    <span>🗑️</span>
                  </button>
                </div>

                <span className="mt-auto text-sm text-muted-foreground relative z-10 font-medium pointer-events-none transition-colors group-hover:font-semibold group-hover:text-foreground">
                  View schedule &rarr;
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}