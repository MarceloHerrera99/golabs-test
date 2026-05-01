import { v } from "convex/values";
import { action } from "./_generated/server";
import { authInfoFromIdentity, requireIdentity } from "./auth";
import { getEnv } from "./env";
import { internalApi } from "./refs";
import { citationValidator, tokenUsageValidator } from "./validators";

type ResponseOutputContent = {
  type?: string;
  text?: string;
  annotations?: Array<{
    type?: string;
    file_id?: string;
    filename?: string;
    index?: number;
    text?: string;
  }>;
};

type ResponseOutputItem = {
  type?: string;
  content?: ResponseOutputContent[];
  results?: Array<{
    file_id?: string;
    filename?: string;
    text?: string;
  }>;
};

type OpenAIResponse = {
  output_text?: string;
  output?: ResponseOutputItem[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
};

type Citation = {
  fileId?: string;
  fileName: string;
  index?: number;
  quote?: string;
};

const DEFAULT_MODEL = "gpt-5.5";

function getOpenAIKey() {
  const apiKey = getEnv("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no está configurado en Convex.");
  }

  return apiKey;
}

function getModel() {
  return getEnv("OPENAI_MODEL") || DEFAULT_MODEL;
}

async function createResponse(body: Record<string, unknown>) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenAIKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI ${response.status}: ${errorBody}`);
  }

  return (await response.json()) as OpenAIResponse;
}

function extractText(response: OpenAIResponse) {
  if (response.output_text) {
    return response.output_text;
  }

  const text = response.output
    ?.flatMap((item) => item.content ?? [])
    .filter((content) => content.type === "output_text" || content.text)
    .map((content) => content.text)
    .filter((value): value is string => Boolean(value))
    .join("\n\n");

  return text || "No pude generar una respuesta con la información disponible.";
}

function extractCitations(response: OpenAIResponse): Citation[] {
  const citationsFromAnnotations = (response.output
    ?.flatMap((item) => item.content ?? [])
    .flatMap((content) => content.annotations ?? [])
    .filter((annotation) => annotation.type === "file_citation")
    .map((annotation) => ({
      fileId: annotation.file_id,
      fileName: annotation.filename ?? "Fuente documental",
      index: annotation.index,
      quote: annotation.text,
    })) ?? []) as Citation[];

  const citationsFromResults = (response.output
    ?.filter((item) => item.type === "file_search_call")
    .flatMap((item) => item.results ?? [])
    .map((result) => ({
      fileId: result.file_id,
      fileName: result.filename ?? "Fuente documental",
      quote: result.text,
    })) ?? []) as Citation[];

  const seen = new Set<string>();
  return [...citationsFromAnnotations, ...citationsFromResults]
    .filter((citation) => {
      const key = `${citation.fileId ?? citation.fileName}:${citation.index ?? ""}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

function extractUsage(response: OpenAIResponse) {
  if (!response.usage) {
    return undefined;
  }

  return {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    totalTokens: response.usage.total_tokens,
  };
}

export const sendMessage = action({
  args: {
    conversationId: v.union(v.id("conversations"), v.null()),
    prompt: v.string(),
  },
  returns: v.object({
    conversationId: v.id("conversations"),
    assistantMessageId: v.id("messages"),
    content: v.string(),
    status: v.union(v.literal("done"), v.literal("error")),
    citations: v.array(citationValidator),
    model: v.string(),
    tokenUsage: v.optional(tokenUsageValidator),
  }),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const model = getModel();
    const now = Date.now();
    const turn = await ctx.runMutation(internalApi.conversations.createTurn, {
      auth: authInfoFromIdentity(identity),
      conversationId: args.conversationId,
      prompt: args.prompt,
      now,
    });

    if (turn.vectorStoreIds.length === 0) {
      const content =
        "Todavía no hay documentos indexados para responder con RAG. Un Admin o Editor debe subir archivos y esperar a que terminen de indexarse.";
      const assistantMessageId = await ctx.runMutation(
        internalApi.conversations.completeAssistantTurn,
        {
          tokenIdentifier: identity.tokenIdentifier,
          conversationId: turn.conversationId,
          content,
          status: "error",
          citations: [],
          model,
          ragUsed: false,
          error: "No hay documentos indexados.",
          now: Date.now(),
        },
      );

      return {
        conversationId: turn.conversationId,
        assistantMessageId,
        content,
        status: "error" as const,
        citations: [] as Citation[],
        model,
      };
    }

    try {
      const response = await createResponse({
        model,
        instructions:
          "Eres un agente RAG para usuarios autenticados. Responde en español claro y profesional. Usa los archivos disponibles como fuente principal. Si la respuesta depende de documentos, cita las fuentes. Si no encuentras soporte suficiente en los documentos, dilo explícitamente y no inventes.",
        input: [
          ...turn.history.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          {
            role: "user",
            content: args.prompt,
          },
        ],
        tools: [
          {
            type: "file_search",
            vector_store_ids: turn.vectorStoreIds,
            max_num_results: 6,
          },
        ],
        include: ["file_search_call.results"],
        reasoning: {
          effort: getEnv("OPENAI_REASONING_EFFORT") || "low",
        },
      });

      const content = extractText(response);
      const citations = extractCitations(response);
      const tokenUsage = extractUsage(response);
      const assistantMessageId = await ctx.runMutation(
        internalApi.conversations.completeAssistantTurn,
        {
          tokenIdentifier: identity.tokenIdentifier,
          conversationId: turn.conversationId,
          content,
          status: "done",
          citations,
          model,
          ragUsed: true,
          tokenUsage,
          now: Date.now(),
        },
      );

      return {
        conversationId: turn.conversationId,
        assistantMessageId,
        content,
        status: "done" as const,
        citations,
        model,
        tokenUsage,
      };
    } catch (error) {
      const content =
        error instanceof Error
          ? `No pude completar la respuesta RAG: ${error.message}`
          : "No pude completar la respuesta RAG por un error desconocido.";
      const assistantMessageId = await ctx.runMutation(
        internalApi.conversations.completeAssistantTurn,
        {
          tokenIdentifier: identity.tokenIdentifier,
          conversationId: turn.conversationId,
          content,
          status: "error",
          citations: [],
          model,
          ragUsed: true,
          error: content,
          now: Date.now(),
        },
      );

      return {
        conversationId: turn.conversationId,
        assistantMessageId,
        content,
        status: "error" as const,
        citations: [] as Citation[],
        model,
      };
    }
  },
});
