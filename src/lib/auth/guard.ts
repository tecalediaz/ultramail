import { NextResponse } from "next/server";
import { getSession } from "./session";

export async function requirePanelSession() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return null;
}
