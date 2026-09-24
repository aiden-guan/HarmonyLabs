import { FEATURE_GROUPS, FEATURE_GROUP_ORDER, type FeatureGroupId } from "@/lib/face/scoring/feature-groups";
import { TIER3_GROUP_MASS_CAP, TIER_SUPPLEMENT_CAP } from "@/lib/face/scoring/weights";
import { SCORING_VERSION } from "@/lib/face/versions";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/types/face";
import type {
  FaceView,
  MetricCategory,
  MetricOverlay,
  MetricUnit,
} from "@/types/face";

export interface ScoreInput {
  id: string;
  label: string;
  category: MetricCategory;
  view: FaceView;
  unit: MetricUnit;
  value: number | null;
  score: number | null;
  /** Legacy per-metric weight. V2 group aggregation uses `influence`. */
  weight: number;
  referenceMin: number;
  referenceMax: number;
  explanation: string;
  formula: string;
  normalization: string;
  overlay: MetricOverlay;
  featureGroup?: FeatureGroupId;
  evidenceTier?: 1 | 2 | 3 | 4;
  scoreEligible?: boolean;
  influence?: number;
  reliabilityFactor?: number;
  measurementConfidence?: number | null;
  evidenceLabel?: string;
  scoreCeiling?: number;
}

export interface CategoryScore {
  category: MetricCategory;
  label: string;
  score: number | null;
}

export interface ScoredMetric extends ScoreInput {
  impact: number | null;
  contribution: number | null;
}

export interface FeatureGroupScore {
  id: FeatureGroupId;
  label: string;
  score: number | null;
  weight: number;
  view: FaceView;
  category: MetricCategory;
}

export interface HarmonyReport {
  harmony: number | null;
  front: number | null;
  profile: number | null;
  partial: boolean;
  scoringVersion: typeof SCORING_VERSION;
  categories: CategoryScore[];
  groups: FeatureGroupScore[];
  metrics: ScoredMetric[];
  strengths: ScoredMetric[];
  deviations: ScoredMetric[];
  impacts: ScoredMetric[];
}

export function weightedAverage(
  items: Array<{ score: number | null; weight: number }>,
): number | null {
  let weightSum = 0;
  let valueSum = 0;
  for (const item of items) {
    if (item.score === null || !Number.isFinite(item.score) || !(item.weight > 0)) continue;
    weightSum += item.weight;
    valueSum += item.score * item.weight;
  }
  if (weightSum <= 0) return null;
  const average = valueSum / weightSum;
  return Number.isFinite(average) ? average : null;
}

interface CappedMember extends ScoreInput {
  cappedInfluence: number;
}

function capTierInfluences(members: ScoreInput[]): CappedMember[] {
  const sum = { 1: 0, 2: 0, 3: 0 };
  for (const member of members) {
    const tier = member.evidenceTier ?? 4;
    if (tier === 1 || tier === 2 || tier === 3) sum[tier] += member.influence ?? 0;
  }
  let scale2 = 1;
  let scale3 = 1;
  if (sum[1] > 0) {
    if (sum[2] > 0) scale2 = Math.min(1, (TIER_SUPPLEMENT_CAP.tier2VersusTier1 * sum[1]) / sum[2]);
    if (sum[3] > 0) scale3 = Math.min(1, (TIER_SUPPLEMENT_CAP.tier3VersusTier1 * sum[1]) / sum[3]);
  } else if (sum[2] > 0 && sum[3] > 0) {
    scale3 = Math.min(1, (TIER_SUPPLEMENT_CAP.tier3VersusTier2 * sum[2]) / sum[3]);
  }
  return members.map((member) => {
    const tier = member.evidenceTier ?? 4;
    const scale = tier === 2 ? scale2 : tier === 3 ? scale3 : tier === 1 ? 1 : 0;
    return { ...member, cappedInfluence: (member.influence ?? 0) * scale };
  });
}

function qualityFactor(members: CappedMember[]): number {
  let weight = 0;
  let sum = 0;
  for (const member of members) {
    const reliability = member.reliabilityFactor ?? 1;
    if (!(reliability > 0) || !(member.cappedInfluence > 0)) continue;
    weight += member.cappedInfluence;
    sum += member.cappedInfluence * reliability;
  }
  if (weight <= 0) return 0;
  return sum / weight;
}

