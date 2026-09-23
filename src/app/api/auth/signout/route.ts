import { NextResponse } from "next/server";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchAction } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import { DEV_SESSION_COOKIE } from "@/lib/auth/constants";
import { isConvexConfigured } from "@/lib/env";

export const runtime = "nodejs";

const CONVEX_COOKIES = [
  "__convexAuthJWT",
  "__Host-__convexAuthJWT",
  "__convexAuthRefreshToken",
  "__Host-__convexAuthRefreshToken",
  "__convexAuthOAuthVerifier",
  "__Host-__convexAuthOAuthVerifier",
];

export async function POST() {
  if (isConvexConfigured()) {
    const token = await convexAuthNextjsToken();
    if (token) {
      await fetchAction(api.auth.signOut, {}, { token }).catch(() => undefined);
    }
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(DEV_SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  for (const name of CONVEX_COOKIES) {
    response.cookies.set(name, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: name.startsWith("__Host-"),
      path: "/",
      maxAge: 0,
    });
  }
  return response;
}
