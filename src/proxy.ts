import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DEV_SESSION_COOKIE } from "@/lib/auth/constants";
import { isDevAuthEnabled, isSupabaseConfigured } from "@/lib/env";

const PROTECTED = [/^\/dashboard(?:\/|$)/, /^\/analysis(?:\/|$)/, /^\/settings(?:\/|$)/, /^\/compare(?:\/|$)/];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });
  let userId: string | null = null;

  if (isSupabaseConfigured()) {
    const supabase = await createServerFromRequest(request, (next) => {
      response = next;
    });
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } else if (isDevAuthEnabled() && request.cookies.get(DEV_SESSION_COOKIE)?.value) {
    userId = "dev";
  }

  const needsAuth = PROTECTED.some((pattern) => pattern.test(pathname));
  if (needsAuth && !userId) {
    const login = new URL("/auth/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  if (pathname === "/auth/login" && userId) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return response;
}

async function createServerFromRequest(request: NextRequest, adopt: (response: NextResponse) => void) {
  const { createServerClient } = await import("@supabase/ssr");
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          adopt(response);
        },
      },
    },
  );
  return supabase;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
