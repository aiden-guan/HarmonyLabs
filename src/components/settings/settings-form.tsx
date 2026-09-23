"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  ShieldAlert,
  Save,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function SettingsForm({ email, displayName }: { email: string; displayName: string }) {
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: name }),
    });
    const body = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(body.error ?? "Could not save the name.");
      return;
    }
    setMessage("Display name updated successfully.");
  }

  async function removeAccount() {
    if (!window.confirm("Delete every analysis, photograph, and message stored for this account?")) return;
    setPending(true);
    setError("");
    const response = await fetch("/api/account", { method: "DELETE" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setPending(false);
      setError(body.error ?? "Could not delete account data.");
      return;
    }
    await fetch("/api/auth/signout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-line pb-6">
        <span className="font-mono text-xs uppercase tracking-[0.16em] text-accent font-semibold block">
          ACCOUNT PREFERENCES
        </span>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-ink">
          Settings
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted">
          Manage your account profile and data privacy controls.
        </p>
      </div>

      {/* Profile Card */}
      <Card className="border border-line bg-panel shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-accent" />
            <CardTitle>Profile information</CardTitle>
          </div>
          <CardDescription>
            Your display name is shown on reports and exported scans.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <div className="rounded-md border border-line bg-slate-50 p-3 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted">
                <Mail className="h-4 w-4" />
                <span>Account email:</span>
              </div>
              <span className="font-mono font-medium text-ink">{email}</span>
            </div>

            <Field label="Display name" description="Up to 80 characters">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                placeholder="Your name or alias"
              />
            </Field>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={pending || name.trim().length === 0} className="gap-2">
                <Save className="h-4 w-4" />
                <span>Save</span>
              </Button>
            </div>
          </form>

          {message ? (
            <div className="mt-4 rounded-md border border-good/20 bg-good/5 p-3 text-xs text-good flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{message}</span>
            </div>
          ) : null}
          {error ? (
            <div role="alert" className="mt-4 rounded-md border border-signal/20 bg-signal/5 p-3 text-xs text-signal flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Danger Zone: Data Deletion */}
      <Card className="border border-signal/30 bg-panel shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-2 text-signal">
            <ShieldAlert className="h-4 w-4" />
            <CardTitle className="text-signal">Delete account data</CardTitle>
          </div>
          <CardDescription>
            Permanently purge all analyses, front and profile photographs, landmark coordinates, scores, and assistant messages.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-signal/20 bg-signal/5 p-3 text-xs text-signal/90 leading-relaxed">
            This action cannot be undone. Once deleted, facial photographs and measurement history are irreversibly removed from storage.
          </div>

          <Button
            variant="danger"
            size="md"
            disabled={pending}
            onClick={removeAccount}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete account data</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
