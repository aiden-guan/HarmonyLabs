import { cookies } from "next/headers";
import { z } from "zod";
import { DEV_SESSION_COOKIE, GUEST_SESSION_COOKIE } from "@/lib/auth/constants";
import { createDevSessionToken, devSessionCookie } from "@/lib/auth/session";
import { jsonError } from "@/lib/api";
import { getStore } from "@/lib/data/store";
import { isDevAuthEnabled } from "@/lib/env";

export const runtime = "nodejs";

const schema = z.object({ email: z.string().trim().email().max(120) }).strict();

export async function POST(request: Request) {
  if (!isDevAuthEnabled()) return jsonError("Development sign-in is unavailable.", 404);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Enter a valid email.", 400);
  const id = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(parsed.data.email.toLowerCase()));
  const userId = bytesToUuid(new Uint8Array(id));
  const user = { id: userId, email: parsed.data.email.toLowerCase() };
  await getStore().ensureProfile(user);
  const token = createDevSessionToken(user);
  const cookie = devSessionCookie(token);
  const jar = await cookies();
  jar.set(cookie.name, cookie.value, cookie.options);
  const guestId = jar.get(GUEST_SESSION_COOKIE)?.value;
  if (guestId) {
    await getStore().claimGuestAnalyses(guestId, user.id);
    jar.delete(GUEST_SESSION_COOKIE);
  }
  return Response.json({ ok: true });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete(DEV_SESSION_COOKIE);
  return Response.json({ ok: true });
}

function bytesToUuid(bytes: Uint8Array): string {
  const hex = [...bytes.subarray(0, 16)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
