import "server-only";

import type { CategoryScore } from "@/lib/face/scoring/aggregate";
import type { SessionUser } from "@/lib/auth/session";
import type {
  AnalysisDetail,
  CreateAnalysisInput,
  PhotoSaveInput,
  ResultSaveInput,
  StoredLandmark,
  StoredMessage,
  StoredMetric,
  StoredPhoto,
} from "@/lib/data/model";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AnalysisSummary } from "@/types/analysis";
import type {
  AnalysisRow,
  ChatMessageRow,
  ChatThreadRow,
  LandmarkRow,
  MetricRow,
  PhotoRow,
  ProfileRow,
} from "@/types/database";
import type { FaceView, PhotoQuality, SemanticLandmark } from "@/types/face";

function fail(error: { message: string } | null, action: string): void {
  if (error) throw new Error(`${action}: ${error.message}`);
}

async function client() {
  return createSupabaseServerClient();
}

function summary(row: AnalysisRow): AnalysisSummary {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    isSample: row.is_sample,
    harmonyScore: row.harmony_score,
    frontScore: row.front_score,
    profileScore: row.profile_score,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function qualitySummary(row: AnalysisRow): { notes: string[]; confidence: AnalysisDetail["confidence"] } {
  const value = row.quality_summary as { notes?: string[]; confidence?: AnalysisDetail["confidence"] } | null;
  return {
    notes: Array.isArray(value?.notes) ? value.notes : [],
    confidence: value?.confidence ?? null,
  };
}

export const supabaseStore = {
  async ensureProfile(user: SessionUser, displayName?: string | null): Promise<void> {
    const supabase = await client();
    const { data, error } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
    fail(error, "Could not read profile");
    if (data) {
      const update = await supabase.from("profiles").update({ email: user.email }).eq("id", user.id);
      fail(update.error, "Could not update profile");
      return;
    }
    const insert = await supabase.from("profiles").insert({
      id: user.id,
      email: user.email,
      display_name: displayName ?? user.email.split("@")[0] ?? "Member",
    });
    fail(insert.error, "Could not create profile");
  },

  async getProfile(userId: string) {
    const supabase = await client();
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    fail(error, "Could not read profile");
    const row = data as ProfileRow | null;
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      createdAt: row.created_at,
    };
  },

  async updateProfile(userId: string, displayName: string): Promise<void> {
    const supabase = await client();
    const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("id", userId);
    fail(error, "Could not update profile");
  },

  async deleteUserData(userId: string): Promise<void> {
    const supabase = await client();
    const analyses = await supabase.from("analyses").select("id").eq("user_id", userId);
    fail(analyses.error, "Could not list analyses");
    const ids = ((analyses.data ?? []) as Array<{ id: string }>).map((item) => item.id);
    if (ids.length > 0) {
      const photos = await supabase.from("analysis_photos").select("storage_path").in("analysis_id", ids);
      fail(photos.error, "Could not list photos");
      const paths = ((photos.data ?? []) as Array<{ storage_path: string }>).map((item) => item.storage_path);
      if (paths.length > 0) {
        const removed = await supabase.storage.from("analysis-photos").remove(paths);
        fail(removed.error, "Could not delete photos");
      }
    }
    const deleted = await supabase.from("profiles").delete().eq("id", userId);
    fail(deleted.error, "Could not delete profile");
  },

  async listAnalyses(userId: string): Promise<AnalysisSummary[]> {
    const supabase = await client();
    const { data, error } = await supabase
      .from("analyses")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    fail(error, "Could not list analyses");
    return ((data ?? []) as AnalysisRow[]).map(summary);
  },

  async getAnalysis(userId: string, analysisId: string): Promise<AnalysisDetail | null> {
    const supabase = await client();
    const analysisResult = await supabase
      .from("analyses")
      .select("*")
      .eq("id", analysisId)
      .eq("user_id", userId)
      .maybeSingle();
    fail(analysisResult.error, "Could not read analysis");
    const row = analysisResult.data as AnalysisRow | null;
    if (!row) return null;
    const [photos, landmarks, metrics, thread] = await Promise.all([
      supabase.from("analysis_photos").select("*").eq("analysis_id", analysisId),
      supabase.from("landmarks").select("*").eq("analysis_id", analysisId),
      supabase.from("metric_results").select("*").eq("analysis_id", analysisId),
      supabase.from("chat_threads").select("*").eq("analysis_id", analysisId).eq("user_id", userId).maybeSingle(),
    ]);
    fail(photos.error, "Could not read photos");
    fail(landmarks.error, "Could not read landmarks");
    fail(metrics.error, "Could not read metrics");
    fail(thread.error, "Could not read chat");
    let messages: StoredMessage[] = [];
    const threadRow = thread.data as ChatThreadRow | null;
    if (threadRow) {
      const messageResult = await supabase
        .from("chat_messages")
        .select("*")
        .eq("thread_id", threadRow.id)
        .order("created_at", { ascending: true });
      fail(messageResult.error, "Could not read messages");
      messages = ((messageResult.data ?? []) as ChatMessageRow[]).map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.created_at,
        structuredData: message.structured_data ?? undefined,
      }));
    }
    const quality = qualitySummary(row);
    return {
      ...summary(row),
      profileMirrored: row.profile_mirrored,
      categoryScores: (row.category_scores as CategoryScore[]) ?? [],
      qualityNotes: quality.notes,
      confidence: quality.confidence,
      errorMessage: row.error_message,
      detectedLandmarks: (row.detected_landmarks as AnalysisDetail["detectedLandmarks"]) ?? {},
      photos: ((photos.data ?? []) as PhotoRow[]).map((photo) => ({
        id: photo.id,
        view: photo.view,
        contentType: photo.content_type,
        width: photo.width,
        height: photo.height,
        quality: photo.quality_json,
      })),
      landmarks: ((landmarks.data ?? []) as LandmarkRow[]).map(toLandmark),
      metrics: ((metrics.data ?? []) as MetricRow[]).map(toMetric),
      messages,
    };
  },

  async createAnalysis(userId: string, input: CreateAnalysisInput): Promise<AnalysisSummary> {
    const supabase = await client();
    const { data, error } = await supabase
      .from("analyses")
      .insert({ user_id: userId, name: input.name, is_sample: Boolean(input.isSample) })
      .select("*")
      .single();
    fail(error, "Could not create analysis");
    return summary(data as AnalysisRow);
  },

  async renameAnalysis(userId: string, analysisId: string, name: string): Promise<void> {
    const supabase = await client();
    const { error } = await supabase.from("analyses").update({ name }).eq("id", analysisId).eq("user_id", userId);
    fail(error, "Could not rename analysis");
  },

  async deleteAnalysis(userId: string, analysisId: string): Promise<boolean> {
    const supabase = await client();
    const existing = await supabase.from("analyses").select("id").eq("id", analysisId).eq("user_id", userId).maybeSingle();
    fail(existing.error, "Could not read analysis");
    if (!existing.data) return false;
    const photos = await supabase.from("analysis_photos").select("storage_path").eq("analysis_id", analysisId);
    fail(photos.error, "Could not list photos");
    const paths = ((photos.data ?? []) as Array<{ storage_path: string }>).map((item) => item.storage_path);
    if (paths.length > 0) {
      const removed = await supabase.storage.from("analysis-photos").remove(paths);
      fail(removed.error, "Could not delete photos");
    }
    const deleted = await supabase.from("analyses").delete().eq("id", analysisId).eq("user_id", userId);
    fail(deleted.error, "Could not delete analysis");
    return true;
  },

  async savePhoto(userId: string, analysisId: string, input: PhotoSaveInput): Promise<StoredPhoto | null> {
    const supabase = await client();
    const existing = await supabase.from("analyses").select("id, status").eq("id", analysisId).eq("user_id", userId).maybeSingle();
    fail(existing.error, "Could not read analysis");
    if (!existing.data) return null;
    const extension = input.contentType === "image/png" ? "png" : input.contentType === "image/webp" ? "webp" : "jpg";
    const storagePath = `${userId}/${analysisId}/${input.view}.${extension}`;
    const uploaded = await supabase.storage.from("analysis-photos").upload(storagePath, input.bytes, {
      contentType: input.contentType,
      upsert: true,
    });
    fail(uploaded.error, "Could not store photo");
    const row = {
      analysis_id: analysisId,
      view: input.view,
      storage_path: storagePath,
      content_type: input.contentType,
      width: input.width,
      height: input.height,
      quality_json: input.quality ?? emptyQuality(),
    };
    const saved = await supabase.from("analysis_photos").upsert(row, { onConflict: "analysis_id,view" }).select("*").single();
    fail(saved.error, "Could not save photo");
    const photo = saved.data as PhotoRow;
    const views = await supabase.from("analysis_photos").select("view").eq("analysis_id", analysisId);
    const present = new Set(((views.data ?? []) as Array<{ view: FaceView }>).map((item) => item.view));
    if (present.has("front") && present.has("profile") && (existing.data as { status: string }).status === "draft") {
      await supabase.from("analyses").update({ status: "photos_uploaded" }).eq("id", analysisId).eq("user_id", userId);
    }
    return {
      id: photo.id,
      view: photo.view,
      contentType: photo.content_type,
      width: photo.width,
      height: photo.height,
      quality: photo.quality_json,
    };
  },

  async updatePhotoQuality(userId: string, analysisId: string, view: FaceView, quality: PhotoQuality) {
    const supabase = await client();
    const owned = await supabase.from("analyses").select("id").eq("id", analysisId).eq("user_id", userId).maybeSingle();
    if (!owned.data) return;
    await supabase.from("analysis_photos").update({ quality_json: quality }).eq("analysis_id", analysisId).eq("view", view);
    if (view === "profile") {
      await supabase.from("analyses").update({ profile_mirrored: quality.mirrored }).eq("id", analysisId).eq("user_id", userId);
    }
  },

  async readPhoto(userId: string, analysisId: string, view: FaceView) {
    const supabase = await client();
    const owned = await supabase.from("analyses").select("id").eq("id", analysisId).eq("user_id", userId).maybeSingle();
    if (!owned.data) return null;
    const photo = await supabase
      .from("analysis_photos")
      .select("storage_path, content_type")
      .eq("analysis_id", analysisId)
      .eq("view", view)
      .maybeSingle();
    const row = photo.data as { storage_path: string; content_type: string } | null;
    if (!row || !row.storage_path.startsWith(`${userId}/`)) return null;
    const downloaded = await supabase.storage.from("analysis-photos").download(row.storage_path);
    if (downloaded.error || !downloaded.data) return null;
    const bytes = Buffer.from(await downloaded.data.arrayBuffer());
    return { bytes, contentType: row.content_type };
  },

  async saveLandmarks(
    userId: string,
    analysisId: string,
    view: FaceView,
    landmarks: SemanticLandmark[],
    options: { detected?: boolean },
  ): Promise<boolean> {
    const supabase = await client();
    const owned = await supabase.from("analyses").select("detected_landmarks").eq("id", analysisId).eq("user_id", userId).maybeSingle();
    if (!owned.data) return false;
    const removed = await supabase.from("landmarks").delete().eq("analysis_id", analysisId).eq("view", view);
    fail(removed.error, "Could not replace landmarks");
    if (landmarks.length > 0) {
      const inserted = await supabase.from("landmarks").insert(
        landmarks.map((landmark) => ({
          analysis_id: analysisId,
          view,
          landmark_key: landmark.key,
          x: landmark.x,
          y: landmark.y,
          z: landmark.z ?? null,
          confidence: landmark.confidence,
          source: landmark.source,
        })),
      );
      fail(inserted.error, "Could not save landmarks");
    }
    const detected = ((owned.data as { detected_landmarks: AnalysisDetail["detectedLandmarks"] }).detected_landmarks) ?? {};
    const nextDetected = options.detected ? { ...detected, [view]: landmarks } : detected;
    const views = await supabase.from("landmarks").select("view").eq("analysis_id", analysisId);
    const present = new Set(((views.data ?? []) as Array<{ view: FaceView }>).map((item) => item.view));
    const status = present.has("front") && present.has("profile") ? "awaiting_verification" : "landmarks_detected";
    const updated = await supabase
      .from("analyses")
      .update({ detected_landmarks: nextDetected, status })
      .eq("id", analysisId)
      .eq("user_id", userId);
    fail(updated.error, "Could not update analysis");
    return true;
  },

  async saveResults(userId: string, analysisId: string, input: ResultSaveInput): Promise<boolean> {
    const supabase = await client();
    const owned = await supabase.from("analyses").select("id").eq("id", analysisId).eq("user_id", userId).maybeSingle();
    if (!owned.data) return false;
    const updated = await supabase
      .from("analyses")
      .update({
        status: input.status,
        harmony_score: input.harmonyScore,
        front_score: input.frontScore,
        profile_score: input.profileScore,
        category_scores: input.categoryScores,
        quality_summary: { notes: input.qualityNotes, confidence: input.confidence },
        error_message: input.errorMessage ?? null,
      })
      .eq("id", analysisId)
      .eq("user_id", userId);
    fail(updated.error, "Could not save scores");
    const cleared = await supabase.from("metric_results").delete().eq("analysis_id", analysisId);
    fail(cleared.error, "Could not replace metrics");
    if (input.metrics.length > 0) {
      const inserted = await supabase.from("metric_results").insert(
        input.metrics.map((metric) => ({
          analysis_id: analysisId,
          metric_id: metric.metricId,
          value: metric.value,
          score: metric.score,
          impact: metric.impact,
          reference_min: metric.referenceMin,
          reference_max: metric.referenceMax,
          unit: metric.unit,
          category: metric.category,
          view: metric.view,
        })),
      );
      fail(inserted.error, "Could not save metrics");
    }
    return true;
  },

  async addExchange(
    userId: string,
    analysisId: string,
    userContent: string,
    assistantContent: string,
    structured: unknown,
  ): Promise<StoredMessage[] | null> {
    const supabase = await client();
    const owned = await supabase.from("analyses").select("id").eq("id", analysisId).eq("user_id", userId).maybeSingle();
    if (!owned.data) return null;
    const existing = await supabase.from("chat_threads").select("id").eq("analysis_id", analysisId).maybeSingle();
    let threadId = (existing.data as { id: string } | null)?.id;
    if (!threadId) {
      const created = await supabase
        .from("chat_threads")
        .insert({ analysis_id: analysisId, user_id: userId })
        .select("id")
        .single();
      fail(created.error, "Could not start chat");
      threadId = (created.data as { id: string }).id;
    }
    const now = Date.now();
    const inserted = await supabase
      .from("chat_messages")
      .insert([
        { thread_id: threadId, role: "user", content: userContent, created_at: new Date(now).toISOString() },
        {
          thread_id: threadId,
          role: "assistant",
          content: assistantContent,
          structured_data: structured ?? null,
          created_at: new Date(now + 1).toISOString(),
        },
      ])
      .select("*");
    fail(inserted.error, "Could not save chat");
    return ((inserted.data ?? []) as ChatMessageRow[]).map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.created_at,
      structuredData: message.structured_data ?? undefined,
    }));
  },
};

function emptyQuality(): PhotoQuality {
  return {
    faceDetected: false,
    faceCount: 0,
    yaw: null,
    pitch: null,
    roll: null,
    blurScore: 0,
    brightnessScore: 0,
    faceCoverage: 0,
    warnings: [],
    mirrored: false,
  };
}

function toLandmark(row: LandmarkRow): StoredLandmark {
  return {
    view: row.view,
    key: row.landmark_key,
    x: row.x,
    y: row.y,
    z: row.z ?? undefined,
    confidence: row.confidence,
    source: row.source,
  };
}

function toMetric(row: MetricRow): StoredMetric {
  return {
    metricId: row.metric_id,
    value: row.value,
    score: row.score,
    impact: row.impact,
    referenceMin: row.reference_min,
    referenceMax: row.reference_max,
    unit: row.unit,
    category: row.category,
    view: row.view,
  };
}
