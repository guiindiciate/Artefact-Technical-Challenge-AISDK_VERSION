import { NextResponse } from "next/server";
import { clearSession } from "@/src/lib/memory";

export async function POST(req: Request) {
  const body = (await req.json()) as { session_id: string };
  clearSession(body.session_id || "default");
  return NextResponse.json({ ok: true });
}
