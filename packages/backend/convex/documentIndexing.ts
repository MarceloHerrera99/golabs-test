import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { getEnv } from "./env";
import { internalApi } from "./refs";

const OPENAI_VECTOR_STORE_SETTING = "openai.vector_store_id";

type OpenAIFile = {
  id: string;
};

type OpenAIVectorStore = {
  id: string;
};

type OpenAIVectorStoreFile = {
  id: string;
  status?: string;
  last_error?: {
    message?: string;
  };
};

function getOpenAIKey() {
  const apiKey = getEnv("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no está configurado en Convex.");
  }

  return apiKey;
}

async function openAIRequest<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`https://api.openai.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getOpenAIKey()}`,
      ...(init.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI ${response.status}: ${body}`);
  }

  return (await response.json()) as T;
}

async function getOrCreateVectorStore(ctx: ActionCtx) {
  if (getEnv("OPENAI_VECTOR_STORE_ID")) {
    return getEnv("OPENAI_VECTOR_STORE_ID")!;
  }

  const existing = await ctx.runQuery(internalApi.documents.getSetting, {
    key: OPENAI_VECTOR_STORE_SETTING,
  });

  if (existing) {
    return existing;
  }

  const vectorStore = await openAIRequest<OpenAIVectorStore>("/vector_stores", {
    method: "POST",
    body: JSON.stringify({
      name: "Pellas RAG Knowledge Base",
    }),
  });

  await ctx.runMutation(internalApi.documents.setSetting, {
    key: OPENAI_VECTOR_STORE_SETTING,
    value: vectorStore.id,
  });

  return vectorStore.id;
}

async function uploadFileToOpenAI(file: Blob, fileName: string) {
  const form = new FormData();
  form.append("purpose", "assistants");
  form.append("file", file, fileName);

  return await openAIRequest<OpenAIFile>("/files", {
    method: "POST",
    body: form,
  });
}

async function attachFileToVectorStore(vectorStoreId: string, fileId: string) {
  const vectorStoreFile = await openAIRequest<OpenAIVectorStoreFile>(
    `/vector_stores/${vectorStoreId}/files`,
    {
      method: "POST",
      body: JSON.stringify({
        file_id: fileId,
      }),
    },
  );

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const current = await openAIRequest<OpenAIVectorStoreFile>(
      `/vector_stores/${vectorStoreId}/files/${vectorStoreFile.id}`,
      { method: "GET" },
    );

    if (current.status === "completed") {
      return;
    }

    if (current.status === "failed" || current.status === "cancelled") {
      throw new Error(
        current.last_error?.message ??
          `No se pudo indexar el archivo (${current.status}).`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  throw new Error("La indexación de OpenAI tardó más de lo esperado.");
}

export const indexDocument = internalAction({
  args: {
    documentId: v.id("documents"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(internalApi.documents.markIndexing, {
      documentId: args.documentId,
    });

    try {
      const document = await ctx.runQuery(
        internalApi.documents.getForIndexing,
        {
          documentId: args.documentId,
        },
      );

      if (!document) {
        return null;
      }

      const blob = await ctx.storage.get(document.storageId);
      if (!blob) {
        throw new Error("No se encontró el archivo en Convex Storage.");
      }

      const vectorStoreId = await getOrCreateVectorStore(ctx);
      const openAIFile = await uploadFileToOpenAI(blob, document.fileName);
      await attachFileToVectorStore(vectorStoreId, openAIFile.id);

      await ctx.runMutation(internalApi.documents.markIndexed, {
        documentId: args.documentId,
        openaiFileId: openAIFile.id,
        vectorStoreId,
      });
    } catch (error) {
      await ctx.runMutation(internalApi.documents.markFailed, {
        documentId: args.documentId,
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido indexando el documento.",
      });
    }

    return null;
  },
});
