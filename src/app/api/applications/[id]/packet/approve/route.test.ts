import { beforeEach, describe, expect, it, vi } from "vitest";
import { approveApplicationPacket } from "@/lib/applications/application-packets";
import { POST } from "./route";

vi.mock("@/lib/applications/application-packets", () => ({
  approveApplicationPacket: vi.fn(),
}));

const approveApplicationPacketMock = vi.mocked(approveApplicationPacket);

describe("POST /api/applications/[id]/packet/approve", () => {
  beforeEach(() => {
    approveApplicationPacketMock.mockReset();
  });

  it("approves an application packet and returns the approved status", async () => {
    approveApplicationPacketMock.mockResolvedValue({
      packet: { id: "packet_1", status: "APPROVED" },
      message: "Application packet approved.",
    } as Awaited<ReturnType<typeof approveApplicationPacket>>);

    const response = await POST(new Request("http://localhost/api/applications/app_1/packet/approve"), {
      params: { id: "app_1" },
    });

    expect(approveApplicationPacketMock).toHaveBeenCalledWith("app_1");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      packetId: "packet_1",
      status: "APPROVED",
      message: "Application packet approved.",
    });
  });

  it("returns a guarded error when the packet is not ready for approval", async () => {
    approveApplicationPacketMock.mockRejectedValue(new Error("Resolve QA review items before approving this packet."));

    const response = await POST(new Request("http://localhost/api/applications/app_1/packet/approve"), {
      params: { id: "app_1" },
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Resolve QA review items before approving this packet.",
    });
  });
});
