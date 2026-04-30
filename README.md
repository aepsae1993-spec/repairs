# 🛠️ ระบบแจ้งซ่อม

ระบบแจ้งซ่อมออนไลน์ พร้อมแจ้งเตือนผ่าน LINE OA  
**Stack:** Next.js 14 (App Router) · Supabase · Google Drive (Apps Script) · LINE Messaging API · Vercel

---

## ✨ ฟีเจอร์

- 📝 หน้าแจ้งซ่อม: กรอกเรื่อง รายละเอียด สถานที่ ผู้แจ้ง พร้อมแนบ/ถ่ายรูป
- 📷 รูปภาพเก็บที่ Google Drive ผ่าน Apps Script
- 💾 ข้อมูลเก็บที่ Supabase (Postgres)
- 🔔 แจ้งเตือน LINE กลุ่ม ทั้งตอน "แจ้งใหม่" และ "อัปเดตสถานะ"
- 🧰 หน้าผู้ดูแล: รับเรื่อง → กำลังดำเนินการ → เสร็จสิ้น
- 🎨 ดีไซน์โทนส้ม-อำพัน ดูสะอาดและอบอุ่น ใช้บนมือถือสะดวก

---

## 🧭 ภาพรวมการทำงาน

```
ผู้แจ้ง --(กรอกฟอร์ม + รูป)--> Next.js (Vercel)
                                  │
                  ┌───────────────┼─────────────────┐
                  ▼               ▼                 ▼
              Supabase     Apps Script(Drive)   LINE OA
              (เก็บข้อมูล)   (เก็บรูป)         (แจ้งกลุ่ม)
```

---

## 🚀 ขั้นตอนการติดตั้ง

### 1) Supabase

1. สร้างโปรเจกต์ที่ https://supabase.com
2. เปิด **SQL Editor** → วางไฟล์ [`supabase/schema.sql`](supabase/schema.sql) แล้ว Run
3. ที่ **Project Settings → API** ก๊อป
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (เก็บเป็นความลับ ใช้ฝั่ง server เท่านั้น)

### 2) Google Drive + Apps Script (เก็บรูป)

1. สร้างโฟลเดอร์ใน Google Drive สำหรับเก็บรูป → เปิด URL จะเห็น `folders/<FOLDER_ID>`
2. เปิด https://script.google.com → New project → วางไฟล์ [`apps-script/Code.gs`](apps-script/Code.gs)
3. แก้ค่าในไฟล์
   - `DRIVE_FOLDER_ID` = ID ของโฟลเดอร์
   - `SECRET` = รหัสลับ (ตั้งเอง)
4. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. ก๊อป Web app URL → `APPS_SCRIPT_UPLOAD_URL`
   ตั้ง `APPS_SCRIPT_SECRET` ใน `.env` ให้ตรงกับใน script

### 3) LINE Messaging API

1. สร้าง Provider + Channel (Messaging API) ที่ https://developers.line.biz/console
2. ในหน้า Channel:
   - **Channel secret** (Basic settings) → `LINE_CHANNEL_SECRET`
   - กด **Issue** เอา **Channel access token (long-lived)** → `LINE_CHANNEL_ACCESS_TOKEN`
   - ปิด **Auto-reply messages** (LINE Official Account Manager) ป้องกันบอตตอบ default
   - เปิด **Use webhooks**
3. ตั้ง **Webhook URL** เป็น `https://<your-vercel-domain>/api/line/webhook` แล้วกด **Verify**
4. **เพิ่ม LINE OA เข้ากลุ่มที่ต้องการ**
5. หา **Group ID** — ในกลุ่มที่เพิ่มบอตเข้าไปแล้ว พิมพ์ว่า
   ```
   /id
   ```
   บอตจะตอบ Group ID กลับมา → ก๊อปไปใส่ `LINE_GROUP_ID` แล้ว redeploy

> หากยังไม่ได้ตั้ง token/group ID ระบบจะข้ามการแจ้งเตือนโดยไม่ error  
> หากยังไม่ตั้ง `LINE_CHANNEL_SECRET` webhook จะทำงานแบบไม่ verify signature (ใช้สำหรับ dev เท่านั้น)

#### 🤖 คำสั่งที่บอตตอบในกลุ่ม

