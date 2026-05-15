import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";

const DEFAULT_MODEL = "gpt-4.1-mini";
const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

let client: OpenAI | null = null;

export function isOpenAiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function parseStructuredOutput<TSchema extends z.ZodTypeAny>({
  schema,
  schemaName,
  system,
  input,
}: {
  schema: TSchema;
  schemaName: string;
  system: string;
  input: unknown;
}): Promise<z.infer<TSchema> | null> {
  if (!isOpenAiConfigured()) return null;

  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.responses.parse({
    model: process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
    input: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(input) },
    ],
    text: {
      format: zodTextFormat(schema, schemaName),
    },
  });

  return response.output_parsed;
}

export async function createEmbedding(input: string) {
  if (!isOpenAiConfigured()) return null;

  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.embeddings.create({
    model: process.env.OPENAI_EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL,
    input: input.slice(0, 8000),
  });

  return {
    model: response.model,
    vector: response.data[0]?.embedding ?? [],
  };
}

export async function createTextResponse({
  system,
  input,
}: {
  system: string;
  input: string;
}) {
  if (!isOpenAiConfigured()) return null;

  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
    input: [
      { role: "system", content: system },
      { role: "user", content: input },
    ],
  });

  return response.output_text?.trim() || null;
}
