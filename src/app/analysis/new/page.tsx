import { AppShell } from "@/components/app-shell/shell";
import { NewAnalysisWizard } from "@/components/upload/new-analysis-wizard";
import { requirePageSession } from "@/lib/auth/page";

export const dynamic = "force-dynamic";

export default async function NewAnalysisPage() {
  await requirePageSession("/analysis/new");
  return (
    <AppShell>
      <div className="px-5 py-8">
        <NewAnalysisWizard />
      </div>
    </AppShell>
  );
}
