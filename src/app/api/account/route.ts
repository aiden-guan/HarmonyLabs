import { jsonError, requireUser } from "@/lib/api";
import { getStore } from "@/lib/data/store";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/env";
import { profileSchema } from "@/lib/validation/analysis";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireUser();
  if (!user) return jsonError("Sign in required.", 401);
  const profile = await getStore().getProfile(user.id);
  return Response.json({
    email: user.email,
    displayName: profile?.displayName ?? null,
  });
}

export async function PATCH(request: Request) {
  const user = await requireUser();
  if (!user) return jsonError("Sign in required.", 401);
  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Enter a display name up to 80 characters.", 400);
  await getStore().updateProfile(user.id, parsed.data.displayName);
  return Response.json({ ok: true });
}

export async function DELETE() {
  const user = await requireUser();
  if (!user) return jsonError("Sign in required.", 401);
  await getStore().deleteUserData(user.id);
  if (isSupabaseConfigured()) {
    const admin = createServiceRoleClient();
    if (admin) {
      const { error } = await admin.auth.admin.deleteUser(user.id);
      if (error) {
        return Response.json({
          ok: true,
          authUserRemoved: false,
          message: "FaceLab data was deleted. The login itself is still present because the auth user could not be removed.",
        });
      }
      return Response.json({ ok: true, authUserRemoved: true });
    }
    return Response.json({
      ok: true,
      authUserRemoved: false,
      message: "FaceLab data was deleted. Removing the login requires the server service role key.",
    });
  }
  return Response.json({ ok: true, authUserRemoved: true });
}
