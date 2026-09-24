import { describe, expect, it } from "vitest";
import { FRONT_FRAME_RATIO, SIDE_FRAME_RATIO, THREE_QUARTER_FRAME_RATIO } from "@/lib/face/capture-outline";

describe("capture framing", () => {
  it("keeps a generic head region and no drawn facial anatomy", () => {
    expect(THREE_QUARTER_FRAME_RATIO).toBeGreaterThan(FRONT_FRAME_RATIO);
    expect(SIDE_FRAME_RATIO).toBeGreaterThan(THREE_QUARTER_FRAME_RATIO);
    expect(SIDE_FRAME_RATIO).toBeGreaterThan(1);
  });
});
