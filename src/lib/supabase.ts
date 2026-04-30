import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ใช้ฝั่ง server เท่านั้น (มี service role key — ข้าม RLS ได้)
export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false }
});
