import "server-only";

import { getSession } from "@/lib/auth/session";
import { getStore } from "@/lib/data/store";

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function requireUser() {
  const session = await getSession();
  if (!session) return null;
  await getStore().ensureProfile(session);
  return session;
}
