"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { Mark } from "@/components/brand/mark";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm({ supabase, devAuth }: { supabase: boolean; devAuth: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const nextParam = params.get("next") || "/dashboard";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(params.get("error") ?? "");
  const [pending, setPending] = useState(false);

  async function sendMagicLink(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const redirect = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirect },
      });
      if (error) throw error;
      setMessage("Check your email for the sign-in link.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The email could not be sent.");
    } finally {
      setPending(false);
    }
  }

  async function google() {
    setPending(true);
    setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const redirect = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirect },
      });
      if (error) throw error;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Google sign-in failed.");
      setPending(false);
    }
  }

  async function devSignIn(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const response = await fetch("/api/auth/dev", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const body = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setMessage(body.error ?? "Development sign-in failed.");
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-5xl items-center gap-12 px-5 py-16 md:grid-cols-2">
      <div>
        <Mark className="h-8 w-8 text-accent" />
        <h1 className="mt-6 text-4xl tracking-tight">Sign in to FaceLab</h1>
        <p className="mt-4 text-sm leading-6 text-muted">
          Analyses and photographs are private to the account. Landmark detection stays in the browser.
        </p>
      </div>
      <div className="border border-line bg-panel p-6">
        {supabase ? (
          <div className="space-y-4">
            <Button className="w-full" onClick={google} disabled={pending}>
              Continue with Google
            </Button>
            <form onSubmit={sendMagicLink} className="space-y-3">
              <Field label="Email">
                <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
              </Field>
              <Button type="submit" variant="secondary" className="w-full" disabled={pending}>
                Email a sign-in link
              </Button>
            </form>
          </div>
        ) : null}
        {devAuth ? (
          <form onSubmit={devSignIn} className="space-y-3">
            <p className="text-sm text-muted">
              Local development sign-in. This path is disabled in production and when Supabase is configured.
            </p>
            <Field label="Email">
              <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
            </Field>
            <Button type="submit" className="w-full" disabled={pending}>
              Continue
            </Button>
          </form>
        ) : null}
        {!supabase && !devAuth ? (
          <p className="text-sm text-signal">Add Supabase environment variables before signing in on this deployment.</p>
        ) : null}
        {message ? (
          <p role="alert" className="mt-4 text-sm text-signal">
            {message}
          </p>
        ) : null}
      </div>
    </main>
  );
}
