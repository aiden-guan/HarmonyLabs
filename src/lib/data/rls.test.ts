import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";

const sql = readFileSync(
  path.join(process.cwd(), "supabase/migrations/20260922120000_init.sql"),
  "utf8",
);

const tables = [
  "profiles",
  "analyses",
  "analysis_photos",
  "landmarks",
  "metric_results",
  "chat_threads",
  "chat_messages",
];

test("every application table enables row level security", () => {
  for (const table of tables) {
    expect(sql).toContain(`alter table public.${table} enable row level security`);
  }
});

test("facial photos stay in a private bucket scoped to the owner folder", () => {
  expect(sql).toContain("insert into storage.buckets");
  expect(sql).toMatch(/'analysis-photos',\s*'analysis-photos',\s*false/);
  expect(sql).toContain("set public = false");
  expect(sql).toContain("bucket_id = 'analysis-photos'");
  expect(sql).toContain("(storage.foldername(name))[1] = auth.uid()::text");
});
