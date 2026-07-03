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

  // Derive the number of cards from the "Tag X of N" counter rather than
  // hardcoding it (quiz/page.tsx fetches up to 15 tags).
  const counter = page.getByText(/Tag \d+ of \d+/);
  await expect(counter).toBeVisible();
  const total = Number((await counter.textContent())?.match(/of (\d+)/)?.[1]);
  expect(total).toBeGreaterThan(0);

  // Like the first few tags (exercises the tourist_tags insert), skip the rest.
  // Either button advances; the action on the final card completes onboarding
  // and redirects to explore. Playwright auto-waits for each button to re-enable
  // between cards (the "Interested" insert briefly disables them).
  for (let i = 0; i < total; i++) {
    const label = i < 3 ? "Interested" : "Skip";
    await page.getByRole("button", { name: label, exact: true }).click();
  }

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

  // Success is confirmed via a toast.
  await expect(page.getByText("Added to your itinerary")).toBeVisible();

  // Modal closes on success.
  await expect(
    page.getByRole("heading", { name: "Schedule Visit" }),
  ).toBeHidden();
});
