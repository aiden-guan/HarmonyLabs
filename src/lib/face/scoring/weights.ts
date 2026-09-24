import type { EvidenceLevel, EvidenceTier } from "@/lib/face/scoring/evidence-types";

/**
 * Tier weights are the relative Harmony influence of evidence classes.
 * They are not attractiveness multipliers. A metric's own score stays a
 * comparison with its reference. Only the aggregation weight changes.
 *
 * Direct attractiveness evidence can carry a full share of its feature group.
 * Established aesthetic evidence is strong but less direct.
 * Anthropometric proportions can support a result, and cannot match a
 * direct study by weight alone.
 * Unsupported measurements contribute nothing.
 */
export const EVIDENCE_TIER_WEIGHT: Record<EvidenceTier, number> = {
  1: 1,
  2: 0.75,
  3: 0.4,
  4: 0,
};

/** How far the citation's sample and method support a general claim. */
export const EVIDENCE_LEVEL_WEIGHT: Record<EvidenceLevel, number> = {
  high: 1,
  moderate: 0.85,
  low: 0.65,
  insufficient: 0,
};

/**
 * Inside one feature group, weaker tiers supplement the strongest tier.
 * Their combined influence cannot exceed these fractions of the stronger tier's
 * influence sum, so a stack of related ratios cannot outvote one direct study.
 */
export const TIER_SUPPLEMENT_CAP = {
  tier2VersusTier1: 0.55,
  tier3VersusTier1: 0.28,
  tier3VersusTier2: 0.45,
} as const;

/**
 * Across groups, tier-3-only groups together cannot exceed half the weight of
 * the tier-1 groups that were actually measured.
 */
export const TIER3_GROUP_MASS_CAP = 0.5;

export function evidenceWeight(tier: EvidenceTier, level: EvidenceLevel): number {
  return EVIDENCE_TIER_WEIGHT[tier] * EVIDENCE_LEVEL_WEIGHT[level];
}
