"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { Users, UserSquare2, BookOpen, Activity } from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    journals: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const studentsSnap = await getDocs(collection(db, "students"));
        const teachersSnap = await getDocs(collection(db, "teachers"));
        const journalsSnap = await getDocs(collection(db, "journals"));

        setStats({
          students: studentsSnap.size,
          teachers: teachersSnap.size,
          journals: journalsSnap.size,
        });
      } catch (error) {
        console.error("Gagal memuat data dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
        <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-400">Selamat datang kembali di sistem informasi sekolah.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Total Siswa Aktif</p>
              <h3 className="mt-1 text-3xl font-black text-slate-900 dark:text-white">{loading ? "..." : stats.students} <span className="text-xs font-normal text-slate-600 dark:text-slate-400">siswa</span></h3>
            </div>
            <div className="rounded-xl bg-indigo-500/10 p-3 text-indigo-400 border border-indigo-500/20">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Total Guru Terdaftar</p>
              <h3 className="mt-1 text-3xl font-black text-slate-900 dark:text-white">{loading ? "..." : stats.teachers} <span className="text-xs font-normal text-slate-600 dark:text-slate-400">pengajar</span></h3>
            </div>
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400 border border-emerald-500/20">
              <UserSquare2 className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Total Jurnal Mengajar</p>
              <h3 className="mt-1 text-3xl font-black text-slate-900 dark:text-white">{loading ? "..." : stats.journals} <span className="text-xs font-normal text-slate-600 dark:text-slate-400">entri</span></h3>
            </div>
            <div className="rounded-xl bg-amber-500/10 p-3 text-amber-400 border border-amber-500/20">
              <BookOpen className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Status Sistem</p>
              <h3 className="mt-1 text-3xl font-black text-emerald-600 dark:text-emerald-400">Aktif <span className="text-xs font-normal text-slate-600 dark:text-slate-400">online</span></h3>
            </div>
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400 border border-emerald-500/20">
              <Activity className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Persentase Kehadiran per Kelas</h3>
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-background/60 text-sm font-medium text-slate-700 dark:text-slate-400">
            Grafik Batang Kehadiran Kelas
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Tren Kehadiran Mingguan</h3>
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-background/60 text-sm font-medium text-slate-700 dark:text-slate-400">
            Grafik Tren Mingguan
          </div>
        </div>
      </div>
    </div>
  );
}