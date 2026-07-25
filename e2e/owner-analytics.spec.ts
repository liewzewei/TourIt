import { test, expect } from "@playwright/test";

// Happy path for the business-owner analytics dashboard, run as the seeded owner
// (see owner.setup.ts). Exercises the whole feature end-to-end against the real
// migrations, RLS, seed data, and SECURITY DEFINER RPCs: the overview renders,
// the period switch works, and drilling into a listing loads its page.
//
// Assertions are structural (headings, table, links) rather than exact numbers,
// so the test is robust to other tests mutating saves/views. The AI insight is
// skipped in CI (no GEMINI_API_KEY), so it never gates the run.
test("business owner sees their analytics dashboard", async ({ page }) => {
  // Locally the AI insight streams for a few seconds (it's skipped in CI, which
  // has no GEMINI_API_KEY), delaying load. Wait for full load so the period /
  // drill-down Links are hydrated before we click them, and allow for the wait.
  test.setTimeout(60_000);
  await page.goto("/business-owner/analytics");

  // Header + period selector.
  await expect(
    page.getByRole("heading", { name: "Insights", level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "30 days" })).toBeVisible();

  // KPI card. The label also appears as a table column header, so take the first
  // match — the card sits above the table.
  await expect(page.getByText("Unique visitors").first()).toBeVisible();

  // Per-listing comparison table: a seeded listing row + the totals row.
  await expect(page.getByRole("heading", { name: "Per listing" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Marina Bay Sands SkyPark" }),
  ).toBeVisible();
  await expect(page.getByRole("cell", { name: "All listings" })).toBeVisible();

  // Trend chart + audience panel.
  await expect(
    page.getByRole("heading", { name: "Views & saves over time" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Audience interests" }),
  ).toBeVisible();

  // Period switch updates the URL. The click triggers a client-side RSC
  // navigation; locally the AI insight Suspense stream can delay the router's
  // URL commit for ~13s, so we give the URL assertion a generous timeout.
  await page.getByRole("link", { name: "7 days" }).click();
  await page.waitForURL(/[?&]period=7d/, { timeout: 30_000 });

  // Drill into a listing. Same generous timeout — the new page also streams
  // its own AI insight via Suspense.
  await page.getByRole("link", { name: "Marina Bay Sands SkyPark" }).click();
  await page.waitForURL(/\/business-owner\/analytics\/[0-9a-f-]{36}/, {
    timeout: 30_000,
  });
  await expect(
    page.getByRole("heading", { name: "Marina Bay Sands SkyPark", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "All listings" }),
  ).toBeVisible();
});
