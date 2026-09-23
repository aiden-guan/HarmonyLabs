import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell/shell";
import { AnalysisView } from "@/components/analysis/analysis-view";
import { requirePageSession } from "@/lib/auth/page";
import { getStore } from "@/lib/data/store";

export const dynamic = "force-dynamic";

export default async function AnalysisPage({ params }: { params: Promise<{ analysisId: string }> }) {
  const { analysisId } = await params;
  const session = await requirePageSession(`/analysis/${analysisId}`);
  const analysis = await getStore().getAnalysis(session.id, analysisId);
  if (!analysis) notFound();
  return (
    <AppShell>
      <AnalysisView analysis={analysis} />
    </AppShell>
  );
}
