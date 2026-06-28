import { test, expect } from "@playwright/test";

// Proves the auth plumbing end to end: with the saved session, the proxy
// middleware recognizes a logged-in (but unonboarded) tourist and routes them
// to the quiz. Without a valid session they'd be sent to /auth/login instead.
test("authenticated tourist is routed to the quiz", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/tourist\/quiz/);
});
