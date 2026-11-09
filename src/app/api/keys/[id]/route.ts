import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePanelSession } from "@/lib/auth/guard";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const denied = await requirePanelSession();
  if (denied) return denied;

  const { id } = await params;

  let body: { active?: boolean; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const existing = await prisma.apiKey.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  const updated = await prisma.apiKey.update({
    where: { id },
    data: {
      ...(body.active !== undefined ? { active: body.active } : {}),
      ...(body.name ? { name: body.name } : {}),
    },
  });

  return NextResponse.json({
    ...updated,
    key: updated.key.slice(0, 8) + "..." + updated.key.slice(-4),
  });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const denied = await requirePanelSession();
  if (denied) return denied;

  const { id } = await params;

  const existing = await prisma.apiKey.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  await prisma.apiKey.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
