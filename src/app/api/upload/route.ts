import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_UPLOAD_URL;
const SECRET = process.env.APPS_SCRIPT_SECRET;

// รับไฟล์จาก client (multipart/form-data)
// แปลงเป็น base64 แล้วส่งให้ Google Apps Script เก็บลง Drive
export async function POST(req: Request) {
  if (!APPS_SCRIPT_URL) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า APPS_SCRIPT_UPLOAD_URL" }, { status: 500 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "ไม่พบไฟล์" }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "ไฟล์ใหญ่เกิน 8MB" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const base64 = buf.toString("base64");

  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret: SECRET,
      filename: file.name || `repair-${Date.now()}.jpg`,
      mimeType: file.type || "image/jpeg",
      data: base64
    })
  });

  if (!res.ok) {
    const txt = await res.text();
    return NextResponse.json({ error: `Upload failed: ${txt}` }, { status: 500 });
  }
  const json = await res.json();
  if (!json.url) {
    return NextResponse.json({ error: json.error || "อัปโหลดไม่สำเร็จ" }, { status: 500 });
  }
  return NextResponse.json({ url: json.url });
}
