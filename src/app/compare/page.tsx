import { AppShell } from "@/components/app-shell/shell";
import { CompareView } from "@/components/analysis/compare-view";
import { requirePageSession } from "@/lib/auth/page";
import { getStore } from "@/lib/data/store";

export const dynamic = "force-dynamic";

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const session = await requirePageSession("/compare");
  const query = await searchParams;
  const analyses = await getStore().listAnalyses(session.id);
  const complete = analyses.filter((item) => item.status === "complete");
  const leftId = query.a ?? complete[0]?.id;
  const rightId = query.b ?? complete.find((item) => item.id !== leftId)?.id;
  const store = getStore();
  const left = leftId ? await store.getAnalysis(session.id, leftId) : null;
  const right = rightId ? await store.getAnalysis(session.id, rightId) : null;
  return (
    <AppShell>
      <CompareView analyses={analyses} left={left} right={right} />
    </AppShell>
  );
}
