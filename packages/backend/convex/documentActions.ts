"use node";

/// <reference path="./pdf-parse-lib.d.ts" />

import { Buffer } from "node:buffer";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { v } from "convex/values";
import type { FunctionReference } from "convex/server";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { maxUploadBytes } from "./documents";
import { getRequiredUserId } from "./lib/auth";
import { createEmbeddings } from "./lib/openai";
import { chunkText, parseCsv } from "./lib/text";

type ProcessDocumentResult = {
  documentId: Id<"documents">;
  chunkCount: number;
};

type StoredChunk = {
  documentName: string;
  sourceType: "csv" | "pdf";
  chunkIndex: number;
  text: string;
  embedding: number[];
  rowStart?: number;
  rowEnd?: number;
};

type InternalMutationRef<Args extends Record<string, unknown>, Result> = FunctionReference<
  "mutation",
  "internal",
  Args,
  Result
>;

const internalApi = internal as unknown as {
  documents: {
    createProcessing: InternalMutationRef<
      {
        userId: string;
        name: string;
        type: "csv" | "pdf";
        mimeType: string;
        size: number;
        storageId: Id<"_storage">;
        now: number;
      },
      Id<"documents">
    >;
    replaceChunks: InternalMutationRef<
      {
        documentId: Id<"documents">;
        userId: string;
        chunks: StoredChunk[];
        summary: {
          columnNames?: string[];
          rowCount?: number;
          textPreview?: string;
        };
        now: number;
      },
      unknown
    >;
    markFailed: InternalMutationRef<
      { documentId: Id<"documents">; error: string; now: number },
      unknown
    >;
  };
};

export const processDocument = action({
  args: {
    storageId: v.id("_storage"),
    name: v.string(),
    mimeType: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args): Promise<ProcessDocumentResult> => {
    const userId = await getRequiredUserId(ctx);
    const now = Date.now();
    const type = detectFileType(args.name, args.mimeType);

    if (!type) {
      await ctx.storage.delete(args.storageId);
      throw new Error("Solo se aceptan archivos CSV y PDF.");
    }

    if (args.size > maxUploadBytes) {
      await ctx.storage.delete(args.storageId);
      throw new Error("El archivo supera el limite de 20 MB.");
    }

    const documentId = (await ctx.runMutation(internalApi.documents.createProcessing, {
      userId,
      name: args.name,
      type,
      mimeType: args.mimeType || fallbackMimeType(type),
      size: args.size,
      storageId: args.storageId,
      now,
    })) as Id<"documents">;

    try {
      const blob = await ctx.storage.get(args.storageId);
      if (!blob) {
        throw new Error("No se encontro el archivo cargado.");
      }

      const parsed = await extractDocumentText(blob, type);
      const textChunks = chunkText(parsed.text);

      if (textChunks.length === 0) {
        throw new Error(
          type === "pdf"
            ? "El PDF no tiene texto seleccionable para procesar."
            : "El CSV no contiene texto procesable."
        );
      }

      const embeddings = await createEmbeddings(textChunks);
      if (embeddings.length !== textChunks.length) {
        throw new Error("No se pudieron generar todos los embeddings del archivo.");
      }

      const chunks = textChunks.map((text, index) => {
        const embedding = embeddings[index];
        if (!embedding) {
          throw new Error("No se pudo generar el embedding de un fragmento.");
        }

        return {
          documentName: args.name,
          sourceType: type,
          chunkIndex: index,
          text,
          embedding,
        };
      });

      await ctx.runMutation(internalApi.documents.replaceChunks, {
        documentId,
        userId,
        chunks,
        summary: {
          columnNames: parsed.columnNames,
          rowCount: parsed.rowCount,
          textPreview: parsed.text.slice(0, 500),
        },
        now: Date.now(),
      });

      return { documentId, chunkCount: chunks.length };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo procesar el archivo.";
      await ctx.runMutation(internalApi.documents.markFailed, {
        documentId,
        error: message,
        now: Date.now(),
      });
      throw error;
    }
  },
});

async function extractDocumentText(blob: Blob, type: "csv" | "pdf") {
  if (type === "csv") {
    const csv = await blob.text();
    const result = parseCsv(csv);
    return {
      text: result.text,
      columnNames: result.headers,
      rowCount: result.rowCount,
    };
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  const result = await pdfParse(buffer);
  return {
    text: result.text.trim(),
  };
}

function detectFileType(name: string, mimeType: string) {
  const lowerName = name.toLowerCase();
  const lowerMime = mimeType.toLowerCase();

  if (lowerName.endsWith(".csv") || lowerMime.includes("csv")) {
    return "csv" as const;
  }

  if (lowerName.endsWith(".pdf") || lowerMime.includes("pdf")) {
    return "pdf" as const;
  }

  return null;
}

function fallbackMimeType(type: "csv" | "pdf") {
  return type === "csv" ? "text/csv" : "application/pdf";
}
