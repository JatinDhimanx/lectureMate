import { test, expect } from "@playwright/test";

test.describe("RecallLoop Study Session", () => {
  test("loads demo study session and allows card flip & FSRS rating", async ({ page }) => {
    await page.goto("/study");

    // Page heading should be visible
    await expect(page.locator("text=Active Recall Session").first()).toBeVisible({ timeout: 10000 });

    // Should display front of card
    const frontCard = page.locator("text=What are the three guarantees").first();
    await expect(frontCard).toBeVisible();

    // Flip card button should be visible
    const flipButton = page.getByRole("button", { name: /flip card/i }).first();
    await expect(flipButton).toBeVisible();

    // Click to flip
    await flipButton.click();

    // Answer buttons (Again, Hard, Good, Easy) should appear
    await expect(page.getByRole("button", { name: /good/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /again/i }).first()).toBeVisible();

    // Verbatim Evidence Drawer button should exist
    const evidenceButton = page.getByRole("button", { name: /verbatim source quote/i }).first();
    await expect(evidenceButton).toBeVisible();

    // Click Good rating
    await page.getByRole("button", { name: /good/i }).first().click();
  });
});
