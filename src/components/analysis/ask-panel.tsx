"use client";

import { FormEvent, useState } from "react";
import { Send, Sparkles, MessageSquare, Bot, User, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const suggestions = [
  "Explain my profile score.",
  "What measurements are furthest from reference?",
  "Why is my front score higher?",
  "What changed between my last analysis and this one?",
  "Which measurements have the most impact?",
];

export function AskPanel({ analysisId, disabled }: { analysisId: string; disabled: boolean }) {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string; mode?: string }>>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function ask(question: string) {
    if (!question.trim() || disabled) return;
    setPending(true);
    setError("");
    setMessages((current) => [...current, { role: "user", content: question }]);
    setDraft("");
    let assistant = "";
    let mode = "";
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId, message: question }),
      });
      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "The assistant could not answer.");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = JSON.parse(line.slice(6)) as { token?: string; error?: string; mode?: string };
          if (payload.error) throw new Error(payload.error);
          if (payload.mode) mode = payload.mode;
          if (payload.token) {
            assistant += payload.token;
            const snapshot = assistant;
            const snapshotMode = mode;
            setMessages((current) => {
              const next = [...current];
              const last = next[next.length - 1];
              if (last?.role === "assistant") next[next.length - 1] = { role: "assistant", content: snapshot, mode: snapshotMode };
              else next.push({ role: "assistant", content: snapshot, mode: snapshotMode });
              return next;
            });
          }
        }
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The assistant could not answer.");
    } finally {
      setPending(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(draft);
  }

  return (
    <Card className="border border-line bg-panel shadow-xs overflow-hidden">
      <CardHeader className="border-b border-line/60 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <CardTitle>Measurement Assistant</CardTitle>
          </div>
          <Badge variant="outline" className="font-mono text-[10px]">
            NUMERICAL EXPLANATION
          </Badge>
        </div>
        <CardDescription>
          Ask questions regarding this report&apos;s scores, literature reference limits, and deviation formulas.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {disabled ? (
          <div className="rounded-md border border-line bg-slate-50 p-3 text-xs text-muted">
            Complete the analysis calculation first before querying the assistant.
          </div>
        ) : null}

        {/* Suggested Prompts Pills */}
        <div>
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted font-medium block mb-2">
            Suggested questions:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={disabled || pending}
                onClick={() => void ask(prompt)}
                className="rounded-md border border-line bg-slate-50 px-3 py-1.5 text-xs text-ink/90 text-left transition-colors hover:border-accent hover:bg-slate-100 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Message Thread */}
        <div className="space-y-3 min-h-[160px] max-h-[420px] overflow-y-auto p-1">
          {messages.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted flex flex-col items-center gap-2">
              <MessageSquare className="h-6 w-6 text-muted/40" />
              <span>Select a question above or type your inquiry below.</span>
            </div>
          ) : null}

          {messages.map((message, index) => {
            const isUser = message.role === "user";
            return (
              <article
                key={`${message.role}-${index}`}
                className={cn(
                  "rounded-lg p-4 text-xs sm:text-sm leading-relaxed border",
                  isUser
                    ? "bg-slate-100/90 border-slate-200/80 text-ink ml-8"
                    : "bg-panel border-line text-ink/90 mr-4 shadow-2xs",
                )}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  {isUser ? (
                    <>
                      <User className="h-3.5 w-3.5 text-muted" />
                      <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-muted">You</span>
                    </>
                  ) : (
                    <>
                      <Bot className="h-3.5 w-3.5 text-accent" />
                      <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-accent">
                        {message.mode === "model" ? "HarmonyLabs Assistant" : "Structured Explanation"}
                      </span>
                    </>
                  )}
                </div>
                <div className="whitespace-pre-wrap font-sans">{message.content}</div>
              </article>
            );
          })}
        </div>

        {/* Query Input Form */}
        <form onSubmit={submit} className="flex gap-2 pt-2 border-t border-line/60">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="h-10 flex-1 rounded-md border border-line bg-panel px-3 text-sm text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
            placeholder="Ask about these measurements…"
            disabled={disabled || pending}
          />
          <Button type="submit" disabled={disabled || pending || !draft.trim()} className="gap-1.5">
            <span>{pending ? "Answering…" : "Ask"}</span>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>

        {error ? (
          <div role="alert" className="rounded-md border border-signal/20 bg-signal/5 p-3 text-xs text-signal flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
