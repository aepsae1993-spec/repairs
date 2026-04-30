import crypto from "crypto";
import type { Repair, RepairStatus } from "./types";
import { STATUS_LABEL } from "./types";
import { toDisplayImage } from "./image";

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!;
const GROUP_ID = process.env.LINE_GROUP_ID!;
const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || "";

type LineMessage = Record<string, unknown>;

// ---------- low-level senders ----------
async function pushToGroup(messages: LineMessage[]) {
  if (!TOKEN || !GROUP_ID) {
    console.warn("LINE env not set — skip push");
    return;
  }
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`
    },
    body: JSON.stringify({ to: GROUP_ID, messages })
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error("LINE push error:", res.status, txt);
  }
}

export async function replyMessages(replyToken: string, messages: LineMessage[]) {
  if (!TOKEN) {
    console.warn("[LINE reply] LINE_CHANNEL_ACCESS_TOKEN not set — skip");
    return;
  }
  const res = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`
    },
    body: JSON.stringify({ replyToken, messages })
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error("[LINE reply] error", res.status, txt);
  } else {
    console.log("[LINE reply] ok");
  }
}

// ---------- signature verify ----------
export function verifyLineSignature(rawBody: string, signature: string | null): boolean {
  if (!CHANNEL_SECRET || !signature) return false;
  const hmac = crypto.createHmac("sha256", CHANNEL_SECRET).update(rawBody).digest("base64");
  // timing-safe compare
  const a = Buffer.from(hmac);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ---------- flex builders ----------
const COLOR: Record<RepairStatus, string> = {
  pending: "#f59e0b",
  accepted: "#3b82f6",
  in_progress: "#8b5cf6",
  completed: "#10b981"
};

function flexCard(altTitle: string, repair: Repair, headline: string) {
  const lines: { label: string; value: string }[] = [
    { label: "เรื่อง", value: repair.title },
    { label: "สถานที่", value: repair.location || "-" },
    { label: "ผู้แจ้ง", value: repair.reporter },
    { label: "สถานะ", value: STATUS_LABEL[repair.status] }
  ];
  if (repair.handler) lines.push({ label: "ผู้รับผิดชอบ", value: repair.handler });
  if (repair.description) lines.push({ label: "รายละเอียด", value: repair.description });

  return {
    type: "flex",
    altText: `${headline}: ${repair.title}`,
    contents: bubble(repair, headline, lines)
  };
}

function bubble(repair: Repair, headline: string, lines: { label: string; value: string }[]) {
  return {
    type: "bubble",
    size: "kilo",
    ...(repair.image_url
      ? {
          hero: {
            type: "image",
            url: toDisplayImage(repair.image_url, 1024)!,
            size: "full",
            aspectRatio: "20:13",
            aspectMode: "cover"
          }
        }
      : {}),
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        { type: "text", text: headline, weight: "bold", color: COLOR[repair.status], size: "sm" },
        { type: "text", text: repair.title, weight: "bold", size: "lg", wrap: true },
        { type: "separator", margin: "md" },
        ...lines.map((l) => ({
          type: "box",
          layout: "baseline",
          spacing: "sm",
          contents: [
            { type: "text", text: l.label, size: "sm", color: "#9ca3af", flex: 2 },
            { type: "text", text: l.value, size: "sm", color: "#111827", flex: 5, wrap: true }
          ]
        }))
      ]
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: `รหัส #${repair.id.slice(0, 8)} · ${new Date(repair.created_at).toLocaleString("th-TH")}`,
          size: "xxs",
          color: "#9ca3af",
          align: "end",
          wrap: true
        }
      ]
    }
  };
}

// Carousel ของหลายรายการ (LINE จำกัด 12 bubble/carousel)
export function flexListMessage(title: string, repairs: Repair[]) {
  if (repairs.length === 0) {
    return [{ type: "text", text: `📭 ไม่พบรายการ — ${title}` }];
  }
  const top = repairs.slice(0, 12);
  const bubbles = top.map((r) => {
    const headline = `${STATUS_LABEL[r.status]}`;
    const lines: { label: string; value: string }[] = [
      { label: "สถานที่", value: r.location || "-" },
      { label: "ผู้แจ้ง", value: r.reporter }
    ];
    if (r.handler) lines.push({ label: "ผู้รับผิดชอบ", value: r.handler });
    return bubble(r, headline, lines);
  });

  const altText = `${title} (${repairs.length} รายการ)`;
  return [
    { type: "text", text: `📋 ${title} (${repairs.length} รายการ${repairs.length > 12 ? " — แสดง 12 ล่าสุด" : ""})` },
    { type: "flex", altText, contents: { type: "carousel", contents: bubbles } }
  ];
}

// ---------- public push helpers ----------
export async function notifyNew(repair: Repair) {
  await pushToGroup([flexCard("แจ้งซ่อมใหม่", repair, "🛠️ มีเรื่องแจ้งซ่อมใหม่")]);
}

export async function notifyStatus(repair: Repair) {
  const headline =
    repair.status === "accepted"
      ? "📥 รับเรื่องแล้ว"
      : repair.status === "in_progress"
      ? "⚙️ กำลังดำเนินการ"
      : repair.status === "completed"
      ? "✅ ซ่อมเสร็จสิ้น"
      : "อัปเดตสถานะ";
  await pushToGroup([flexCard("อัปเดตสถานะ", repair, headline)]);
}
