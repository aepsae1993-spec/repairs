// แปลง URL ของ Google Drive ให้เป็นรูปแบบที่ฝังใน <img> ได้
// ปัจจุบัน https://drive.google.com/uc?export=view&id=... โดน Google block hotlink
// ให้ใช้ https://drive.google.com/thumbnail?id=...&sz=w1600 แทน (เสถียรกว่า)

const DRIVE_ID_RE =
  /(?:drive\.google\.com\/(?:uc\?(?:[^#]*&)?id=|file\/d\/|thumbnail\?(?:[^#]*&)?id=|open\?id=)|googleusercontent\.com\/d\/)([A-Za-z0-9_-]{20,})/;

export function toDisplayImage(url: string | null | undefined, size = 1600): string | null {
  if (!url) return null;
  const m = url.match(DRIVE_ID_RE);
  if (!m) return url; // ไม่ใช่ Drive — ใช้ URL เดิม
  const id = m[1];
  return `https://drive.google.com/thumbnail?id=${id}&sz=w${size}`;
}
