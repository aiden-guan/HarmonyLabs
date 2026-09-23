/**
 * Serializes saves for one view so a slower retake cannot finish after,
 * and overwrite, a newer capture.
 */
export function createCaptureQueue() {
  const tokens: Record<string, number> = {};
  const tails: Record<string, Promise<void>> = {};

  return {
    start(view: string) {
      const token = (tokens[view] ?? 0) + 1;
      tokens[view] = token;
      const current = () => tokens[view] === token;
      return {
        token,
        current,
        enqueue(task: () => Promise<void>) {
          const previous = tails[view] ?? Promise.resolve();
          const run = previous.then(
            () => (current() ? task() : undefined),
            () => (current() ? task() : undefined),
          );
          tails[view] = run.then(
            () => undefined,
            () => undefined,
          );
          return run;
        },
      };
    },
    tail(view: string) {
      return tails[view] ?? Promise.resolve();
    },
  };
}
