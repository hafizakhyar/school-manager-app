"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { Users, TrendingUp, BookOpen, AlertTriangle, Loader2 } from "lucide-react";

export default function DashboardPage() {
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [totalTeachers, setTotalTeachers] = useState<number>(0);
  const [totalJournals, setTotalJournals] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // 1. Ambil jumlah total siswa dari koleksi 'students'
        const studentsSnapshot = await getDocs(collection(db, "students"));
        setTotalStudents(studentsSnapshot.size);

        // 2. Ambil jumlah total guru dari koleksi 'teachers'
        const teachersSnapshot = await getDocs(collection(db, "teachers"));
        setTotalTeachers(teachersSnapshot.size);

        // 3. Ambil jumlah total jurnal mengajar dari koleksi 'journals'
        const journalsSnapshot = await getDocs(collection(db, "journals"));
        setTotalJournals(journalsSnapshot.size);
      } catch (error) {
        console.error("Gagal memuat data statistik dashboard:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">Selamat datang kembali di sistem informasi sekolah.</p>
      </div>

      {/* Statistik Cards Utama (Terhubung ke Firestore) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Siswa Aktif</span>
            <Users className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-indigo-400 my-1" />
            ) : (
              <span className="text-3xl font-extrabold text-white">{totalStudents}</span>
            )}
            <span className="text-xs text-slate-400">siswa</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Guru Terdaftar</span>
            <TrendingUp className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-emerald-400 my-1" />
            ) : (
              <span className="text-3xl font-extrabold text-white">{totalTeachers}</span>
            )}
            <span className="text-xs text-emerald-400">pengajar</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Jurnal Mengajar</span>
            <BookOpen className="h-5 w-5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-amber-400 my-1" />
            ) : (
              <span className="text-3xl font-extrabold text-white">{totalJournals}</span>
            )}
            <span className="text-xs text-slate-400">entri tersimpan</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Status Sistem</span>
            <AlertTriangle className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">Aktif</span>
            <span className="text-xs text-indigo-400">online</span>
          </div>
        </div>
      </div>

      {/* Grafik / Bagian Bawah Dashboard */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-sm">
          <h3 className="text-base font-bold text-white mb-4">Persentase Kehadiran per Kelas</h3>
          <div className="h-64 flex items-center justify-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl">
            Grafik Batang Kehadiran Kelas
          </div>
        </div>

        <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-sm">
          <h3 className="text-base font-bold text-white mb-4">Tren Kehadiran Mingguan</h3>
          <div className="h-64 flex items-center justify-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl">
            Grafik Tren Mingguan
          </div>
        </div>
      </div>

      {/* Siswa Perlu Perhatian */}
      <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Siswa Perlu Perhatian (Ketidakhadiran / Alpa)</h3>
          </div>
          <span className="text-xs text-slate-400">Bulan ini</span>
        </div>
        <p className="text-xs text-slate-500 text-center py-6">Tidak ada siswa dengan ketidakhadiran berlebih.</p>
      </div>
    </div>
  );
}