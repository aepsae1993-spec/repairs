export type RepairStatus = "pending" | "accepted" | "in_progress" | "completed";

export type Repair = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  reporter: string;
  phone: string | null;
  image_url: string | null;
  status: RepairStatus;
  handler: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export const STATUS_LABEL: Record<RepairStatus, string> = {
  pending: "รอรับเรื่อง",
  accepted: "รับเรื่องแล้ว",
  in_progress: "กำลังดำเนินการ",
  completed: "เสร็จสิ้น"
};

export const STATUS_COLOR: Record<RepairStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-blue-100 text-blue-800",
  in_progress: "bg-violet-100 text-violet-800",
  completed: "bg-emerald-100 text-emerald-800"
};
