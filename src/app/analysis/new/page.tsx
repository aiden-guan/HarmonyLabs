import { AppShell } from "@/components/app-shell/shell";
import { NewAnalysisWizard } from "@/components/upload/new-analysis-wizard";
import { getOptionalPageSession } from "@/lib/auth/page";

export const dynamic = "force-dynamic";

export default async function NewAnalysisPage() {
  const session = await getOptionalPageSession();
  return (
    <AppShell user={session}>
      <div className="px-4 py-5 sm:px-5 sm:py-8">
        <NewAnalysisWizard />
      </div>
    </AppShell>
  );
}
