const responsesUrl = "https://api.openai.com/v1/responses";
const embeddingsUrl = "https://api.openai.com/v1/embeddings";

export const embeddingDimensions = 1536;

type ResponseInput = {
  instructions: string;
  conversation: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
};

export async function createResponse(input: ResponseInput) {
  const model = process.env.OPENAI_MODEL || "gpt-5.4";
  const body = {
    model,
    input: buildPrompt(input),
    reasoning: { effort: "medium" },
    max_output_tokens: 1600,
  };

  const data = await postOpenAI(responsesUrl, body);
  return extractOutputText(data);
}

export async function createEmbeddings(texts: string[]) {
  if (texts.length === 0) {
    return [];
  }

  const model = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
  const batches: number[][] = [];

  for (let index = 0; index < texts.length; index += 64) {
    const batch = texts.slice(index, index + 64);
    const data = await postOpenAI(embeddingsUrl, {
      model,
      input: batch,
    });

    const embeddings = (data.data ?? []).map(
      (item: { embedding: number[] }) => item.embedding
    );

    batches.push(...embeddings);
  }

  return batches;
}

async function postOpenAI(url: string, body: unknown) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Falta configurar OPENAI_API_KEY en el entorno de Convex.");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI respondio ${response.status}: ${detail}`);
  }

  return response.json();
}

function buildPrompt(input: ResponseInput) {
  return [
    input.instructions,
    "",
    "Conversacion:",
    ...input.conversation.map((message) => {
      const label = message.role === "user" ? "Usuario" : "Asistente";
      return `${label}: ${message.content}`;
    }),
  ].join("\n");
}

function extractOutputText(data: any) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const chunks: string[] = [];

  for (const item of data.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string") {
        chunks.push(content.text);
      }
    }
  }

  return chunks.join("\n").trim() || "No pude generar una respuesta.";
}
