import createClient from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import AddToItineraryButton from "./AddToItineraryButton";

// Notice params is now a Promise
export default async function ListingDetailsPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const supabase = await createClient();
  
  // Await the params before using them!
  const resolvedParams = await params;

  // Fetch the specific listing by ID
  const { data: listing, error } = await supabase
    .from("listings")
    .select(`
      *,
      listing_tags (
        tags (id, tag_name)
      )
    `)
    .eq("id", resolvedParams.id) // Use the awaited id here
    .single();

  if (error || !listing) {
    console.error("Supabase Error:", error); 
    return notFound();
  }

  // Render the full details page
  return (
    <main className="max-w-4xl mx-auto p-8">
      <div className="flex justify-between items-start mb-6">
        <h1 className="text-4xl font-bold">{listing.listing_name}</h1>
        <AddToItineraryButton listingId={listing.id} />
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <p className="text-gray-700 whitespace-pre-wrap">{listing.listing_description}</p>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg border">
        <h3 className="font-semibold mb-2">Details</h3>
        <p>📍 <span className="font-semibold">Address:</span> {listing.listing_address || "No address provided"}</p>
        {(listing.open_time || listing.close_time) && (
          <p>🕒 <span className="font-semibold">Operation Hours:</span> {listing.open_time} - {listing.close_time}</p>
        )}
      </div>
    </main>
  );
}