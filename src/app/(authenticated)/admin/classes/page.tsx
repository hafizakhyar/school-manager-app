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

interface ClassRoom {
  id: string;
  name: string;
  gradeLevel: string;
  homeroomTeacherId?: string;
}

interface Teacher {
  id: string;
  fullName: string;
}

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("10");
  const [homeroomTeacherId, setHomeroomTeacherId] = useState("");

  // CSV Import States
  const [csvSuccessMessage, setCsvSuccessMessage] = useState<string | null>(null);
  const [csvErrorMessage, setCsvErrorMessage] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch teachers
      const tSnap = await getDocs(collection(db, "teachers"));
      const tList: Teacher[] = [];
      tSnap.forEach(d => tList.push({ id: d.id, fullName: d.data().fullName }));
      setTeachers(tList);

      // Fetch classes
      const cSnap = await getDocs(collection(db, "classes"));
      const cList: ClassRoom[] = [];
      cSnap.forEach(d => cList.push({ id: d.id, ...d.data() } as ClassRoom));
      setClasses(cList.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setCurrentId(null);
    setName("");
    setGradeLevel("10");
    setHomeroomTeacherId("");
    setIsOpen(true);
  };

  const handleOpenEdit = (c: ClassRoom) => {
    setIsEditing(true);
    setCurrentId(c.id);
    setName(c.name);
    setGradeLevel(c.gradeLevel || "10");
    setHomeroomTeacherId(c.homeroomTeacherId || "");
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Nama kelas wajib diisi!");
      return;
    }

    try {
      const docId = isEditing && currentId ? currentId : `KLS_${name.trim().replace(/\s+/g, "_")}`;
      const docRef = doc(db, "classes", docId);
      
      await setDoc(docRef, {
        name: name.trim(),
        gradeLevel,
        homeroomTeacherId: homeroomTeacherId || "",
        updatedAt: Timestamp.now()
      }, { merge: true });

      setIsOpen(false);
      await fetchData();
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan data kelas!");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data kelas ini?")) return;
    try {
      await deleteDoc(doc(db, "classes", id));
      await fetchData();
    } catch (error) {
      console.error(error);
      alert("Gagal menghapus data kelas!");
    }
  };

  // CSV Import Parse & Batch Upload
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

      // Format CSV: Name, GradeLevel
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(",").map(c => c.trim());
        const className = cols[0];
        const classGrade = cols[1] || "10";

        if (!className) {
          skipped++;
          continue;
        }

        const docId = `KLS_${className.replace(/\s+/g, "_")}`;
        const docRef = doc(db, "classes", docId);

        batch.set(docRef, {
          name: className,
          gradeLevel: classGrade,
          createdAt: Timestamp.now()
        }, { merge: true });
        count++;
      }

      if (count > 0) {
        try {
          await batch.commit();
          setCsvSuccessMessage(`Berhasil mengimpor ${count} data kelas.`);
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
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Data Kelas / Rombel</h1>
          <p className="text-sm text-slate-400 mt-1">Kelola rombongan belajar dan wali kelas SMA Islam Alam & Sains Al-Jannah.</p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <label className="flex items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:text-white cursor-pointer transition-colors">
            <Upload className="h-4.5 w-4.5" />
            <span>Impor CSV</span>
            <input type="file" accept=".csv" onChange={handleCsvImport} className="hidden" />
          </label>

          <button onClick={handleOpenAdd} className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500">
            <Plus className="h-4.5 w-4.5" />
            <span>Tambah Kelas</span>
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

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(n => <div key={n} className="h-14 w-full animate-pulse rounded bg-slate-900" />)}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-900 bg-slate-900/40 backdrop-blur-sm">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800">
              <tr>
                <th className="py-4 px-4">Nama Kelas</th>
                <th className="py-4 px-4">Tingkat</th>
                <th className="py-4 px-4">Wali Kelas</th>
                <th className="py-4 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {classes.map((c) => (
                <tr key={c.id} className="hover:bg-slate-900/25 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-white">{c.name}</td>
                  <td className="py-3.5 px-4 text-xs text-slate-400">Kelas {c.gradeLevel}</td>
                  <td className="py-3.5 px-4 text-xs text-slate-300">
                    {teachers.find(t => t.id === c.homeroomTeacherId)?.fullName || "Belum Ditingkatkan"}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleOpenEdit(c)} className="rounded-lg p-1.5 text-slate-400 hover:text-white">
                        <Pencil className="h-4.5 w-4.5" />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-500/10">
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h2 className="text-lg font-bold text-white">{isEditing ? "Edit Kelas" : "Tambah Kelas"}</h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Nama Kelas (e.g. 10-A)</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Tingkat Kelas</label>
                <select value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none">
                  <option value="10">Kelas 10</option>
                  <option value="11">Kelas 11</option>
                  <option value="12">Kelas 12</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Wali Kelas (Opsional)</label>
                <select value={homeroomTeacherId} onChange={e => setHomeroomTeacherId(e.target.value)} className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none">
                  <option value="">-- Pilih Wali Kelas --</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm text-slate-400">Batal</button>
                <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}