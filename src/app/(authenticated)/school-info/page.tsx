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
import { Megaphone, Plus, Trash2, Search, X, Calendar } from "lucide-react";
import { useAuth } from "@/context/auth-context";

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: any;
}

export default function SchoolInfoPage() {
  const { role } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Pengumuman Umum");
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "schoolInfo"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const list: Announcement[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Announcement));
      setAnnouncements(list);
    } catch (err) {
      console.error("Gagal memuat informasi:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchAnnouncements(); 
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) {
      alert("Judul dan isi pengumuman wajib diisi!");
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, "schoolInfo"), {
        title,
        content,
        category,
        createdAt: Timestamp.now()
      });
      setTitle("");
      setContent("");
      setCategory("Pengumuman Umum");
      setIsOpen(false);
      fetchAnnouncements();
      alert("Informasi sekolah berhasil dipublikasikan!");
    } catch (err: any) {
      console.error("Gagal memublikasikan informasi:", err);
      alert("Gagal memublikasikan informasi! Detail: " + (err.message || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus pengumuman ini?")) return;
    try {
      await deleteDoc(doc(db, "schoolInfo", id));
      fetchAnnouncements();
    } catch (err: any) {
      console.error("Gagal menghapus:", err);
      alert("Gagal menghapus pengumuman. Detail: " + err.message);
    }
  };

  const filtered = announcements.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canManage = role === "admin" || role === "teacher" || role === "kepala_sekolah";

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Informasi Sekolah</h1>
          <p className="text-sm text-slate-400 mt-1">Pengumuman resmi, jadwal kegiatan, dan informasi penting bagi guru dan siswa.</p>
        </div>
        {canManage && (
          <button 
            onClick={() => setIsOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 cursor-pointer transition-all"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Buat Pengumuman</span>
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-5 backdrop-blur-sm flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input 
            type="text"
            placeholder="Cari informasi atau pengumuman..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(n => <div key={n} className="h-32 w-full animate-pulse rounded-2xl bg-slate-900" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-12 text-center text-slate-500 backdrop-blur-sm">
          <Megaphone className="h-10 w-10 mx-auto mb-3 text-slate-600" />
          <p className="text-sm font-medium">Belum ada informasi atau pengumuman sekolah.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(item => (
            <div key={item.id} className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-sm space-y-3 relative group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="rounded-md bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 text-xs font-semibold text-indigo-400">
                    {item.category}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar className="h-3.5 w-3.5" />
                    {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' }) : "Baru saja"}
                  </span>
                </div>
                {canManage && (
                  <button onClick={() => handleDelete(item.id)} className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg transition-colors cursor-pointer">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <h2 className="text-lg font-bold text-white">{item.title}</h2>
              <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">{item.content}</p>
            </div>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white">Buat Pengumuman Sekolah</h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Judul Pengumuman</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="Contoh: PM Kelas 12 Sabtu" 
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
                  <option value="Pengumuman Umum">Pengumuman Umum</option>
                  <option value="Akademik & PM">Akademik & PM</option>
                  <option value="Kegiatan Sekolah">Kegiatan Sekolah</option>
                  <option value="Penting / Urgen">Penting / Urgen</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Isi Informasi / Pengumuman</label>
                <textarea 
                  rows={5}
                  value={content} 
                  onChange={e => setContent(e.target.value)} 
                  placeholder="Tuliskan isi pengumuman lengkap di sini..." 
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-slate-200 outline-none focus:border-indigo-500 resize-none" 
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white cursor-pointer">Batal</button>
                <button 
                  type="submit" 
                  disabled={submitting} 
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Memublikasikan..." : "Memublikasikan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}