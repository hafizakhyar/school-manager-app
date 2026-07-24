"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { 
  GraduationCap, 
  LayoutDashboard, 
  BookOpen, 
  CalendarCheck, 
  Award, 
  FileText,
  Megaphone,
  Users, 
  UserSquare2, 
  School, 
  BookMarked, 
  FolderGit2, 
  Menu, 
  X, 
  LogOut,
  ChevronRight
} from "lucide-react";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userData, role, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const getRoleBadgeColor = () => {
    switch (role) {
      case "admin": return "bg-red-500/10 text-red-600 border-red-500/20";
      case "kepala_sekolah": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "wali_kelas": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "guru": return "bg-indigo-500/10 text-indigo-600 border-indigo-500/20";
      default: return "bg-slate-500/10 text-slate-600 border-slate-500/20";
    }
  };

  const getRoleLabel = () => {
    switch (role) {
      case "admin": return "Administrator";
      case "kepala_sekolah": return "Kepala Sekolah";
      case "wali_kelas": return "Wali Kelas";
      case "guru": return "Guru Mata Pelajaran";
      default: return "Pengguna";
    }
  };

  // Menu Utama Lengkap
  const baseLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/jurnal-mengajar", label: "Jurnal Mengajar", icon: BookOpen },
    { href: "/absensi", label: "Daftar Hadir / Absensi", icon: CalendarCheck },
    { href: "/nilai", label: "Daftar Nilai", icon: Award },
    { href: "/academic-files", label: "Dokumen Akademik", icon: FileText },
    { href: "/school-info", label: "Informasi Sekolah", icon: Megaphone },
  ];

  // Menu Khusus Admin
  const adminLinks = [
    { href: "/admin/teachers", label: "Data Guru", icon: UserSquare2 },
    { href: "/admin/students", label: "Data Siswa", icon: Users },
    { href: "/admin/classes", label: "Data Kelas / Rombel", icon: School },
    { href: "/admin/subjects", label: "Mata Pelajaran", icon: BookMarked },
    { href: "/admin/teaching-assignments", label: "Penugasan Mengajar", icon: FolderGit2 },
  ];

  const NavLink = ({ href, label, icon: Icon, onClick }: any) => {
    const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
    return (
      <Link
        href={href}
        onClick={onClick}
        className={`group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
          isActive
            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
            : "text-slate-400 hover:bg-slate-900 hover:text-white"
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon className={`h-4.5 w-4.5 transition-colors ${isActive ? "text-white" : "text-slate-400 group-hover:text-white"}`} />
          <span>{label}</span>
        </div>
        <ChevronRight className={`h-3.5 w-3.5 opacity-0 transition-all ${isActive ? "opacity-100" : "group-hover:opacity-100 group-hover:translate-x-0.5"}`} />
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      {/* Sidebar - Desktop (Tetap Hitam/Gelap) */}
      <aside className="hidden w-72 shrink-0 border-r border-slate-800 bg-slate-950 text-slate-100 lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 shadow-md shadow-indigo-600/30">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-white tracking-wide text-sm block">AL-JANNAH</span>
            <span className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider block">School Manager</span>
          </div>
        </div>

        <div className="flex flex-col justify-between h-[calc(100vh-4rem)] p-4">
          <div className="space-y-6 overflow-y-auto pr-1">
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Menu Utama</span>
              {baseLinks.map((link) => (
                <NavLink key={link.href} {...link} />
              ))}
            </div>

            {role === "admin" && (
              <div className="space-y-1">
                <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Master Data (Admin)</span>
                {adminLinks.map((link) => (
                  <NavLink key={link.href} {...link} />
                ))}
              </div>
            )}
          </div>

          {/* User profile & Logout */}
          <div className="border-t border-slate-800 pt-4 mt-auto">
            <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-indigo-400">
                  {userData?.displayName?.charAt(0) || "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-white">{userData?.displayName || user?.email}</p>
                  <span className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider border ${getRoleBadgeColor()} mt-1`}>
                    {getRoleLabel()}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 cursor-pointer"
            >
              <LogOut className="h-4.5 w-4.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Page Area (Latar Belakang Terang/Putih) */}
      <div className="flex flex-1 flex-col bg-slate-50">
        {/* Top Navbar */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden cursor-pointer"
            >
              <Menu className="h-6 w-6" />
            </button>
            
            <div className="hidden lg:flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Tahun Akademik:</span>
              <span className="rounded-lg bg-indigo-50 border border-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-600">2026/2027</span>
            </div>
            
            <div className="lg:hidden flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-indigo-600" />
              <span className="font-bold text-slate-900 text-sm">Al-Jannah</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end text-right">
              <p className="text-xs font-bold text-slate-800">{userData?.displayName || user?.email}</p>
              <p className="text-[10px] text-slate-500">{getRoleLabel()}</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center font-bold text-indigo-700">
              {userData?.displayName?.charAt(0) || "U"}
            </div>
          </div>
        </header>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div 
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            
            <div className="relative flex w-full max-w-xs flex-col bg-slate-950 text-slate-100 border-r border-slate-800 p-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
                    <GraduationCap className="h-4.5 w-4.5 text-white" />
                  </div>
                  <span className="font-bold text-white text-sm">Al-Jannah Portal</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-900 hover:text-white cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-6">
                <div className="space-y-1">
                  <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Menu Utama</span>
                  {baseLinks.map((link) => (
                    <NavLink key={link.href} {...link} onClick={() => setMobileMenuOpen(false)} />
                  ))}
                </div>

                {role === "admin" && (
                  <div className="space-y-1">
                    <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Master Data (Admin)</span>
                    {adminLinks.map((link) => (
                      <NavLink key={link.href} {...link} onClick={() => setMobileMenuOpen(false)} />
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-4 mt-auto">
                <div className="mb-4 rounded-lg bg-slate-900/50 p-3">
                  <p className="truncate text-xs font-bold text-white">{userData?.displayName || user?.email}</p>
                  <span className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider border ${getRoleBadgeColor()} mt-1`}>
                    {getRoleLabel()}
                  </span>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 cursor-pointer"
                >
                  <LogOut className="h-4.5 w-4.5" />
                  <span>Keluar</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Wrapper */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}