// รองรับหลายรหัสใน ADMIN_PASSWORD โดยคั่นด้วย comma หรือ newline
// เช่น ADMIN_PASSWORD = "alice123,bob456,carol789"
// (เว้นวรรครอบ ๆ ก็ได้ — โค้ดจะ trim ให้)

function getValidPasswords(): string[] {
  const raw = process.env.ADMIN_PASSWORD || "";
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isValidAdminPassword(input: string | null | undefined): boolean {
  const list = getValidPasswords();
  if (list.length === 0) return true; // ไม่ตั้งรหัส = dev mode ปล่อยผ่าน
  if (!input) return false;
  return list.includes(input);
}

export function isAdminRequest(req: Request): boolean {
  const pass = req.headers.get("x-admin-password");
  return isValidAdminPassword(pass);
}
