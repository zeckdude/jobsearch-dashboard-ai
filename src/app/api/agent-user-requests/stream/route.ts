import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const pollIntervalMs = 2000;

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let lastSignature = "";
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      const poll = async (initial = false) => {
        if (closed) return;
        try {
          const snapshot = await openRequestSnapshot();
          if (initial) {
            lastSignature = snapshot.signature;
            send("ready", snapshot);
            return;
          }
          if (snapshot.signature !== lastSignature) {
            lastSignature = snapshot.signature;
            send("needs-me", snapshot);
          } else {
            send("heartbeat", { at: new Date().toISOString() });
          }
        } catch (error) {
          send("error", { message: error instanceof Error ? error.message : "Unable to stream Needs Me updates." });
        }
      };

      await poll(true);
      const timer = setInterval(() => void poll(), pollIntervalMs);
      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(timer);
        controller.close();
      });
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}

async function openRequestSnapshot() {
  const requests = await prisma.agentUserRequest.findMany({
    where: { status: "OPEN" },
    select: {
      id: true,
      type: true,
      updatedAt: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 100,
  });
  const signature = requests
    .map((item) => `${item.id}:${item.type}:${item.createdAt.toISOString()}:${item.updatedAt.toISOString()}`)
    .join("|");
  return {
    count: requests.length,
    latestCreatedAt: requests.at(-1)?.createdAt.toISOString() ?? null,
    signature,
    at: new Date().toISOString(),
  };
}
