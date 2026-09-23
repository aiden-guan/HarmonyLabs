import { describe, expect, it } from "vitest";
import { createCaptureQueue } from "@/lib/face/capture-queue";
import { liveMeshIsFresh, resolveCaptureFaces } from "@/lib/face/capture-route";
import { createSessionLease } from "@/lib/mediapipe/session-lease";

const frame = { width: 1280, height: 960 };
const face = [{ x: 0.5, y: 0.4, z: 0 }];

describe("capture face routing", () => {
  it("reuses a fresh camera mesh and does not call the still detector", async () => {
    let calls = 0;
    const result = await resolveCaptureFaces({
      source: "camera",
      live: { faces: [face], detectedAt: 1_000, frame },
      capturedAt: 1_300,
      captureFrame: frame,
      detectStill: async () => {
        calls += 1;
        return [];
      },
    });
    expect(result.path).toBe("live");
    expect(result.faces).toEqual([face]);
    expect(calls).toBe(0);
  });

  it("sends uploads and stale camera frames to the still detector", async () => {
    const calls: string[] = [];
    const uploaded = await resolveCaptureFaces({
      source: "upload",
      live: { faces: [face], detectedAt: 1_000, frame },
      capturedAt: 1_100,
      captureFrame: frame,
      detectStill: async () => {
        calls.push("upload");
        return [[{ x: 0.2, y: 0.2, z: 0 }]];
      },
    });
    const stale = await resolveCaptureFaces({
      source: "camera",
      live: { faces: [face], detectedAt: 1_000, frame },
      capturedAt: 1_700,
      captureFrame: frame,
      detectStill: async () => {
        calls.push("stale");
        return [[{ x: 0.3, y: 0.3, z: 0 }]];
      },
    });
    expect(liveMeshIsFresh({
      source: "camera",
      live: { faces: null, detectedAt: null, frame: null },
      capturedAt: 10,
      captureFrame: frame,
    })).toBe(false);
    expect(uploaded.path).toBe("still");
    expect(stale.path).toBe("still");
    expect(calls).toEqual(["upload", "stale"]);
  });
});

describe("capture save queue", () => {
  it("drops a superseded save and lets the newer capture finish last", async () => {
    const queue = createCaptureQueue();
    const first = queue.start("front");
    const order: string[] = [];
    const older = first.enqueue(async () => {
      order.push("old-write");
    });
    const second = queue.start("front");
    const newer = second.enqueue(async () => {
      order.push("new-write");
    });
    await older;
    await newer;
    expect(order).toEqual(["new-write"]);
  });
});

describe("capture session lease", () => {
  it("keeps one detector across a front to profile handoff and a strict remount", async () => {
    const opens: string[] = [];
    const closes: string[] = [];
    const timers: Array<{ fn: () => void; cancelled?: boolean }> = [];
    const lease = createSessionLease<{ key: string }>({
      graceMs: 500,
      open: async (key) => {
        opens.push(key);
        return { key };
      },
      close: (value) => {
        closes.push(value.key);
      },
      schedule: (fn) => {
        const timer = { fn, cancelled: false, cancel: () => { timer.cancelled = true; } };
        timers.push(timer);
        return timer;
      },
    });

    const front = await lease.acquire("live");
    lease.release();
    const profile = await lease.acquire("live");
    expect(profile).toBe(front);
    expect(opens).toEqual(["live"]);
    expect(closes).toEqual([]);
    expect(timers[0]?.cancelled).toBe(true);

    await lease.acquire("landscape");
    expect(closes).toEqual(["live"]);
    expect(opens).toEqual(["live", "landscape"]);
  });
});
