import { redirect } from "next/navigation";
import { requirePageSession } from "@/lib/auth/page";

export const dynamic = "force-dynamic";

export default async function AnalysisComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ analysisId: string }>;
  searchParams: Promise<{ with?: string }>;
}) {
  const { analysisId } = await params;
  const query = await searchParams;
  await requirePageSession(`/analysis/${analysisId}/compare`);
  const next = new URLSearchParams({ a: analysisId });
  if (query.with) next.set("b", query.with);
  redirect(`/compare?${next.toString()}`);
}
