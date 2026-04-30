import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { notifyStatus } from "@/lib/line";
import type { Repair, RepairStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function isAdmin(req: Request) {
  if (!ADMIN_PASSWORD) return true; // ถ้าไม่ตั้งรหัสไว้ = ปล่อยผ่าน (dev)
  const pass = req.headers.get("x-admin-password");
  return pass === ADMIN_PASSWORD;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 401 });
  }

  const body = await req.json();
  const allowed = ["status", "handler", "note"] as const;
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) update[k] = body[k];

  if ("status" in update) {
    const s = update.status as RepairStatus;
    if (!["pending", "accepted", "in_progress", "completed"].includes(s)) {
      return NextResponse.json({ error: "สถานะไม่ถูกต้อง" }, { status: 400 });
    }
  }

  const { data, error } = await supabaseAdmin
    .from("repairs")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // แจ้งเตือน LINE เมื่อเปลี่ยนสถานะ
  if ("status" in update) {
    try {
      await notifyStatus(data as Repair);
    } catch (e) {
      console.error("LINE notify failed", e);
    }
  }

  return NextResponse.json({ data });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 401 });
  }

  const { error } = await supabaseAdmin.from("repairs").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
