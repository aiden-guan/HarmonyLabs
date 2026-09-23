import { describe, expect, it } from "vitest";
import {
  SHARE_CARD_HEIGHT,
  SHARE_CARD_WIDTH,
  SHARE_PHOTO_HEIGHT,
  getSansFont,
  getMonoFont,
} from "./render-result-card";

describe("share card dimensions and geometry", () => {
  it("enforces standard 4:5 social aspect ratio at 1080x1350 resolution", () => {
    expect(SHARE_CARD_WIDTH).toBe(1080);
    expect(SHARE_CARD_HEIGHT).toBe(1350);
    expect(SHARE_CARD_WIDTH / SHARE_CARD_HEIGHT).toBe(4 / 5);
  });

  it("allocates top 70% for user front photography", () => {
    expect(SHARE_PHOTO_HEIGHT).toBe(945);
    expect(SHARE_PHOTO_HEIGHT / SHARE_CARD_HEIGHT).toBe(0.7);
  });

  it("leaves sufficient vertical room for branding, large score, and reference descriptor", () => {
    const footerHeight = SHARE_CARD_HEIGHT - SHARE_PHOTO_HEIGHT;
    expect(footerHeight).toBe(405);
    expect(footerHeight).toBeGreaterThanOrEqual(300);
  });

  it("generates valid CSS font strings without rejected CSS var() syntax", () => {
    const sans = getSansFont(700, 32);
    expect(sans).toContain("700 32px");
    // Must never contain var() which CanvasRenderingContext2D.font rejects
    expect(sans).not.toContain("var(");

    const mono = getMonoFont(600, 120);
    expect(mono).toContain("600 120px");
    expect(mono).not.toContain("var(");
  });
});
