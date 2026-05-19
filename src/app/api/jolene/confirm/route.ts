import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { cancelJoleneConfirmation, executeJoleneConfirmation } from "@/lib/jolene/confirmation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const confirmationSchema = z.object({
  messageId: z.string().min(1),
  confirmationPlanId: z.string().min(1),
  decision: z.enum(["confirm", "cancel"]).default("confirm"),
});

export async function POST(request: Request) {
  try {
    const body = confirmationSchema.parse(await request.json());
    const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
    if (!user) {
      return NextResponse.json({ error: "No user exists. Run seed first." }, { status: 400 });
    }

    if (body.decision === "cancel") {
      const updated = await cancelJoleneConfirmation({
        userId: user.id,
        messageId: body.messageId,
        confirmationPlanId: body.confirmationPlanId,
      });
      return NextResponse.json({
        updatedMessage: serializeMessage(updated),
        messages: [serializeMessage(updated)],
        clientAction: null,
      });
    }

    const result = await executeJoleneConfirmation({
      userId: user.id,
      messageId: body.messageId,
      confirmationPlanId: body.confirmationPlanId,
    });

    return NextResponse.json({
      updatedMessage: serializeMessage(result.updatedMessage),
      messages: [serializeMessage(result.updatedMessage), serializeMessage(result.assistantMessage)],
      executedActions: result.executedActions,
      clientAction: result.clientAction ?? null,
    });
  } catch (error) {
    return apiError(error, 400);
  }
}

function serializeMessage(message: {
  id: string;
  role: string;
  content: string;
  actionJson?: unknown;
  createdAt: Date;
}) {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    actionJson: message.actionJson ?? {},
    createdAt: message.createdAt.toISOString(),
  };
}
