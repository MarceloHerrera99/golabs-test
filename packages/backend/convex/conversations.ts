import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import {
  authInfoFromIdentity,
  getUserByTokenIdentifier,
  requireIdentity,
  requireUser,
  upsertUserFromAuth,
} from "./auth";
import {
  authInfoValidator,
  citationValidator,
  conversationStatusValidator,
  messageRoleValidator,
  messageStatusValidator,
  tokenUsageValidator,
} from "./validators";

const conversationValidator = v.object({
  _id: v.id("conversations"),
  _creationTime: v.number(),
  userId: v.id("users"),
  title: v.string(),
  status: conversationStatusValidator,
  createdAt: v.number(),
  updatedAt: v.number(),
  lastMessageAt: v.number(),
});

const messageValidator = v.object({
  _id: v.id("messages"),
  _creationTime: v.number(),
  conversationId: v.id("conversations"),
  userId: v.id("users"),
  role: messageRoleValidator,
  content: v.string(),
  status: messageStatusValidator,
  citations: v.array(citationValidator),
  model: v.optional(v.string()),
  ragUsed: v.boolean(),
  tokenUsage: v.optional(tokenUsageValidator),
  error: v.optional(v.string()),
  createdAt: v.number(),
});

const historyMessageValidator = v.object({
  role: v.union(v.literal("user"), v.literal("assistant")),
  content: v.string(),
});

export const list = query({
  args: {},
  returns: v.array(conversationValidator),
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    return await ctx.db
      .query("conversations")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .order("desc")
      .take(30);
  },
});

export const create = mutation({
  args: {
    title: v.optional(v.string()),
  },
  returns: v.id("conversations"),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const user = await upsertUserFromAuth(ctx, authInfoFromIdentity(identity));
    const now = Date.now();

    return await ctx.db.insert("conversations", {
      userId: user._id,
      title: args.title?.trim() || "Nueva conversación",
      status: "active",
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
    });
  },
});

export const listMessages = query({
  args: {
    conversationId: v.id("conversations"),
  },
  returns: v.array(messageValidator),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation || conversation.userId !== user._id) {
      throw new Error("Conversación no encontrada.");
    }

    return await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("conversationId"), args.conversationId))
      .take(100);
  },
});

export const archive = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation || conversation.userId !== user._id) {
      throw new Error("Conversación no encontrada.");
    }

    await ctx.db.patch(args.conversationId, {
      status: "archived",
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const createTurn = internalMutation({
  args: {
    auth: authInfoValidator,
    conversationId: v.union(v.id("conversations"), v.null()),
    prompt: v.string(),
    now: v.number(),
  },
  returns: v.object({
    conversationId: v.id("conversations"),
    userMessageId: v.id("messages"),
    history: v.array(historyMessageValidator),
    vectorStoreIds: v.array(v.string()),
    indexedDocumentCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const user = await upsertUserFromAuth(ctx, args.auth);
    let conversationId = args.conversationId;

    if (conversationId) {
      const conversation = await ctx.db.get(conversationId);
      if (!conversation || conversation.userId !== user._id) {
        throw new Error("Conversación no encontrada.");
      }
    } else {
      conversationId = await ctx.db.insert("conversations", {
        userId: user._id,
        title: args.prompt.slice(0, 64) || "Nueva conversación",
        status: "active",
        createdAt: args.now,
        updatedAt: args.now,
        lastMessageAt: args.now,
      });
    }

    const recentMessages = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("conversationId"), conversationId))
      .order("desc")
      .take(8);

    const history = recentMessages
      .reverse()
      .filter((message) => message.role !== "system")
      .map((message) => ({
        role: (message.role === "assistant" ? "assistant" : "user") as
          | "assistant"
          | "user",
        content: String(message.content),
      }));

    const userMessageId = await ctx.db.insert("messages", {
      conversationId,
      userId: user._id,
      role: "user",
      content: args.prompt,
      status: "done",
      citations: [],
      ragUsed: false,
      createdAt: args.now,
    });

    const conversationPatch: {
      title?: string;
      updatedAt: number;
      lastMessageAt: number;
    } = {
      updatedAt: args.now,
      lastMessageAt: args.now,
    };

    if (recentMessages.length === 0) {
      conversationPatch.title = args.prompt.slice(0, 64) || "Nueva conversación";
    }

    await ctx.db.patch(conversationId, conversationPatch);

    const indexedDocuments = await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("status"), "indexed"))
      .take(100);

    const vectorStoreIds = [
      ...new Set(
        indexedDocuments
          .map((document) => document.vectorStoreId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    return {
      conversationId,
      userMessageId,
      history,
      vectorStoreIds,
      indexedDocumentCount: indexedDocuments.length,
    };
  },
});

export const completeAssistantTurn = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    conversationId: v.id("conversations"),
    content: v.string(),
    status: messageStatusValidator,
    citations: v.array(citationValidator),
    model: v.optional(v.string()),
    ragUsed: v.boolean(),
    tokenUsage: v.optional(tokenUsageValidator),
    error: v.optional(v.string()),
    now: v.number(),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    const user = await getUserByTokenIdentifier(ctx, args.tokenIdentifier);
    if (!user) {
      throw new Error("Usuario no encontrado.");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== user._id) {
      throw new Error("Conversación no encontrada.");
    }

    const assistantMessageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId: user._id,
      role: "assistant",
      content: args.content,
      status: args.status,
      citations: args.citations,
      model: args.model,
      ragUsed: args.ragUsed,
      tokenUsage: args.tokenUsage,
      error: args.error,
      createdAt: args.now,
    });

    await ctx.db.patch(args.conversationId, {
      updatedAt: args.now,
      lastMessageAt: args.now,
    });

    return assistantMessageId;
  },
});
