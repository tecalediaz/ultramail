import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import {
  getClientIp,
  secureCompare,
  checkLoginBlocked,
  recordFailedLogin,
  clearLoginAttempts,
} from "@/lib/auth/rate-limit";

function dbErrorCode(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }
  return "unknown";
}

// Neon can suspend the compute. A dead pool then throws before the password
// is checked, and the client only sees a generic login error. Retry once on a
// fresh connection; if the database is still down, do not turn that into a 500.
async function withLoginStore<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.error("login rate-limit failed", dbErrorCode(error));
    try {
      await prisma.$disconnect();
    } catch {
      // The client may already be disconnected.
    }
    try {
      return await run();
    } catch (retryError) {
      console.error("login rate-limit failed", dbErrorCode(retryError));
      return fallback;
    }
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  const blocked = await withLoginStore(() => checkLoginBlocked(ip), {
    blocked: false,
  });
  if (blocked.blocked) {
    return NextResponse.json(
      {
        error:
          "Tras 10 intentos fallidos, el acceso queda bloqueado por 5 minutos.",
        retryAfter: blocked.retryAfter,
      },
      {
        status: 429,
        headers: blocked.retryAfter
          ? { "Retry-After": String(blocked.retryAfter) }
          : undefined,
      }
    );
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { password } = body;
  const expectedPassword = process.env.PANEL_PASSWORD ?? "";

  if (!password || !secureCompare(password, expectedPassword)) {
    const result = await withLoginStore(() => recordFailedLogin(ip), {
      blocked: false,
    });
    if (result.blocked) {
      return NextResponse.json(
        {
          error:
            "Tras 10 intentos fallidos, el acceso queda bloqueado por 5 minutos.",
          retryAfter: result.retryAfter,
        },
        {
          status: 429,
          headers: result.retryAfter
            ? { "Retry-After": String(result.retryAfter) }
            : undefined,
        }
      );
    }
    return NextResponse.json(
      {
        error: "Contraseña incorrecta",
        attemptsLeft: result.attemptsLeft,
      },
      { status: 401 }
    );
  }

  await withLoginStore(async () => {
    await clearLoginAttempts(ip);
    return true;
  }, false);

  const session = await getSession();
  session.isLoggedIn = true;
  await session.save();

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const session = await getSession();
  session.destroy();
  return NextResponse.json({ success: true });
}
