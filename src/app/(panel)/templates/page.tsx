"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader } from "@/components/loader/loader";
import { toast } from "sonner";
import styles from "./templates.module.css";

interface Template {
  id: string;
  name: string;
  subject: string;
  variables: string[];
  createdAt: string;
  updatedAt: string;
  _count: { logs: number };
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      const res = await fetch("/api/templates");
      if (!res.ok) throw new Error("Error al cargar plantillas");
      const data = await res.json();
      setTemplates(data);
    } catch {
      toast.error("Error al cargar plantillas");
    } finally {
      setLoading(false);
    }
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((template) => {
      const haystack = [
        template.name,
        template.subject,
        ...template.variables,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [templates, query]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/templates/${pendingDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Error al eliminar");
        return;
      }
      toast.success("Plantilla eliminada");
      setPendingDelete(null);
      fetchTemplates();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setDeleting(false);
    }
  }

  async function handleDuplicate(template: Template) {
    try {
      const originalRes = await fetch(`/api/templates/${template.id}`);
      if (!originalRes.ok) {
        toast.error("Error al duplicar");
        return;
      }
      const original = await originalRes.json();

      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${original.name} (copia)`,
          subject: original.subject,
          html: original.html,
        }),
      });

      if (!res.ok) {
        toast.error("Error al duplicar");
        return;
      }

      toast.success("Plantilla duplicada");
      fetchTemplates();
    } catch {
      toast.error("Error de conexión");
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Plantillas</h1>
        <div className={styles.headerActions}>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar nombre, asunto o variable"
            className={styles.searchInput}
            aria-label="Buscar plantillas"
          />
          <Button onClick={() => router.push("/templates/new")}>
            Nueva plantilla
          </Button>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className={styles.empty}>
          <p>No hay plantillas todavía.</p>
          <Button onClick={() => router.push("/templates/new")}>
            Crear primera plantilla
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <div className={styles.empty}>
          <p>Ninguna plantilla coincide con la búsqueda.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Asunto</TableHead>
              <TableHead>Variables</TableHead>
              <TableHead>Envíos</TableHead>
              <TableHead>Actualizada</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((t) => (
              <TableRow
                key={t.id}
                className={styles.clickableRow}
                onClick={() => router.push(`/templates/${t.id}`)}
              >
                <TableCell className={styles.nameCell}>{t.name}</TableCell>
                <TableCell>{t.subject}</TableCell>
                <TableCell>
                  <div className={styles.badges}>
                    {t.variables.map((v) => (
                      <Badge key={v} variant="secondary">
                        {v}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{t._count.logs}</TableCell>
                <TableCell>
                  {new Date(t.updatedAt).toLocaleDateString()}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        ...
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => router.push(`/templates/${t.id}`)}
                      >
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(t)}>
                        Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setPendingDelete(t)}
                        className={styles.deleteItem}
                      >
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar plantilla</DialogTitle>
            <DialogDescription>
              Se elimina «{pendingDelete?.name}» y todos sus registros de envío.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingDelete(null)}
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
