"use client";

import Link from "next/link";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import { Mark } from "@/components/brand/mark";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function LoginForm({ convex, devAuth }: { convex: boolean; devAuth: boolean }) {
  const params = useSearchParams();
  const nextParam = params.get("next") || "/dashboard";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";
  const initialMessage = params.get("error") ?? "";
  const isResultUnlock = next.startsWith("/analysis/") || params.get("reason") === "view_results";

  return (
    <div className="min-h-screen bg-paper flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-2">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <Mark className="h-8 w-8 text-accent transition-transform group-hover:scale-105" />
            <span className="text-xl font-bold tracking-tight text-ink">MogLabs</span>
          </Link>
        </div>
        <h1 className="mt-4 text-center text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {isResultUnlock ? "Your analysis is ready" : "Sign in to MogLabs"}
        </h1>
        <p className="mt-2 text-center text-xs text-muted leading-relaxed max-w-sm mx-auto">
          {isResultUnlock
            ? "Sign in or create a free account to unlock your Harmony score, symmetry measurements, and report."
            : "Private facial geometry analytics. Detection runs in your browser, and photographs remain strictly confidential."}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {isResultUnlock ? (
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 sm:p-5 text-center space-y-2 mb-6">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Measurements calculated</span>
            </div>
            <h2 className="text-sm font-semibold tracking-tight text-ink">
              Create an account or sign in to view results
            </h2>
            <p className="text-xs text-muted leading-relaxed max-w-sm mx-auto">
              Your geometric analysis is complete. Connect your account to save your scan and unlock the full report.
            </p>
          </div>
        ) : null}

        <Card className="border border-line bg-panel shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold text-muted uppercase tracking-wider">
              {isResultUnlock
                ? "Unlock Analysis Results"
                : convex
                ? "Account Authentication"
                : "Developer Access"}
            </CardTitle>
            <CardDescription>
              {isResultUnlock
                ? "Sign in or create an account to view your full harmony and proportions report."
                : convex
                ? "Enter your credentials to access your private scans and measurements."
                : "Local session authorization for development and testing."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {convex ? (
              <ConvexPasswordForm
                next={next}
                initialMessage={initialMessage}
                isResultUnlock={isResultUnlock}
              />
            ) : null}
            {devAuth ? (
              <DevSignIn
                next={next}
                initialMessage={initialMessage}
                isResultUnlock={isResultUnlock}
              />
            ) : null}
            {!convex && !devAuth ? (
              <p className="text-sm text-signal">Convex is not configured for this deployment.</p>
            ) : null}

            <div className="mt-6 border-t border-line/60 pt-4 flex items-center justify-between text-xs text-muted">
              <Link href="/" className="inline-flex items-center gap-1.5 hover:text-ink transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to start</span>
              </Link>
              <div className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-good" />
                <span>Client-side detection</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ConvexPasswordForm({
  next,
  initialMessage,
  isResultUnlock = false,
}: {
  next: string;
  initialMessage: string;
  isResultUnlock?: boolean;
}) {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [flow, setFlow] = useState<"signIn" | "signUp">(isResultUnlock ? "signUp" : "signIn");
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
    <form onSubmit={submit} className="space-y-4">
      <div className="flex rounded-md border border-line bg-panel-muted p-1 text-xs mb-2">
        <button
          type="button"
          onClick={() => { setFlow("signIn"); setMessage(""); }}
          className={`flex-1 rounded py-1 font-medium transition-colors ${flow === "signIn" ? "bg-panel text-ink shadow-xs" : "text-muted"}`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => { setFlow("signUp"); setMessage(""); }}
          className={`flex-1 rounded py-1 font-medium transition-colors ${flow === "signUp" ? "bg-panel text-ink shadow-xs" : "text-muted"}`}
        >
          Create account
        </button>
      </div>

      <Field label="Email">
        <Input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          placeholder="you@domain.com"
        />
      </Field>

      <Field label="Password">
        <Input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={flow === "signUp" ? "new-password" : "current-password"}
          placeholder="At least 8 characters"
        />
      </Field>

      <Button type="submit" className="w-full mt-2" disabled={pending}>
        {pending
          ? "Authenticating…"
          : flow === "signIn"
          ? isResultUnlock
            ? "Sign in & view results"
            : "Sign in"
          : isResultUnlock
          ? "Create account & view results"
          : "Create account"}
      </Button>

      {message ? (
        <p role="alert" className="text-xs text-signal bg-signal/5 border border-signal/20 p-2.5 rounded-md leading-relaxed">
          {message}
        </p>
      ) : null}
    </form>
  );
}

function DevSignIn({
  next,
  initialMessage,
  isResultUnlock = false,
}: {
  next: string;
  initialMessage: string;
  isResultUnlock?: boolean;
}) {
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
    <form onSubmit={devSignIn} className="space-y-4">
      <div className="rounded-md border border-line bg-panel-muted p-3 text-xs leading-relaxed text-muted">
        {isResultUnlock
          ? "Enter your email below to save your scan to a local session and view your complete results."
          : "Local development sign-in. This route bypasses cloud credentials and saves data locally under your project tree."}
      </div>
      <Field label="Email">
        <Input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          placeholder="tester@domain.com"
        />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending
          ? "Signing in…"
          : isResultUnlock
          ? "Continue to results"
          : "Continue"}
      </Button>
      {message ? (
        <p role="alert" className="text-xs text-signal bg-signal/5 border border-signal/20 p-2.5 rounded-md leading-relaxed">
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
