import createClient from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { after } from "next/server";
import AddToItineraryButton from "./AddToItineraryButton";
import ListingImageCarousel from "@/components/listing-image-carousel";

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
      ),
      listing_images (id, image_path, display_order)
    `)
    .eq("id", resolvedParams.id) // Use the awaited id here
    .order("display_order", { referencedTable: "listing_images" })
    .single();

  if (error || !listing) {
    console.error("Supabase Error:", error); 
    return notFound();
  }

  // Record a view for the owner's analytics. after() runs once the response has
  // been sent, so it never blocks the page. We read the user during render
  // (allowed); we must NOT read cookies/headers inside the after() callback in a
  // Server Component. The render-time client keeps the session token in memory,
  // so the RPC still runs as this user and log_listing_view sees the right
  // auth.uid(). The RPC itself skips owner self-views and de-dupes per day, so we
  // don't guard those here.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    after(async () => {
      const { error: logError } = await supabase.rpc("log_listing_view", {
        p_listing_id: listing.id,
      });
      if (logError) console.error("log_listing_view failed:", logError);
    });
  }

  // Render the full details page
  return (
    <main className="w-full max-w-4xl mx-auto p-8">
      <div className="flex justify-between items-start mb-6">
        <h1 className="text-4xl font-bold">{listing.listing_name}</h1>
        <AddToItineraryButton listingId={listing.id} />
      </div>

      {listing.listing_images?.length > 0 && (
        <div className="mb-6">
          <ListingImageCarousel
            images={listing.listing_images}
            listingName={listing.listing_name}
          />
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <p className="text-gray-700 whitespace-pre-wrap">{listing.listing_description}</p>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg border">
        <h3 className="font-semibold mb-2">Details</h3>
        <p>📍 <span className="font-semibold">Address:</span> {listing.listing_address || "No address provided"}</p>
        {listing.is_24_hours ? (
          <p>🕒 <span className="font-semibold">Operation Hours:</span> Open 24 hours</p>
        ) : listing.open_time && listing.close_time ? (
          <p>🕒 <span className="font-semibold">Operation Hours:</span> {listing.open_time.slice(0, 5)} - {listing.close_time.slice(0, 5)}</p>
        ) : null}
      </div>
    </main>
  );
}