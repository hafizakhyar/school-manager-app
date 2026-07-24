"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { Users, UserSquare2, BookOpen, Activity, AlertTriangle } from "lucide-react";

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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Selamat datang kembali di sistem informasi sekolah.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Siswa Aktif</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{loading ? "..." : stats.students} <span className="text-xs font-normal text-slate-500">siswa</span></h3>
            </div>
            <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600 border border-indigo-100">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Guru Terdaftar</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{loading ? "..." : stats.teachers} <span className="text-xs font-normal text-slate-500">pengajar</span></h3>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600 border border-emerald-100">
              <UserSquare2 className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Jurnal Mengajar</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{loading ? "..." : stats.journals} <span className="text-xs font-normal text-slate-500">entri</span></h3>
            </div>
            <div className="rounded-xl bg-amber-50 p-3 text-amber-600 border border-amber-100">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Status Sistem</p>
              <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">Aktif <span className="text-xs font-normal text-slate-500">online</span></h3>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600 border border-emerald-100">
              <Activity className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Chart Sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4">Persentase Kehadiran per Kelas</h3>
          <div className="h-64 flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-400 text-sm">
            Grafik Batang Kehadiran Kelas
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4">Tren Kehadiran Mingguan</h3>
          <div className="h-64 flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-400 text-sm">
            Grafik Tren Mingguan
          </div>
        </div>
      </div>
    </div>
  );
}