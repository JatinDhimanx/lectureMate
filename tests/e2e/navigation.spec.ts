import { test, expect } from "@playwright/test";

test.describe("RecallLoop Dashboard Navigation", () => {
  test("loads landing page with hero CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Master Any Lecture");
    await expect(page.getByRole("link", { name: /try live demo/i }).first()).toBeVisible();
  });

  test("navigates through dashboard core routes", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("text=Welcome back").first()).toBeVisible();

    await page.goto("/lectures");
    await expect(page.locator("h1")).toHaveText("Lectures");

    await page.goto("/quiz");
    await expect(page.locator("h1")).toHaveText("Adaptive Quizzes");

    await page.goto("/map");
    await expect(page.locator("h1")).toHaveText("Knowledge Graphs");

    await page.goto("/settings");
    await expect(page.locator("h1")).toHaveText("Settings & Preferences");
  });
});
