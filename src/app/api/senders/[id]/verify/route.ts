import { NextRequest, NextResponse } from "next/server";
import { verifySender } from "@/lib/email/smtp-transport";
import { prisma } from "@/lib/db";
import { requirePanelSession } from "@/lib/auth/guard";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePanelSession();
  if (denied) return denied;

  const { id } = await params;
  const result = await verifySender(id);

  const sender = await prisma.sender.findUnique({ where: { id } });
  if (sender) {
    const update = result.connected
      ? { verifyFailureCount: 0 }
      : {
          lastVerifyFailedAt: new Date(),
          verifyFailureCount: { increment: 1 },
        };
    await prisma.sender.update({
      where: { id },
      data: update,
    });
  }

  return NextResponse.json(result);
}
