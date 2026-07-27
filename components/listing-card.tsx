import Image from "next/image";
import Link from "next/link";
import { ImageIcon, MapPin, Clock } from "lucide-react";

import { getListingImageUrl } from "@/lib/listing-images";

export type ListingCardTag = { id: string; tag_name: string };

// The listing card shared by the explore feed and the business-owner home. It
// takes already-normalised props (each page flattens its own row shape) so the
// two feeds can never drift apart again. The cover area is always present -- a
// listing with no image shows a neutral placeholder -- so owner and tourist
// cards line up whether or not images have been added yet.
//
// `href` makes the whole card a link (the tourist feed); omitting it renders a
// static card (the owner's read-only list).
type ListingCardProps = {
  name: string;
  description?: string | null;
  address?: string | null;
  openTime?: string | null;
  closeTime?: string | null;
  tags?: ListingCardTag[];
  imagePath?: string | null;
  href?: string;
  // Defaults to the shared 3-column grid these feeds render in.
  imageSizes?: string;
};

const DEFAULT_IMAGE_SIZES =
  "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw";

export default function ListingCard({
  name,
  description,
  address,
  openTime,
  closeTime,
  tags = [],
  imagePath,
  href,
  imageSizes = DEFAULT_IMAGE_SIZES,
}: ListingCardProps) {
  const body = (
    <>
      {/* Fixed aspect box reserves space before load (no layout shift). A
          missing image falls back to a neutral icon, not a committed asset. */}
      <div className="relative aspect-video bg-muted">
        {imagePath ? (
          <Image
            src={getListingImageUrl(imagePath)}
            alt={name}
            fill
            sizes={imageSizes}
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground/60">
            <ImageIcon className="h-10 w-10" aria-hidden />
          </div>
        )}
      </div>

      <div className="flex flex-grow flex-col p-6">
        <h2 className="mb-2 text-xl font-semibold">{name}</h2>

        <p className="mb-4 line-clamp-3 flex-grow text-muted-foreground">
          {description || "No description provided."}
        </p>

        {tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full bg-accent px-2 py-1 text-xs font-medium text-accent-foreground"
              >
                {tag.tag_name}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto border-t pt-4 text-sm text-muted-foreground space-y-1">
          <p className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{address || "Location unavailable"}</span>
          </p>
          {(openTime || closeTime) && (
            <p className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{openTime} - {closeTime}</span>
            </p>
          )}
        </div>
      </div>
    </>
  );

  // `lift` (hover: rise + scale + elevated shadow) drives the card off the page;
  // its transform/shadow animate via this element's own transition. Under
  // reduced motion the lift tokens flatten to no movement, leaving just the
  // shadow as a hover cue.
  const className =
    "flex h-full flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition-all lift";

  if (href) {
    return (
      <Link href={href} className={`${className} cursor-pointer`}>
        {body}
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}
