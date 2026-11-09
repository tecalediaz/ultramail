import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePanelSession } from "@/lib/auth/guard";

export async function GET(request: NextRequest) {
  const denied = await requirePanelSession();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const statusCode = searchParams.get("statusCode");
  const q = searchParams.get("q")?.trim();
  const page = Math.max(parseInt(searchParams.get("page") ?? "1", 10) || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 1),
    100
  );

  const where: Prisma.ApiAuditLogWhereInput = {};
  if (statusCode) {
    const code = parseInt(statusCode, 10);
    if (!isNaN(code)) where.statusCode = code;
  }
  if (q) {
    where.OR = [
      { path: { contains: q, mode: "insensitive" } },
      { apiKeyName: { contains: q, mode: "insensitive" } },
      { to: { contains: q, mode: "insensitive" } },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.apiAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.apiAuditLog.count({ where }),
  ]);

  return NextResponse.json({
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
