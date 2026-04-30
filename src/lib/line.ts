import type { Repair } from "./types";
import { STATUS_LABEL } from "./types";

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!;
const GROUP_ID = process.env.LINE_GROUP_ID!;

type LineMessage = Record<string, unknown>;

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

const COLOR = {
  pending: "#f59e0b",
  accepted: "#3b82f6",
  in_progress: "#8b5cf6",
  completed: "#10b981"
} as const;

function flexCard(title: string, repair: Repair, headline: string) {
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
    contents: {
      type: "bubble",
      size: "kilo",
      ...(repair.image_url
        ? {
            hero: {
              type: "image",
              url: repair.image_url,
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
          {
            type: "text",
            text: headline,
            weight: "bold",
            color: COLOR[repair.status],
            size: "sm"
          },
          { type: "text", text: title, weight: "bold", size: "lg", wrap: true },
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
            text: `รหัส #${repair.id.slice(0, 8)}`,
            size: "xxs",
            color: "#9ca3af",
            align: "end"
          }
        ]
      }
    }
  };
}

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
