import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { DEV_SESSION_COOKIE, GUEST_SESSION_COOKIE } from "@/lib/auth/constants";
import { isConvexConfigured, isDevAuthEnabled } from "@/lib/env";

const COOKIE = DEV_SESSION_COOKIE;

export interface SessionUser {
  id: string;
  email: string;
}

function devSecret(): string {
  return process.env.HARMONYLABS_DEV_SECRET || "harmonylabs-dev-only-secret";
}

function sign(payload: string): string {
  const mac = createHmac("sha256", devSecret()).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

function verify(token: string): SessionUser | null {
  const split = token.lastIndexOf(".");
  if (split <= 0) return null;
  const payload = token.slice(0, split);
  const mac = token.slice(split + 1);
  const expected = createHmac("sha256", devSecret()).update(payload).digest("base64url");
  const left = Buffer.from(mac);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: string;
      email?: string;
      exp?: number;
    };
    if (!parsed.sub || !parsed.email || !parsed.exp || parsed.exp < Date.now()) return null;
    return { id: parsed.sub, email: parsed.email };
  } catch {
    return null;
  }
}

export function createDevSessionToken(user: SessionUser): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 14,
    }),
  ).toString("base64url");
  return sign(payload);
}

export async function getSession(): Promise<SessionUser | null> {
  if (isConvexConfigured()) {
    const token = await convexAuthNextjsToken();
    if (!token) return null;
    const viewer = await fetchQuery(api.account.viewer, {}, { token });
    if (!viewer) return null;
    return { id: viewer.id, email: viewer.email };
  }
  if (!isDevAuthEnabled()) return null;
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return verify(token);
}

export function devSessionCookie(token: string) {
  return {
    name: COOKIE,
    value: token,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    },
  };
}

export async function getGuestId(): Promise<string | null> {
  const jar = await cookies();
  const val = jar.get(GUEST_SESSION_COOKIE)?.value;
  return val && val.startsWith("guest_") ? val : null;
}

export async function getOrCreateGuestId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(GUEST_SESSION_COOKIE)?.value;
  if (existing && existing.startsWith("guest_")) {
    return existing;
  }
  const nextId = `guest_${crypto.randomUUID()}`;
  jar.set(GUEST_SESSION_COOKIE, nextId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return nextId;
}

export async function clearGuestId(): Promise<void> {
  const jar = await cookies();
  jar.delete(GUEST_SESSION_COOKIE);
}

