import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell/shell";
import { LandmarkEditor } from "@/components/landmark-editor/editor";
import { requirePageSession } from "@/lib/auth/page";
import { getStore } from "@/lib/data/store";

export const dynamic = "force-dynamic";

export default async function EditAnalysisPage({ params }: { params: Promise<{ analysisId: string }> }) {
  const { analysisId } = await params;
  const session = await requirePageSession(`/analysis/${analysisId}/edit`);
  const analysis = await getStore().getAnalysis(session.id, analysisId);
  if (!analysis) notFound();
  return (
    <AppShell>
      <LandmarkEditor analysis={analysis} />
    </AppShell>
  );
}
