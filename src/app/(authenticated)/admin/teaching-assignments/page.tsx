"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  Timestamp, 
  writeBatch 
} from "firebase/firestore";
import { Plus, Pencil, Trash2, X, Upload, CheckCircle, AlertTriangle } from "lucide-react";

interface Assignment {
  id: string;
  teacherId: string;
  classId: string;
  subjectId: string;
}

export default function AdminAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teachers, setTeachers] = useState<Record<string, string>>({});
  const [classes, setClasses] = useState<Record<string, string>>({});
  const [subjects, setSubjects] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Bulk Selection & Sorting States
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Modal states
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Form states
  const [teacherId, setTeacherId] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");

  // CSV Import States
  const [csvSuccessMessage, setCsvSuccessMessage] = useState<string | null>(null);
  const [csvErrorMessage, setCsvErrorMessage] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Lookup Teachers
      const tSnap = await getDocs(collection(db, "teachers"));
      const tMap: Record<string, string> = {};
      tSnap.forEach(d => tMap[d.id] = d.data().fullName);
      setTeachers(tMap);

      // Lookup Classes
      const cSnap = await getDocs(collection(db, "classes"));
      const cMap: Record<string, string> = {};
      cSnap.forEach(d => cMap[d.id] = d.data().name);
      setClasses(cMap);

      // Lookup Subjects
      const sSnap = await getDocs(collection(db, "subjects"));
      const sMap: Record<string, string> = {};
      sSnap.forEach(d => sMap[d.id] = d.data().name);
      setSubjects(sMap);

      // Assignments
      const aSnap = await getDocs(collection(db, "teachingAssignments"));
      const aList: Assignment[] = [];
      aSnap.forEach(d => aList.push({ id: d.id, ...d.data() } as Assignment));
      setAssignments(aList);
      setSelectedIds([]); // Reset selection on fetch
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(sortedAssignments.map(a => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Bulk Delete handler
  const handleBulkDelete = async () => {
    if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} penugasan yang dipilih?`)) return;
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        batch.delete(doc(db, "teachingAssignments", id));
      });
      await batch.commit();
      setSelectedIds([]);
      await fetchData();
    } catch (error) {
      console.error(error);
      alert("Gagal menghapus penugasan massal!");
    }
  };

  // Sorted list based on teacher name A-Z or Z-A
  const sortedAssignments = [...assignments].sort((a, b) => {
    const nameA = (teachers[a.teacherId] || a.teacherId).toLowerCase();
    const nameB = (teachers[b.teacherId] || b.teacherId).toLowerCase();
    if (sortOrder === "asc") {
      return nameA.localeCompare(nameB);
    } else {
      return nameB.localeCompare(nameA);
    }
  });

  const handleOpenAdd = () => {
    setIsEditing(false);
    setCurrentId(null);
    setTeacherId(Object.keys(teachers)[0] || "");
    setClassId(Object.keys(classes)[0] || "");
    setSubjectId(Object.keys(subjects)[0] || "");
    setIsOpen(true);
  };

  const handleOpenEdit = (a: Assignment) => {
    setIsEditing(true);
    setCurrentId(a.id);
    setTeacherId(a.teacherId);
    setClassId(a.classId);
    setSubjectId(a.subjectId);
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherId || !classId || !subjectId) {
      alert("Pilih Guru, Kelas, dan Mata Pelajaran!");
      return;
    }

    try {
      const docId = isEditing && currentId ? currentId : `ASG_${Date.now()}`;
      const docRef = doc(db, "teachingAssignments", docId);

      await setDoc(docRef, {
        teacherId,
        classId,
        subjectId,
        createdAt: Timestamp.now()
      }, { merge: true });

      setIsOpen(false);
      await fetchData();
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan penugasan!");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus penugasan mengajar ini?")) return;
    try {
      await deleteDoc(doc(db, "teachingAssignments", id));
      await fetchData();
    } catch (error) {
      console.error(error);
      alert("Gagal menghapus penugasan!");
    }
  };

  // CSV Import Parse
  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvSuccessMessage(null);
    setCsvErrorMessage(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split("\n");
      const batch = writeBatch(db);
      let count = 0;
      let skipped = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(",").map(c => c.trim());
        const tId = cols[0];
        const cId = cols[1];
        const sId = cols[2];

        if (!tId || !cId || !sId) {
          skipped++;
          continue;
        }

        const docId = `ASG_${Date.now()}_${i}`;
        const docRef = doc(db, "teachingAssignments", docId);

        batch.set(docRef, {
          teacherId: tId,
          classId: cId,
          subjectId: sId,
          createdAt: Timestamp.now()
        }, { merge: true });
        count++;
      }

      if (count > 0) {
        try {
          await batch.commit();
          setCsvSuccessMessage(`Berhasil mengimpor ${count} penugasan mengajar.`);
          await fetchData();
        } catch (err: any) {
          console.error(err);
          setCsvErrorMessage(`Gagal mengimpor batch: ${err.message}`);
        }
      } else {
        setCsvErrorMessage("Tidak ada data valid yang ditemukan dalam CSV.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Penugasan Mengajar</h1>
          <p className="text-sm text-slate-400 mt-1">Kelola pembagian tugas mengajar guru per kelas dan mata pelajaran.</p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <label className="flex items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:text-white cursor-pointer transition-colors">
            <Upload className="h-4.5 w-4.5" />
            <span>Impor CSV</span>
            <input type="file" accept=".csv" onChange={handleCsvImport} className="hidden" />
          </label>

          <button onClick={handleOpenAdd} className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 cursor-pointer">
            <Plus className="h-4.5 w-4.5" />
            <span>Tambah Penugasan</span>
          </button>
        </div>
      </div>

      {csvSuccessMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm text-emerald-400">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span>{csvSuccessMessage}</span>
        </div>
      )}
      {csvErrorMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-400">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{csvErrorMessage}</span>
        </div>
      )}

      {/* Action Bar (Bulk Actions & Sorting Filter) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {selectedIds.length > 0 ? (
          <div className="flex items-center gap-3 bg-indigo-950/40 border border-indigo-500/30 px-4 py-2 rounded-xl">
            <span className="text-xs font-bold text-indigo-300">{selectedIds.length} penugasan dipilih</span>
            <button
              onClick={handleBulkDelete}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 transition-colors cursor-pointer"
            >
              Hapus Terpilih
            </button>
          </div>
        ) : <div />}

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Urutkan:</span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="asc">Nama Guru (A ke Z)</option>
            <option value="desc">Nama Guru (Z ke A)</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(n => <div key={n} className="h-14 w-full animate-pulse rounded bg-slate-900" />)}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-900 bg-slate-900/40 backdrop-blur-sm">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800">
              <tr>
                <th className="py-4 px-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={sortedAssignments.length > 0 && selectedIds.length === sortedAssignments.length}
                    onChange={handleSelectAll}
                    className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th className="py-4 px-4">Nama Guru</th>
                <th className="py-4 px-4">Mata Pelajaran</th>
                <th className="py-4 px-4">Kelas</th>
                <th className="py-4 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {sortedAssignments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">Belum ada data penugasan mengajar.</td>
                </tr>
              ) : (
                sortedAssignments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-900/25 transition-colors">
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(a.id)}
                        onChange={() => handleSelectOne(a.id)}
                        className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">{teachers[a.teacherId] || a.teacherId}</td>
                    <td className="py-3.5 px-4 text-xs text-indigo-400">{subjects[a.subjectId] || a.subjectId}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-300">{classes[a.classId] || a.classId}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleOpenEdit(a)} className="rounded-lg p-1.5 text-slate-400 hover:text-white cursor-pointer">
                          <Pencil className="h-4.5 w-4.5" />
                        </button>
                        <button onClick={() => handleDelete(a.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-500/10 cursor-pointer">
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h2 className="text-lg font-bold text-white">{isEditing ? "Edit Penugasan" : "Tambah Penugasan"}</h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Guru Pengajar</label>
                <select value={teacherId} onChange={e => setTeacherId(e.target.value)} className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none cursor-pointer">
                  {Object.entries(teachers).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Mata Pelajaran</label>
                <select value={subjectId} onChange={e => setSubjectId(e.target.value)} className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none cursor-pointer">
                  {Object.entries(subjects).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Kelas yang Diajar</label>
                <select value={classId} onChange={e => setClassId(e.target.value)} className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none cursor-pointer">
                  {Object.entries(classes).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm text-slate-400 cursor-pointer">Batal</button>
                <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white cursor-pointer">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}