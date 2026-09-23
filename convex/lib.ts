import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type ReadCtx = QueryCtx | MutationCtx;

export async function requireUserId(ctx: ReadCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Sign in required.");
  return userId;
}

export async function ownedAnalysis(ctx: ReadCtx, publicId: string) {
  const userId = await requireUserId(ctx);
  const analysis = await ctx.db
    .query("analyses")
    .withIndex("by_public_id", (q) => q.eq("publicId", publicId))
    .unique();
  if (!analysis || analysis.userId !== userId) return null;
  return analysis;
}

export function iso(ms: number) {
  return new Date(ms).toISOString();
}

export function summary(analysis: Doc<"analyses">) {
  return {
    id: analysis.publicId,
    name: analysis.name,
    status: analysis.status,
    isSample: analysis.isSample,
    harmonyScore: analysis.harmonyScore,
    frontScore: analysis.frontScore,
    profileScore: analysis.profileScore,
    createdAt: iso(analysis._creationTime),
    updatedAt: iso(analysis.updatedAt),
  };
}

export async function analysisDetail(ctx: ReadCtx, analysis: Doc<"analyses">) {
  const photos = await ctx.db
    .query("photos")
    .withIndex("by_analysis", (q) => q.eq("analysisId", analysis._id))
    .collect();
  const thread = await ctx.db
    .query("threads")
    .withIndex("by_analysis", (q) => q.eq("analysisId", analysis._id))
    .unique();
  const messages = thread
    ? await ctx.db
        .query("messages")
        .withIndex("by_thread", (q) => q.eq("threadId", thread._id))
        .collect()
    : [];
  return {
    ...summary(analysis),
    profileMirrored: analysis.profileMirrored,
    categoryScores: analysis.categoryScores,
    qualityNotes: analysis.qualityNotes,
    confidence: analysis.confidence,
    errorMessage: analysis.errorMessage,
    detectedLandmarks: analysis.detectedLandmarks,
    photos: photos.map((photo) => ({
      id: photo._id,
      view: photo.view,
      contentType: photo.contentType,
      width: photo.width,
      height: photo.height,
      quality: photo.quality,
    })),
    landmarks: analysis.landmarks,
    metrics: analysis.metrics,
    messages: messages.map((message) => ({
      id: message._id,
      role: message.role,
      content: message.content,
      createdAt: iso(message._creationTime),
      ...(message.structuredData !== undefined ? { structuredData: message.structuredData } : {}),
    })),
  };
}

export async function deleteAnalysisTree(ctx: MutationCtx, analysisId: Id<"analyses">) {
  const photos = await ctx.db
    .query("photos")
    .withIndex("by_analysis", (q) => q.eq("analysisId", analysisId))
    .collect();
  for (const photo of photos) {
    await ctx.storage.delete(photo.storageId);
    await ctx.db.delete(photo._id);
  }
  const thread = await ctx.db
    .query("threads")
    .withIndex("by_analysis", (q) => q.eq("analysisId", analysisId))
    .unique();
  if (thread) {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", thread._id))
      .collect();
    for (const message of messages) await ctx.db.delete(message._id);
    await ctx.db.delete(thread._id);
  }
  await ctx.db.delete(analysisId);
}

export const emptyQuality = {
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
