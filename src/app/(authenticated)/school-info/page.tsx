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
import { Megaphone, Plus, Trash2, Calendar, User, X } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: any;
}

export default function SchoolInfoPage() {
  const { role, userData, user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states (Admin / Kepala Sekolah)
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const list: Announcement[] = [];
      snapshot.forEach(d => {
        list.push({ id: d.id, ...d.data() } as Announcement);
      });
      setAnnouncements(list);
    } catch (err) {
      console.error("Gagal memuat informasi sekolah:", err);
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
      await addDoc(collection(db, "announcements"), {
        title,
        content,
        author: userData?.displayName || user?.email || "Administrator",
        createdAt: Timestamp.now()
      });
      setTitle("");
      setContent("");
      setIsOpen(false);
      fetchAnnouncements();
    } catch (error) {
      console.error("Gagal menyimpan pengumuman:", error);
      alert("Gagal mempublikasikan informasi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus informasi ini?")) return;
    try {
      await deleteDoc(doc(db, "announcements", id));
      fetchAnnouncements();
    } catch (error) {
      console.error("Gagal menghapus:", error);
      alert("Gagal menghapus informasi.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Informasi Sekolah</h1>
          <p className="text-sm text-slate-400 mt-1">Pengumuman, berita, dan informasi penting seputar kegiatan sekolah.</p>
        </div>

        {(role === "admin" || role === "kepala_sekolah") && (
          <button 
            onClick={() => setIsOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 cursor-pointer transition-all"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Buat Pengumuman Baru</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(n => <div key={n} className="h-28 w-full animate-pulse rounded-2xl bg-slate-900" />)}
        </div>
      ) : announcements.length === 0 ? (
        <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-12 text-center text-slate-500 shadow-sm backdrop-blur-sm">
          <Megaphone className="h-10 w-10 mx-auto mb-3 text-slate-600" />
          <p className="text-sm font-medium">Belum ada pengumuman atau informasi sekolah yang dipublikasikan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {announcements.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6 shadow-sm backdrop-blur-sm space-y-4 relative overflow-hidden">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">{item.title}</h2>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-1.5">
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-indigo-400" />
                      {item.author}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" />
                      {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' }) : "Baru saja"}
                    </span>
                  </div>
                </div>

                {(role === "admin" || role === "kepala_sekolah") && (
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="rounded-lg p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Hapus Pengumuman"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                )}
              </div>

              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line border-t border-slate-800/60 pt-4">
                {item.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h2 className="text-lg font-bold text-white">Buat Pengumuman Sekolah</h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Judul Pengumuman</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="Contoh: Libur Nasional Hari Raya..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Isi Informasi / Pengumuman</label>
                <textarea 
                  rows={5}
                  value={content} 
                  onChange={e => setContent(e.target.value)} 
                  placeholder="Tuliskan detail pengumuman di sini..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500 resize-none" 
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white cursor-pointer">Batal</button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20 cursor-pointer transition-all disabled:opacity-50"
                >
                  {submitting ? "Mempublikasikan..." : "Publikasikan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}