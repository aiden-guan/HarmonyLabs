import { AppShell } from "@/components/app-shell/shell";
import { DashboardHome } from "@/components/analysis/dashboard-home";
import { requirePageSession } from "@/lib/auth/page";
import { getStore } from "@/lib/data/store";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requirePageSession("/dashboard");
  const analyses = await getStore().listAnalyses(session.id);
  return (
    <AppShell>
      <DashboardHome analyses={analyses} />
    </AppShell>
  );
}
