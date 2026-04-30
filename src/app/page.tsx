"use client";

import { useState } from "react";

export default function Home() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<null | { id: string }>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const fd = new FormData(e.currentTarget);
      const file = fd.get("file") as File | null;

      let imageUrl: string | null = null;
      if (file && file.size > 0) {
        const upFd = new FormData();
        upFd.append("file", file);
        const upRes = await fetch("/api/upload", { method: "POST", body: upFd });
        const upJson = await upRes.json();
        if (!upRes.ok) throw new Error(upJson.error || "อัปโหลดรูปไม่สำเร็จ");
        imageUrl = upJson.url;
      }

      const res = await fetch("/api/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: fd.get("title"),
          description: fd.get("description"),
          location: fd.get("location"),
          reporter: fd.get("reporter"),
          phone: fd.get("phone"),
          image_url: imageUrl
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "ส่งคำขอไม่สำเร็จ");
      setDone({ id: json.data.id });
      (e.target as HTMLFormElement).reset();
      setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="card text-center space-y-4">
        <div className="text-6xl">✅</div>
        <h1 className="text-2xl font-bold text-brand-700">ส่งคำขอแจ้งซ่อมสำเร็จ</h1>
        <p className="text-slate-600">
          รหัสคำขอ: <code className="bg-brand-50 px-2 py-1 rounded">#{done.id.slice(0, 8)}</code>
        </p>
        <p className="text-sm text-slate-500">เจ้าหน้าที่ได้รับเรื่องและแจ้งเตือนใน LINE กลุ่มแล้ว</p>
        <button onClick={() => setDone(null)} className="btn-primary">แจ้งซ่อมรายการใหม่</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="card bg-gradient-to-br from-brand-500 to-amber-500 text-white">
        <h1 className="text-2xl font-bold">แจ้งซ่อมออนไลน์</h1>
        <p className="text-white/90 text-sm mt-1">
          กรอกข้อมูล แนบรูป แล้วกดส่ง — ระบบจะแจ้งเตือนผู้ดูแลผ่าน LINE ทันที
        </p>
      </div>

      <form onSubmit={onSubmit} className="card space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">เรื่องที่จะแจ้งซ่อม *</label>
          <input name="title" required className="input" placeholder="เช่น หลอดไฟห้องประชุมเสีย" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">รายละเอียดเพิ่มเติม</label>
          <textarea name="description" rows={3} className="input" placeholder="อธิบายอาการ/ความเร่งด่วน ฯลฯ" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">สถานที่</label>
            <input name="location" className="input" placeholder="เช่น อาคาร A ชั้น 3 ห้อง 305" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์ติดต่อ</label>
            <input name="phone" className="input" placeholder="เช่น 081-234-5678" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อผู้แจ้ง *</label>
          <input name="reporter" required className="input" placeholder="ชื่อ-นามสกุล" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">รูปประกอบ</label>
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-brand-300 rounded-xl p-6 bg-brand-50/50 cursor-pointer hover:bg-brand-50 transition">
            {preview ? (
              <img src={preview} alt="preview" className="max-h-64 rounded-lg" />
            ) : (
              <>
                <span className="text-4xl">📷</span>
                <span className="text-sm text-brand-700 font-medium">แตะเพื่อเลือก/ถ่ายรูป</span>
                <span className="text-xs text-slate-500">รองรับ JPG, PNG (ไม่เกิน 8MB)</span>
              </>
            )}
            <input
              type="file"
              name="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setPreview(f ? URL.createObjectURL(f) : null);
              }}
            />
          </label>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm border border-red-200">
            {error}
          </div>
        )}

        <button type="submit" disabled={submitting} className="btn-primary w-full text-lg py-3 disabled:opacity-60">
          {submitting ? "กำลังส่ง..." : "📤 ส่งแจ้งซ่อม"}
        </button>
      </form>
    </div>
  );
}
