"use client";

import * as React from "react";
import Image from "next/image";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { getListingImageUrl } from "@/lib/listing-images";
import { cn } from "@/lib/utils";

type ListingImage = { id: string; image_path: string };

// The detail page lives in a max-w-4xl (896px) column; this hints the optimizer
// to serve roughly that width on desktop and full-viewport on smaller screens.
const IMAGE_SIZES = "(max-width: 896px) 100vw, 832px";

function CoverImage({
  image,
  alt,
  priority,
}: {
  image: ListingImage;
  alt: string;
  priority: boolean;
}) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-lg border bg-gray-100">
      <Image
        src={getListingImageUrl(image.image_path)}
        alt={alt}
        fill
        priority={priority}
        sizes={IMAGE_SIZES}
        className="object-cover"
      />
    </div>
  );
}

export default function ListingImageCarousel({
  images,
  listingName,
}: {
  images: ListingImage[];
  listingName: string;
}) {
  const [api, setApi] = React.useState<CarouselApi>();
  // 0-based index of the visible slide. Starts at 0 (Embla's default start
  // index) and is only ever written from the "select"/"reInit" listeners, so no
  // setState runs synchronously inside the effect.
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  // No images: render nothing so the detail page keeps its current layout.
  if (images.length === 0) return null;

  // A single image needs no carousel chrome.
  if (images.length === 1) {
    return <CoverImage image={images[0]} alt={`${listingName} photo 1`} priority />;
  }

  return (
    <div className="flex flex-col gap-3">
      <Carousel setApi={setApi} className="w-full">
        <CarouselContent>
          {images.map((image, index) => (
            <CarouselItem key={image.id}>
              <CoverImage
                image={image}
                alt={`${listingName} photo ${index + 1}`}
                priority={index === 0}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        {/* Arrows are for pointer devices (touch users swipe). Positioned just
            inside the image so they never clip against the narrow content
            column. */}
        <CarouselPrevious className="hidden sm:flex left-2" />
        <CarouselNext className="hidden sm:flex right-2" />
      </Carousel>

      <div className="flex items-center justify-center gap-3">
        <div className="flex items-center gap-1.5">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => api?.scrollTo(index)}
              aria-label={`Go to photo ${index + 1}`}
              aria-current={index === current}
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                index === current ? "bg-gray-800" : "bg-gray-300 hover:bg-gray-400",
              )}
            />
          ))}
        </div>
        <span className="text-sm text-gray-500 tabular-nums">
          {current + 1} / {images.length}
        </span>
      </div>
    </div>
  );
}
