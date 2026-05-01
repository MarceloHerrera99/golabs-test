import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  citationValidator,
  conversationStatusValidator,
  documentStatusValidator,
  documentVisibilityValidator,
  messageRoleValidator,
  messageStatusValidator,
  roleValidator,
  tokenUsageValidator,
} from "./validators";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    subject: v.optional(v.string()),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    role: roleValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
    lastSeenAt: v.number(),
  })
    .index("by_tokenIdentifier", ["tokenIdentifier"])
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  documents: defineTable({
    title: v.optional(v.string()),
    fileName: v.optional(v.string()),
    contentType: v.optional(v.string()),
    size: v.number(),
    storageId: v.id("_storage"),
    uploadedBy: v.optional(v.id("users")),
    status: v.union(
      documentStatusValidator,
      v.literal("processing"),
      v.literal("ready"),
    ),
    visibility: v.optional(documentVisibilityValidator),
    openaiFileId: v.optional(v.string()),
    vectorStoreId: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    indexedAt: v.optional(v.number()),
    archivedAt: v.optional(v.number()),
    userId: v.optional(v.string()),
    name: v.optional(v.string()),
    type: v.optional(v.union(v.literal("csv"), v.literal("pdf"))),
    mimeType: v.optional(v.string()),
    columnNames: v.optional(v.array(v.string())),
    rowCount: v.optional(v.number()),
    chunkCount: v.optional(v.number()),
    textPreview: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_uploadedBy", ["uploadedBy"])
    .index("by_vectorStoreId", ["vectorStoreId"])
    .index("by_openaiFileId", ["openaiFileId"]),

  conversations: defineTable({
    userId: v.union(v.id("users"), v.string()),
    title: v.string(),
    status: v.optional(conversationStatusValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastMessageAt: v.optional(v.number()),
    mode: v.optional(v.union(v.literal("chat"), v.literal("rag"))),
  })
    .index("by_userId_and_updatedAt", ["userId", "updatedAt"])
    .index("by_userId_and_status", ["userId", "status"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    userId: v.union(v.id("users"), v.string()),
    role: messageRoleValidator,
    content: v.string(),
    status: v.optional(messageStatusValidator),
    citations: v.optional(v.array(citationValidator)),
    sources: v.optional(
      v.array(
        v.union(
          citationValidator,
          v.object({
            documentId: v.optional(v.id("documents")),
            documentName: v.string(),
            sourceType: v.union(
              v.literal("csv"),
              v.literal("pdf"),
              v.literal("web"),
            ),
            url: v.optional(v.string()),
          }),
        ),
      ),
    ),
    mode: v.optional(v.union(v.literal("chat"), v.literal("rag"))),
    model: v.optional(v.string()),
    ragUsed: v.optional(v.boolean()),
    tokenUsage: v.optional(tokenUsageValidator),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_conversationId_and_createdAt", ["conversationId", "createdAt"])
    .index("by_userId_and_createdAt", ["userId", "createdAt"]),

  appSettings: defineTable({
    key: v.string(),
    value: v.string(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  auditLogs: defineTable({
    actorId: v.id("users"),
    action: v.string(),
    targetType: v.string(),
    targetId: v.optional(v.string()),
    metadata: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_actorId_and_createdAt", ["actorId", "createdAt"])
    .index("by_targetType_and_createdAt", ["targetType", "createdAt"]),

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
