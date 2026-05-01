"use node";

import { v } from "convex/values";
import type { FunctionReference } from "convex/server";
import { action, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { getRequiredUserId } from "./lib/auth";
import {
  fetchNhtsaVehicleContext,
  looksLikeVehicleQuestion,
} from "./lib/nhtsa";
import { createEmbeddings, createResponse } from "./lib/openai";

const modeValidator = v.union(v.literal("chat"), v.literal("rag"));

type Mode = "chat" | "rag";
type ChatSource = {
  documentId?: Id<"documents">;
  documentName: string;
  sourceType: "csv" | "pdf" | "web";
  url?: string;
};

type ConversationMessage = Pick<Doc<"messages">, "role" | "content">;

type SendMessageResult = {
  conversationId: Id<"conversations">;
  answer: string;
  sources?: ChatSource[];
};

type InternalMutationRef<Args extends Record<string, unknown>, Result> = FunctionReference<
  "mutation",
  "internal",
  Args,
  Result
>;
type InternalQueryRef<Args extends Record<string, unknown>, Result> = FunctionReference<
  "query",
  "internal",
  Args,
  Result
>;

const internalApi = internal as unknown as {
  chat: {
    createConversation: InternalMutationRef<
      { userId: string; mode: Mode; title: string; now: number },
      Id<"conversations">
    >;
    addMessage: InternalMutationRef<
      {
        userId: string;
        conversationId: Id<"conversations">;
        mode: Mode;
        role: "user" | "assistant";
        content: string;
        sources?: ChatSource[];
        now: number;
      },
      Id<"messages">
    >;
    getConversationMessages: InternalQueryRef<
      { conversationId: Id<"conversations">; userId: string },
      ConversationMessage[]
    >;
  };
  documents: {
    getChunksForUser: InternalQueryRef<
      { userId: string; chunkIds: Id<"documentChunks">[] },
      Doc<"documentChunks">[]
    >;
  };
};

export const sendMessage = action({
  args: {
    conversationId: v.optional(v.id("conversations")),
    mode: modeValidator,
    content: v.string(),
  },
  handler: async (ctx, args): Promise<SendMessageResult> => {
    const userId = await getRequiredUserId(ctx);
    const now = Date.now();
    const conversationId =
      args.conversationId ??
      ((await ctx.runMutation(internalApi.chat.createConversation, {
        userId,
        mode: args.mode,
        title: "Nueva conversacion",
        now,
      })) as Id<"conversations">);

    await ctx.runMutation(internalApi.chat.addMessage, {
      userId,
      conversationId,
      mode: args.mode,
      role: "user",
      content: args.content,
      now,
    });

    const history = (await ctx.runQuery(internalApi.chat.getConversationMessages, {
      conversationId,
      userId,
    })) as ConversationMessage[];

    const { answer, sources } = looksLikeVehicleQuestion(args.content)
      ? await answerWithVehicleApi(args.content, history)
      : args.mode === "rag"
        ? await answerWithRag(ctx, userId, args.content, history)
        : await answerWithChat(history);

    await ctx.runMutation(internalApi.chat.addMessage, {
      userId,
      conversationId,
      mode: args.mode,
      role: "assistant",
      content: answer,
      sources,
      now: Date.now(),
    });

    return { conversationId, answer, sources };
  },
});

async function answerWithChat(
  history: ConversationMessage[]
): Promise<{ answer: string; sources: undefined }> {
  const answer = await createResponse({
    instructions: [
      "Eres un asistente de dashboard para el usuario autenticado.",
      "Usa solo el contexto conversacional de este usuario.",
      "No afirmes haber consultado documentos si el modo no es RAG.",
      "Responde en el idioma del usuario con tono claro y amable.",
    ].join(" "),
    conversation: history.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  });

  return { answer, sources: undefined };
}

async function answerWithVehicleApi(
  question: string,
  history: ConversationMessage[]
): Promise<{ answer: string; sources: ChatSource[] }> {
  const vehicleContext = await fetchNhtsaVehicleContext(question);

  if (!vehicleContext) {
    const answer = await createResponse({
      instructions: [
        "Eres un asistente de dashboard para el usuario autenticado.",
        "El usuario hizo una pregunta relacionada con vehiculos, pero no se pudo identificar VIN, marca o anio suficiente para consultar NHTSA.",
        "Pide de forma breve la marca, el anio o el VIN necesarios para buscar informacion de modelos.",
        "No inventes datos de vehiculos.",
      ].join(" "),
      conversation: history.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    });

    return { answer, sources: [] };
  }

  const answer = await createResponse({
    instructions: [
      "Eres un asistente de dashboard para el usuario autenticado.",
      "Responde con base en el contexto de NHTSA vPIC provisto.",
      "Explica que NHTSA vPIC contiene datos reportados por fabricantes para vehiculos y modelos.",
      "Si los datos no alcanzan, dilo claramente y pide el dato faltante.",
      "Al final incluye una linea 'Fuentes: NHTSA vPIC' y no cites otras fuentes.",
    ].join(" "),
    conversation: [
      ...history.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      {
        role: "user",
        content: `Contexto NHTSA vPIC:\n${vehicleContext.summary}\n\nPregunta: ${question}`,
      },
    ],
  });

  return {
    answer,
    sources: [
      {
        documentName: vehicleContext.sourceName,
        sourceType: "web",
        url: vehicleContext.sourceUrl,
      },
    ],
  };
}

async function answerWithRag(
  ctx: ActionCtx,
  userId: string,
  question: string,
  history: ConversationMessage[]
): Promise<{ answer: string; sources: ChatSource[] }> {
  const [queryEmbedding] = await createEmbeddings([question]);

  if (!queryEmbedding) {
    throw new Error("No se pudo generar el embedding de la pregunta.");
  }

  const results = await ctx.vectorSearch("documentChunks", "by_embedding", {
    vector: queryEmbedding,
    limit: 8,
    filter: (q) => q.eq("userId", userId),
  });

  const chunks = (await ctx.runQuery(internalApi.documents.getChunksForUser, {
    userId,
    chunkIds: results.map((result) => result._id),
  })) as Doc<"documentChunks">[];

  if (chunks.length === 0) {
    return {
      answer:
        "No encontre contexto suficiente en tus documentos cargados para responder esta pregunta.",
      sources: [],
    };
  }

  const uniqueSources = Array.from(
    new Map(
      chunks.map((chunk) => [
        chunk.documentId,
        {
          documentId: chunk.documentId,
          documentName: chunk.documentName,
          sourceType: chunk.sourceType,
        },
      ])
    ).values()
  );

  const context = chunks
    .map((chunk, index) => {
      return `[Fuente ${index + 1}: ${chunk.documentName}]\n${chunk.text}`;
    })
    .join("\n\n");

  const answer = await createResponse({
    instructions: [
      "Eres un asistente RAG para un dashboard privado.",
      "Responde exclusivamente con base en el contexto recuperado de los documentos del usuario.",
      "Si el contexto no alcanza, dilo claramente.",
      "Al final incluye una linea 'Fuentes: ...' con los nombres de documentos utilizados.",
      "No uses busqueda web ni fuentes externas.",
    ].join(" "),
    conversation: [
      ...history.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      {
        role: "user",
        content: `Contexto recuperado:\n${context}\n\nPregunta: ${question}`,
      },
    ],
  });

  return { answer, sources: uniqueSources };
}
