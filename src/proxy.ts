import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import { DEV_SESSION_COOKIE } from "@/lib/auth/constants";
import { isConvexConfigured, isDevAuthEnabled } from "@/lib/env";

const isProtected = createRouteMatcher(["/dashboard(.*)", "/analysis(.*)", "/settings(.*)", "/compare(.*)"]);
const isLogin = createRouteMatcher(["/auth/login"]);
const isGuestAllowed = (pathname: string) =>
  pathname === "/analysis/new" ||
  pathname === "/analysis/new/" ||
  /^\/analysis\/[^/]+\/edit(\/)?$/.test(pathname);

const convexProxy = convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    const authed = await convexAuth.isAuthenticated();
    if (isProtected(request) && !isGuestAllowed(request.nextUrl.pathname) && !authed) {
      const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
      const reasonParam = request.nextUrl.pathname.startsWith("/analysis/") ? "&reason=view_results" : "";
      return nextjsMiddlewareRedirect(request, `/auth/login?next=${encodeURIComponent(next)}${reasonParam}`);
    }
    if (isLogin(request) && authed) {
      return nextjsMiddlewareRedirect(request, "/dashboard");
    }
  },
  { cookieConfig: { maxAge: 60 * 60 * 24 * 14 } },
);

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  if (isConvexConfigured()) return convexProxy(request, event);
  return devProxy(request);
}

function devProxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const signedIn = isDevAuthEnabled() && Boolean(request.cookies.get(DEV_SESSION_COOKIE)?.value);
  const needsAuth = isProtected(request) && !isGuestAllowed(pathname);
  if (needsAuth && !signedIn) {
    const login = new URL("/auth/login", request.url);
    login.searchParams.set("next", pathname);
    if (pathname.startsWith("/analysis/")) {
      login.searchParams.set("reason", "view_results");
    }
    return NextResponse.redirect(login);
  }
  if (pathname === "/auth/login" && signedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
