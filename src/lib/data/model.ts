import type { CategoryScore } from "@/lib/face/scoring/aggregate";
import type { DistanceProtocol, PresentationProfile, ScoringVersionId } from "@/lib/face/versions";
import type { AnalysisStatus, AnalysisSummary } from "@/types/analysis";
import type {
  FaceView,
  LandmarkSource,
  MetricCategory,
  MetricUnit,
  PhotoQuality,
  SemanticLandmark,
  SemanticLandmarkKey,
} from "@/types/face";

export interface StoredLandmark {
  view: FaceView;
  key: SemanticLandmarkKey;
  x: number;
  y: number;
  z?: number;
  confidence: number;
  source: LandmarkSource;
}

export interface StoredMetric {
  metricId: string;
  value: number | null;
  score: number | null;
  impact: number | null;
  referenceMin: number;
  referenceMax: number;
  unit: MetricUnit;
  category: MetricCategory;
  view: FaceView;
  evidenceTier?: number | null;
  evidenceLabel?: string | null;
  scoreEligible?: boolean;
  measurementConfidence?: number | null;
  contribution?: number | null;
}

export interface StoredPhoto {
  id: string;
  view: FaceView;
  contentType: string;
  width: number;
  height: number;
  quality: PhotoQuality;
}

export interface StoredMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  structuredData?: unknown;
}

export interface AnalysisDetail extends AnalysisSummary {
  profileMirrored: boolean;
  categoryScores: CategoryScore[];
  qualityNotes: string[];
  confidence: "High" | "Moderate" | "Low" | null;
  errorMessage: string | null;
  detectedLandmarks: Partial<Record<FaceView, SemanticLandmark[]>>;
  photos: StoredPhoto[];
  landmarks: StoredLandmark[];
  metrics: StoredMetric[];
  messages: StoredMessage[];
  scoringVersion?: ScoringVersionId | string | null;
  metricDefinitionVersion?: string | null;
  referenceDataVersion?: string | null;
  landmarkModelVersion?: string | null;
  presentationProfile?: PresentationProfile | null;
  adultAcknowledged?: boolean | null;
  distanceProtocol?: DistanceProtocol | null;
}

export interface CreateAnalysisInput {
  name: string;
  isSample?: boolean;
  adultAcknowledged?: boolean;
  presentationProfile?: PresentationProfile;
  distanceProtocol?: DistanceProtocol;
}

export interface PhotoSaveInput {
  view: FaceView;
  bytes: Uint8Array;
  contentType: string;
  width: number;
  height: number;
  quality?: PhotoQuality;
}

export interface ResultSaveInput {
  status: AnalysisStatus;
  harmonyScore: number | null;
  frontScore: number | null;
  profileScore: number | null;
  categoryScores: CategoryScore[];
  qualityNotes: string[];
  confidence: "High" | "Moderate" | "Low" | null;
  metrics: StoredMetric[];
  errorMessage?: string | null;
  scoringVersion?: string | null;
  metricDefinitionVersion?: string | null;
  referenceDataVersion?: string | null;
  landmarkModelVersion?: string | null;
  presentationProfile?: PresentationProfile | null;
  adultAcknowledged?: boolean | null;
  distanceProtocol?: DistanceProtocol | null;
}
