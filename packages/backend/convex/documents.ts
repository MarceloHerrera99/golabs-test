import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { getOptionalUserId, getRequiredUserId } from "./lib/auth";

export const maxUploadBytes = 20 * 1024 * 1024;

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await getRequiredUserId(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getOptionalUserId(ctx);

    if (!userId) {
      return [];
    }

    return await ctx.db
      .query("documents")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const createProcessing = internalMutation({
  args: {
    userId: v.string(),
    name: v.string(),
    type: v.union(v.literal("csv"), v.literal("pdf")),
    mimeType: v.string(),
    size: v.number(),
    storageId: v.id("_storage"),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("documents", {
      userId: args.userId,
      name: args.name,
      type: args.type,
      mimeType: args.mimeType,
      size: args.size,
      storageId: args.storageId,
      status: "processing",
      createdAt: args.now,
      updatedAt: args.now,
    });
  },
});

export const replaceChunks = internalMutation({
  args: {
    documentId: v.id("documents"),
    userId: v.string(),
    chunks: v.array(
      v.object({
        documentName: v.string(),
        sourceType: v.union(v.literal("csv"), v.literal("pdf")),
        chunkIndex: v.number(),
        text: v.string(),
        embedding: v.array(v.float64()),
        rowStart: v.optional(v.number()),
        rowEnd: v.optional(v.number()),
      })
    ),
    summary: v.object({
      columnNames: v.optional(v.array(v.string())),
      rowCount: v.optional(v.number()),
      textPreview: v.optional(v.string()),
    }),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("documentChunks")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();

    for (const chunk of existing) {
      await ctx.db.delete(chunk._id);
    }

    for (const chunk of args.chunks) {
      const record = {
        userId: args.userId,
        documentId: args.documentId,
        documentName: chunk.documentName,
        sourceType: chunk.sourceType,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        embedding: chunk.embedding,
        createdAt: args.now,
        ...(typeof chunk.rowStart === "number" ? { rowStart: chunk.rowStart } : {}),
        ...(typeof chunk.rowEnd === "number" ? { rowEnd: chunk.rowEnd } : {}),
      };

      await ctx.db.insert("documentChunks", record);
    }

    const patch: {
      status: "ready";
      chunkCount: number;
      updatedAt: number;
      columnNames?: string[];
      rowCount?: number;
      textPreview?: string;
    } = {
      status: "ready",
      chunkCount: args.chunks.length,
      updatedAt: args.now,
    };

    if (args.summary.columnNames) {
      patch.columnNames = args.summary.columnNames;
    }

    if (typeof args.summary.rowCount === "number") {
      patch.rowCount = args.summary.rowCount;
    }

    if (args.summary.textPreview) {
      patch.textPreview = args.summary.textPreview;
    }

    await ctx.db.patch(args.documentId, patch);
  },
});

export const markFailed = internalMutation({
  args: {
    documentId: v.id("documents"),
    error: v.string(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.documentId, {
      status: "failed",
      error: args.error,
      updatedAt: args.now,
    });
  },
});

export const getChunksForUser = internalQuery({
  args: {
    userId: v.string(),
    chunkIds: v.array(v.id("documentChunks")),
  },
  handler: async (ctx, args) => {
    const chunks = await Promise.all(
      args.chunkIds.map(async (chunkId) => {
        const chunk = await ctx.db.get(chunkId);
        return chunk?.userId === args.userId ? chunk : null;
      })
    );

    return chunks.filter((chunk) => chunk !== null);
  },
});
