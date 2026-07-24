"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { FileText, DownloadCloud } from "lucide-react";

interface LatestFile {
  id: string;
  title: string;
  fileUrl: string;
  createdAt: any;
}

export default function DashboardPage() {
  const [latestFile, setLatestFile] = useState<LatestFile | null>(null);
  const [loadingFile, setLoadingFile] = useState(true);

  useEffect(() => {
    async function fetchLatestAcademicFile() {
      try {
        const q = query(
          collection(db, "academicFiles"),
          orderBy("createdAt", "desc"),
          limit(1)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const docData = snapshot.docs[0];
          setLatestFile({
            id: docData.id,
            ...docData.data()
          } as LatestFile);
        }
      } catch (err) {
        console.error("Gagal memuat file akademik:", err);
      } finally {
        setLoadingFile(false);
      }
    }

    fetchLatestAcademicFile();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Dashboard Akademik</h1>
        <p className="text-sm text-slate-400 mt-1">Selamat datang kembali di sistem informasi sekolah.</p>
      </div>

      {/* CARD DOKUMEN AKADEMIK TERBARU (Tampil untuk Semua User) */}
      <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/40 to-slate-900/60 p-6 backdrop-blur-sm shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-indigo-600/20 p-3 text-indigo-400 border border-indigo-500/30">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <span className="inline-block rounded-full bg-indigo-500/10 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-400 border border-indigo-500/20 mb-1">
                Dokumen Akademik Terbaru
              </span>
              <h3 className="text-lg font-bold text-white">
                {loadingFile ? "Memuat informasi file..." : latestFile ? latestFile.title : "Belum ada dokumen akademik yang diunggah."}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Silakan unduh dokumen penting terbaru yang telah dipublikasikan oleh pihak sekolah.
              </p>
            </div>
          </div>

          {latestFile && (
            <a
              href={latestFile.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer shrink-0"
            >
              <DownloadCloud className="h-4.5 w-4.5" />
              <span>Unduh Dokumen</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}