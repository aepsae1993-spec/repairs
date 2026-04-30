import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { notifyNew } from "@/lib/line";
import type { Repair, RepairStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as RepairStatus | null;

  let q = supabaseAdmin.from("repairs").select("*").order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { title, description, location, reporter, phone, image_url } = body ?? {};

  if (!title || !reporter) {
    return NextResponse.json({ error: "กรุณากรอกชื่อเรื่องและชื่อผู้แจ้ง" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("repairs")
    .insert({
      title,
      description: description ?? null,
      location: location ?? null,
      reporter,
      phone: phone ?? null,
      image_url: image_url ?? null
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ส่งแจ้งเตือนเข้า LINE กลุ่ม (ไม่ block หาก fail)
  try {
    await notifyNew(data as Repair);
  } catch (e) {
    console.error("LINE notify failed", e);
  }

  return NextResponse.json({ data });
}
