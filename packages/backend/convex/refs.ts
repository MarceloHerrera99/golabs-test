import type { FunctionReference } from "convex/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

type Citation = {
  fileId?: string;
  fileName: string;
  index?: number;
  quote?: string;
};

type TokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

type AuthInfo = {
  tokenIdentifier: string;
  subject?: string;
  name?: string;
  email?: string;
  imageUrl?: string;
};

export const internalApi = internal as unknown as {
  conversations: {
    createTurn: FunctionReference<
      "mutation",
      "internal",
      {
        auth: AuthInfo;
        conversationId: Id<"conversations"> | null;
        prompt: string;
        now: number;
      },
      {
        conversationId: Id<"conversations">;
        userMessageId: Id<"messages">;
        history: Array<{
          role: "user" | "assistant";
          content: string;
        }>;
        vectorStoreIds: string[];
        indexedDocumentCount: number;
      }
    >;
    completeAssistantTurn: FunctionReference<
      "mutation",
      "internal",
      {
        tokenIdentifier: string;
        conversationId: Id<"conversations">;
        content: string;
        status: "done" | "error" | "pending";
        citations: Citation[];
        model?: string;
        ragUsed: boolean;
        tokenUsage?: TokenUsage;
        error?: string;
        now: number;
      },
      Id<"messages">
    >;
  };
  documents: {
    getForIndexing: FunctionReference<
      "query",
      "internal",
      {
        documentId: Id<"documents">;
      },
      {
        _id: Id<"documents">;
        title: string;
        fileName: string;
        contentType?: string;
        storageId: Id<"_storage">;
      } | null
    >;
    markIndexing: FunctionReference<
      "mutation",
      "internal",
      { documentId: Id<"documents"> },
      null
    >;
    markIndexed: FunctionReference<
      "mutation",
      "internal",
      {
        documentId: Id<"documents">;
        openaiFileId: string;
        vectorStoreId: string;
      },
      null
    >;
    markFailed: FunctionReference<
      "mutation",
      "internal",
      { documentId: Id<"documents">; error: string },
      null
    >;
    getSetting: FunctionReference<
      "query",
      "internal",
      { key: string },
      string | null
    >;
    setSetting: FunctionReference<
      "mutation",
      "internal",
      { key: string; value: string },
      null
    >;
  };
  documentIndexing: {
    indexDocument: FunctionReference<
      "action",
      "internal",
      { documentId: Id<"documents"> },
      null
    >;
  };
};
