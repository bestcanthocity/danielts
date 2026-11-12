import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DanielTS Portal | Điểm danh & Quản lý Học phí (danielts.nextband.vn)",
  description:
    "Hệ thống điểm danh buổi học và quản lý học phí linh hoạt theo ngày nhập học dành riêng cho DanielTS (danielts.nextband.vn)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#f8fafc] text-slate-900 antialiased font-['Plus_Jakarta_Sans',sans-serif] selection:bg-indigo-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
