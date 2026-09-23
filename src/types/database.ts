import type { AnalysisStatus } from "@/types/analysis";
import type {
  FaceView,
  LandmarkSource,
  MetricCategory,
  MetricUnit,
  PhotoQuality,
  SemanticLandmarkKey,
} from "@/types/face";

export interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

export interface AnalysisRow {
  id: string;
  user_id: string;
  name: string;
  status: AnalysisStatus;
  harmony_score: number | null;
  front_score: number | null;
  profile_score: number | null;
  category_scores: unknown;
  quality_summary: unknown;
  profile_mirrored: boolean;
  is_sample: boolean;
  detected_landmarks: unknown;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface PhotoRow {
  id: string;
  analysis_id: string;
  view: FaceView;
  storage_path: string;
  content_type: string;
  width: number;
  height: number;
  quality_json: PhotoQuality;
  created_at: string;
}

export interface LandmarkRow {
  id: string;
  analysis_id: string;
  view: FaceView;
  landmark_key: SemanticLandmarkKey;
  x: number;
  y: number;
  z: number | null;
  confidence: number;
  source: LandmarkSource;
  created_at: string;
  updated_at: string;
}

export interface MetricRow {
  id: string;
  analysis_id: string;
  metric_id: string;
  value: number | null;
  score: number | null;
  impact: number | null;
  reference_min: number;
  reference_max: number;
  unit: MetricUnit;
  category: MetricCategory;
  view: FaceView;
  created_at: string;
}

export interface ChatThreadRow {
  id: string;
  analysis_id: string;
  user_id: string;
  created_at: string;
}

export interface ChatMessageRow {
  id: string;
  thread_id: string;
  role: "user" | "assistant";
  content: string;
  structured_data: unknown;
  created_at: string;
}
