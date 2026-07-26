"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  Timestamp, 
  query, 
  orderBy 
} from "firebase/firestore";
import { Plus, Trash2, FileText, X, DownloadCloud, Search } from "lucide-react";

interface AcademicFile {
  id: string;
  title: string;
  fileUrl: string;
  createdAt: any;
}

export default function AcademicFilesPage() {
  const { role } = useAuth();
  const [files, setFiles] = useState<AcademicFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "academicFiles"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const list: AcademicFile[] = [];
      snapshot.forEach(d => {
        list.push({ id: d.id, ...d.data() } as AcademicFile);
      });
      setFiles(list);
    } catch (err) {
      console.error(err);
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
      alert("Judul dan Link File wajib diisi!");
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, "academicFiles"), {
        title,
        fileUrl,
        createdAt: Timestamp.now()
      });
      setTitle("");
      setFileUrl("");
      setIsOpen(false);
      fetchFiles();
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan dokumen!");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus dokumen ini dari sistem?")) return;
    try {
      await deleteDoc(doc(db, "academicFiles", id));
      fetchFiles();
    } catch (error) {
      console.error(error);
      alert("Gagal menghapus dokumen!");
    }
  };

  const filteredFiles = files.filter(f => 
    f.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Dokumen Akademik</h1>
          <p className="text-sm text-slate-400 mt-1">Daftar file, kalender, dan panduan akademik sekolah yang dapat diunduh.</p>
        </div>

        {role === "admin" && (
          <button 
            onClick={() => setIsOpen(true)} 
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 cursor-pointer transition-all"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Tambah Dokumen Baru</span>
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-5 backdrop-blur-sm flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input 
            type="text"
            placeholder="Cari judul dokumen akademik..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(n => <div key={n} className="h-16 w-full animate-pulse rounded-xl bg-slate-900" />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-sm overflow-hidden">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-4 px-6">Judul Dokumen</th>
                <th className="py-4 px-6">Tanggal Unggah</th>
                <th className="py-4 px-6 text-right">Aksi Unduh</th>
                {role === "admin" && <th className="py-4 px-6 text-right">Kelola</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan={role === "admin" ? 4 : 3} className="py-12 text-center text-slate-500 text-sm">
                    {files.length === 0 ? "Belum ada dokumen akademik yang diunggah." : "Dokumen yang dicari tidak ditemukan."}
                  </td>
                </tr>
              ) : (
                filteredFiles.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-900/30 transition-colors">
                    <td className="py-4 px-6 font-semibold text-white flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shrink-0">
                        <FileText className="h-4.5 w-4.5" />
                      </div>
                      <span>{f.title}</span>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-400">
                      {f.createdAt?.toDate ? f.createdAt.toDate().toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' }) : "Baru saja"}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <a 
                        href={f.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/10 px-3.5 py-2 text-xs font-semibold text-indigo-400 hover:bg-indigo-500/20 transition-all border border-indigo-500/20"
                      >
                        <DownloadCloud className="h-3.5 w-3.5" />
                        <span>Unduh File</span>
                      </a>
                    </td>
                    {role === "admin" && (
                      <td className="py-4 px-6 text-right">
                        <button 
                          onClick={() => handleDelete(f.id)} 
                          className="rounded-lg p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Hapus Dokumen"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h2 className="text-lg font-bold text-white">Tambah Dokumen Akademik</h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Judul Dokumen</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="Contoh: Kalender Akademik 2026/2027"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Tautan / Link File (Google Drive / Cloud)</label>
                <input 
                  type="url" 
                  value={fileUrl} 
                  onChange={e => setFileUrl(e.target.value)} 
                  placeholder="https://drive.google.com/..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500" 
                />
                <p className="text-[11px] text-slate-500 mt-1">Pastikan tautan disetel ke &quot;Anyone with the link&quot;.</p>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white cursor-pointer">Batal</button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20 cursor-pointer transition-all disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan & Publikasikan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}