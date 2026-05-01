import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { ensureRole, requireUser } from "./auth";
import { internalApi } from "./refs";
import {
  documentStatusValidator,
  documentVisibilityValidator,
} from "./validators";

type CurrentDocumentStatus =
  | "uploaded"
  | "indexing"
  | "indexed"
  | "failed"
  | "archived";

const currentDocumentStatuses = new Set<string>([
  "uploaded",
  "indexing",
  "indexed",
  "failed",
  "archived",
]);

const documentWithUploaderValidator = v.object({
  _id: v.id("documents"),
  _creationTime: v.number(),
  title: v.string(),
  fileName: v.string(),
  contentType: v.optional(v.string()),
  size: v.number(),
  storageId: v.id("_storage"),
  uploadedBy: v.id("users"),
  uploaderName: v.union(v.string(), v.null()),
  uploaderEmail: v.union(v.string(), v.null()),
  status: documentStatusValidator,
  visibility: documentVisibilityValidator,
  openaiFileId: v.optional(v.string()),
  vectorStoreId: v.optional(v.string()),
  error: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
  indexedAt: v.optional(v.number()),
  archivedAt: v.optional(v.number()),
});

const documentForIndexingValidator = v.object({
  _id: v.id("documents"),
  title: v.string(),
  fileName: v.string(),
  contentType: v.optional(v.string()),
  storageId: v.id("_storage"),
});

export const list = query({
  args: {},
  returns: v.array(documentWithUploaderValidator),
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const canManage = user.role === "admin" || user.role === "editor";
    const documents = canManage
      ? await ctx.db.query("documents").take(100)
      : await ctx.db
          .query("documents")
          .filter((q) => q.eq(q.field("status"), "indexed"))
          .take(100);

    const visibleDocuments = documents
      .filter(
        (document) =>
          document.status !== "archived" &&
          currentDocumentStatuses.has(document.status) &&
          document.uploadedBy &&
          document.title &&
          document.fileName &&
          document.visibility,
      )
      .sort((a, b) => b.createdAt - a.createdAt);

    return await Promise.all(
      visibleDocuments.map(async (document) => {
        const uploader = document.uploadedBy
          ? await ctx.db.get(document.uploadedBy)
          : null;

        return {
          _id: document._id,
          _creationTime: document._creationTime,
          title: document.title ?? document.fileName ?? "Documento",
          fileName: document.fileName ?? document.title ?? "documento",
          contentType: document.contentType,
          size: document.size,
          storageId: document.storageId,
          uploadedBy: document.uploadedBy!,
          status: document.status as CurrentDocumentStatus,
          visibility: document.visibility ?? "workspace",
          openaiFileId: document.openaiFileId,
          vectorStoreId: document.vectorStoreId,
          error: document.error,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
          indexedAt: document.indexedAt,
          archivedAt: document.archivedAt,
          uploaderName: uploader?.name ?? null,
          uploaderEmail: uploader?.email ?? null,
        };
      }),
    );
  },
});

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    ensureRole(user, ["admin", "editor"]);

    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    contentType: v.optional(v.string()),
    size: v.number(),
    title: v.optional(v.string()),
    visibility: v.optional(documentVisibilityValidator),
  },
  returns: v.id("documents"),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    ensureRole(user, ["admin", "editor"]);

    const now = Date.now();
    const documentId = await ctx.db.insert("documents", {
      title: args.title?.trim() || args.fileName,
      fileName: args.fileName,
      contentType: args.contentType,
      size: args.size,
      storageId: args.storageId,
      uploadedBy: user._id,
      status: "uploaded",
      visibility: args.visibility ?? "workspace",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      actorId: user._id,
      action: "document.uploaded",
      targetType: "document",
      targetId: documentId,
      metadata: JSON.stringify({ fileName: args.fileName }),
      createdAt: now,
    });

    await ctx.scheduler.runAfter(
      0,
      internalApi.documentIndexing.indexDocument,
      {
        documentId,
      },
    );

    return documentId;
  },
});

export const retryIndex = mutation({
  args: {
    documentId: v.id("documents"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    ensureRole(user, ["admin", "editor"]);

    const document = await ctx.db.get(args.documentId);
    if (!document || document.status === "archived") {
      throw new Error("Documento no encontrado.");
    }

    await ctx.db.patch(args.documentId, {
      status: "uploaded",
      error: undefined,
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(
      0,
      internalApi.documentIndexing.indexDocument,
      {
        documentId: args.documentId,
      },
    );

    return null;
  },
});

export const archive = mutation({
  args: {
    documentId: v.id("documents"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    ensureRole(user, ["admin", "editor"]);

    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Documento no encontrado.");
    }

    const now = Date.now();
    await ctx.db.patch(args.documentId, {
      status: "archived",
      archivedAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      actorId: user._id,
      action: "document.archived",
      targetType: "document",
      targetId: args.documentId,
      metadata: JSON.stringify({ fileName: document.fileName }),
      createdAt: now,
    });

    return null;
  },
});

export const getForIndexing = internalQuery({
  args: {
    documentId: v.id("documents"),
  },
  returns: v.union(documentForIndexingValidator, v.null()),
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document || document.status === "archived") {
      return null;
    }

    if (!document.title || !document.fileName) {
      return null;
    }

    return {
      _id: document._id,
      title: document.title,
      fileName: document.fileName,
      contentType: document.contentType,
      storageId: document.storageId,
    };
  },
});

export const markIndexing = internalMutation({
  args: {
    documentId: v.id("documents"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.documentId, {
      status: "indexing",
      error: undefined,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const markIndexed = internalMutation({
  args: {
    documentId: v.id("documents"),
    openaiFileId: v.string(),
    vectorStoreId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.documentId, {
      status: "indexed",
      openaiFileId: args.openaiFileId,
      vectorStoreId: args.vectorStoreId,
      error: undefined,
      indexedAt: now,
      updatedAt: now,
    });

    return null;
  },
});

export const markFailed = internalMutation({
  args: {
    documentId: v.id("documents"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.documentId, {
      status: "failed",
      error: args.error,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const getSetting = internalQuery({
  args: {
    key: v.string(),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("appSettings")
      .filter((q) => q.eq(q.field("key"), args.key))
      .first();

    return setting?.value ?? null;
  },
});

export const setSetting = internalMutation({
  args: {
    key: v.string(),
    value: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("appSettings")
      .filter((q) => q.eq(q.field("key"), args.key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        updatedAt: Date.now(),
      });
      return null;
    }

    await ctx.db.insert("appSettings", {
      key: args.key,
      value: args.value,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const activeVectorStoreIds = internalQuery({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const indexedDocuments = await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("status"), "indexed"))
      .take(100);

    return [
      ...new Set(
        indexedDocuments
          .map((document) => document.vectorStoreId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
  },
});

export const documentStats = query({
  args: {},
  returns: v.object({
    indexed: v.number(),
    indexing: v.number(),
    failed: v.number(),
    uploaded: v.number(),
  }),
  handler: async (ctx) => {
    await requireUser(ctx);
    const documents = await ctx.db.query("documents").take(200);

    return documents.reduce(
      (counts, document) => {
        if (document.status in counts) {
          counts[document.status as keyof typeof counts] += 1;
        }
        return counts;
      },
      { indexed: 0, indexing: 0, failed: 0, uploaded: 0 },
    );
  },
});
