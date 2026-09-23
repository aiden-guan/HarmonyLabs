import { expect, test } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import { writeCheckerboards } from "./checkerboard";

const fixtureDir = path.join(process.cwd(), "e2e", "fixtures");

test.beforeAll(() => {
  writeCheckerboards(fixtureDir);
});

test("sign in, upload, adjust a landmark, read report, and export shareable card", async ({ page }) => {
  await page.goto("/auth/login?next=/analysis/new");
  await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  await page.getByLabel("Email").fill(`qa-${Date.now()}@moglabs.test`);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator("#content").getByText("New analysis")).toBeVisible();

  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Upload photo" }).click();
  await page.getByLabel("Front photograph").setInputFiles(path.join(fixtureDir, "front.png"));
  await expect(page.getByRole("heading", { name: "Profile photograph" })).toBeVisible();
  await expect(page.getByText("Turn your head 90° to either side.")).toBeVisible();
  await page.getByRole("button", { name: "Upload photo" }).click();
  await page.getByLabel("Profile photograph").setInputFiles(path.join(fixtureDir, "profile.png"));
  await expect(page.getByRole("heading", { name: "Photo check" })).toBeVisible();
  await page.getByRole("button", { name: "Review landmarks" }).click();

  const nasion = page.locator("[data-landmark='nasion']");
  await nasion.focus();
  await page.keyboard.press("ArrowRight");
  await page.getByRole("button", { name: "Continue to profile" }).click();
  await page.getByRole("button", { name: "Calculate measurements" }).click();

  // Redesigned report verification
  await expect(page.getByText("Proportional harmony")).toBeVisible();
  await expect(page.getByText("Geometric reference score, not attractiveness.")).toBeVisible();

  // Measurements tab & overlay verification
  await page.getByRole("button", { name: "Measurements" }).click();
  await page.getByRole("button", { name: "View" }).first().click();
  await expect(page.locator("svg polyline, svg line, svg path").first()).toBeVisible();

  // Ask AI tab verification
  await page.getByRole("button", { name: "Ask AI" }).click();
  await page.getByRole("button", { name: "What measurements are furthest from reference?" }).click();
  await expect(page.getByText("not a measure of attractiveness")).toBeVisible();

  // Share results verification (Sections 18-23, 30)
  await expect(page.getByRole("button", { name: "Share results" })).toBeVisible();
  await page.getByRole("button", { name: "Share results" }).click();

  // Modal dialog & 4:5 live preview verification
  await expect(page.getByRole("heading", { name: "Share results" })).toBeVisible();
  const preview = page.getByTestId("share-card-preview");
  await expect(preview).toBeVisible();
  await expect(preview.locator("img")).toBeVisible({ timeout: 15_000 });

  // Download PNG verification
  const downloadButton = page.getByRole("button", { name: "Download PNG" });
  await expect(downloadButton).toBeEnabled();

  const downloadPromise = page.waitForEvent("download");
  await downloadButton.click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe("MogLabs-result.png");
  const downloadedPath = await download.path();
  expect(downloadedPath).toBeTruthy();
  if (downloadedPath) {
    const fileStats = await fs.promises.stat(downloadedPath);
    expect(fileStats.size).toBeGreaterThan(1000);
  }

  // Close modal via Escape key
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Share results" })).not.toBeVisible();
});
