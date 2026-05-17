import type { Prisma } from "@prisma/client";

type TraceMetadata = Record<string, unknown>;

const DEFAULT_PROJECT = "job-search-os-local";
const SAFE_METADATA_KEYS = new Set([
  "inputKind",
  "inputLength",
  "inputType",
  "outputKind",
  "outputLength",
]);
const SENSITIVE_KEY_PATTERN = /api[_-]?key|token|secret|password|authorization|cookie|resume|cover[_-]?letter|answer|value|phone|email|address|prompt|input|output|content|html|text/i;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_PATTERN = /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}/g;
const MAX_STRING_LENGTH = 180;

export function isLangSmithEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.LANGSMITH_TRACING === "true" && Boolean(env.LANGSMITH_API_KEY?.trim());
}

export function langSmithTraceMetadata(env: NodeJS.ProcessEnv = process.env): Prisma.InputJsonValue {
  return {
    provider: "langsmith",
    enabled: isLangSmithEnabled(env),
    project: env.LANGSMITH_PROJECT?.trim() || DEFAULT_PROJECT,
    endpoint: env.LANGSMITH_ENDPOINT?.trim() || "https://api.smith.langchain.com",
    redactionMode: "metadata",
  } as Prisma.InputJsonValue;
}

export async function traceWorkflowStep<T>(
  name: string,
  metadata: TraceMetadata,
  fn: () => Promise<T>,
): Promise<T> {
  return traceOperation(name, "chain", metadata, fn);
}

export async function traceAgentOperation<T>(
  name: string,
  metadata: TraceMetadata,
  fn: () => Promise<T>,
): Promise<T> {
  return traceOperation(name, "chain", metadata, fn);
}

export function sanitizeTraceInput(value: unknown): Prisma.InputJsonValue {
  return sanitizeUnknown(value) as Prisma.InputJsonValue;
}

export function sanitizeTraceOutput(value: unknown): Prisma.InputJsonValue {
  return sanitizeUnknown(value) as Prisma.InputJsonValue;
}

async function traceOperation<T>(
  name: string,
  runType: "chain" | "tool" | "llm" | "retriever",
  metadata: TraceMetadata,
  fn: () => Promise<T>,
): Promise<T> {
  if (!isLangSmithEnabled()) return fn();

  let traced: (() => Promise<T>) | null = null;
  try {
    const { traceable } = await import("langsmith/traceable");
    traced = traceable(
      async () => fn(),
      {
        name,
        run_type: runType,
        metadata: sanitizeTraceInput({
          ...metadata,
          redactionMode: "metadata",
          app: "job-search-os",
        }) as Record<string, unknown>,
        project_name: process.env.LANGSMITH_PROJECT?.trim() || DEFAULT_PROJECT,
      },
    );
  } catch (error) {
    console.warn(`LangSmith trace failed for ${name}; continuing without trace.`, error);
    return fn();
  }
  return traced();
}

function sanitizeUnknown(value: unknown, key = "", depth = 0): unknown {
  if (value == null) return value;
  if (depth > 8) return "[redacted:depth]";
  if (typeof value === "string") return sanitizeString(value, key);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.slice(0, 40).map((item) => sanitizeUnknown(item, key, depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([entryKey, entryValue]) => [
        entryKey,
        shouldRedactKey(entryKey) ? redactedValue(entryValue) : sanitizeUnknown(entryValue, entryKey, depth + 1),
      ]),
    );
  }
  return String(value);
}

function sanitizeString(value: string, key: string) {
  if (shouldRedactKey(key)) return "[redacted]";
  const scrubbed = value
    .replace(EMAIL_PATTERN, "[redacted-email]")
    .replace(PHONE_PATTERN, "[redacted-phone]");
  return scrubbed.length > MAX_STRING_LENGTH ? `${scrubbed.slice(0, MAX_STRING_LENGTH)}...` : scrubbed;
}

function shouldRedactKey(key: string) {
  if (SAFE_METADATA_KEYS.has(key)) return false;
  return SENSITIVE_KEY_PATTERN.test(key);
}

function redactedValue(value: unknown) {
  if (Array.isArray(value)) return `[redacted:${value.length} items]`;
  if (value && typeof value === "object") return "[redacted:object]";
  if (typeof value === "string" && !value.trim()) return "";
  return "[redacted]";
}
