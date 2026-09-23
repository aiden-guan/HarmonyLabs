export type AnalysisStatus =
  | "draft"
  | "photos_uploaded"
  | "landmarks_detected"
  | "awaiting_verification"
  | "processing"
  | "complete"
  | "failed";

export interface Profile {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
}

export interface AnalysisSummary {
  id: string;
  name: string;
  status: AnalysisStatus;
  isSample: boolean;
  harmonyScore: number | null;
  frontScore: number | null;
  profileScore: number | null;
  createdAt: string;
  updatedAt: string;
}
