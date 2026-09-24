import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell/shell";
import { LandmarkEditor } from "@/components/landmark-editor/editor";
import { getOptionalPageSession } from "@/lib/auth/page";
import { getGuestId } from "@/lib/auth/session";
import { getStore } from "@/lib/data/store";

export const dynamic = "force-dynamic";

export default async function EditAnalysisPage({ params }: { params: Promise<{ analysisId: string }> }) {
  const { analysisId } = await params;
  const session = await getOptionalPageSession();
  const callerId = session?.id ?? (await getGuestId());
  if (!callerId) notFound();
  const analysis = await getStore().getAnalysis(callerId, analysisId);
  if (!analysis) notFound();
  return (
    <AppShell user={session}>
      <LandmarkEditor analysis={analysis} isGuest={!session} />
    </AppShell>
  );
}
