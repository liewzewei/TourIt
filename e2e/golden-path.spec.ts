import { test, expect } from "@playwright/test";

// Golden path: an authenticated, unonboarded tourist completes the tag quiz,
// lands on the personalized explore feed, opens a listing, and schedules it into
// an itinerary. The signed-in session and a clean test user are provisioned by
// auth.setup.ts (the "setup" project this spec depends on).
test("tourist completes quiz, explores, and schedules a listing", async ({
  page,
}) => {
  // The 15-card quiz plus first-hit dev compiles of each route add up.
  test.setTimeout(90_000);

  // The proxy middleware traps an unonboarded tourist in the quiz.
  await page.goto("/");
  await expect(page).toHaveURL(/\/tourist\/quiz/);

  // Wait for the tag grid to load
  await expect(page.getByText(/Select up to 3 things/i)).toBeVisible();

  // Select up to 3 tags.
  const tagContainer = page.locator('.flex-wrap');
  const tagButtons = tagContainer.getByRole("button");
  await tagButtons.first().waitFor();
  
  const count = Math.min(3, await tagButtons.count());
  for (let i = 0; i < count; i++) {
    await tagButtons.nth(i).click();
  }

  // Submit the selected tags
  const continueButton = page.getByRole("button", { name: "Continue", exact: true });
  await expect(continueButton).toBeEnabled();
  await continueButton.click();

  // Quiz complete → personalized feed.
  await expect(page).toHaveURL(/\/tourist\/explore/);
  await expect(
    page.getByRole("heading", { name: "Explore Listings" }),
  ).toBeVisible();

  // Open the first ranked listing.
  const firstListing = page
    .locator('a[href*="/tourist/explore/listings/"]')
    .first();
  await expect(firstListing).toBeVisible();
  await firstListing.click();

  // Schedule it. With a fresh user the modal auto-creates a first itinerary.
  await page.getByRole("button", { name: "Add to Itinerary" }).click();
  await expect(
    page.getByRole("heading", { name: "Schedule Visit" }),
  ).toBeVisible();

  // "Add now, let AI decide the timings" is checked by default, so the stop is
  // added without a time for the AI scheduler to slot in later.
  await page.getByRole("button", { name: "Save Schedule" }).click();

  // Success is confirmed via a toast. Match the visible toast exactly — a
  // substring match also hits Radix's hidden "Notification ..." aria-live span.
  await expect(
    page.getByText("Added to your itinerary.", { exact: true }),
  ).toBeVisible();

  // Modal closes on success.
  await expect(
    page.getByRole("heading", { name: "Schedule Visit" }),
  ).toBeHidden();
});
