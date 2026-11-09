import type { PrismaClient } from "@prisma/client";

const ALLOWED_DAYS = [7, 14, 30] as const;

export interface DayMetric {
  date: string;
  sent: number;
  failed: number;
  total: number;
}

export interface TemplateMetric {
  id: string;
  name: string;
  sent: number;
  failed: number;
  total: number;
}

export interface SenderAlert {
  id: string;
  name: string;
  fromEmail: string;
  lastFailureAt: string | null;
  failureCount: number;
}

export interface MetricsSnapshot {
  days: number;
  emailsPerDay: DayMetric[];
  successRate: number | null;
  totals: { sent: number; failed: number };
  byTemplate: TemplateMetric[];
  senderAlerts: SenderAlert[];
}

export function normalizeMetricDays(value: number | undefined) {
  if (value && ALLOWED_DAYS.includes(value as (typeof ALLOWED_DAYS)[number])) {
    return value;
  }
  return 14;
}

export async function collectMetrics(
  prisma: PrismaClient,
  daysInput?: number
): Promise<MetricsSnapshot> {
  const days = normalizeMetricDays(daysInput);
  const now = new Date();
  const startDate = new Date(now);
  startDate.setUTCDate(startDate.getUTCDate() - days + 1);
  startDate.setUTCHours(0, 0, 0, 0);

  const logs = await prisma.emailLog.findMany({
    where: { sentAt: { gte: startDate } },
    select: { status: true, sentAt: true, templateId: true },
  });

  const dayMap = new Map<string, { sent: number; failed: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate.getTime());
    d.setUTCDate(startDate.getUTCDate() + i);
    dayMap.set(d.toISOString().slice(0, 10), { sent: 0, failed: 0 });
  }

  const templateMap = new Map<string, { sent: number; failed: number }>();
  for (const log of logs) {
    const key = new Date(log.sentAt).toISOString().slice(0, 10);
    const day = dayMap.get(key);
    const sent = log.status === "sent";
    if (day) {
      if (sent) day.sent += 1;
      else day.failed += 1;
    }
    const template = templateMap.get(log.templateId) ?? { sent: 0, failed: 0 };
    if (sent) template.sent += 1;
    else template.failed += 1;
    templateMap.set(log.templateId, template);
  }

  const emailsPerDay = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      sent: data.sent,
      failed: data.failed,
      total: data.sent + data.failed,
    }));

  const sent = logs.filter((log) => log.status === "sent").length;
  const failed = logs.length - sent;
  const names = await prisma.template.findMany({
    where: { id: { in: Array.from(templateMap.keys()) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(names.map((template) => [template.id, template.name]));

  const byTemplate = Array.from(templateMap.entries())
    .map(([id, counts]) => ({
      id,
      name: nameById.get(id) ?? "Plantilla eliminada",
      sent: counts.sent,
      failed: counts.failed,
      total: counts.sent + counts.failed,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const senderAlerts = await prisma.sender.findMany({
    where: { verifyFailureCount: { gte: 3 } },
    select: {
      id: true,
      name: true,
      fromEmail: true,
      lastVerifyFailedAt: true,
      verifyFailureCount: true,
    },
  });

  return {
    days,
    emailsPerDay,
    successRate: logs.length > 0 ? Math.round((sent / logs.length) * 1000) / 1000 : null,
    totals: { sent, failed },
    byTemplate,
    senderAlerts: senderAlerts.map((sender) => ({
      id: sender.id,
      name: sender.name,
      fromEmail: sender.fromEmail,
      lastFailureAt: sender.lastVerifyFailedAt?.toISOString() ?? null,
      failureCount: sender.verifyFailureCount,
    })),
  };
}
