import type { JobSource } from "@prisma/client";

const pausedBoardDefaults: Partial<Record<JobSource["type"], number>> = {
  remoteok: 240,
  weworkremotely: 120,
};

export function isPausedBoardSourceType(type: JobSource["type"]) {
  return type === "remoteok" || type === "weworkremotely";
}

export function prepareBoardSourceForRun(source: JobSource, includedInRun: boolean): JobSource {
  if (!includedInRun || !isPausedBoardSourceType(source.type)) return source;

  const config = objectConfig(source.config);
  const configuredMax = readNumber(config, "maxFetch");
  if (configuredMax > 0) return source;

  const maxFetch = pausedBoardDefaults[source.type] ?? 120;
  return { ...source, config: { ...config, maxFetch } };
}

function objectConfig(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readNumber(value: Record<string, unknown>, key = "maxFetch") {
  const found = value[key];
  return typeof found === "number" && Number.isFinite(found) ? found : 0;
}
