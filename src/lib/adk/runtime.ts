import type { AgentRun, Prisma } from "@prisma/client";
import { adkModelName, getAdkAgentRegistration, shouldUseAdkControlPlane } from "@/lib/adk/registry";
import { prisma } from "@/lib/prisma";

type AdkControlPlaneInput<TOutput> = {
  run: AgentRun;
  execute: () => Promise<TOutput>;
};

type AdkPackageStatus = {
  available: boolean;
  exports: string[];
  error?: string;
};

export async function runWithAdkControlPlane<TOutput>({ run, execute }: AdkControlPlaneInput<TOutput>): Promise<TOutput> {
  const registration = getAdkAgentRegistration(run.agentType);
  if (!registration || !shouldUseAdkControlPlane(run.agentType)) return execute();

  const packageStatus = await loadAdkPackageStatus();
  await prisma.agentRunEvent.create({
    data: {
      agentRunId: run.id,
      type: "adk_control_plane_started",
      message: `${registration.displayName} started with ADK control-plane metadata.`,
      payloadJson: toJsonValue({
        agentId: registration.id,
        model: adkModelName(),
        tools: registration.tools,
        risk: registration.risk,
        packageStatus,
      }),
    },
  });

  try {
    const output = await execute();
    await prisma.agentRunEvent.create({
      data: {
        agentRunId: run.id,
        type: "adk_control_plane_completed",
        message: `${registration.displayName} completed under ADK control-plane supervision.`,
        payloadJson: toJsonValue({
          agentId: registration.id,
          model: adkModelName(),
          outputType: typeof output,
        }),
      },
    });
    return output;
  } catch (error) {
    await prisma.agentRunEvent.create({
      data: {
        agentRunId: run.id,
        type: "adk_control_plane_failed",
        message: `${registration.displayName} failed under ADK control-plane supervision.`,
        payloadJson: toJsonValue({
          agentId: registration.id,
          model: adkModelName(),
          error: error instanceof Error ? error.message : "Unknown ADK-supervised agent failure",
        }),
      },
    }).catch(() => null);
    throw error;
  }
}

async function loadAdkPackageStatus(): Promise<AdkPackageStatus> {
  try {
    const importer = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<Record<string, unknown>>;
    const adk = await importer("@google/adk");
    return {
      available: true,
      exports: Object.keys(adk).filter((key) => ["Agent", "LlmAgent", "InMemoryRunner", "FunctionTool", "MCPToolset"].includes(key)),
    };
  } catch (error) {
    return {
      available: false,
      exports: [],
      error: error instanceof Error ? error.message : "Unable to load @google/adk",
    };
  }
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}
