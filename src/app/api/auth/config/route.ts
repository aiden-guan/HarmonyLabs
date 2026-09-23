import { isAiConfigured, isConvexConfigured, isDevAuthEnabled } from "@/lib/env";

export function GET() {
  return Response.json({
    convex: isConvexConfigured(),
    devAuth: isDevAuthEnabled(),
    ai: isAiConfigured(),
  });
}
