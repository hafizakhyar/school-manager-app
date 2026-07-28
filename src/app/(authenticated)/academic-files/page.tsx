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
import { FileText, Plus, Trash2, ExternalLink, Search, X, Eye } from "lucide-react";

interface TeachingAssignment {
  id: string;
  teacher_name: string;
  subject: string;
  class_name: string;
  createdAt?: any;
}

export default function TeachingAssignmentsPage() {
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // State form tambah manual
  const [teacherName, setTeacherName] = useState("");
  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // State untuk pop-up detail guru
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "teachingAssignments"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const list: TeachingAssignment[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as TeachingAssignment));
      setAssignments(list);
    } catch (err) {
      console.error("Gagal memuat penugasan mengajar:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchAssignments(); 
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName || !subject || !className) {
      alert("Nama guru, mata pelajaran, dan kelas wajib diisi!");
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, "teachingAssignments"), {
        teacher_name: teacherName,
        subject,
        class_name: className,
        createdAt: Timestamp.now()
      });
      setTeacherName("");
      setSubject("");
      setClassName("");
      setIsOpen(false);
      fetchAssignments();
      alert("Penugasan mengajar berhasil disimpan!");
    } catch (err: any) {
      console.error("Gagal menyimpan penugasan:", err);
      alert("Gagal menyimpan penugasan! Detail: " + (err.message || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus penugasan ini dari daftar?")) return;
    try {
      await deleteDoc(doc(db, "teachingAssignments", id));
      fetchAssignments();
    } catch (err) {
      console.error("Gagal menghapus:", err);
      alert("Gagal menghapus data.");
    }
  };

  // Mengelompokkan data berdasarkan nama guru (1 baris per nama guru unik)
  const groupedTeachers = assignments.reduce((acc, curr) => {
    const name = curr.teacher_name || "Tanpa Nama";
    if (!acc[name]) {
      acc[name] = [];
    }
    acc[name].push(curr);
    return acc;
  }, {} as Record<string, TeachingAssignment[]>);

  const teacherList = Object.keys(groupedTeachers).map((name) => ({
    teacher_name: name,
    total_assignments: groupedTeachers[name].length,
    items: groupedTeachers[name],
  }));

  // Filter pencarian nama guru
  const filteredTeachers = teacherList.filter((item) =>
    item.teacher_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (name: string) => {
    setSelectedTeacher(name);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTeacher(null);
  };

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Penugasan Mengajar</h1>
          <p className="text-sm text-slate-400 mt-1">Kelola pembagian tugas mengajar guru per kelas dan mata pelajaran.</p>
        </div>
        <button 
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 cursor-pointer transition-all"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Tambah Penugasan</span>
        </button>
      </div>

      <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-5 backdrop-blur-sm flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input 
            type="text"
            placeholder="Cari nama guru..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-12 text-center text-slate-500 backdrop-blur-sm">
          <p className="text-sm font-medium animate-pulse">Memuat data penugasan mengajar...</p>
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-12 text-center text-slate-500 backdrop-blur-sm">
          <FileText className="h-10 w-10 mx-auto mb-3 text-slate-600" />
          <p className="text-sm font-medium">Belum ada data penugasan mengajar atau hasil pencarian tidak ditemukan.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-900 bg-slate-900/40 overflow-hidden backdrop-blur-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider bg-slate-950/60">
                <th className="py-3.5 px-6 font-semibold">Nama Guru</th>
                <th className="py-3.5 px-6 font-semibold">Total Tugas Mengajar</th>
                <th className="py-3.5 px-6 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-sm">
              {filteredTeachers.map((item, index) => (
                <tr 
                  key={index}
                  onClick={() => handleOpenModal(item.teacher_name)}
                  className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                >
                  <td className="py-4 px-6 font-semibold text-white group-hover:text-indigo-400 transition-colors">
                    {item.teacher_name}
                  </td>
                  <td className="py-4 px-6 text-slate-300">
                    <span className="inline-flex items-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 text-xs font-semibold text-indigo-400">
                      {item.total_assignments} Kelas / Mata Pelajaran Diampu
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleOpenModal(item.teacher_name)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600/15 border border-indigo-500/30 px-3 py-1.5 text-xs font-semibold text-indigo-400 hover:bg-indigo-600/25 transition-all cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Lihat Detail</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL / POP-UP DETAIL GURU */}
      {isModalOpen && selectedTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={handleCloseModal} />
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto">
            
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-lg font-bold text-white">Detail Penugasan Mengajar</h2>
                <p className="text-xs text-indigo-400 mt-0.5 font-medium">Guru: {selectedTeacher}</p>
              </div>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-white cursor-pointer p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Daftar Kelas & Mapel (Banyak Baris di Dalam Pop-up) */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Daftar Mata Pelajaran & Kelas:</p>
              {groupedTeachers[selectedTeacher]?.map((assignment, idx) => (
                <div key={assignment.id || idx} className="rounded-xl border border-slate-800 bg-slate-950 p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-white">{assignment.subject}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Kelas: <span className="text-indigo-300 font-semibold">{assignment.class_name}</span></p>
                  </div>
                  <button 
                    onClick={() => handleDelete(assignment.id)}
                    className="text-slate-500 hover:text-red-400 p-2 rounded-lg transition-colors cursor-pointer"
                    title="Hapus penugasan ini"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Footer Modal */}
            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 cursor-pointer transition-all"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL TAMBAH MANUAL */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white">Tambah Penugasan Mengajar</h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Nama Guru</label>
                <input 
                  type="text" 
                  value={teacherName} 
                  onChange={e => setTeacherName(e.target.value)} 
                  placeholder="Contoh: Hafiz Akhyar S.Si" 
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-slate-200 outline-none focus:border-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Mata Pelajaran</label>
                <input 
                  type="text" 
                  value={subject} 
                  onChange={e => setSubject(e.target.value)} 
                  placeholder="Contoh: Kimia" 
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-slate-200 outline-none focus:border-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Kelas</label>
                <input 
                  type="text" 
                  value={className} 
                  onChange={e => setClassName(e.target.value)} 
                  placeholder="Contoh: 12 IPA 1" 
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-slate-200 outline-none focus:border-indigo-500" 
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white cursor-pointer">Batal</button>
                <button 
                  type="submit" 
                  disabled={submitting} 
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan Penugasan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}