"use client";

import { useEffect, useMemo, useState } from "react";
import type { Repair, RepairStatus } from "@/lib/types";
import { STATUS_LABEL, STATUS_COLOR } from "@/lib/types";

const FILTERS: { key: "all" | RepairStatus; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "pending", label: "รอรับเรื่อง" },
  { key: "accepted", label: "รับเรื่องแล้ว" },
  { key: "in_progress", label: "กำลังดำเนินการ" },
  { key: "completed", label: "เสร็จสิ้น" }
];

export default function AdminPage() {
  const [password, setPassword] = useState<string>("");
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const p = sessionStorage.getItem("admin-pass");
    if (p) {
      setPassword(p);
      setAuthed(true);
    }
  }, []);

  if (!authed) {
    return (
      <div className="card max-w-sm mx-auto space-y-4">
        <h1 className="text-xl font-bold text-brand-700">เข้าสู่หน้าผู้ดูแล</h1>
        <input
          type="password"
          className="input"
          placeholder="รหัสผ่านผู้ดูแล"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          className="btn-primary w-full"
          onClick={() => {
            sessionStorage.setItem("admin-pass", password);
            setAuthed(true);
          }}
        >
          เข้าสู่ระบบ
        </button>
      </div>
    );
  }

  return <AdminList password={password} onLogout={() => { sessionStorage.removeItem("admin-pass"); setAuthed(false); }} />;
}

function AdminList({ password, onLogout }: { password: string; onLogout: () => void }) {
  const [items, setItems] = useState<Repair[]>([]);
  const [filter, setFilter] = useState<"all" | RepairStatus>("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/repairs", { cache: "no-store" });
    const json = await res.json();
    setItems(json.data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((r) => r.status === filter)),
    [items, filter]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const r of items) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, [items]);

  async function updateStatus(id: string, status: RepairStatus, extra?: { handler?: string }) {
    setBusyId(id);
    const res = await fetch(`/api/repairs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ status, ...(extra || {}) })
    });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error || "อัปเดตไม่สำเร็จ");
    } else {
      setItems((prev) => prev.map((r) => (r.id === id ? json.data : r)));
    }
    setBusyId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-700">รายการแจ้งซ่อม</h1>
        <div className="flex gap-2">
          <button onClick={load} className="btn-ghost text-sm">🔄 รีเฟรช</button>
          <button onClick={onLogout} className="btn-ghost text-sm">ออก</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
              filter === f.key ? "bg-brand-500 text-white" : "bg-white text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"
            }`}
          >
            {f.label} {counts[f.key] ? <span className="opacity-70">({counts[f.key]})</span> : null}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card text-center text-slate-500">กำลังโหลด...</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center text-slate-500">ไม่มีรายการ</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <RepairCard key={r.id} repair={r} busy={busyId === r.id} onAction={updateStatus} />
          ))}
        </div>
      )}
    </div>
  );
}

function RepairCard({
  repair,
  busy,
  onAction
}: {
  repair: Repair;
  busy: boolean;
  onAction: (id: string, status: RepairStatus, extra?: { handler?: string }) => void;
}) {
  const [open, setOpen] = useState(false);

  function accept() {
    const handler = prompt("ชื่อผู้รับผิดชอบ:");
    if (!handler) return;
    onAction(repair.id, "accepted", { handler });
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`badge ${STATUS_COLOR[repair.status]}`}>{STATUS_LABEL[repair.status]}</span>
            <span className="text-xs text-slate-400">#{repair.id.slice(0, 8)}</span>
            <span className="text-xs text-slate-400">
              {new Date(repair.created_at).toLocaleString("th-TH")}
            </span>
          </div>
          <h3 className="font-bold text-lg mt-1 text-slate-800">{repair.title}</h3>
          <div className="text-sm text-slate-600 mt-1 space-y-0.5">
            {repair.location && <div>📍 {repair.location}</div>}
            <div>👤 {repair.reporter}{repair.phone ? ` · ${repair.phone}` : ""}</div>
            {repair.handler && <div>🔧 ผู้รับผิดชอบ: <b>{repair.handler}</b></div>}
          </div>
        </div>
        {repair.image_url && (
          <a href={repair.image_url} target="_blank" rel="noreferrer" className="shrink-0">
            <img src={repair.image_url} alt="" className="w-20 h-20 object-cover rounded-xl ring-1 ring-orange-100" />
          </a>
        )}
      </div>

      {repair.description && (
        <details open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
          <summary className="cursor-pointer text-sm text-brand-700 select-none">
            {open ? "ซ่อนรายละเอียด" : "ดูรายละเอียด"}
          </summary>
          <p className="text-sm text-slate-700 whitespace-pre-wrap mt-2 bg-orange-50/50 p-3 rounded-lg">
            {repair.description}
          </p>
        </details>
      )}

      <div className="flex flex-wrap gap-2 pt-2 border-t border-orange-100">
        {repair.status === "pending" && (
          <button disabled={busy} onClick={accept} className="btn-primary text-sm">📥 รับเรื่อง</button>
        )}
        {repair.status === "accepted" && (
          <button disabled={busy} onClick={() => onAction(repair.id, "in_progress")} className="btn-primary text-sm">
            ⚙️ เริ่มดำเนินการ
          </button>
        )}
        {(repair.status === "accepted" || repair.status === "in_progress") && (
          <button disabled={busy} onClick={() => onAction(repair.id, "completed")} className="btn text-sm bg-emerald-500 text-white hover:bg-emerald-600">
            ✅ เสร็จสิ้น
          </button>
        )}
        {repair.status === "completed" && (
          <span className="text-sm text-emerald-700 font-medium">
            เสร็จเมื่อ {repair.completed_at ? new Date(repair.completed_at).toLocaleString("th-TH") : "-"}
          </span>
        )}
      </div>
    </div>
  );
}
