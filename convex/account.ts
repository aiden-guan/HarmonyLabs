import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { ensureProfileRecord } from "./auth";
import { deleteAnalysisTree, iso } from "./lib";
import { mutation, query } from "./_generated/server";

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    return {
      id: userId,
      email: profile?.email || user.email || "",
      displayName: profile?.displayName ?? null,
    };
  },
});

export const profile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) return null;
    return {
      id: userId,
      email: profile.email,
      displayName: profile.displayName,
      createdAt: iso(profile._creationTime),
    };
  },
});

export const ensureProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in required.");
    const user = await ctx.db.get(userId);
    await ensureProfileRecord(ctx, userId, user?.email ?? "");
  },
});

export const updateProfile = mutation({
  args: { displayName: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in required.");
    const name = args.displayName.trim();
    if (!name || name.length > 80) throw new Error("Enter a display name up to 80 characters.");
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) throw new Error("Profile not found.");
    await ctx.db.patch(profile._id, { displayName: name });
  },
});

export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in required.");
    const user = await ctx.db.get(userId);
    const analyses = await ctx.db
      .query("analyses")
      .withIndex("by_user_updated", (q) => q.eq("userId", userId))
      .collect();
    for (const analysis of analyses) {
      await deleteAnalysisTree(ctx, analysis._id);
    }
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (profile) await ctx.db.delete(profile._id);

    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
      .collect();
    for (const account of accounts) {
      const codes = await ctx.db
        .query("authVerificationCodes")
        .withIndex("accountId", (q) => q.eq("accountId", account._id))
        .collect();
      for (const code of codes) await ctx.db.delete(code._id);
      await ctx.db.delete(account._id);
    }
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();
    for (const session of sessions) {
      const tokens = await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
        .collect();
      for (const token of tokens) await ctx.db.delete(token._id);
      await ctx.db.delete(session._id);
    }
    if (user?.email) {
      const limits = await ctx.db
        .query("authRateLimits")
        .withIndex("identifier", (q) => q.eq("identifier", user.email as string))
        .collect();
      for (const limit of limits) await ctx.db.delete(limit._id);
    }
    await ctx.db.delete(userId);
  },
});
