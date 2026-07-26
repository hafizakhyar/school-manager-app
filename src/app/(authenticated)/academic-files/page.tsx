"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  Timestamp 
} from "firebase/firestore";
import { FileText, Plus, Trash2, ExternalLink, Search, X } from "lucide-react";

interface AcademicFile {
  id: string;
  title: string;
  fileUrl: string;
  category: string;
  createdAt: any;
}

export default function AcademicFilesPage() {
  const [files, setFiles] = useState<AcademicFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [category, setCategory] = useState("Kurikulum");
  const [submitting, setSubmitting] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "academicFiles"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const list: AcademicFile[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as AcademicFile));
      setFiles(list);
    } catch (err) {
      console.error("Gagal memuat dokumen:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchFiles(); 
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !fileUrl) {
      alert("Judul dokumen dan tautan file wajib diisi!");
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, "academicFiles"), {
        title,
        fileUrl,
        category,
        createdAt: Timestamp.now()
      });
      setTitle("");
      setFileUrl("");
      setCategory("Kurikulum");
      setIsOpen(false);
      fetchFiles();
      alert("Dokumen akademik berhasil disimpan!");
    } catch (err: any) {
      console.error("Gagal menyimpan dokumen:", err);
      alert("Gagal menyimpan dokumen! Periksa koneksi atau izin database Firebase Anda. Detail: " + (err.message || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus dokumen ini dari daftar?")) return;
    try {
      await deleteDoc(doc(db, "academicFiles", id));
      fetchFiles();
    } catch (err) {
      console.error("Gagal menghapus:", err);
      alert("Gagal menghapus dokumen.");
    }
  };

  const filtered = files.filter(f => 
    f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Dokumen Akademik</h1>
          <p className="text-sm text-slate-400 mt-1">Penyimpanan dan tautan berkas penting sekolah, kalender akademik, dan kurikulum.</p>
        </div>
        <button 
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 cursor-pointer transition-all"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Tambah Dokumen</span>
        </button>
      </div>

      <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-5 backdrop-blur-sm flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input 
            type="text"
            placeholder="Cari judul dokumen atau kategori..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(n => <div key={n} className="h-40 w-full animate-pulse rounded-2xl bg-slate-900" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-12 text-center text-slate-500 backdrop-blur-sm">
          <FileText className="h-10 w-10 mx-auto mb-3 text-slate-600" />
          <p className="text-sm font-medium">Belum ada dokumen akademik yang diunggah.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <div key={item.id} className="rounded-2xl border border-slate-900 bg-slate-900/40 p-5 backdrop-blur-sm flex flex-col justify-between space-y-4 relative group">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <span className="rounded-md bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 text-xs font-semibold text-indigo-400">
                    {item.category}
                  </span>
                  <button onClick={() => handleDelete(item.id)} className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg transition-colors cursor-pointer">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <h2 className="text-base font-bold text-white line-clamp-2">{item.title}</h2>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' }) : "Baru saja"}
                </span>
                <a 
                  href={item.fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600/15 border border-indigo-500/30 px-3 py-1.5 text-xs font-semibold text-indigo-400 hover:bg-indigo-600/25 transition-all"
                >
                  <span>Buka File</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white">Tambah Dokumen Akademik</h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Judul Dokumen</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="Contoh: Kalender Akademik 2026/2027" 
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-slate-200 outline-none focus:border-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Kategori</label>
                <select 
                  value={category} 
                  onChange={e => setCategory(e.target.value)} 
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-slate-200 outline-none focus:border-indigo-500"
                >
                  <option value="Kurikulum">Kurikulum</option>
                  <option value="Kalender Akademik">Kalender Akademik</option>
                  <option value="Peraturan & SOP">Peraturan & SOP</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Tautan / Link File (Google Drive / Cloud)</label>
                <input 
                  type="url" 
                  value={fileUrl} 
                  onChange={e => setFileUrl(e.target.value)} 
                  placeholder="https://drive.google.com/..." 
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-slate-200 outline-none focus:border-indigo-500" 
                />
                <span className="block text-[11px] text-slate-500 mt-1">Pastikan tautan disetel ke "Anyone with the link".</span>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white cursor-pointer">Batal</button>
                <button 
                  type="submit" 
                  disabled={submitting} 
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan Dokumen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}