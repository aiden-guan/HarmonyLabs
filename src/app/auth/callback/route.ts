import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") || "/dashboard";
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/auth/login", url.origin));
  }
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const login = new URL("/auth/login", url.origin);
      login.searchParams.set("error", "The sign-in link could not be confirmed.");
      return NextResponse.redirect(login);
    }
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
