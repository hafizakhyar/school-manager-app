"use client";

import React, { useState } from "react";
import { 
  Plus, 
  Upload, 
  Download, 
  Search, 
  Filter 
} from "lucide-react";

export default function DaftarKegiatanPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterKelas, setFilterKelas] = useState("Semua");

  const [kegiatanList, setKegiatanList] = useState([
    { id: 1, tanggal: "2026-07-28", kegiatan: "Upacara Bendera", kelas: "Semua Kelas", keterangan: "Berjalan dengan tertib", pj: "Pembina OSIS" },
    { id: 2, tanggal: "2026-07-29", kegiatan: "Pesantren Kilat", kelas: "Kelas 7", keterangan: "Materi tahsin dan fiqih", pj: "Ust. Rahmat" },
    { id: 3, tanggal: "2026-07-30", kegiatan: "Uji Kompetensi Sains", kelas: "Kelas 9", keterangan: "Laboratorium Komputer", pj: "Tim Kurikulum" },
  ]);

  const filteredData = kegiatanList.filter((item) => {
    const matchesSearch = item.kegiatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.keterangan.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.pj.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesKelas = filterKelas === "Semua" || item.kelas === filterKelas;
    return matchesSearch && matchesKelas;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Daftar Kegiatan</h1>
          <p className="text-xs text-slate-400 mt-1">Kelola dan pantau jadwal serta agenda kegiatan sekolah.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button className="flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer">
            <Upload className="h-4 w-4 text-slate-400" />
            <span>Upload CSV</span>
          </button>

          <button className="flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer">
            <Download className="h-4 w-4 text-slate-400" />
            <span>Download</span>
          </button>

          <button className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all cursor-pointer">
            <Plus className="h-4 w-4" />
            <span>Tambah Kegiatan</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-slate-900 bg-slate-900/40 p-4 backdrop-blur-md">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Cari kegiatan, keterangan, atau PJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-500" />
          <span className="text-xs text-slate-400">Kelas:</span>
          <select
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
          >
            <option value="Semua">Semua Kelas</option>
            <option value="Kelas 7">Kelas 7</option>
            <option value="Kelas 8">Kelas 8</option>
            <option value="Kelas 9">Kelas 9</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-slate-900 bg-slate-900/40 overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-900 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5 w-14 text-center">No</th>
                <th className="px-4 py-3.5">Tanggal</th>
                <th className="px-4 py-3.5">Kegiatan</th>
                <th className="px-4 py-3.5">Kelas</th>
                <th className="px-4 py-3.5">Keterangan</th>
                <th className="px-4 py-3.5">PJ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-300">
              {filteredData.length > 0 ? (
                filteredData.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="px-4 py-3.5 text-center font-medium text-slate-500">{index + 1}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-400">{item.tanggal}</td>
                    <td className="px-4 py-3.5 font-semibold text-white">{item.kegiatan}</td>
                    <td className="px-4 py-3.5">
                      <span className="rounded bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 text-[10px] font-semibold text-indigo-400">
                        {item.kelas}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-400">{item.keterangan}</td>
                    <td className="px-4 py-3.5 text-slate-300 font-medium">{item.pj}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Tidak ada data kegiatan yang ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}