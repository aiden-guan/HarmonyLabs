import type { FaceView, MetricCategory } from "@/types/face";

/**
 * Correlated measurements share one feature group.
 * The group's base weight is its importance. Adding another ratio inside the
 * group reallocates that weight. It does not create a new vote.
 *
 * Bases follow the independence of the signal, not a fixed front/profile mix.
 * Profile and front Harmony are always reported on their own. Combined Harmony
 * is the same group average, renormalized over the groups that could be measured.
 */
export const FEATURE_GROUPS = {
  eyeSpacing: { base: 1.15, view: "front", category: "eyes", label: "Eye spacing" },
  nasalWidthBalance: { base: 0.9, view: "front", category: "nose", label: "Nasal width balance" },
  oralProportions: { base: 0.8, view: "front", category: "lips", label: "Oral proportions" },
  facialVerticals: { base: 0.8, view: "front", category: "facialStructure", label: "Facial verticals" },
  profileConvexity: { base: 1.05, view: "profile", category: "profile", label: "Profile convexity" },
  nasalProfile: { base: 1.1, view: "profile", category: "profile", label: "Nasal profile" },
  chinProfile: { base: 1, view: "profile", category: "profile", label: "Chin profile" },
  eyeMorphology: { base: 0.4, view: "front", category: "eyes", label: "Eye morphology" },
  jawBalance: { base: 0.35, view: "front", category: "jaw", label: "Jaw balance" },
  midlineSymmetry: { base: 0.32, view: "front", category: "symmetry", label: "Midline symmetry" },
} as const satisfies Record<
  string,
  { base: number; view: FaceView; category: MetricCategory; label: string }
>;

export type FeatureGroupId = keyof typeof FEATURE_GROUPS;

export const FEATURE_GROUP_ORDER: FeatureGroupId[] = [
  "eyeSpacing",
  "nasalWidthBalance",
  "oralProportions",
  "facialVerticals",
  "eyeMorphology",
  "jawBalance",
  "midlineSymmetry",
  "profileConvexity",
  "nasalProfile",
  "chinProfile",
];
