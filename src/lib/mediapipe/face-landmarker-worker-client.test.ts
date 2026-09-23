import { describe, expect, it } from "vitest";
import { createStillDetectorClient, type DetectorWorker } from "@/lib/mediapipe/face-landmarker-worker-client";

class FakeWorker implements DetectorWorker {
  static created = 0;
  inits = 0;
  detects = 0;
  terminated = false;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor() {
    FakeWorker.created += 1;
  }

  postMessage(message: unknown) {
    const data = message as { type?: string; id?: number };
    if (data.type === "init") {
      this.inits += 1;
      queueMicrotask(() => this.onmessage?.({ data: { type: "ready", ok: true } } as MessageEvent));
      return;
    }
    if (data.type === "detect") {
      this.detects += 1;
      queueMicrotask(() =>
        this.onmessage?.({
          data: { type: "detect", id: data.id, ok: true, faces: [[{ x: 0.4, y: 0.4, z: 0 }]] },
        } as MessageEvent),
      );
    }
  }

  terminate() {
    this.terminated = true;
  }
}

describe("still detector client", () => {
  it("initializes one worker and runs two detections on it", async () => {
    FakeWorker.created = 0;
    const workers: FakeWorker[] = [];
    const client = createStillDetectorClient({
      createWorker: () => {
        const worker = new FakeWorker();
        workers.push(worker);
        return worker;
      },
    });
    const first = await client.detect({ close() {} });
    const second = await client.detect({ close() {} });
    expect(first.faces).toHaveLength(1);
    expect(second.faces).toHaveLength(1);
    expect(workers).toHaveLength(1);
    expect(workers[0].inits).toBe(1);
    expect(workers[0].detects).toBe(2);
    expect(client.workerCount).toBe(1);
    client.terminate();
    expect(workers[0].terminated).toBe(true);
  });

  it("rejects a pending detection when the worker dies", async () => {
    const client = createStillDetectorClient({
      createWorker: () => {
        const worker = new FakeWorker();
        const original = worker.postMessage.bind(worker);
        worker.postMessage = (message: unknown) => {
          const data = message as { type?: string };
          if (data.type === "detect") {
            queueMicrotask(() => worker.onerror?.(new Event("error")));
            return;
          }
          original(message);
        };
        return worker;
      },
      timeoutMs: 1_000,
    });
    await expect(client.detect({ close() {} })).rejects.toThrow(/failed/);
  });
});
