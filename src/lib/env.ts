export function isConvexConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
}

export function isDevAuthEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (isConvexConfigured()) return false;
  return process.env.HARMONYLABS_DEV_AUTH !== "0";
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.AI_API_KEY && process.env.AI_BASE_URL && process.env.AI_MODEL);
}

export function maxUploadBytes(): number {
  const mb = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB ?? "10");
  if (!Number.isFinite(mb) || mb <= 0) return 10 * 1024 * 1024;
  return Math.round(mb * 1024 * 1024);
}

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
