import { isAiConfigured, isDevAuthEnabled, isSupabaseConfigured } from "@/lib/env";

export function GET() {
  return Response.json({
    supabase: isSupabaseConfigured(),
    devAuth: isDevAuthEnabled(),
    ai: isAiConfigured(),
  });
}
