"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Loader } from "@/components/loader/loader";
import styles from "./metricas.module.css";

const RANGES = [7, 14, 30] as const;
type RangeDays = (typeof RANGES)[number];

interface DayMetric {
  date: string;
  sent: number;
  failed: number;
  total: number;
}

interface TemplateMetric {
  id: string;
  name: string;
  sent: number;
  failed: number;
  total: number;
}

interface SenderAlert {
  id: string;
  name: string;
  fromEmail: string;
  lastFailureAt: string | null;
  failureCount: number;
}

interface MetricsResponse {
  days: number;
  emailsPerDay: DayMetric[];
  successRate: number | null;
  totals: { sent: number; failed: number };
  byTemplate: TemplateMetric[];
  senderAlerts: SenderAlert[];
}

function formatDay(isoDate: string) {
  const [, month, day] = isoDate.split("-");
  if (!month || !day) return isoDate;
  return `${day}/${month}`;
}

function formatRate(rate: number | null) {
  if (rate === null) return "—";
  const percent = Math.round(rate * 1000) / 10;
  return `${percent}%`;
}

export default function MetricasPage() {
  const [days, setDays] = useState<RangeDays>(14);
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/metrics?days=${days}`);
      if (!res.ok) throw new Error("Error al cargar métricas");
      const json: MetricsResponse = await res.json();
      setData(json);
    } catch {
      toast.error("Error al cargar métricas");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Métricas</h1>
        <p className={styles.subtitle}>
          Envíos, fallos y plantillas de los últimos {days} días
        </p>
        <div className={styles.toolbar}>
          {RANGES.map((range) => (
            <Button
              key={range}
              variant={days === range ? "default" : "outline"}
              size="sm"
              onClick={() => setDays(range)}
            >
              {range} días
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={fetchMetrics}>
            Actualizar
          </Button>
        </div>
      </div>

      {loading ? (
        <Loader size="md" />
      ) : !data ? (
        <div className={styles.empty}>No se pudieron cargar las métricas.</div>
      ) : (
        <>
          <div className={styles.stats}>
            <Card>
              <CardHeader>
                <CardTitle>Enviados</CardTitle>
              </CardHeader>
              <CardContent>
                <span className={styles.statValue}>{data.totals.sent}</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Fallidos</CardTitle>
              </CardHeader>
              <CardContent>
                <span className={styles.statValue}>{data.totals.failed}</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Tasa de éxito</CardTitle>
              </CardHeader>
              <CardContent>
                <span className={styles.statValue}>
                  {formatRate(data.successRate)}
                </span>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Enviados y fallidos por día</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.chart}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.emailsPerDay}>
                    <CartesianGrid strokeDasharray="3 3" className={styles.grid} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={formatDay}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11 }}
                      domain={[0, "auto"]}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 0,
                      }}
                      labelFormatter={(value) => formatDay(String(value))}
                    />
                    <Legend />
                    <Bar dataKey="sent" name="Enviados" fill="var(--chart-2)" />
                    <Bar dataKey="failed" name="Fallidos" fill="var(--chart-5)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Por plantilla</CardTitle>
            </CardHeader>
            <CardContent>
              {data.byTemplate.length === 0 ? (
                <p className={styles.subtitle}>
                  No hay envíos de plantillas en este rango.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plantilla</TableHead>
                      <TableHead>Enviados</TableHead>
                      <TableHead>Fallidos</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.byTemplate.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell>{template.name}</TableCell>
                        <TableCell className={styles.mono}>{template.sent}</TableCell>
                        <TableCell className={styles.mono}>{template.failed}</TableCell>
                        <TableCell className={styles.mono}>{template.total}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {data.senderAlerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Alertas de remitentes</CardTitle>
                <p className={styles.subtitle}>
                  Remitentes con 3 o más fallos de verificación
                </p>
              </CardHeader>
              <CardContent>
                <div className={styles.alertList}>
                  {data.senderAlerts.map((sender) => (
                    <div key={sender.id} className={styles.alertItem}>
                      <div>
                        <strong>{sender.name}</strong> ({sender.fromEmail})
                      </div>
                      <div className={styles.alertMeta}>
                        <Badge variant="destructive">
                          {sender.failureCount} fallos de verificación
                        </Badge>
                        {sender.lastFailureAt && (
                          <span className={styles.mono}>
                            Último: {new Date(sender.lastFailureAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
