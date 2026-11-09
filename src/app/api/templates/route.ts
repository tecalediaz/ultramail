import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractVariables } from "@/lib/email/template-engine";
import { requirePanelSession } from "@/lib/auth/guard";

export async function GET() {
  const denied = await requirePanelSession();
  if (denied) return denied;

  const templates = await prisma.template.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { logs: true } },
    },
  });

  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const denied = await requirePanelSession();
  if (denied) return denied;

  let body: { name?: string; subject?: string; html?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { name, subject, html } = body;

  if (!name || !subject || !html) {
    return NextResponse.json(
      { error: "name, subject, and html are required" },
      { status: 400 }
    );
  }

  const variables = extractVariables(html + " " + subject);

  const template = await prisma.template.create({
    data: { name, subject, html, variables },
  });

  return NextResponse.json(template, { status: 201 });
}
