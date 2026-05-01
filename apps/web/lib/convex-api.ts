import type { FunctionReference } from "convex/server";
import { api } from "@repo/backend/convex/_generated/api";
import type { Id } from "@repo/backend/convex/_generated/dataModel";

export type Role = "admin" | "editor" | "user";
export type DocumentStatus =
  | "uploaded"
  | "indexing"
  | "indexed"
  | "failed"
  | "archived";

export type Citation = {
  fileId?: string;
  fileName: string;
  index?: number;
  quote?: string;
};

export type TokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type Viewer = {
  id: Id<"users"> | null;
  tokenIdentifier: string;
  name: string | null;
  email: string | null;
  imageUrl: string | null;
  role: Role;
};

export type Conversation = {
  _id: Id<"conversations">;
  _creationTime: number;
  userId: Id<"users">;
  title: string;
  status: "active" | "archived";
  createdAt: number;
  updatedAt: number;
  lastMessageAt: number;
};

export type Message = {
  _id: Id<"messages">;
  _creationTime: number;
  conversationId: Id<"conversations">;
  userId: Id<"users">;
  role: "user" | "assistant" | "system";
  content: string;
  status: "pending" | "done" | "error";
  citations: Citation[];
  model?: string;
  ragUsed: boolean;
  tokenUsage?: TokenUsage;
  error?: string;
  createdAt: number;
};

export type RagDocument = {
  _id: Id<"documents">;
  _creationTime: number;
  title: string;
  fileName: string;
  contentType?: string;
  size: number;
  storageId: Id<"_storage">;
  uploadedBy: Id<"users">;
  uploaderName: string | null;
  uploaderEmail: string | null;
  status: DocumentStatus;
  visibility: "workspace" | "private";
  openaiFileId?: string;
  vectorStoreId?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
  indexedAt?: number;
  archivedAt?: number;
};

export type TeamUser = {
  _id: Id<"users">;
  _creationTime: number;
  tokenIdentifier: string;
  subject?: string;
  name?: string;
  email?: string;
  imageUrl?: string;
  role: Role;
  createdAt: number;
  updatedAt: number;
  lastSeenAt: number;
};

export const convexApi = api as unknown as {
  agent: {
    sendMessage: FunctionReference<
      "action",
      "public",
      { conversationId: Id<"conversations"> | null; prompt: string },
      {
        conversationId: Id<"conversations">;
        assistantMessageId: Id<"messages">;
        content: string;
        status: "done" | "error";
        citations: Citation[];
        model: string;
        tokenUsage?: TokenUsage;
      }
    >;
  };
  conversations: {
    list: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      Conversation[]
    >;
    create: FunctionReference<
      "mutation",
      "public",
      { title?: string },
      Id<"conversations">
    >;
    listMessages: FunctionReference<
      "query",
      "public",
      { conversationId: Id<"conversations"> },
      Message[]
    >;
    archive: FunctionReference<
      "mutation",
      "public",
      { conversationId: Id<"conversations"> },
      null
    >;
  };
  documents: {
    list: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      RagDocument[]
    >;
    documentStats: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      { indexed: number; indexing: number; failed: number; uploaded: number }
    >;
    generateUploadUrl: FunctionReference<
      "mutation",
      "public",
      Record<string, never>,
      string
    >;
    create: FunctionReference<
      "mutation",
      "public",
      {
        storageId: Id<"_storage">;
        fileName: string;
        contentType?: string;
        size: number;
        title?: string;
        visibility?: "workspace" | "private";
      },
      Id<"documents">
    >;
    retryIndex: FunctionReference<
      "mutation",
      "public",
      { documentId: Id<"documents"> },
      null
    >;
    archive: FunctionReference<
      "mutation",
      "public",
      { documentId: Id<"documents"> },
      null
    >;
  };
  users: {
    viewer: FunctionReference<"query", "public", Record<string, never>, Viewer>;
    syncViewer: FunctionReference<
      "mutation",
      "public",
      Record<string, never>,
      Viewer
    >;
    list: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      TeamUser[]
    >;
    setRole: FunctionReference<
      "mutation",
      "public",
      { userId: Id<"users">; role: Role },
      null
    >;
  };
};
