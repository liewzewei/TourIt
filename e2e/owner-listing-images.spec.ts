import { test, expect } from "@playwright/test";
import path from "node:path";
import { createAdminClient, deleteListingCascade } from "./supabase-admin";

// End-to-end for the Listing Images feature, exercising both roles in one flow:
// the seeded business owner (this file matches /owner-.*\.spec\.ts/, so the
// project gives `page` the owner storage state) uploads images while creating a
// listing, then a tourist views the cover on the explore feed and swipes the
// detail-page carousel.
//
// The tourist is a second browser context signed in as the seeded, already
// onboarded tourist@tourit.local (a different user from the golden-path tourist,
// so there's no interference with auth.setup.ts). An owner can't view
// /tourist/explore -- the proxy redirects them to their own dashboard -- hence
// the separate context rather than reusing `page`.

const FIXTURE_1 = path.join(__dirname, "fixtures", "listing-photo-1.jpg");
const FIXTURE_2 = path.join(__dirname, "fixtures", "listing-photo-2.jpg");
const BASE_URL = "http://localhost:3000";

// Unique per run so the listing is easy to find and reruns don't collide.
const LISTING_NAME = `E2E Image Listing ${Date.now()}`;

test.describe("listing images", () => {
  let listingId: string | undefined;

  test.afterAll(async () => {
    // Remove the listing, its images (rows + storage objects), and any views.
    if (listingId) await deleteListingCascade(listingId);
  });

  test("owner uploads images; tourist sees the cover and swipes the gallery", async ({
    page,
    browser,
  }) => {
    // First-hit dev compiles of each route add up; the upload is a round trip too.
    test.setTimeout(60_000);

    // --- 1. Owner creates a listing with two images ---
    await page.goto("/business-owner/listings");
    await page.getByLabel("Listing Name").fill(LISTING_NAME);
    await page.getByLabel("Street Address, City & Country").fill("1600 Pennsylvania Avenue NW, Washington, DC 20500, United States");
    // Open 24 hours so no opening/closing times are required.
    await page.getByLabel("Open 24 hours").check();
    
    // The file input has no name attribute (bytes must not hit the server
    // action), so target it by id. setInputFiles fires the change handler.
    await page.locator("#listing_images").setInputFiles([FIXTURE_1, FIXTURE_2]);
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(2);

    await page.getByRole("button", { name: "Create Listing" }).click();

    // The listing row is created first, then the images upload directly to
    // Storage and are recorded -- one toast each.
    await expect(
      page.getByText("Your listing was created successfully.", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("2 images added to your listing.", { exact: true }),
    ).toBeVisible();

    // The form doesn't navigate, so read the new id back via the admin client.
    const admin = createAdminClient();
    const { data: listing, error } = await admin
      .from("listings")
      .select("id")
      .eq("listing_name", LISTING_NAME)
      .single();
    expect(error, error?.message).toBeNull();
    listingId = listing?.id as string;
    expect(listingId, "created listing id").toBeTruthy();

    // --- 2 & 3. Tourist views the listing in a separate, onboarded session ---
    const touristContext = await browser.newContext({ baseURL: BASE_URL });
    try {
      // context.request shares the cookie jar with the context's pages, so this
      // login authenticates touristPage (same pattern as auth.setup.ts).
      const loginRes = await touristContext.request.post("/auth/test-login", {
        data: { email: "tourist@tourit.local", password: "password123" },
      });
      expect(
        loginRes.ok(),
        `tourist login failed: ${loginRes.status()} ${await loginRes.text()}`,
      ).toBeTruthy();
      const touristPage = await touristContext.newPage();

      // 2. The explore card shows a real cover image (an <img>), not the
      // placeholder icon. Fewer than PAGE_SIZE listings exist, so the new one is
      // on the first page regardless of ranking.
      await touristPage.goto("/tourist/explore");
      const card = touristPage.locator(
        `a[href*="/tourist/explore/listings/${listingId}"]`,
      );
      await expect(card).toBeVisible();
      await expect(card.locator("img")).toBeVisible();

      // 3. The detail-page carousel starts at 1 / 2 and advances on Next.
      await touristPage.goto(`/tourist/explore/listings/${listingId}`);
      await expect(touristPage.getByText("1 / 2")).toBeVisible();
      await touristPage.getByRole("button", { name: "Next slide" }).click();
      await expect(touristPage.getByText("2 / 2")).toBeVisible();
    } finally {
      await touristContext.close();
    }
  });
});
