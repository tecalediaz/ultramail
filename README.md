# Ultramail

Microservicio privado para diseñar plantillas de correo, enviarlas por API y revisar historial, actividad y métricas desde un panel.

## Qué incluye

- Plantillas HTML con variables `{{nombre}}` en el asunto y en el cuerpo.
- Envío por `POST /api/send` con API key, remitente SMTP elegido o el predeterminado, y adjuntos (base64 o URL `https`, hasta 10 MB en total).
- Varios remitentes SMTP. Las contraseñas se guardan cifradas.
- Historial de envíos, auditoría de la API, métricas de 7, 14 y 30 días y alertas de remitentes con fallos de verificación.
- Newsletter de la landing y servidor MCP con las mismas operaciones que el panel.

## Requisitos

- Node.js 20 o superior
- PostgreSQL

## Puesta en marcha

```bash
npm install
cp .env.example .env
```

Completá `.env` en local. No lo subas al repositorio. Las variables son:

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Conexión a Postgres (con pooler, si el proveedor lo separa) |
| `DIRECT_URL` | Conexión directa, la que usa Prisma para el esquema |
| `ENCRYPTION_KEY` | Secreto de al menos 32 caracteres para cifrar contraseñas SMTP |
| `PANEL_PASSWORD` | Contraseña del panel |
| `SESSION_SECRET` | Secreto de al menos 32 caracteres para la cookie de sesión |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app |

No hay carpeta de migraciones. El esquema vive en `prisma/schema.prisma`. Para crearlo o actualizarlo en la base:

```bash
npx prisma db push
npm run dev
```

- Landing: [http://localhost:3000](http://localhost:3000)
- Panel: [http://localhost:3000/login](http://localhost:3000/login)

Diez intentos fallidos de login bloquean esa IP durante 5 minutos.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Genera el cliente de Prisma y compila Next.js |
| `npm run start` | Sirve la build |
| `npm run mcp` | Arranca el servidor MCP por stdio |

## API

Públicas:

- `POST /api/send` — header `X-API-Key`. Cuerpo: `template_id`, `to`, y de forma opcional `variables`, `sender_id` y `attachments`.
- `POST /api/newsletter` — cuerpo `{ "name", "email" }`. Sin API key.
- `GET /api/health` — estado de la base y de los remitentes. Sin API key.

El resto de `/api/*` (plantillas, logs, auditoría, métricas, remitentes, keys, alta y baja de suscriptores, envío de prueba) exige la sesión del panel. `GET /api/metrics?days=` acepta 7, 14 o 30. `GET /api/logs?q=` filtra por destinatario.

La documentación de uso, con el ejemplo de envío y la lista de herramientas, está en el panel en `/mcp`.

## MCP

El servidor está en `mcp-server/index.ts`. Al arrancar lee `.env` y necesita `DATABASE_URL`, `DIRECT_URL` y `ENCRYPTION_KEY`. En el cliente MCP, apuntá el comando a ese archivo con una ruta absoluta, o usá `npm run mcp`.

Las herramientas cubren plantillas, envíos, historial, remitentes, métricas (`days`: 7, 14 o 30), API keys, auditoría y suscriptores. `ultramail_create_api_key` es la única que devuelve la key completa. El resto la enmascara.

## Panel

Plantillas, historial, actividad de la API, métricas, newsletter y configuración de remitentes y API keys. La ruta `/mcp` del menú es la documentación de uso.
