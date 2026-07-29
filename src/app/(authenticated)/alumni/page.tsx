"use client";

import React from "react";
import { BarChart3 } from "lucide-react";

export default function AlumniPage() {
  return (
    <div className="space-y-8 pb-16">
      {/* Header Halaman */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Data & Statistik Alumni</h1>
          <p className="text-sm text-slate-400 mt-1">
            Visualisasi dan rekapitulasi data kelulusan serta penelusuran tamatan sekolah.
          </p>
        </div>
      </div>

      {/* Container Looker Studio Report */}
      <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-4 backdrop-blur-sm shadow-xl">
        <div className="w-full h-[750px] rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
          <iframe
            src="https://datastudio.google.com/embed/reporting/d3b7d014-19b3-416a-b20c-80d7256f1fbb/page/p_zba6itxhid"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            title="Looker Studio Alumni Report"
          />
        </div>
      </div>
    </div>
  );
}