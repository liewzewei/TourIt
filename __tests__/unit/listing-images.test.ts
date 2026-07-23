import {
  ALLOWED_IMAGE_TYPES,
  LISTING_IMAGES_BUCKET,
  MAX_IMAGES_PER_LISTING,
  MAX_IMAGE_BYTES,
  getListingImageUrl,
  validateImageFiles,
} from "@/lib/listing-images";

// Sizes/counts are derived from the exported constants rather than hard-coded,
// so these tests keep testing the *rule* if a limit is ever retuned.
const mkFile = (
  name: string,
  type: string = "image/jpeg",
  size: number = 1024,
): File => new File([new ArrayBuffer(size)], name, { type });

describe("validateImageFiles", () => {
  it("accepts an empty batch (images are optional)", () => {
    expect(validateImageFiles([])).toBeNull();
  });

  it("accepts a batch of allowed types", () => {
    expect(
      validateImageFiles([mkFile("a.jpg", "image/jpeg"), mkFile("b.png", "image/png")]),
    ).toBeNull();
  });

  it("accepts exactly the maximum number of images", () => {
    const files = Array.from({ length: MAX_IMAGES_PER_LISTING }, (_, i) =>
      mkFile(`photo-${i}.jpg`),
    );
    expect(validateImageFiles(files)).toBeNull();
  });

  it("rejects one image over the maximum", () => {
    const files = Array.from({ length: MAX_IMAGES_PER_LISTING + 1 }, (_, i) =>
      mkFile(`photo-${i}.jpg`),
    );
    expect(validateImageFiles(files)).toMatch(
      new RegExp(`at most ${MAX_IMAGES_PER_LISTING} images`),
    );
  });

  it("accepts a file exactly at the size limit", () => {
    expect(validateImageFiles([mkFile("edge.jpg", "image/jpeg", MAX_IMAGE_BYTES)])).toBeNull();
  });

  it("rejects a file one byte over the size limit, naming it", () => {
    const error = validateImageFiles([
      mkFile("too-big.jpg", "image/jpeg", MAX_IMAGE_BYTES + 1),
    ]);
    expect(error).toContain("too-big.jpg");
    expect(error).toContain("5 MB");
  });

  it("rejects a disallowed image type, naming it", () => {
    const error = validateImageFiles([mkFile("anim.gif", "image/gif")]);
    expect(error).toContain("anim.gif");
    expect(error).toContain("JPG or PNG");
  });

  it("rejects a non-image type", () => {
    expect(validateImageFiles([mkFile("doc.pdf", "application/pdf")])).not.toBeNull();
  });

  it("rejects a file with an empty type", () => {
    expect(validateImageFiles([mkFile("mystery", "")])).not.toBeNull();
  });

  it("reports the offending file even when earlier files are fine", () => {
    const error = validateImageFiles([
      mkFile("ok.jpg", "image/jpeg"),
      mkFile("bad.gif", "image/gif"),
    ]);
    expect(error).toContain("bad.gif");
  });

  it("checks the count before individual files", () => {
    // A batch that breaks both rules reports the count problem first.
    const files = Array.from({ length: MAX_IMAGES_PER_LISTING + 1 }, (_, i) =>
      mkFile(`bad-${i}.gif`, "image/gif"),
    );
    expect(validateImageFiles(files)).toMatch(
      new RegExp(`at most ${MAX_IMAGES_PER_LISTING} images`),
    );
  });

  it("accepts every type on the allow-list", () => {
    for (const type of ALLOWED_IMAGE_TYPES) {
      expect(validateImageFiles([mkFile("photo", type)])).toBeNull();
    }
  });
});

describe("getListingImageUrl", () => {
  // next/jest loads env files, but Next skips .env.local when NODE_ENV is
  // "test", so the URL has to be stubbed here.
  const original = process.env.NEXT_PUBLIC_SUPABASE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  });

  afterAll(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = original;
  });

  it("builds a public object URL for a stored path", () => {
    expect(getListingImageUrl("listing-id/photo.jpg")).toBe(
      `https://example.supabase.co/storage/v1/object/public/${LISTING_IMAGES_BUCKET}/listing-id/photo.jpg`,
    );
  });

  it("does not double up the slash when the base URL has a trailing one", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co/";
    expect(getListingImageUrl("listing-id/photo.jpg")).toBe(
      `https://example.supabase.co/storage/v1/object/public/${LISTING_IMAGES_BUCKET}/listing-id/photo.jpg`,
    );
  });

  it("works against a local stack URL", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    expect(getListingImageUrl("abc/def.png")).toBe(
      `http://127.0.0.1:54321/storage/v1/object/public/${LISTING_IMAGES_BUCKET}/abc/def.png`,
    );
  });
});