| คำสั่ง (พิมพ์ในกลุ่ม) | ผลลัพธ์ |
|---|---|
| `/id` หรือ `ขอไอดี` | ตอบ Group ID ของกลุ่มปัจจุบัน |
| `/list` หรือ `ดูทั้งหมด` | รายการแจ้งซ่อมทุกสถานะ (12 ล่าสุด) |
| `ดูรอรับเรื่อง` หรือ `/pending` | เฉพาะที่ยังไม่มีคนรับ |
| `ดูรับเรื่องแล้ว` หรือ `/accepted` | เฉพาะที่รับเรื่องแล้ว |
| `ดูกำลังดำเนินการ` หรือ `/inprogress` | เฉพาะที่กำลังซ่อม |
| `ดูเสร็จสิ้น` หรือ `/done` | เฉพาะที่เสร็จแล้ว |
| `/help` | แสดงคำสั่งทั้งหมด |

ข้อความอื่น ๆ บอตจะเงียบไม่ตอบ

### 4) ตั้งค่าตัวแปรแวดล้อม

ก๊อป `.env.example` เป็น `.env.local` (ตอน dev) แล้วใส่ค่าที่ได้จากด้านบน

```bash
cp .env.example .env.local
```

### 5) รันบนเครื่อง

```bash
npm install
npm run dev
```

เปิด http://localhost:3000 — หน้าแจ้งซ่อม  
http://localhost:3000/admin — หน้าผู้ดูแล (ใส่ `ADMIN_PASSWORD`)

---

## ☁️ Deploy ขึ้น Vercel

1. **อัปโค้ดขึ้น GitHub**
   ```bash
   git init
   git add .
   git commit -m "init repair system"
   git branch -M main
   git remote add origin https://github.com/<user>/<repo>.git
   git push -u origin main
   ```
2. ไปที่ https://vercel.com/new → Import repo จาก GitHub
3. ที่ **Environment Variables** ใส่ค่าตามไฟล์ `.env.example` ทั้งหมด
4. Deploy → ได้ URL เช่น `https://your-app.vercel.app`

> ทุกครั้งที่ push ขึ้น GitHub จะ auto deploy

---

## 🗂️ โครงสร้างโปรเจกต์

```
.
├── apps-script/Code.gs            # อัปรูปลง Google Drive
├── supabase/schema.sql            # ตาราง repairs + trigger
├── src/
│   ├── app/
│   │   ├── layout.tsx             # โครงหน้า + nav
│   │   ├── page.tsx               # หน้าแจ้งซ่อม
│   │   ├── globals.css
│   │   ├── admin/page.tsx         # หน้าผู้ดูแล
│   │   └── api/
│   │       ├── repairs/route.ts          # GET list, POST create
│   │       ├── repairs/[id]/route.ts     # PATCH อัปเดตสถานะ
│   │       ├── upload/route.ts           # proxy ไปยัง Apps Script
│   │       └── line/webhook/route.ts     # รับ webhook จาก LINE (reply คำสั่ง)
│   └── lib/
│       ├── supabase.ts            # supabase admin client
│       ├── line.ts                # ส่ง flex message
│       └── types.ts               # type + label สถานะ
├── .env.example
├── package.json
├── tailwind.config.ts
└── README.md
```

---

## 🔄 Flow สถานะ

```
pending (รอรับเรื่อง)
   └─ admin กด "รับเรื่อง" + ใส่ผู้รับผิดชอบ
accepted (รับเรื่องแล้ว)        → 🔔 แจ้ง LINE
   └─ admin กด "เริ่มดำเนินการ"
in_progress (กำลังดำเนินการ)    → 🔔 แจ้ง LINE
   └─ admin กด "เสร็จสิ้น"
completed (เสร็จสิ้น)            → 🔔 แจ้ง LINE
```

---

## 🧪 ทดสอบเร็ว ๆ

- หน้าแจ้งซ่อม `/` → กรอก + แนบรูป + ส่ง → ดูข้อความใน LINE กลุ่ม
- หน้าผู้ดูแล `/admin` → ใส่รหัส `ADMIN_PASSWORD` → ทดลองกดเปลี่ยนสถานะ
- เช็ค record ใน Supabase: `select * from repairs order by created_at desc;`

---

## 💡 ต่อยอดเพิ่มเติม (ตัวเลือก)

- เพิ่ม OAuth/LINE Login เพื่อระบุตัวผู้แจ้งอัตโนมัติ
- ตั้ง LINE Webhook → คำสั่งใช้งานในกลุ่ม (เช่น พิมพ์ `#รับ 1234`)
- เพิ่มหมวดหมู่ (ไฟฟ้า/ประปา/IT) และผู้รับผิดชอบประจำหมวด
- รายงาน/กราฟสถิติเดือน
