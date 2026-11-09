"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader } from "@/components/loader/loader";
import { toast } from "sonner";
import styles from "./newsletter.module.css";

interface Subscriber {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export default function NewsletterPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<Subscriber | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchSubscribers() {
    setLoading(true);
    try {
      const res = await fetch("/api/newsletter");
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        throw new Error("Error al cargar");
      }
      const data = await res.json();
      setSubscribers(data);
    } catch {
      toast.error("Error al cargar suscriptores");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSubscribers();
  }, []);

  async function confirmDelete() {
    if (!pending) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/newsletter?id=${encodeURIComponent(pending.id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error ?? "Error al eliminar");
        return;
      }
      toast.success("Suscriptor eliminado");
      setPending(null);
      fetchSubscribers();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Newsletter</h1>
        <Button variant="outline" onClick={fetchSubscribers}>
          Actualizar
        </Button>
      </div>

      {loading ? (
        <Loader size="md" />
      ) : subscribers.length === 0 ? (
        <div className={styles.empty}>
          No hay suscriptores aún. Los registros aparecerán cuando alguien complete
          el formulario "Ser parte del proyecto" en la landing.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Fecha de alta</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscribers.map((s) => (
              <TableRow key={s.id}>
                <TableCell className={styles.nameCell}>{s.name}</TableCell>
                <TableCell>{s.email}</TableCell>
                <TableCell>
                  {new Date(s.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPending(s)}
                  >
                    Eliminar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog
        open={!!pending}
        onOpenChange={(open) => {
          if (!open && !deleting) setPending(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar suscriptor</DialogTitle>
            <DialogDescription>
              Se da de baja a {pending?.name} ({pending?.email}).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPending(null)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
