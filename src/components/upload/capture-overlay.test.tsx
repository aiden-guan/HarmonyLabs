/**
 * @vitest-environment jsdom
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CaptureFrameGuide, type GuideLive } from "@/components/upload/capture-overlay";

const live: GuideLive = {
  oval: [
    { x: 0.4, y: 0.2 },
    { x: 0.6, y: 0.25 },
    { x: 0.55, y: 0.8 },
  ],
  eyeLine: [
    { x: 0.42, y: 0.4 },
    { x: 0.58, y: 0.4 },
  ],
  nose: { x: 0.7, y: 0.5 },
};

describe("capture overlay", () => {
  it("does not draw facial anatomy or the live face oval on a turned stage", () => {
    for (const view of ["threeQuarter", "profile"] as const) {
      const { container } = render(<CaptureFrameGuide width={640} height={480} view={view} status="adjust" live={live} />);
      expect(container.querySelector("polygon")).toBeNull();
      expect(container.querySelector("[data-landmark]")).toBeNull();
      expect(container.querySelector("[data-guide='brackets']")).not.toBeNull();
      expect(container.querySelector("[data-guide='frame-oval']")).not.toBeNull();
      expect(container.querySelectorAll("ellipse")).toHaveLength(1);
      expect(container.querySelectorAll("line")).toHaveLength(0);
    }
  });

  it("keeps the simple front overlay, including the live face oval", () => {
    const { container } = render(<CaptureFrameGuide width={640} height={480} view="front" status="ready" live={live} />);
    expect(container.querySelector("polygon")).not.toBeNull();
    expect(container.querySelector("[data-landmark='nose']")).not.toBeNull();
    expect(container.querySelectorAll("ellipse").length).toBeGreaterThan(1);
  });
});
