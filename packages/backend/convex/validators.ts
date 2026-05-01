import { v } from "convex/values";

export const roleValidator = v.union(
  v.literal("admin"),
  v.literal("editor"),
  v.literal("user"),
);

export const documentStatusValidator = v.union(
  v.literal("uploaded"),
  v.literal("indexing"),
  v.literal("indexed"),
  v.literal("failed"),
  v.literal("archived"),
);

export const documentVisibilityValidator = v.union(
  v.literal("workspace"),
  v.literal("private"),
);

export const conversationStatusValidator = v.union(
  v.literal("active"),
  v.literal("archived"),
);

export const messageRoleValidator = v.union(
  v.literal("user"),
  v.literal("assistant"),
  v.literal("system"),
);

export const messageStatusValidator = v.union(
  v.literal("pending"),
  v.literal("done"),
  v.literal("error"),
);

export const citationValidator = v.object({
  fileId: v.optional(v.string()),
  fileName: v.string(),
  index: v.optional(v.number()),
  quote: v.optional(v.string()),
});

export const tokenUsageValidator = v.object({
  inputTokens: v.optional(v.number()),
  outputTokens: v.optional(v.number()),
  totalTokens: v.optional(v.number()),
});

export const authInfoValidator = v.object({
  tokenIdentifier: v.string(),
  subject: v.optional(v.string()),
  name: v.optional(v.string()),
  email: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
});
