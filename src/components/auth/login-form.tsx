"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { Mark } from "@/components/brand/mark";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function LoginForm({ convex, devAuth }: { convex: boolean; devAuth: boolean }) {
  const params = useSearchParams();
  const nextParam = params.get("next") || "/dashboard";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";
  const initialMessage = params.get("error") ?? "";

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
        {convex ? <ConvexPasswordForm next={next} initialMessage={initialMessage} /> : null}
        {devAuth ? <DevSignIn next={next} initialMessage={initialMessage} /> : null}
        {!convex && !devAuth ? (
          <p className="text-sm text-signal">Convex is not configured for this deployment.</p>
        ) : null}
      </div>
    </main>
  );
}

function ConvexPasswordForm({ next, initialMessage }: { next: string; initialMessage: string }) {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(initialMessage);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    if (password.length < 8) {
      setMessage("Use at least 8 characters.");
      setPending(false);
      return;
    }
    const formData = new FormData();
    formData.set("email", email.trim().toLowerCase());
    formData.set("password", password);
    formData.set("flow", flow);
    try {
      await signIn("password", formData);
      router.replace(next);
      router.refresh();
    } catch (error) {
      setMessage(authError(error, flow));
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Email">
        <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
      </Field>
      <Field label="Password">
        <Input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={flow === "signUp" ? "new-password" : "current-password"}
        />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {flow === "signIn" ? "Sign in" : "Create account"}
      </Button>
      <button
        type="button"
        className="w-full text-sm text-accent"
        onClick={() => {
          setFlow(flow === "signIn" ? "signUp" : "signIn");
          setMessage("");
        }}
      >
        {flow === "signIn" ? "Create an account" : "Already have an account? Sign in"}
      </button>
      {message ? (
        <p role="alert" className="text-sm text-signal">
          {message}
        </p>
      ) : null}
    </form>
  );
}

function DevSignIn({ next, initialMessage }: { next: string; initialMessage: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(initialMessage);
  const [pending, setPending] = useState(false);

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
    <form onSubmit={devSignIn} className="space-y-3">
      <p className="text-sm text-muted">
        Local development sign-in. This path is disabled in production and when Convex is configured.
      </p>
      <Field label="Email">
        <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        Continue
      </Button>
      {message ? (
        <p role="alert" className="text-sm text-signal">
          {message}
        </p>
      ) : null}
    </form>
  );
}

function authError(error: unknown, flow: "signIn" | "signUp") {
  const text = error instanceof Error ? error.message : "";
  if (/invalid credentials/i.test(text)) return "That email and password do not match.";
  if (/already exists|account.*exists/i.test(text)) return "An account with that email already exists.";
  if (/8 characters/i.test(text)) return "Use at least 8 characters.";
  if (/valid email/i.test(text)) return "Enter a valid email address.";
  if (text && text.length < 160 && !text.includes("Request ID")) return text;
  return flow === "signUp" ? "The account could not be created." : "Sign-in failed.";
}
