export interface Cancelable {
  cancel: () => void;
}

export interface SessionLease<T> {
  acquire: (key: string) => Promise<T>;
  release: () => void;
}

/**
 * Refcounted resource with a short grace period before close.
 * A strict-mode remount, or a front→profile render that briefly drops the
 * owner, reuses the same resource instead of opening a second one.
 */
export function createSessionLease<T>(options: {
  graceMs: number;
  open: (key: string) => Promise<T>;
  close: (value: T) => void;
  schedule?: (callback: () => void, delayMs: number) => Cancelable;
}): SessionLease<T> {
  const schedule =
    options.schedule ??
    ((callback, delayMs) => {
      const id = setTimeout(callback, delayMs);
      return { cancel: () => clearTimeout(id) };
    });

  let retains = 0;
  let key: string | null = null;
  let value: T | null = null;
  let opening: Promise<T> | null = null;
  let stopTimer: Cancelable | null = null;
  let epoch = 0;

  function cancelStop() {
    stopTimer?.cancel();
    stopTimer = null;
  }

  return {
    acquire(nextKey: string) {
      retains += 1;
      cancelStop();
      if (value && key === nextKey) return Promise.resolve(value);
      if (opening && key === nextKey) return opening;
      const token = ++epoch;
      if (value) {
        const previous = value;
        value = null;
        options.close(previous);
      }
      key = nextKey;
      opening = Promise.resolve()
        .then(() => options.open(nextKey))
        .then((created) => {
          if (token !== epoch) {
            options.close(created);
            throw new Error("The capture session ended before it started.");
          }
          value = created;
          opening = null;
          if (retains <= 0) {
            options.close(created);
            value = null;
            key = null;
            throw new Error("The capture session ended before it started.");
          }
          return created;
        })
        .catch((error: unknown) => {
          if (token === epoch) opening = null;
          throw error;
        });
      return opening;
    },
    release() {
      if (retains <= 0) return;
      retains -= 1;
      if (retains > 0) return;
      const token = epoch;
      stopTimer = schedule(() => {
        stopTimer = null;
        if (retains > 0 || token !== epoch || !value) return;
        const current = value;
        value = null;
        key = null;
        opening = null;
        epoch += 1;
        options.close(current);
      }, options.graceMs);
    },
  };
}
