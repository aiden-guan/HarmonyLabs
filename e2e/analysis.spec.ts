import { expect, test } from "@playwright/test";
import path from "node:path";
import { writeCheckerboards } from "./checkerboard";

const fixtureDir = path.join(process.cwd(), "e2e", "fixtures");

test.beforeAll(() => {
  writeCheckerboards(fixtureDir);
});

test("sign in, upload, adjust a landmark, and read the harmony report", async ({ page }) => {
  await page.goto("/auth/login?next=/analysis/new");
  await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  await page.getByLabel("Email").fill(`qa-${Date.now()}@facelab.test`);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator("#content").getByText("New analysis")).toBeVisible();

  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Upload photo" }).click();
  await page.getByLabel("Front photograph").setInputFiles(path.join(fixtureDir, "front.png"));
  await expect(page.getByRole("heading", { name: "Profile photograph" })).toBeVisible();
  await page.getByRole("button", { name: "Upload photo" }).click();
  await page.getByLabel("Profile photograph").setInputFiles(path.join(fixtureDir, "profile.png"));
  await expect(page.getByRole("heading", { name: "Photo check" })).toBeVisible();
  await page.getByRole("button", { name: "Review landmarks" }).click();

  const nasion = page.locator("[data-landmark='nasion']");
  await nasion.focus();
  await page.keyboard.press("ArrowRight");
  await page.getByRole("button", { name: "Continue to profile" }).click();
  await page.getByRole("button", { name: "Calculate measurements" }).click();

  await expect(page.getByText("Proportional harmony")).toBeVisible();
  await expect(page.getByText("Geometric reference score, not attractiveness.")).toBeVisible();

  await page.getByRole("button", { name: "Measurements" }).click();
  await page.getByRole("button", { name: "View" }).first().click();
  await expect(page.locator("svg polyline, svg line, svg path").first()).toBeVisible();

  await page.getByRole("button", { name: "Ask AI" }).click();
  await page.getByRole("button", { name: "What measurements are furthest from reference?" }).click();
  await expect(page.getByText("not a measure of attractiveness")).toBeVisible();
});
