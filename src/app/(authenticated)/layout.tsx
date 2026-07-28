"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { 
  LayoutDashboard, 
  BookOpen, 
  CalendarCheck, 
  Award, 
  FileText,
  Megaphone,
  Wallet,
  HeartHandshake,
  ClipboardPen,
  BookOpenCheck,
  GraduationCap,
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
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { userData, role, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const baseLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/jurnal-mengajar", label: "Jurnal Mengajar", icon: BookOpen },
    { href: "/absensi", label: "Daftar Hadir Pelajaran", icon: CalendarCheck },
    { href: "/nilai", label: "Daftar Nilai", icon: Award },
    { href: "/academic-files", label: "Dokumen Akademik", icon: FileText },
    { href: "/school-info", label: "Informasi Sekolah", icon: Megaphone },
    { href: "/tuition-fees", label: "Keuangan & SPP", icon: Wallet },
    { href: "/counseling", label: "Bimbingan Konseling", icon: HeartHandshake },
    { href: "/student-notes", label: "Catatan Siswa", icon: ClipboardPen },
    { href: "/tahfiz", label: "Capaian Tahfiz", icon: BookOpenCheck },
  ];

  const adminLinks = [
    { href: "/admin/teachers", label: "Data Guru", icon: UserSquare2 },
    { href: "/admin/students", label: "Data Siswa", icon: Users },
    { href: "/admin/classes", label: "Data Kelas / Rombel", icon: School },
    { href: "/admin/subjects", label: "Mata Pelajaran", icon: BookMarked },
    { href: "/admin/teaching-assignments", label: "Penugasan Mengajar", icon: FolderGit2 },
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Gagal keluar:", error);
    }
  };

  const getRoleLabel = () => {
    if (role === "admin") return "Administrator";
    if (role === "teacher") return "Guru Pengajar";
    return "Pengguna";
  };

  const getRoleBadgeColor = () => {
    if (role === "admin") return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20";
    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
  };

  const sidebarTextClass = "text-slate-600 dark:text-slate-400";
  const sidebarPanelClass = "border-slate-200 bg-slate-50/80 text-slate-900 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-100";
  const sidebarPanelStrongClass = "border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950/40 dark:text-white shadow-sm";

  const NavLink = ({ href, label, icon: Icon, onClick }: any) => {
    const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
    return (
      <Link
        href={href}
        onClick={onClick}
        className={`group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
          isActive
            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
            : "text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon className={`h-4.5 w-4.5 transition-colors ${isActive ? "text-white" : "text-slate-600 group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-white"}`} />
          <span>{label}</span>
        </div>
        <ChevronRight className={`h-3.5 w-3.5 opacity-0 transition-all ${isActive ? "opacity-100" : "group-hover:opacity-100 group-hover:translate-x-0.5"}`} />
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar - Desktop */}
      <aside className={`hidden w-72 shrink-0 border-r ${sidebarPanelClass} backdrop-blur-md lg:block`}>
        <div className={`flex h-16 items-center gap-3 border-b ${sidebarPanelClass} px-6`}>
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden">
        <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS3Ma2Rk1NtmmjnqB3BtpTTjq4TGVOHIfx0EH40NGKHeUlaPITOh21cF-24&s=10" alt="logo sekolah" className="h-full w-full object-contain" />
      </div>
          <div>
            <span className="block text-sm font-extrabold tracking-wide text-slate-900 dark:text-white">AL-JANNAH</span>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">School Manager</span>
          </div>
        </div>

        <div className="flex flex-col justify-between h-[calc(100vh-4rem)] p-4">
          <div className="space-y-6 overflow-y-auto pr-1">
            <div className="space-y-1">
              <span className={`px-3 text-[10px] font-bold uppercase tracking-wider ${sidebarTextClass} block mb-2`}>Menu Utama</span>
              {baseLinks.map((link) => (
                <NavLink key={link.href} {...link} />
              ))}
            </div>

            {role === "admin" && (
              <div className="space-y-1">
                <span className={`px-3 text-[10px] font-bold uppercase tracking-wider ${sidebarTextClass} block mb-2`}>Master Data (Admin)</span>
                {adminLinks.map((link) => (
                  <NavLink key={link.href} {...link} />
                ))}
              </div>
            )}
          </div>

          {/* User profile & Logout */}
          <div className={`border-t ${sidebarPanelClass} pt-4 mt-auto`}>
            <div className={`mb-4 rounded-lg border ${sidebarPanelStrongClass} p-3`}>
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-300 font-bold text-indigo-700 dark:bg-slate-800 dark:text-indigo-400">
                  {userData?.displayName?.charAt(0) || "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-extrabold text-slate-900 dark:text-white">{userData?.displayName || user?.email}</p>
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

      {/* Main Page Area */}
      <div className="flex flex-1 flex-col bg-background">
        {/* Top Navbar */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden cursor-pointer"
            >
              <Menu className="h-6 w-6" />
            </button>
            
            <div className="hidden lg:flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-400">Tahun Akademik:</span>
              <span className="rounded bg-slate-200 px-2 py-1 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">2026/2027</span>
            </div>
            
            <div className="lg:hidden flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-indigo-500" />
              <span className="text-sm font-extrabold text-slate-900 dark:text-white">Al-Jannah</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="hidden md:flex flex-col items-end text-right">
              <p className="text-xs font-semibold text-slate-900 dark:text-white">{userData?.displayName || user?.email}</p>
              <p className="text-[10px] font-medium text-slate-600 dark:text-slate-400">{getRoleLabel()}</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-secondary border border-border flex items-center justify-center font-bold text-indigo-400">
              {userData?.displayName?.charAt(0) || "U"}
            </div>
          </div>
        </header>

        {/* Mobile Menu Backdrop & Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="fixed inset-0 bg-background/70 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />

            <div className={`relative flex w-full max-w-xs flex-col bg-background border-r ${sidebarPanelClass} p-4`}>
              <div className={`flex items-center justify-between border-b ${sidebarPanelClass} pb-4 mb-4`}>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-700">
                    <GraduationCap className="h-4.5 w-4.5 text-white" />
                  </div>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">Al-Jannah Portal</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-6">
                <div className="space-y-1">
                  <span className={`px-3 text-[10px] font-bold uppercase tracking-wider ${sidebarTextClass} block mb-2`}>Menu Utama</span>
                  {baseLinks.map((link) => (
                    <NavLink key={link.href} {...link} onClick={() => setMobileMenuOpen(false)} />
                  ))}
                </div>

                {role === "admin" && (
                  <div className="space-y-1">
                    <span className={`px-3 text-[10px] font-bold uppercase tracking-wider ${sidebarTextClass} block mb-2`}>Master Data (Admin)</span>
                    {adminLinks.map((link) => (
                      <NavLink key={link.href} {...link} onClick={() => setMobileMenuOpen(false)} />
                    ))}
                  </div>
                )}
              </div>

              <div className={`border-t ${sidebarPanelClass} pt-4 mt-auto`}>
                <div className={`mb-4 rounded-lg border ${sidebarPanelStrongClass} p-3`}>
                  <p className="truncate text-xs font-extrabold text-slate-900 dark:text-white">{userData?.displayName || user?.email}</p>
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