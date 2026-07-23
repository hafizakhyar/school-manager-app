import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import RouteGuard from "@/components/route-guard";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SMA Islam Alam & Sains Al-Jannah — Sistem Informasi Akademik",
  description: "Sistem Manajemen Sekolah: Jurnal Mengajar, Daftar Hadir (Absensi), dan Daftar Nilai untuk Tahun Ajaran 2026/2027",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${inter.className} min-h-screen bg-slate-950 text-slate-100 antialiased`}>
        <Providers>
          <RouteGuard>{children}</RouteGuard>
        </Providers>
      </body>
    </html>
  );
}
