import createClient from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import ListingImageCarousel from "@/components/listing-image-carousel";
import BackLink from "@/components/back-link";
import { LOGIN_PATH } from "@/constants/common";
import { Pencil, MapPin, Clock, Lightbulb, ExternalLink } from "lucide-react";

export default async function OwnerListingDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();

  // 1. Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect(LOGIN_PATH);
  }

  // 2. Await params before using them (Next.js 15+ requirement)
  const resolvedParams = await params;

  // 3. Fetch the listing by ID, ensuring it belongs to THIS business owner
  const { data: listing, error } = await supabase
    .from("listings")
    .select(`
      *,
      listing_tags (
        tags (id, tag_name)
      ),
      listing_images (id, image_path, display_order)
    `)
    .eq("id", resolvedParams.id)
    .eq("profile_id", user.id) // Security check: Must be owned by logged-in user!
    .order("display_order", { referencedTable: "listing_images" })
    .single();

  if (error || !listing) {
    console.error("Supabase Error or Listing Not Found:", error);
    return notFound();
  }

  // 4. Flatten the many-to-many tags relationship
  const tags = (listing.listing_tags ?? [])
    .map((relation: { tags: { id: string; tag_name: string } | null }) => relation.tags)
    .filter((tag: { id: string; tag_name: string } | null): tag is { id: string; tag_name: string } => tag !== null);

  // 5. Render the exact same view as tourists, but with Owner controls!
  return (
    <main className="w-full max-w-4xl mx-auto p-8">
      <div className="mb-6">
        <BackLink href="/business-owner">Back to my dashboard</BackLink>
      </div>

      <div className="flex justify-between items-start mb-4 gap-4">
        <h1 className="text-4xl font-bold">{listing.listing_name}</h1>
        
        {/* --- Owner Control: Edit Listing Button --- */}
        <Link
          href={`/business-owner/listings/${listing.id}/edit`}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap"
        >
          <Pencil className="h-4 w-4" /> Edit Listing
        </Link>
      </div>

      {/* Tags Pill List */}
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

      {/* Image Carousel */}
      {listing.listing_images?.length > 0 && (
        <div className="mb-6">
          <ListingImageCarousel
            images={listing.listing_images}
            listingName={listing.listing_name}
          />
        </div>
      )}

      {/* Description Box */}
      {listing.listing_description && (
        <div className="bg-card p-6 rounded-lg shadow-sm border mb-6">
          <p className="text-foreground whitespace-pre-wrap">{listing.listing_description}</p>
        </div>
      )}

      {/* Location & Details Box */}
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

        {/* Google Maps Button using coordinates */}
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