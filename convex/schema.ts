import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const faceView = v.union(v.literal("front"), v.literal("profile"));

export const analysisStatus = v.union(
  v.literal("draft"),
  v.literal("photos_uploaded"),
  v.literal("landmarks_detected"),
  v.literal("awaiting_verification"),
  v.literal("processing"),
  v.literal("complete"),
  v.literal("failed"),
);

export const landmarkSource = v.union(v.literal("mediapipe"), v.literal("derived"), v.literal("manual"));

export const storedLandmark = v.object({
  view: faceView,
  key: v.string(),
  x: v.number(),
  y: v.number(),
  z: v.optional(v.number()),
  confidence: v.number(),
  source: landmarkSource,
});

export const storedMetric = v.object({
  metricId: v.string(),
  value: v.union(v.number(), v.null()),
  score: v.union(v.number(), v.null()),
  impact: v.union(v.number(), v.null()),
  referenceMin: v.number(),
  referenceMax: v.number(),
  unit: v.union(v.literal("ratio"), v.literal("percent"), v.literal("degrees")),
  category: v.string(),
  view: faceView,
});

export default defineSchema({
  ...authTables,
  profiles: defineTable({
    userId: v.id("users"),
    email: v.string(),
    displayName: v.string(),
  }).index("by_user", ["userId"]),
  analyses: defineTable({
    publicId: v.string(),
    userId: v.optional(v.id("users")),
    guestId: v.optional(v.string()),
    name: v.string(),
    status: analysisStatus,
    isSample: v.boolean(),
    harmonyScore: v.union(v.number(), v.null()),
    frontScore: v.union(v.number(), v.null()),
    profileScore: v.union(v.number(), v.null()),
    categoryScores: v.array(
      v.object({
        category: v.string(),
        label: v.string(),
        score: v.union(v.number(), v.null()),
      }),
    ),
    qualityNotes: v.array(v.string()),
    confidence: v.union(v.literal("High"), v.literal("Moderate"), v.literal("Low"), v.null()),
    profileMirrored: v.boolean(),
    errorMessage: v.union(v.string(), v.null()),
    detectedLandmarks: v.any(),
    landmarks: v.array(storedLandmark),
    metrics: v.array(storedMetric),
    updatedAt: v.number(),
  })
    .index("by_public_id", ["publicId"])
    .index("by_user_updated", ["userId", "updatedAt"])
    .index("by_guest_id", ["guestId"]),
  photos: defineTable({
    analysisId: v.id("analyses"),
    userId: v.optional(v.id("users")),
    guestId: v.optional(v.string()),
    view: faceView,
    storageId: v.id("_storage"),
    contentType: v.string(),
    width: v.number(),
    height: v.number(),
    quality: v.any(),
  }).index("by_analysis", ["analysisId"]),
  threads: defineTable({
    analysisId: v.id("analyses"),
    userId: v.optional(v.id("users")),
    guestId: v.optional(v.string()),
  }).index("by_analysis", ["analysisId"]),
  messages: defineTable({
    threadId: v.id("threads"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    structuredData: v.optional(v.any()),
  }).index("by_thread", ["threadId"]),
});
