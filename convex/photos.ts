import { v } from "convex/values";
import { emptyQuality, ownedAnalysis, requireUserId } from "./lib";
import { faceView } from "./schema";
import { mutation, query } from "./_generated/server";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    return ctx.storage.generateUploadUrl();
  },
});

export const save = mutation({
  args: {
    analysisId: v.string(),
    storageId: v.id("_storage"),
    view: faceView,
    contentType: v.string(),
    width: v.number(),
    height: v.number(),
    quality: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const analysis = await ownedAnalysis(ctx, args.analysisId);
    if (!analysis) return null;
    if (!["image/jpeg", "image/png", "image/webp"].includes(args.contentType)) {
      throw new Error("Use a JPEG, PNG, or WebP image.");
    }
    if (args.width < 32 || args.height < 32) throw new Error("The image dimensions could not be read.");
    const existing = (
      await ctx.db
        .query("photos")
        .withIndex("by_analysis", (q) => q.eq("analysisId", analysis._id))
        .collect()
    ).filter((photo) => photo.view === args.view);
    for (const photo of existing) {
      await ctx.storage.delete(photo.storageId);
      await ctx.db.delete(photo._id);
    }
    const quality = args.quality ?? emptyQuality;
    const id = await ctx.db.insert("photos", {
      analysisId: analysis._id,
      userId: analysis.userId,
      view: args.view,
      storageId: args.storageId,
      contentType: args.contentType,
      width: args.width,
      height: args.height,
      quality,
    });
    const photos = await ctx.db
      .query("photos")
      .withIndex("by_analysis", (q) => q.eq("analysisId", analysis._id))
      .collect();
    const views = new Set(photos.map((photo) => photo.view));
    const patch: { updatedAt: number; status?: "photos_uploaded"; profileMirrored?: boolean } = {
      updatedAt: Date.now(),
    };
    if (views.has("front") && views.has("profile") && analysis.status === "draft") {
      patch.status = "photos_uploaded";
    }
    if (args.view === "profile" && quality && typeof quality === "object" && "mirrored" in quality) {
      patch.profileMirrored = Boolean((quality as { mirrored?: boolean }).mirrored);
    }
    await ctx.db.patch(analysis._id, patch);
    return {
      id,
      view: args.view,
      contentType: args.contentType,
      width: args.width,
      height: args.height,
      quality,
    };
  },
});

export const updateQuality = mutation({
  args: {
    analysisId: v.string(),
    view: faceView,
    quality: v.any(),
  },
  handler: async (ctx, args) => {
    const analysis = await ownedAnalysis(ctx, args.analysisId);
    if (!analysis) return;
    const photos = await ctx.db
      .query("photos")
      .withIndex("by_analysis", (q) => q.eq("analysisId", analysis._id))
      .collect();
    const photo = photos.find((item) => item.view === args.view);
    if (photo) await ctx.db.patch(photo._id, { quality: args.quality });
    if (args.view === "profile" && args.quality && typeof args.quality === "object") {
      await ctx.db.patch(analysis._id, {
        profileMirrored: Boolean((args.quality as { mirrored?: boolean }).mirrored),
        updatedAt: Date.now(),
      });
    }
  },
});

export const url = query({
  args: { analysisId: v.string(), view: faceView },
  handler: async (ctx, args) => {
    const analysis = await ownedAnalysis(ctx, args.analysisId);
    if (!analysis) return null;
    const photos = await ctx.db
      .query("photos")
      .withIndex("by_analysis", (q) => q.eq("analysisId", analysis._id))
      .collect();
    const photo = photos.find((item) => item.view === args.view);
    if (!photo) return null;
    const url = await ctx.storage.getUrl(photo.storageId);
    if (!url) return null;
    return { url, contentType: photo.contentType };
  },
});
