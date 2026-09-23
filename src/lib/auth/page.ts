import "server-only";

import { redirect } from "next/navigation";
import { getSession, type SessionUser } from "@/lib/auth/session";
import { getStore } from "@/lib/data/store";

export async function requirePageSession(nextPath: string): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect(`/auth/login?next=${encodeURIComponent(nextPath)}`);
  await getStore().ensureProfile(session);
  return session;
}
