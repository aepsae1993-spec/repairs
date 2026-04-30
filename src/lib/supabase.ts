import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ใช้ฝั่ง server เท่านั้น (มี service role key — ข้าม RLS ได้)
// สร้างแบบ lazy เพื่อไม่ให้ build fail ตอน Vercel ยังไม่ได้ตั้ง env
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase env not set. ตั้งค่า NEXT_PUBLIC_SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  _client = createClient(url, serviceKey, { auth: { persistSession: false } });
  return _client;
}

// Proxy ทำให้ใช้ supabaseAdmin.from(...) ได้เหมือนเดิม โดยสร้าง client ตอนถูกเรียกครั้งแรก
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    const c = getClient() as unknown as Record<string | symbol, unknown>;
    const v = c[prop];
    return typeof v === "function" ? (v as Function).bind(c) : v;
  }
});
