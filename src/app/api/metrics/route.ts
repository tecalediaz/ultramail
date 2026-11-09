import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePanelSession } from "@/lib/auth/guard";
import { collectMetrics } from "@/lib/metrics";

export async function GET(request: NextRequest) {
  const denied = await requirePanelSession();
  if (denied) return denied;

  const days = Number(new URL(request.url).searchParams.get("days") ?? "14");
  return NextResponse.json(await collectMetrics(prisma, days));
}
