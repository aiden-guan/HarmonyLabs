import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

function emailFrom(params: Record<string, unknown>) {
  const email = String(params.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ConvexError("Enter a valid email address.");
  }
  return email;
}

const password = Password({
  profile(params) {
    return { email: emailFrom(params) };
  },
  validatePasswordRequirements(password) {
    if (password.length < 8) {
      throw new ConvexError("Use at least 8 characters.");
    }
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [password],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, args) {
      await ensureProfileRecord(ctx as MutationCtx, args.userId, args.profile.email ?? "");
    },
  },
});

export async function ensureProfileRecord(ctx: MutationCtx, userId: Id<"users">, email: string) {
  const existing = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (existing) {
    if (email && existing.email !== email) {
      await ctx.db.patch(existing._id, { email });
    }
    return;
  }
  const local = email.split("@")[0];
  await ctx.db.insert("profiles", {
    userId,
    email,
    displayName: local || "Member",
  });
}
