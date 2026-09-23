const enabled = process.env.NODE_ENV !== "production";

/** Development-only timeline marks. They stay out of production logs. */
export function markCapture(name: string): void {
  if (!enabled || typeof performance === "undefined" || typeof performance.mark !== "function") return;
  performance.mark(`moglabs:${name}`);
}

export function measureCapture(name: string, start: string, end: string): void {
  if (!enabled || typeof performance === "undefined" || typeof performance.measure !== "function") return;
  try {
    performance.measure(`moglabs:${name}`, `moglabs:${start}`, `moglabs:${end}`);
  } catch {
    // A skipped stage has no start mark.
  }
}
