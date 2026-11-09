import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePanelSession } from "@/lib/auth/guard";

export async function GET(request: NextRequest) {
  const denied = await requirePanelSession();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);

  const templateId = searchParams.get("templateId");
  const status = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const q = searchParams.get("q")?.trim();
  const page = Math.max(parseInt(searchParams.get("page") ?? "1", 10) || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 1),
    100
  );

  const where: Record<string, unknown> = {};

  if (templateId) where.templateId = templateId;
  if (status) where.status = status;
  if (q) where.to = { contains: q, mode: "insensitive" };
  if (from || to) {
    where.sentAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const [logs, total] = await Promise.all([
    prisma.emailLog.findMany({
      where,
      orderBy: { sentAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        template: { select: { name: true } },
      },
    }),
    prisma.emailLog.count({ where }),
  ]);

  return NextResponse.json({
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
