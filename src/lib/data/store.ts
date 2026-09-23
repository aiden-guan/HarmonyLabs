import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { localStore } from "@/lib/data/local-store";
import { supabaseStore } from "@/lib/data/supabase-store";

export function getStore() {
  if (isSupabaseConfigured()) return supabaseStore;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Supabase environment variables are required in production.");
  }
  return localStore;
}

export type AppStore = typeof localStore;
