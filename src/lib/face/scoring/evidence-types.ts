import type { FeatureGroupId } from "@/lib/face/scoring/feature-groups";
import type { FaceView } from "@/types/face";

export type EvidenceType =
  | "direct-attractiveness"
  | "aesthetic-harmony"
  | "anthropometric-proportion"
  | "population-reference"
  | "experimental"
  | "unsupported";

export type EvidenceTier = 1 | 2 | 3 | 4;

export type EvidenceLevel = "high" | "moderate" | "low" | "insufficient";

export type FindingType =
  | "attractiveness-rating"
  | "preference-experiment"
  | "attractive-cohort"
  | "aesthetic-analysis"
  | "anthropometry"
  | "systematic-review";

export type ScoringShape = "peaked-target" | "flat-target" | "extremeness" | "lower-is-better";

export interface LiteratureReference {
  title: string;
  authors?: string;
  year: number;
  doi?: string;
  pmid?: string;
  population: string;
  sampleSize?: number;
  methodology: string;
  findingType: FindingType;
  notes?: string;
}

export interface NumericBand {
  min: number;
  max: number;
  center?: number;
}

export interface PresentationBands {
  aestheticTarget?: NumericBand;
  harmoniousRange: NumericBand;
  populationRange?: NumericBand;
  sigmaLow: number;
  sigmaHigh: number;
}

export interface MetricEvidence {
  metricId: string;
  group: FeatureGroupId;
  view: FaceView;
  scoringShape: ScoringShape;
  bands: {
    neutral: PresentationBands;
    masculine?: PresentationBands;
    feminine?: PresentationBands;
  };
  /** Half-width, in metric units, treated as measurement noise rather than a difference. */
  uncertainty?: number;
  evidenceType: EvidenceType;
  evidenceTier: EvidenceTier;
  evidenceLevel: EvidenceLevel;
  /** Photographic repeatability prior, before this capture's landmark confidence. */
  measurementReliability: number;
  /** 1 when the MogLabs formula matches the cited definition. */
  formulaCompatibility: number;
  /**
   * Extra reduction when an optional presentation profile uses a study whose
   * model sex does not match that profile. Never inferred from the face.
   */
  feminineCompatibility?: number;
  masculineCompatibility?: number;
  scoreEligible: boolean;
  perspectiveSensitive: boolean;
  sourcePopulation: string;
  references: LiteratureReference[];
  limitations: string[];
  formulaCompatibilityNotes: string[];
  accuracyBudget: string[];
}

export interface ResolvedEvidence {
  evidence: MetricEvidence;
  bands: PresentationBands;
  formulaCompatibility: number;
}
