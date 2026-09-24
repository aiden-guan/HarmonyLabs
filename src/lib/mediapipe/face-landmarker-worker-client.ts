import type { ExpressionSignals } from "@/lib/face/expression-qc";
import type { FacialMatrix } from "@/lib/face/facial-transform";
import type { RawFaceLandmark } from "@/types/face";

export interface DetectorWorker {
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
  terminate: () => void;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
}

interface DetectResponse {
  type: "detect";
  id: number;
  ok: boolean;
  faces?: RawFaceLandmark[][];
  transforms?: FacialMatrix[];
  expression?: ExpressionSignals | null;
  error?: string;
}

export interface StillDetection {
  faces: RawFaceLandmark[][];
  transforms: FacialMatrix[];
  expression?: ExpressionSignals | null;
}

export interface StillDetectorClient {
  detect: (bitmap: { close?: () => void }) => Promise<StillDetection>;
  prewarm: () => void;
  terminate: () => void;
  readonly workerCount: number;
}

/**
 * One FaceLandmarker worker for the capture session.
 * Creating a worker per photo threw away the model's warmup.
 */
export function createStillDetectorClient(options: {
  createWorker: () => DetectorWorker;
  timeoutMs?: number;
}): StillDetectorClient {
  const timeoutMs = options.timeoutMs ?? 45_000;
  let worker: DetectorWorker | null = null;
  let workerCount = 0;
  let nextId = 0;
  const pending = new Map<
    number,
    { resolve: (detection: StillDetection) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }
  >();

  function failAll(error: Error) {
    for (const [id, request] of pending) {
      clearTimeout(request.timer);
      pending.delete(id);
      request.reject(error);
    }
  }

  function dropWorker() {
    const current = worker;
    worker = null;
    if (!current) return;
    current.onmessage = null;
    current.onerror = null;
    current.terminate();
  }

  function ensureWorker() {
    if (worker) return worker;
    const created = options.createWorker();
    workerCount += 1;
    created.onmessage = (event: MessageEvent) => {
      const data = event.data as DetectResponse | { type: string };
      if (!data || data.type !== "detect" || !("id" in data)) return;
      const request = pending.get(data.id);
      if (!request) return;
      clearTimeout(request.timer);
      pending.delete(data.id);
      if (!data.ok || !data.faces) {
        request.reject(new Error(data.error ?? "Face detection failed"));
        return;
      }
      request.resolve({ faces: data.faces, transforms: data.transforms ?? [], expression: data.expression ?? null });
    };
    created.onerror = () => {
      failAll(new Error("The face landmarker worker failed."));
      dropWorker();
    };
    worker = created;
    created.postMessage({ type: "init" });
    return created;
  }

  return {
    get workerCount() {
      return workerCount;
    },
    prewarm() {
      ensureWorker();
    },
    detect(bitmap) {
      const current = ensureWorker();
      const id = ++nextId;
      return new Promise<StillDetection>((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          failAll(new Error("Face detection timed out."));
          dropWorker();
          reject(new Error("Face detection timed out."));
        }, timeoutMs);
        pending.set(id, {
          resolve,
          reject,
          timer,
        });
        const transfer = typeof bitmap.close === "function" ? [bitmap as unknown as Transferable] : [];
        try {
          current.postMessage({ type: "detect", id, bitmap }, transfer);
        } catch (error) {
          clearTimeout(timer);
          pending.delete(id);
          reject(error instanceof Error ? error : new Error("Face detection failed."));
        }
      });
    },
    terminate() {
      failAll(new Error("Face detection was interrupted."));
      if (worker) {
        try {
          worker.postMessage({ type: "shutdown" });
        } catch {
          // The worker is already gone.
        }
      }
      dropWorker();
    },
  };
}