function anchorOf(tiers: Array<1 | 2 | 3 | 4 | undefined>): number {
  if (tiers.includes(1)) return 1;
  if (tiers.includes(2)) return 0.75;
  if (tiers.includes(3)) return 0.4;
  return 0;
}

function capTier3Groups(groups: FeatureGroupScore[]): FeatureGroupScore[] {
  const tier1 = groups.filter((group) => group.weight > 0 && anchorFromLabel(group) === 1);
  const tier1Mass = tier1.reduce((sum, group) => sum + group.weight, 0);
  if (tier1Mass <= 0) return groups;
  const tier3 = groups.filter((group) => group.weight > 0 && anchorFromLabel(group) === 3);
  const tier3Mass = tier3.reduce((sum, group) => sum + group.weight, 0);
  const cap = TIER3_GROUP_MASS_CAP * tier1Mass;
  if (tier3Mass <= cap || tier3Mass <= 0) return groups;
  const scale = cap / tier3Mass;
  return groups.map((group) =>
    anchorFromLabel(group) === 3 ? { ...group, weight: group.weight * scale } : group,
  );
}

const groupAnchor = new Map<FeatureGroupId, number>();

function anchorFromLabel(group: FeatureGroupScore): number {
  return groupAnchor.get(group.id) ?? 0;
}

export function scoreFeatureGroups(metrics: ScoreInput[]): FeatureGroupScore[] {
  groupAnchor.clear();
  const groups = FEATURE_GROUP_ORDER.map((id) => {
    const spec = FEATURE_GROUPS[id];
    const members = metrics.filter(
      (metric) =>
        metric.featureGroup === id &&
        metric.score !== null &&
        metric.scoreEligible !== false &&
        (metric.influence ?? 0) > 0,
    );
    if (members.length === 0) {
      groupAnchor.set(id, 0);
      return {
        id,
        label: spec.label,
        score: null,
        weight: 0,
        view: spec.view,
        category: spec.category,
      };
    }
    const capped = capTierInfluences(members);
    const anchor = anchorOf(members.map((member) => member.evidenceTier));
    groupAnchor.set(id, anchor === 1 ? 1 : anchor === 0.75 ? 2 : anchor === 0.4 ? 3 : 0);
    const weight = spec.base * anchor * qualityFactor(capped);
    return {
      id,
      label: spec.label,
      score: weightedAverage(capped.map((member) => ({ score: member.score, weight: member.cappedInfluence }))),
      weight,
      view: spec.view,
      category: spec.category,
    };
  });
  return capTier3Groups(groups);
}

function usesGroups(metrics: ScoreInput[]): boolean {
  return metrics.some((metric) => metric.featureGroup);
}

function legacyView(metrics: ScoreInput[], view: FaceView): number | null {
  return weightedAverage(
    metrics.filter((metric) => metric.view === view).map((metric) => ({ score: metric.score, weight: metric.weight })),
  );
}

function measuredWeight(metrics: ScoreInput[], view: FaceView): number {
  return metrics.reduce((sum, metric) => {
    if (metric.view !== view || metric.score === null || !(metric.weight > 0)) return sum;
    return sum + metric.weight;
  }, 0);
}

export function harmonyFromMetrics(metrics: ScoreInput[]): {
  harmony: number | null;
  front: number | null;
  profile: number | null;
  partial: boolean;
  groups: FeatureGroupScore[];
} {
  if (!usesGroups(metrics)) {
    const front = legacyView(metrics, "front");
    const profile = legacyView(metrics, "profile");
    if (front === null && profile === null) return { harmony: null, front, profile, partial: false, groups: [] };
    if (front === null) return { harmony: profile, front, profile, partial: true, groups: [] };
    if (profile === null) return { harmony: front, front, profile, partial: true, groups: [] };
    const frontWeight = measuredWeight(metrics, "front");
    const profileWeight = measuredWeight(metrics, "profile");
    const harmony = (front * frontWeight + profile * profileWeight) / (frontWeight + profileWeight);
    return {
      harmony: Number.isFinite(harmony) ? harmony : null,
      front,
      profile,
      partial: false,
      groups: [],
    };
  }

  const groups = scoreFeatureGroups(metrics);
  const front = weightedAverage(
    groups.filter((group) => group.view === "front").map((group) => ({ score: group.score, weight: group.weight })),
  );
  const profile = weightedAverage(
    groups.filter((group) => group.view === "profile").map((group) => ({ score: group.score, weight: group.weight })),
  );
  const harmony = weightedAverage(groups.map((group) => ({ score: group.score, weight: group.weight })));
  const partial = (front === null) !== (profile === null) && harmony !== null;
  return { harmony, front, profile, partial, groups };
}

