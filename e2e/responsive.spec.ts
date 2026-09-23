import { expect, test } from "@playwright/test";

const viewports = [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1440", width: 1440, height: 900 },
];

for (const vp of viewports) {
  test(`landing page renders with no horizontal overflow at ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/");

    // Verify main landmarks
    await expect(page.getByText("Your facial proportions, measured.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Analyze face" }).first()).toBeVisible();

    // Verify no horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });

  test(`login page renders with no horizontal overflow at ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/auth/login");

    await expect(page.getByRole("heading", { name: "Sign in to MogLabs" })).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });

  test(`dashboard and compare render with no horizontal overflow at ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });

    // Authenticate via dev login
    await page.goto("/auth/login?next=/dashboard");
    await page.getByLabel("Email").fill(`responsive-${vp.name}@moglabs.test`);
    await page.getByRole("button", { name: "Continue" }).click();

    // Verify dashboard
    await expect(page.getByRole("heading", { name: "Your analyses" })).toBeVisible();
    let hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);

    // Verify compare studio
    await page.goto("/compare");
    await expect(page.getByText("Compare two analyses")).toBeVisible();
    hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);
  });
}
