import { NextResponse } from "next/server";
import { isValidAdminPassword } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const ok = isValidAdminPassword(body?.password);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "รหัสไม่ถูกต้อง" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
