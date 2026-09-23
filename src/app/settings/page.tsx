import { AppShell } from "@/components/app-shell/shell";
import { SettingsForm } from "@/components/settings/settings-form";
import { requirePageSession } from "@/lib/auth/page";
import { getStore } from "@/lib/data/store";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requirePageSession("/settings");
  const profile = await getStore().getProfile(session.id);
  return (
    <AppShell>
      <SettingsForm email={session.email} displayName={profile?.displayName ?? ""} />
    </AppShell>
  );
}
