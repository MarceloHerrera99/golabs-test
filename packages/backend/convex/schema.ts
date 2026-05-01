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
    title: v.string(),
    fileName: v.string(),
    contentType: v.optional(v.string()),
    size: v.number(),
    storageId: v.id("_storage"),
    uploadedBy: v.id("users"),
    status: documentStatusValidator,
    visibility: documentVisibilityValidator,
    openaiFileId: v.optional(v.string()),
    vectorStoreId: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    indexedAt: v.optional(v.number()),
    archivedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_uploadedBy", ["uploadedBy"])
    .index("by_vectorStoreId", ["vectorStoreId"])
    .index("by_openaiFileId", ["openaiFileId"]),

  conversations: defineTable({
    userId: v.id("users"),
    title: v.string(),
    status: conversationStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
    lastMessageAt: v.number(),
  })
    .index("by_userId_and_updatedAt", ["userId", "updatedAt"])
    .index("by_userId_and_status", ["userId", "status"]),

  messages: defineTable({
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
});
