"use client";

import { useState } from "react";
import styles from "./mcp.module.css";

const MCP_CONFIG = `{
  "mcpServers": {
    "ultramail": {
      "command": "npx",
      "args": ["tsx", "/ruta/completa/al/proyecto/ultramail/mcp-server/index.ts"]
    }
  }
}`;

const API_EXAMPLE = `curl -X POST https://tu-dominio.com/api/send \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: um_tu_api_key" \\
  -d '{
    "template_id": "id_de_la_plantilla",
    "to": "usuario@ejemplo.com",
    "variables": {
      "nombre": "Juan",
      "pedido_id": "12345"
    }
  }'`;

const VARIABLE_EXAMPLE = `<p>Hola {{nombre}},</p>
<p>Tu pedido {{pedido_id}} ya está listo.</p>`;

const TOOLS = [
  ["ultramail_list_templates", "Lista las plantillas, con el conteo de envíos."],
  ["ultramail_get_template", "Devuelve una plantilla por template_id, incluido el HTML."],
  ["ultramail_create_template", "Crea una plantilla. Detecta las variables de asunto y HTML."],
  ["ultramail_update_template", "Actualiza nombre, asunto o HTML y recalcula las variables."],
  ["ultramail_delete_template", "Elimina la plantilla y sus registros de envío."],
  ["ultramail_send_email", "Envía un correo. Acepta variables, sender_id y adjuntos."],
  ["ultramail_list_logs", "Historial de envíos. Filtros: template_id, status, page, limit."],
  ["ultramail_list_senders", "Lista remitentes SMTP, sin la contraseña."],
  ["ultramail_create_sender", "Crea un remitente. La contraseña se guarda cifrada."],
  ["ultramail_update_sender", "Actualiza un remitente. smtpPassword solo si cambia."],
  ["ultramail_verify_sender", "Prueba la conexión SMTP de un remitente."],
  ["ultramail_delete_sender", "Elimina un remitente."],
  ["ultramail_senders_status", "Verifica la conexión de todos los remitentes."],
  ["ultramail_list_api_keys", "Lista las API keys con la key enmascarada."],
  ["ultramail_create_api_key", "Crea una API key. La key completa solo se muestra aquí."],
  ["ultramail_update_api_key", "Activa, desactiva o renombra una key. Devuelve la key enmascarada."],
  ["ultramail_delete_api_key", "Elimina una API key."],
  ["ultramail_list_audit", "Llamadas a POST /api/send. Filtro opcional por statusCode."],
  ["ultramail_metrics", "Métricas de 7, 14 o 30 días: por día, por plantilla, tasa y alertas."],
  ["ultramail_health", "Estado de la base y de los remitentes configurados."],
  ["ultramail_list_subscribers", "Lista los suscriptores del newsletter."],
  ["ultramail_delete_subscriber", "Elimina un suscriptor por subscriber_id."],
] as const;

