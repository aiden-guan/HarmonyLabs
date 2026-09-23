import { AppShell } from "@/components/app-shell/shell";
import { NewAnalysisWizard } from "@/components/upload/new-analysis-wizard";
import { requirePageSession } from "@/lib/auth/page";

export const dynamic = "force-dynamic";

export default async function NewAnalysisPage() {
  await requirePageSession("/analysis/new");
  return (
    <AppShell>
      <div className="px-4 py-5 sm:px-5 sm:py-8">
        <NewAnalysisWizard />
      </div>
    </AppShell>
  );
}
