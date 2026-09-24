import "server-only";

import { redirect } from "next/navigation";
import { clearGuestId, getGuestId, getSession, type SessionUser } from "@/lib/auth/session";
import { getStore } from "@/lib/data/store";

export async function requirePageSession(nextPath: string): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    const reasonParam = nextPath.startsWith("/analysis/") ? "&reason=view_results" : "";
    redirect(`/auth/login?next=${encodeURIComponent(nextPath)}${reasonParam}`);
  }
  const guestId = await getGuestId();
  if (guestId) {
    await getStore().claimGuestAnalyses(guestId, session.id);
    await clearGuestId();
  }
  await getStore().ensureProfile(session);
  return session;
}

export async function getOptionalPageSession(): Promise<SessionUser | null> {
  const session = await getSession();
  if (session) {
    const guestId = await getGuestId();
    if (guestId) {
      await getStore().claimGuestAnalyses(guestId, session.id);
      await clearGuestId();
    }
    await getStore().ensureProfile(session);
  }
  return session;
}