export default function McpPage() {
  const [copied, setCopied] = useState<"config" | "api" | "vars" | null>(null);

  async function copy(id: "config" | "api" | "vars", text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Documentación</h1>
        <p className={styles.subtitle}>
          Cómo armar una plantilla, enviarla por la API y operar el mismo
          sistema desde un cliente MCP. El panel y estas herramientas leen la
          misma base.
        </p>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Variables</h2>
        <p className={styles.sectionDesc}>
          En el asunto y en el HTML, una variable es <code>{"{{nombre}}"}</code>.
          El nombre admite letras, números y guion bajo. Al guardar la plantilla,
          Ultramail extrae las variables de los dos campos. Al enviar, cada clave
          de <code>variables</code> reemplaza su marca. Si falta una clave, la
          marca queda escrita en el correo.
        </p>
        <div className={styles.codeBlock}>
          <button
            type="button"
            onClick={() => copy("vars", VARIABLE_EXAMPLE)}
            className={styles.copyBtn}
          >
            {copied === "vars" ? "Copiado" : "Copiar ejemplo"}
          </button>
          <pre className={styles.code}>{VARIABLE_EXAMPLE}</pre>
        </div>
        <p className={styles.sectionDesc}>
          El identificador que usa la API y MCP es el <code>id</code> de la
          plantilla, no el nombre visible.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>API REST</h2>
        <p className={styles.sectionDesc}>
          Tres rutas son públicas. El resto del API del panel exige la sesión
          iniciada en el navegador.
        </p>
        <ol className={styles.steps}>
          <li className={styles.step}>
            <span className={styles.stepNumber}>POST /api/send</span>
            <span className={styles.stepTitle}>Envío externo</span>
            <span className={styles.stepDesc}>
              Header <code>X-API-Key</code> con una key activa (prefijo{" "}
              <code>um_</code>). Cuerpo JSON: <code>template_id</code> y{" "}
              <code>to</code> obligatorios; <code>variables</code>,{" "}
              <code>sender_id</code> y <code>attachments</code> opcionales. Cada
              adjunto lleva <code>filename</code> y <code>content</code> (base64
              o URL https). El total de adjuntos no puede pasar de 10 MB. Sin{" "}
              <code>sender_id</code> se usa el remitente predeterminado. La
              respuesta es 200 con <code>messageId</code> y <code>logId</code>,
              401 si la key no sirve, 400 si falta un campo y 500 si el SMTP
              falla. Cada llamada queda en Actividad API.
            </span>
          </li>
          <li className={styles.step}>
            <span className={styles.stepNumber}>POST /api/newsletter</span>
            <span className={styles.stepTitle}>Alta pública</span>
            <span className={styles.stepDesc}>
              Cuerpo <code>{"{ name, email }"}</code>. No lleva API key. Responde
              201, 409 si el email ya existe y 429 si la misma IP insiste.
            </span>
          </li>
          <li className={styles.step}>
            <span className={styles.stepNumber}>GET /api/health</span>
            <span className={styles.stepTitle}>Estado</span>
            <span className={styles.stepDesc}>
              Sin autenticación. Devuelve <code>database</code>,{" "}
              <code>sendersConfigured</code> y <code>defaultSenderExists</code>.
              HTTP 200 si está sano y 503 si la base o los remitentes no responden.
            </span>
          </li>
        </ol>
        <div className={styles.codeBlock}>
          <button
            type="button"
            onClick={() => copy("api", API_EXAMPLE)}
            className={styles.copyBtn}
          >
            {copied === "api" ? "Copiado" : "Copiar ejemplo"}
          </button>
          <pre className={styles.code}>{API_EXAMPLE}</pre>
        </div>
        <p className={styles.sectionDesc}>
          Con la sesión del panel: plantillas en <code>/api/templates</code>,
          historial en <code>/api/logs?q=</code> (busca por destinatario),
          actividad en <code>/api/audit?q=</code>, métricas en{" "}
          <code>/api/metrics?days=7|14|30</code>, remitentes en{" "}
          <code>/api/senders</code>, keys en <code>/api/keys</code> y
          suscriptores en <code>GET</code> y <code>DELETE /api/newsletter?id=</code>.
          El login del panel se bloquea 5 minutos después de 10 intentos fallidos.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Herramientas MCP</h2>
        <p className={styles.sectionDesc}>
          El servidor MCP habla directo con la base. Cubre el mismo trabajo que
          el panel: plantillas, envíos, historial, remitentes, métricas, API
          keys, auditoría y suscriptores. No pasa por la cookie de sesión.
        </p>
        <div className={styles.toolList}>
          {TOOLS.map(([name, use]) => (
            <div key={name} className={styles.tool}>
              <span className={styles.toolName}>{name}</span>
              <span className={styles.toolUse}>{use}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Cómo conectar</h2>
        <ol className={styles.steps}>
          <li className={styles.step}>
            <span className={styles.stepNumber}>Paso 1</span>
            <span className={styles.stepTitle}>Variables de entorno</span>
            <span className={styles.stepDesc}>
              En la raíz del proyecto, un archivo <code>.env</code> con{" "}
              <code>DATABASE_URL</code>, <code>DIRECT_URL</code> y{" "}
              <code>ENCRYPTION_KEY</code> (32 caracteres o más). El servidor MCP
              carga ese archivo al arrancar. <code>PANEL_PASSWORD</code> y{" "}
              <code>SESSION_SECRET</code> son del panel web, no del proceso MCP.
            </span>
          </li>
          <li className={styles.step}>
            <span className={styles.stepNumber}>Paso 2</span>
            <span className={styles.stepTitle}>Cliente MCP</span>
            <span className={styles.stepDesc}>
              Agregá el bloque de abajo en la configuración MCP del editor, por
              ejemplo <code>.cursor/mcp.json</code>. La ruta al archivo{" "}
              <code>mcp-server/index.ts</code> tiene que ser absoluta. También
              podés probarlo en la terminal con <code>npm run mcp</code>.
            </span>
          </li>
          <li className={styles.step}>
            <span className={styles.stepNumber}>Paso 3</span>
            <span className={styles.stepTitle}>Remitente, plantilla y key</span>
            <span className={styles.stepDesc}>
              Creá un remitente SMTP y marcalo como predeterminado. Para Gmail,
              usá una contraseña de aplicación, host <code>smtp.gmail.com</code>{" "}
              y puerto 587. Creá la plantilla y, si el envío va por HTTP, una API
              key. La key completa solo se muestra al crearla.
            </span>
          </li>
        </ol>
        <div className={styles.codeBlock}>
          <button
            type="button"
            onClick={() => copy("config", MCP_CONFIG)}
            className={styles.copyBtn}
          >
            {copied === "config" ? "Copiado" : "Copiar configuración"}
          </button>
          <pre className={styles.code}>{MCP_CONFIG}</pre>
        </div>
      </section>
    </div>
  );
}
