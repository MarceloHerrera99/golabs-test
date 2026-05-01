import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { sourceValidator } from "./schema";
import { getOptionalUserId } from "./lib/auth";

export const listConversations = query({
  args: {
    mode: v.union(v.literal("chat"), v.literal("rag")),
  },
  handler: async (ctx, args) => {
    const userId = await getOptionalUserId(ctx);

    if (!userId) {
      return [];
    }

    return await ctx.db
      .query("conversations")
      .withIndex("by_user_mode", (q) =>
        q.eq("userId", userId).eq("mode", args.mode)
      )
      .order("desc")
      .take(20);
  },
});

export const listMessages = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const userId = await getOptionalUserId(ctx);

    if (!userId) {
      return [];
    }

    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation || conversation.userId !== userId) {
      throw new Error("No tienes acceso a esta conversacion.");
    }

    return await ctx.db
      .query("messages")
      .withIndex("by_conversation_time", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();
  },
});

export const getConversationMessages = internalQuery({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== args.userId) {
      return [];
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_time", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("desc")
      .take(16);

    return messages.reverse();
  },
});

export const createConversation = internalMutation({
  args: {
    userId: v.string(),
    mode: v.union(v.literal("chat"), v.literal("rag")),
    title: v.string(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("conversations", {
      userId: args.userId,
      mode: args.mode,
      title: args.title,
      createdAt: args.now,
      updatedAt: args.now,
    });
  },
});

export const addMessage = internalMutation({
  args: {
    userId: v.string(),
    conversationId: v.id("conversations"),
    mode: v.union(v.literal("chat"), v.literal("rag")),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    sources: v.optional(v.array(sourceValidator)),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    const title =
      conversation?.title === "Nueva conversacion"
        ? args.content.slice(0, 48) || "Nueva conversacion"
        : conversation?.title ?? "Nueva conversacion";

    const message = {
      userId: args.userId,
      conversationId: args.conversationId,
      mode: args.mode,
      role: args.role,
      content: args.content,
      createdAt: args.now,
      ...(args.sources ? { sources: args.sources } : {}),
    };

    const messageId = await ctx.db.insert("messages", message);

    await ctx.db.patch(args.conversationId, {
      updatedAt: args.now,
      title,
    });

    return messageId;
  },
});
