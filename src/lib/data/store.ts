import "server-only";

import { isConvexConfigured } from "@/lib/env";
import { convexStore } from "@/lib/data/convex-store";
import { localStore } from "@/lib/data/local-store";

export function getStore(): AppStore {
  if (isConvexConfigured()) return convexStore as AppStore;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Convex environment variables are required in production.");
  }
  return localStore;
}

export type AppStore = typeof localStore;
