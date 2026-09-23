"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

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
    setMessage("Display name saved.");
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
    <div className="mx-auto max-w-xl px-5 py-8">
      <h1 className="text-3xl tracking-tight">Settings</h1>
      <p className="mt-2 text-sm text-muted">{email}</p>
      <form onSubmit={save} className="mt-6 space-y-4 border border-line bg-panel p-5">
        <Field label="Display name">
          <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />
        </Field>
        <Button type="submit" disabled={pending || name.trim().length === 0}>Save</Button>
      </form>
      <section className="mt-6 border border-line bg-panel p-5">
        <h2 className="text-lg">Delete stored data</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          This removes analyses, photographs, landmarks, scores, and chat messages for this account. Facial images stay private until they are deleted.
        </p>
        <Button variant="danger" className="mt-4" disabled={pending} onClick={removeAccount}>
          Delete account data
        </Button>
      </section>
      {message ? <p className="mt-4 text-sm text-good">{message}</p> : null}
      {error ? <p role="alert" className="mt-4 text-sm text-signal">{error}</p> : null}
    </div>
  );
}
