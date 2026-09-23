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
      <div className="px-5 py-8">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted">Landmarks</p>
        <h1 className="mt-2 text-3xl tracking-tight">{analysis.name}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Drag a point, or select it and use the arrow keys. Coordinates stay between 0 and 1 so the overlay follows the photograph when the window changes size.
        </p>
        <div className="mt-6">
          <LandmarkEditor analysis={analysis} />
        </div>
      </div>
    </AppShell>
  );
}
