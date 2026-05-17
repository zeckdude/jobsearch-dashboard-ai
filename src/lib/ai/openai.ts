import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";
import { traceAgentOperation } from "@/lib/observability/langsmith";

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

  const model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
  const response = await traceAgentOperation(
    `openai.structured.${schemaName}`,
    {
      provider: "openai",
      operation: "responses.parse",
      model,
      schemaName,
      inputKind: input == null ? "null" : Array.isArray(input) ? "array" : typeof input,
    },
    () => client!.responses.parse({
      model,
      input: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(input) },
      ],
      text: {
        format: zodTextFormat(schema, schemaName),
      },
    }),
  );

  return response.output_parsed;
}

export async function createEmbedding(input: string) {
  if (!isOpenAiConfigured()) return null;

  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const model = process.env.OPENAI_EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL;
  const response = await traceAgentOperation(
    "openai.embedding",
    {
      provider: "openai",
      operation: "embeddings.create",
      model,
      inputLength: input.length,
      truncatedLength: Math.min(input.length, 8000),
    },
    () => client!.embeddings.create({
      model,
      input: input.slice(0, 8000),
    }),
  );

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

  const model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
  const response = await traceAgentOperation(
    "openai.text_response",
    {
      provider: "openai",
      operation: "responses.create",
      model,
      inputLength: input.length,
    },
    () => client!.responses.create({
      model,
      input: [
        { role: "system", content: system },
        { role: "user", content: input },
      ],
    }),
  );

  return response.output_text?.trim() || null;
}
