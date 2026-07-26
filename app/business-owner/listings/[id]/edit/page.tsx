import createClient from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import ListingForm from "../../listing-form";
import BackLink from "@/components/back-link";
import { LOGIN_PATH } from "@/constants/common";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect(LOGIN_PATH);
  }

  const resolvedParams = await params;

  // 1. Fetch tags and existing listing in parallel
  const [tagsRes, listingRes] = await Promise.all([
    supabase.from("tags").select("*").order("category"),
    supabase
      .from("listings")
      .select(`
        *,
        listing_tags (
          tags (id, tag_name)
        ),
        listing_images (id, image_path, display_order)
      `)
      .eq("id", resolvedParams.id)
      .eq("profile_id", user.id)
      .single(),
  ]);

  if (listingRes.error || !listingRes.data) {
    return notFound();
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <div className="mb-4">
        <BackLink href={`/business-owner/listings/${resolvedParams.id}`}>
          Back to listing
        </BackLink>
      </div>
      
      <h1 className="text-2xl font-bold mb-6">Edit Listing</h1>
      
      {/* Pass initialData to your form */}
      <ListingForm
        availableTags={tagsRes.data || []}
        initialData={listingRes.data}
      />
    </div>
  );
}