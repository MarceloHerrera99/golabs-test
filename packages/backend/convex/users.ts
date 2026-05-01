import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  authInfoFromIdentity,
  ensureRole,
  requireIdentity,
  requireUser,
  upsertUserFromAuth,
} from "./auth";
import { roleValidator } from "./validators";
import type { Id } from "./_generated/dataModel";

const viewerValidator = v.object({
  id: v.union(v.id("users"), v.null()),
  tokenIdentifier: v.string(),
  name: v.union(v.string(), v.null()),
  email: v.union(v.string(), v.null()),
  imageUrl: v.union(v.string(), v.null()),
  role: roleValidator,
});

const userListItemValidator = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  tokenIdentifier: v.string(),
  subject: v.optional(v.string()),
  name: v.optional(v.string()),
  email: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  role: roleValidator,
  createdAt: v.number(),
  updatedAt: v.number(),
  lastSeenAt: v.number(),
});

function toViewer(user: {
  _id?: Id<"users">;
  tokenIdentifier: string;
  name?: string;
  email?: string;
  imageUrl?: string;
  role: "admin" | "editor" | "user";
}) {
  return {
    id: user._id ?? null,
    tokenIdentifier: user.tokenIdentifier,
    name: user.name ?? null,
    email: user.email ?? null,
    imageUrl: user.imageUrl ?? null,
    role: user.role,
  };
}

export const viewer = query({
  args: {},
  returns: viewerValidator,
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const auth = authInfoFromIdentity(identity);
    const existing = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("tokenIdentifier"), identity.tokenIdentifier))
      .first();

    if (existing) {
      return toViewer(existing);
    }

    return toViewer({
      tokenIdentifier: auth.tokenIdentifier,
      name: auth.name,
      email: auth.email,
      imageUrl: auth.imageUrl,
      role: "user",
    });
  },
});

export const syncViewer = mutation({
  args: {},
  returns: viewerValidator,
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const user = await upsertUserFromAuth(ctx, authInfoFromIdentity(identity));

    return toViewer(user);
  },
});

export const list = query({
  args: {},
  returns: v.array(userListItemValidator),
  handler: async (ctx) => {
    const viewerUser = await requireUser(ctx);
    ensureRole(viewerUser, ["admin"]);

    return await ctx.db.query("users").take(100);
  },
});

export const setRole = mutation({
  args: {
    userId: v.id("users"),
    role: roleValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const viewerUser = await requireUser(ctx);
    ensureRole(viewerUser, ["admin"]);

    const target = await ctx.db.get(args.userId);
    if (!target) {
      throw new Error("Usuario no encontrado.");
    }

    if (target.role === "admin" && args.role !== "admin") {
      const admins = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("role"), "admin"))
        .take(2);

      if (admins.length <= 1) {
        throw new Error("Debe quedar al menos un administrador activo.");
      }
    }

    await ctx.db.patch(args.userId, {
      role: args.role,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("auditLogs", {
      actorId: viewerUser._id,
      action: "user.role_updated",
      targetType: "user",
      targetId: args.userId,
      metadata: JSON.stringify({ role: args.role }),
      createdAt: Date.now(),
    });

    return null;
  },
});
