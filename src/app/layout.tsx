import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ระบบแจ้งซ่อม",
  description: "แจ้งซ่อมออนไลน์ พร้อมแจ้งเตือนผ่าน LINE"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>
        <header className="bg-white/80 backdrop-blur sticky top-0 z-30 border-b border-orange-100">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-bold text-brand-700">
              <span className="text-2xl">🛠️</span>
              <span>ระบบแจ้งซ่อม</span>
            </Link>
            <nav className="flex gap-2 text-sm">
              <Link href="/" className="px-3 py-1.5 rounded-lg hover:bg-brand-50 text-brand-700">แจ้งซ่อม</Link>
              <Link href="/admin" className="px-3 py-1.5 rounded-lg hover:bg-brand-50 text-brand-700">ผู้ดูแล</Link>
            </nav>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>
        <footer className="text-center text-xs text-brand-700/60 py-6">
          © {new Date().getFullYear()} ระบบแจ้งซ่อม
        </footer>
      </body>
    </html>
  );
}
