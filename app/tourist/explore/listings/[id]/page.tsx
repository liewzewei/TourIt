import createClient from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { after } from "next/server";
import AddToItineraryButton from "./AddToItineraryButton";
import ListingImageCarousel from "@/components/listing-image-carousel";
import BackLink from "@/components/back-link";
import { MapPin, Clock, Lightbulb, ExternalLink } from "lucide-react";

// Notice params is now a Promise
export default async function ListingDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();

  // Await the params before using them!
  const resolvedParams = await params;

  // The feed's filters ride along in the URL (added by the explore cards), so
  // "back to listings" returns to the same filtered page rather than a reset
  // feed. Absent (e.g. a direct link), it falls back to the bare feed.
  const feedQuery = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) value.forEach((v) => feedQuery.append(key, v));
    else feedQuery.set(key, value);
  }
  const feedQs = feedQuery.toString();
  const backHref = feedQs ? `/tourist/explore?${feedQs}` : "/tourist/explore";

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

  // Tags come back nested as listing_tags -> tags; flatten and drop any nulls.
  const tags = (listing.listing_tags ?? [])
    .map((relation: { tags: { id: string; tag_name: string } | null }) => relation.tags)
    .filter((tag: { id: string; tag_name: string } | null): tag is { id: string; tag_name: string } => tag !== null);

  // Render the full details page
  return (
    <main className="w-full max-w-4xl mx-auto p-8">
      <div className="mb-6">
        <BackLink href={backHref}>Back to listings</BackLink>
      </div>

      <div className="flex justify-between items-start mb-4">
        <h1 className="text-4xl font-bold">{listing.listing_name}</h1>
        <AddToItineraryButton listingId={listing.id} />
      </div>

      {tags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {tags.map((tag: { id: string; tag_name: string }) => (
            <span
              key={tag.id}
              className="rounded-full bg-accent px-2 py-1 text-xs font-medium text-accent-foreground"
            >
              {tag.tag_name}
            </span>
          ))}
        </div>
      )}

      {listing.listing_images?.length > 0 && (
        <div className="mb-6">
          <ListingImageCarousel
            images={listing.listing_images}
            listingName={listing.listing_name}
          />
        </div>
      )}

      {listing.listing_description && (
        <div className="bg-card p-6 rounded-lg shadow-sm border mb-6">
          <p className="text-foreground whitespace-pre-wrap">{listing.listing_description}</p>
        </div>
      )}

      <div className="bg-muted p-6 rounded-lg border space-y-3">
        <h3 className="font-semibold text-lg">Location & Details</h3>
        
        <div>
          <p className="flex items-start gap-1.5">
            <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span><span className="font-semibold">Address:</span> {listing.listing_address || "No address provided"}</span>
          </p>
          {listing.unit_number && (
            <p className="text-sm text-muted-foreground ml-5.5">Unit: {listing.unit_number}</p>
          )}
        </div>

        {listing.directions_tip && (
          <div className="bg-background/80 p-3 rounded-md border text-sm">
            <p className="font-medium text-primary flex items-center gap-1.5">
              <Lightbulb className="h-4 w-4 flex-shrink-0" />
              <span>How to Get There:</span>
            </p>
            <p className="text-muted-foreground mt-0.5">{listing.directions_tip}</p>
          </div>
        )}

        {listing.is_24_hours ? (
          <p className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span><span className="font-semibold">Operation Hours:</span> Open 24 hours</span>
          </p>
        ) : listing.open_time && listing.close_time ? (
          <p className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span><span className="font-semibold">Operation Hours:</span> {listing.open_time.slice(0, 5)} - {listing.close_time.slice(0, 5)}</span>
          </p>
        ) : null}

        {/* --- NEW: Get Directions Button using saved coordinates --- */}
        {listing.latitude && listing.longitude && (
          <div className="pt-2">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${listing.latitude},${listing.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              Open in Google Maps <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </div>
    </main>
  );
}