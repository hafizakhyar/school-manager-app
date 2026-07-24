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
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">Selamat datang kembali di sistem informasi sekolah.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Siswa Aktif</p>
              <h3 className="text-3xl font-black text-white mt-1">{loading ? "..." : stats.students} <span className="text-xs font-normal text-slate-400">siswa</span></h3>
            </div>
            <div className="rounded-xl bg-indigo-500/10 p-3 text-indigo-400 border border-indigo-500/20">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Guru Terdaftar</p>
              <h3 className="text-3xl font-black text-white mt-1">{loading ? "..." : stats.teachers} <span className="text-xs font-normal text-slate-400">pengajar</span></h3>
            </div>
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400 border border-emerald-500/20">
              <UserSquare2 className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Jurnal Mengajar</p>
              <h3 className="text-3xl font-black text-white mt-1">{loading ? "..." : stats.journals} <span className="text-xs font-normal text-slate-400">entri</span></h3>
            </div>
            <div className="rounded-xl bg-amber-500/10 p-3 text-amber-400 border border-amber-500/20">
              <BookOpen className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Status Sistem</p>
              <h3 className="text-3xl font-black text-emerald-400 mt-1">Aktif <span className="text-xs font-normal text-slate-400">online</span></h3>
            </div>
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400 border border-emerald-500/20">
              <Activity className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-sm">
          <h3 className="text-lg font-bold text-white mb-4">Persentase Kehadiran per Kelas</h3>
          <div className="h-64 flex items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-slate-500 text-sm">
            Grafik Batang Kehadiran Kelas
          </div>
        </div>

        <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-sm">
          <h3 className="text-lg font-bold text-white mb-4">Tren Kehadiran Mingguan</h3>
          <div className="h-64 flex items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-slate-500 text-sm">
            Grafik Tren Mingguan
          </div>
        </div>
      </div>
    </div>
  );
}