import { test, expect } from "@playwright/test";

// Theming is role-agnostic; this runs as the onboarded seeded owner so /settings
// is reachable (the tourist test user is reset to unonboarded and trapped in the
// quiz). Covers the switcher plus persistence of both axes across a full
// navigation and a reload.
test("theme mode and palette persist across navigation and reload", async ({
  page,
}) => {
  test.setTimeout(60_000);

  await page.goto("/settings/profile");
  const html = page.locator("html");

  // Baseline: no palette cookie -> default palette.
  await expect(html).toHaveAttribute("data-palette", "default");

  // Switch mode to Dark (next-themes adds the class) ...
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(html).toHaveClass(/dark/);

  // ... and the palette to Sunset (cookie + data-palette attribute).
  await page.getByRole("button", { name: "Sunset", exact: true }).click();
  await expect(html).toHaveAttribute("data-palette", "sunset");

  // Persist across a full navigation: palette via the SSR cookie read, mode via
  // next-themes' blocking script from localStorage.
  await page.goto("/business-owner");
  await expect(html).toHaveAttribute("data-palette", "sunset");
  await expect(html).toHaveClass(/dark/);

  // Persist across a reload too.
  await page.reload();
  await expect(html).toHaveAttribute("data-palette", "sunset");
  await expect(html).toHaveClass(/dark/);
});
