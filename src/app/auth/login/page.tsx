import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { isConvexConfigured, isDevAuthEnabled } from "@/lib/env";

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="px-5 py-16 text-sm text-muted">Loading sign-in…</main>}>
      <LoginForm convex={isConvexConfigured()} devAuth={isDevAuthEnabled()} />
    </Suspense>
  );
}
