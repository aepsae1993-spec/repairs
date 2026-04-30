"use client";

import { useRef, useState } from "react";

export default function Home() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<null | { id: string }>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  function pickFile(f: File | null) {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  function clearFile() {
    setFile(null);
    setPreview(null);
    if (cameraRef.current) cameraRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const fd = new FormData(e.currentTarget);

      let imageUrl: string | null = null;
      if (file && file.size > 0) {
        // ใช้ไฟล์จาก state — ครอบคลุมทั้งกล้องและคลัง
        // (ลบไฟล์จาก FormData กันทับกัน)
        fd.delete("file");
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
      clearFile();
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

          {/* hidden inputs — ตัวจัดการการเลือกไฟล์จริง */}
          <input
            ref={galleryRef}
            type="file"
            name="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />

          {preview ? (
            <div className="rounded-xl border-2 border-brand-200 bg-white p-3 space-y-3">
              <img src={preview} alt="preview" className="max-h-64 mx-auto rounded-lg" />
              <div className="flex gap-2 justify-center">
                <button type="button" onClick={() => galleryRef.current?.click()} className="btn-ghost text-sm">
                  🔁 เปลี่ยนรูป
                </button>
                <button type="button" onClick={clearFile} className="btn text-sm bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100">
                  🗑️ ลบ
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-brand-300 rounded-xl p-5 bg-brand-50/50 hover:bg-brand-50 active:scale-[.98] transition"
              >
                <span className="text-3xl">🖼️</span>
                <span className="text-sm text-brand-700 font-medium">เลือกจากคลัง</span>
              </button>
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-brand-300 rounded-xl p-5 bg-brand-50/50 hover:bg-brand-50 active:scale-[.98] transition"
              >
                <span className="text-3xl">📷</span>
                <span className="text-sm text-brand-700 font-medium">ถ่ายรูป</span>
              </button>
            </div>
          )}
          <p className="text-xs text-slate-500 mt-2">รองรับ JPG, PNG (ไม่เกิน 8MB)</p>
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