function contributions(metrics: ScoreInput[], groups: FeatureGroupScore[]): Map<string, number> {
  const total = groups.reduce((sum, group) => sum + (group.score === null ? 0 : group.weight), 0);
  const shares = new Map<string, number>();
  if (total <= 0) return shares;
  for (const group of groups) {
    if (!(group.weight > 0) || group.score === null) continue;
    const members = capTierInfluences(
      metrics.filter(
        (metric) =>
          metric.featureGroup === group.id &&
          metric.score !== null &&
          metric.scoreEligible !== false &&
          (metric.influence ?? 0) > 0,
      ),
    );
    const memberTotal = members.reduce((sum, member) => sum + member.cappedInfluence, 0);
    if (memberTotal <= 0) continue;
    for (const member of members) {
      shares.set(member.id, (group.weight * member.cappedInfluence) / memberTotal / total);
    }
  }
  return shares;
}

export function withImpacts(metrics: ScoreInput[]): ScoredMetric[] {
  const summary = harmonyFromMetrics(metrics);
  const shares = contributions(metrics, summary.groups);
  return metrics.map((metric) => {
    const contribution = shares.get(metric.id) ?? (metric.scoreEligible === false ? 0 : null);
    if (summary.harmony === null || metric.score === null) return { ...metric, impact: null, contribution };
    const ceiling = metric.scoreCeiling ?? 10;
    if (metric.score >= ceiling - 0.005) return { ...metric, impact: 0, contribution };
    const next = harmonyFromMetrics(
      metrics.map((item) => (item.id === metric.id ? { ...item, score: ceiling } : item)),
    ).harmony;
    if (next === null) return { ...metric, impact: null, contribution };
    return { ...metric, impact: next - summary.harmony, contribution };
  });
}

export function categoryScores(metrics: ScoreInput[], groups: FeatureGroupScore[]): CategoryScore[] {
  if (groups.length === 0) {
    return CATEGORY_ORDER.map((category) => ({
      category,
      label: CATEGORY_LABELS[category],
      score: weightedAverage(
        metrics.filter((metric) => metric.category === category).map((metric) => ({
          score: metric.score,
          weight: metric.weight,
        })),
      ),
    }));
  }
  return CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    score: weightedAverage(
      groups.filter((group) => group.category === category).map((group) => ({
        score: group.score,
        weight: group.weight,
      })),
    ),
  }));
}

export function buildReport(metrics: ScoreInput[]): HarmonyReport {
  const scored = withImpacts(metrics);
  const summary = harmonyFromMetrics(scored);
  const ranked = scored.filter((metric) => metric.score !== null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const strengths = ranked.filter((metric) => (metric.score ?? 0) >= 8).slice(0, 3);
  return {
    harmony: summary.harmony,
    front: summary.front,
    profile: summary.profile,
    partial: summary.partial,
    scoringVersion: SCORING_VERSION,
    categories: categoryScores(scored, summary.groups),
    groups: summary.groups,
    metrics: scored,
    strengths: strengths.length > 0 ? strengths : ranked.slice(0, 3),
    deviations: [...ranked].reverse().filter((metric) => (metric.score ?? 10) < 9.5).slice(0, 3),
    impacts: [...scored]
      .filter((metric) => (metric.impact ?? 0) > 0.005)
      .sort((a, b) => (b.impact ?? 0) - (a.impact ?? 0))
      .slice(0, 5),
  };
}

export function viewScore(metrics: ScoreInput[], view: FaceView): number | null {
  return harmonyFromMetrics(metrics)[view];
}

export function combineHarmony(
  front: number | null,
  profile: number | null,
): { harmony: number | null; partial: boolean } {
  if (front === null && profile === null) return { harmony: null, partial: false };
  if (front === null) return { harmony: profile, partial: true };
  if (profile === null) return { harmony: front, partial: true };
  const harmony = (front + profile) / 2;
  return { harmony: Number.isFinite(harmony) ? harmony : null, partial: false };
}
