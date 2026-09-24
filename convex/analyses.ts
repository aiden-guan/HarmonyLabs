import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { analysisDetail, deleteAnalysisTree, ownedAnalysis, requireUserId, summary } from "./lib";
import { analysisStatus, landmarkSource, storedMetric } from "./schema";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const analyses = await ctx.db
      .query("analyses")
      .withIndex("by_user_updated", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return analyses.map(summary);
  },
});

export const get = query({
  args: { analysisId: v.string(), guestId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const analysis = await ownedAnalysis(ctx, args.analysisId, args.guestId);
    if (!analysis) return null;
    return analysisDetail(ctx, analysis);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    isSample: v.optional(v.boolean()),
    guestId: v.optional(v.string()),
    adultAcknowledged: v.optional(v.boolean()),
    presentationProfile: v.optional(v.union(v.literal("neutral"), v.literal("masculine"), v.literal("feminine"))),
    distanceProtocol: v.optional(v.union(v.literal("followed"), v.literal("not-followed"), v.literal("unknown"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId && !args.guestId) throw new Error("Sign in required.");
    const name = args.name.trim();
    if (!name || name.length > 80) throw new Error("Enter a shorter analysis name.");
    const now = Date.now();
    const publicId = crypto.randomUUID();
    await ctx.db.insert("analyses", {
      publicId,
      ...(userId ? { userId } : { guestId: args.guestId }),
      name,
      status: "draft",
      isSample: Boolean(args.isSample),
      harmonyScore: null,
      frontScore: null,
      profileScore: null,
      categoryScores: [],
      qualityNotes: [],
      confidence: null,
      profileMirrored: false,
      errorMessage: null,
      detectedLandmarks: {},
      landmarks: [],
      metrics: [],
      updatedAt: now,
      presentationProfile: args.presentationProfile ?? "neutral",
      adultAcknowledged: args.adultAcknowledged ?? null,
      distanceProtocol: args.distanceProtocol ?? "unknown",
    });
    const analysis = await ctx.db
      .query("analyses")
      .withIndex("by_public_id", (q) => q.eq("publicId", publicId))
      .unique();
    if (!analysis) throw new Error("Could not create the analysis.");
    return summary(analysis);
  },
});

export const claimGuest = mutation({
  args: { guestId: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const guestId = args.guestId.trim();
    if (!guestId) return 0;
    const analyses = await ctx.db
      .query("analyses")
      .withIndex("by_guest_id", (q) => q.eq("guestId", guestId))
      .collect();
    let count = 0;
    for (const analysis of analyses) {
      await ctx.db.patch(analysis._id, {
        userId,
        guestId: undefined,
        updatedAt: Date.now(),
      });
      count++;
      const photos = await ctx.db
        .query("photos")
        .withIndex("by_analysis", (q) => q.eq("analysisId", analysis._id))
        .collect();
      for (const photo of photos) {
        await ctx.db.patch(photo._id, {
          userId,
          guestId: undefined,
        });
      }
      const thread = await ctx.db
        .query("threads")
        .withIndex("by_analysis", (q) => q.eq("analysisId", analysis._id))
        .unique();
      if (thread) {
        await ctx.db.patch(thread._id, {
          userId,
          guestId: undefined,
        });
      }
    }
    return count;
  },
});

export const rename = mutation({
  args: { analysisId: v.string(), name: v.string(), guestId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const analysis = await ownedAnalysis(ctx, args.analysisId, args.guestId);
    if (!analysis) return false;
    const name = args.name.trim();
    if (!name || name.length > 80) throw new Error("Enter a name up to 80 characters.");
    await ctx.db.patch(analysis._id, { name, updatedAt: Date.now() });
    return true;
  },
});

export const remove = mutation({
  args: { analysisId: v.string(), guestId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const analysis = await ownedAnalysis(ctx, args.analysisId, args.guestId);
    if (!analysis) return false;
    await deleteAnalysisTree(ctx, analysis._id);
    return true;
  },
});

export const saveLandmarks = mutation({
  args: {
    analysisId: v.string(),
    view: v.union(v.literal("front"), v.literal("profile")),
    landmarks: v.array(
      v.object({
        key: v.string(),
        x: v.number(),
        y: v.number(),
        z: v.optional(v.number()),
        confidence: v.number(),
        source: landmarkSource,
      }),
    ),
    detected: v.optional(v.boolean()),
    guestId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const analysis = await ownedAnalysis(ctx, args.analysisId, args.guestId);
    if (!analysis) return false;
    const incoming = args.landmarks.map((landmark) => ({ ...landmark, view: args.view }));
    const landmarks = [...analysis.landmarks.filter((landmark) => landmark.view !== args.view), ...incoming];
    const views = new Set(landmarks.map((landmark) => landmark.view));
    const detectedLandmarks = args.detected
      ? { ...(analysis.detectedLandmarks as Record<string, unknown>), [args.view]: incoming }
      : analysis.detectedLandmarks;
    await ctx.db.patch(analysis._id, {
      landmarks,
      detectedLandmarks,
      status: views.has("front") && views.has("profile") ? "awaiting_verification" : "landmarks_detected",
      updatedAt: Date.now(),
    });
    return true;
  },
});

export const saveResults = mutation({
  args: {
    analysisId: v.string(),
    status: analysisStatus,
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
    errorMessage: v.union(v.string(), v.null()),
    metrics: v.array(storedMetric),
    guestId: v.optional(v.string()),
    scoringVersion: v.optional(v.union(v.string(), v.null())),
    metricDefinitionVersion: v.optional(v.union(v.string(), v.null())),
    referenceDataVersion: v.optional(v.union(v.string(), v.null())),
    landmarkModelVersion: v.optional(v.union(v.string(), v.null())),
    presentationProfile: v.optional(
      v.union(v.literal("neutral"), v.literal("masculine"), v.literal("feminine"), v.null()),
    ),
    adultAcknowledged: v.optional(v.union(v.boolean(), v.null())),
    distanceProtocol: v.optional(
      v.union(v.literal("followed"), v.literal("not-followed"), v.literal("unknown"), v.null()),
    ),
  },
  handler: async (ctx, args) => {
    const analysis = await ownedAnalysis(ctx, args.analysisId, args.guestId);
    if (!analysis) return false;
    const { analysisId: _analysisId, guestId: _guestId, ...patch } = args;
    await ctx.db.patch(analysis._id, { ...patch, updatedAt: Date.now() });
    return true;
  },
});

export const addExchange = mutation({
  args: {
    analysisId: v.string(),
    userContent: v.string(),
    assistantContent: v.string(),
    structured: v.any(),
  },
  handler: async (ctx, args) => {
    const analysis = await ownedAnalysis(ctx, args.analysisId);
    if (!analysis) return null;
    let thread = await ctx.db
      .query("threads")
      .withIndex("by_analysis", (q) => q.eq("analysisId", analysis._id))
      .unique();
    if (!thread) {
      const threadId = await ctx.db.insert("threads", { analysisId: analysis._id, userId: analysis.userId });
      thread = await ctx.db.get(threadId);
    }
    if (!thread) return null;
    const userId = await ctx.db.insert("messages", {
      threadId: thread._id,
      role: "user",
      content: args.userContent,
    });
    const assistantId = await ctx.db.insert("messages", {
      threadId: thread._id,
      role: "assistant",
      content: args.assistantContent,
      structuredData: args.structured,
    });
    const user = await ctx.db.get(userId);
    const assistant = await ctx.db.get(assistantId);
    if (!user || !assistant) return null;
    return [user, assistant].map((message) => ({
      id: message._id,
      role: message.role,
      content: message.content,
      createdAt: new Date(message._creationTime).toISOString(),
      ...(message.structuredData !== undefined ? { structuredData: message.structuredData } : {}),
    }));
  },
});
