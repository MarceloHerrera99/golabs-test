import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const sourceValidator = v.object({
  documentId: v.optional(v.id("documents")),
  documentName: v.string(),
  sourceType: v.union(v.literal("csv"), v.literal("pdf"), v.literal("web")),
  url: v.optional(v.string()),
});

export default defineSchema({
  conversations: defineTable({
    userId: v.string(),
    mode: v.union(v.literal("chat"), v.literal("rag")),
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_mode", ["userId", "mode"])
    .index("by_user_updated", ["userId", "updatedAt"]),

  messages: defineTable({
    userId: v.string(),
    conversationId: v.id("conversations"),
    mode: v.union(v.literal("chat"), v.literal("rag")),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    sources: v.optional(v.array(sourceValidator)),
    createdAt: v.number(),
  })
    .index("by_conversation_time", ["conversationId", "createdAt"])
    .index("by_user_time", ["userId", "createdAt"]),

  documents: defineTable({
    userId: v.string(),
    name: v.string(),
    type: v.union(v.literal("csv"), v.literal("pdf")),
    mimeType: v.string(),
    size: v.number(),
    storageId: v.id("_storage"),
    status: v.union(
      v.literal("processing"),
      v.literal("ready"),
      v.literal("failed")
    ),
    error: v.optional(v.string()),
    columnNames: v.optional(v.array(v.string())),
    rowCount: v.optional(v.number()),
    chunkCount: v.optional(v.number()),
    textPreview: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_user_status", ["userId", "status"]),

  documentChunks: defineTable({
    userId: v.string(),
    documentId: v.id("documents"),
    documentName: v.string(),
    sourceType: v.union(v.literal("csv"), v.literal("pdf")),
    chunkIndex: v.number(),
    text: v.string(),
    embedding: v.array(v.float64()),
    rowStart: v.optional(v.number()),
    rowEnd: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_document", ["documentId", "chunkIndex"])
    .index("by_user_document", ["userId", "documentId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["userId"],
    }),
});
