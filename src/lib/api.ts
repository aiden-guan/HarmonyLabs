import "server-only";

import { clearGuestId, getGuestId, getOrCreateGuestId, getSession, type SessionUser } from "@/lib/auth/session";
import { getStore } from "@/lib/data/store";

export interface AnalysisCaller {
  id: string;
  email?: string;
  isGuest: boolean;
}

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function requireUser(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session) return null;
  const guestId = await getGuestId();
  if (guestId) {
    await getStore().claimGuestAnalyses(guestId, session.id);
    await clearGuestId();
  }
  await getStore().ensureProfile(session);
  return session;
}

export async function getAnalysisCaller(): Promise<AnalysisCaller> {
  const user = await requireUser();
  if (user) {
    return { id: user.id, email: user.email, isGuest: false };
  }
  const guestId = await getOrCreateGuestId();
  return { id: guestId, isGuest: true };
}

export async function getExistingAnalysisCaller(): Promise<AnalysisCaller | null> {
  const user = await requireUser();
  if (user) {
    return { id: user.id, email: user.email, isGuest: false };
  }
  const guestId = await getGuestId();
  if (guestId) {
    return { id: guestId, isGuest: true };
  }
  return null;
}
