import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { replyMessages, verifyLineSignature, flexListMessage } from "@/lib/line";
import type { Repair, RepairStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// LINE webhook event types (เฉพาะที่ใช้)
type Source = {
  type: "user" | "group" | "room";
  userId?: string;
  groupId?: string;
  roomId?: string;
};
type Event = {
  type: string;
  replyToken?: string;
  source: Source;
  message?: { type: string; text?: string };
};

// คำสั่ง → ตัวกรองสถานะ (null = ทั้งหมด)
const COMMANDS: { keys: string[]; status: RepairStatus | null; label: string }[] = [
  { keys: ["/list", "ดูทั้งหมด", "รายการ", "list"], status: null, label: "รายการแจ้งซ่อมทั้งหมด" },
  { keys: ["ดูรอ", "ดูรอรับเรื่อง", "/pending", "รอรับเรื่อง"], status: "pending", label: "รายการรอรับเรื่อง" },
  { keys: ["ดูรับ", "ดูรับเรื่อง", "ดูรับเรื่องแล้ว", "/accepted"], status: "accepted", label: "รายการที่รับเรื่องแล้ว" },
  { keys: ["ดูกำลัง", "ดูกำลังดำเนินการ", "/inprogress", "กำลังดำเนินการ"], status: "in_progress", label: "รายการกำลังดำเนินการ" },
  { keys: ["ดูเสร็จ", "ดูเสร็จสิ้น", "/done", "/completed", "เสร็จสิ้น"], status: "completed", label: "รายการที่เสร็จสิ้นแล้ว" }
];

const ID_KEYWORDS = ["/id", "ขอไอดี", "ขอ id", "groupid", "group id", "ไอดีกลุ่ม", "id กลุ่ม"];
const HELP_KEYWORDS = ["/help", "ช่วยเหลือ", "help", "คำสั่ง"];

const HELP_TEXT =
  "📖 คำสั่งที่ใช้ได้\n" +
  "• /id หรือ \"ขอไอดี\" — ดู Group ID\n" +
  "• /list หรือ \"ดูทั้งหมด\" — รายการแจ้งซ่อมทั้งหมด\n" +
  "• \"ดูรอรับเรื่อง\" / /pending\n" +
  "• \"ดูรับเรื่องแล้ว\" / /accepted\n" +
  "• \"ดูกำลังดำเนินการ\" / /inprogress\n" +
  "• \"ดูเสร็จสิ้น\" / /done\n" +
  "• /help — แสดงคำสั่ง";

function matchCommand(text: string) {
  const t = text.trim().toLowerCase();
  if (HELP_KEYWORDS.some((k) => t === k || t.startsWith(k + " "))) {
    return { kind: "help" as const };
  }
  if (ID_KEYWORDS.some((k) => t === k || t.startsWith(k + " "))) {
    return { kind: "id" as const };
  }
  for (const c of COMMANDS) {
    if (c.keys.some((k) => t === k.toLowerCase() || t.startsWith(k.toLowerCase() + " "))) {
      return { kind: "list" as const, status: c.status, label: c.label };
    }
  }
  return null;
}

function sourceIdLabel(src: Source) {
  if (src.type === "group") return `🆔 Group ID:\n${src.groupId}`;
  if (src.type === "room") return `🆔 Room ID:\n${src.roomId}`;
  return `🆔 User ID:\n${src.userId}`;
}

async function fetchRepairs(status: RepairStatus | null, limit = 20): Promise<Repair[]> {
  let q = supabaseAdmin
    .from("repairs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) {
    console.error("supabase fetch error:", error);
    return [];
  }
  return (data || []) as Repair[];
}

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-line-signature");

  // ถ้ามี secret ตั้งไว้ → ตรวจ signature; ถ้าไม่ตั้ง → เตือนแล้วผ่าน (เผื่อ dev)
  if (process.env.LINE_CHANNEL_SECRET) {
    if (!verifyLineSignature(raw, sig)) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }
  } else {
    console.warn("LINE_CHANNEL_SECRET not set — skipping signature verify");
  }

  let body: { events?: Event[] };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const events = body.events || [];
  await Promise.all(events.map(handleEvent));

  return NextResponse.json({ ok: true });
}

async function handleEvent(ev: Event) {
  if (ev.type !== "message" || ev.message?.type !== "text" || !ev.replyToken) return;
  const text = ev.message.text || "";
  const cmd = matchCommand(text);
  if (!cmd) return; // เงียบไว้ ไม่ตอบทุกข้อความ

  if (cmd.kind === "help") {
    await replyMessages(ev.replyToken, [{ type: "text", text: HELP_TEXT }]);
    return;
  }

  if (cmd.kind === "id") {
    await replyMessages(ev.replyToken, [
      { type: "text", text: sourceIdLabel(ev.source) },
      {
        type: "text",
        text:
          "นำค่านี้ไปใส่ในตัวแปรแวดล้อม LINE_GROUP_ID บน Vercel\nเพื่อให้ระบบส่งแจ้งเตือนเข้ากลุ่มนี้ได้"
      }
    ]);
    return;
  }

  if (cmd.kind === "list") {
    const repairs = await fetchRepairs(cmd.status);
    const messages = flexListMessage(cmd.label, repairs);
    await replyMessages(ev.replyToken, messages);
    return;
  }
}

// LINE จะ verify URL ตอน setup — ตอบ 200 ไว้ให้
export async function GET() {
  return NextResponse.json({ ok: true, msg: "LINE webhook" });
}
