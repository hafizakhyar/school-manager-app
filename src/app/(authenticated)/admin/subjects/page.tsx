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

interface Subject {
  id: string;
  code: string;
  name: string;
  category?: string;
}

export default function AdminSubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Form states
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Wajib");

  // CSV Import States
  const [csvSuccessMessage, setCsvSuccessMessage] = useState<string | null>(null);
  const [csvErrorMessage, setCsvErrorMessage] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "subjects"));
      const list: Subject[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Subject));
      setSubjects(list.sort((a, b) => a.name.localeCompare(b.name)));
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
    setCode("");
    setName("");
    setCategory("Wajib");
    setIsOpen(true);
  };

  const handleOpenEdit = (s: Subject) => {
    setIsEditing(true);
    setCurrentId(s.id);
    setCode(s.code);
    setName(s.name);
    setCategory(s.category || "Wajib");
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      alert("Kode dan Nama Mata Pelajaran wajib diisi!");
      return;
    }

    try {
      const docId = isEditing && currentId ? currentId : `SUBJ_${code.trim().toUpperCase()}`;
      const docRef = doc(db, "subjects", docId);

      await setDoc(docRef, {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        category,
        updatedAt: Timestamp.now()
      }, { merge: true });

      setIsOpen(false);
      await fetchData();
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan data mata pelajaran!");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus mata pelajaran ini?")) return;
    try {
      await deleteDoc(doc(db, "subjects", id));
      await fetchData();
    } catch (error) {
      console.error(error);
      alert("Gagal menghapus mata pelajaran!");
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

      // Format CSV: Code, Name, Category
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(",").map(c => c.trim());
        const subjCode = cols[0];
        const subjName = cols[1];
        const subjCat = cols[2] || "Wajib";

        if (!subjCode || !subjName) {
          skipped++;
          continue;
        }

        const docId = `SUBJ_${subjCode.toUpperCase()}`;
        const docRef = doc(db, "subjects", docId);

        batch.set(docRef, {
          code: subjCode.toUpperCase(),
          name: subjName,
          category: subjCat,
          createdAt: Timestamp.now()
        }, { merge: true });
        count++;
      }

      if (count > 0) {
        try {
          await batch.commit();
          setCsvSuccessMessage(`Berhasil mengimpor ${count} mata pelajaran.`);
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
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Mata Pelajaran</h1>
          <p className="text-sm text-slate-400 mt-1">Kelola daftar kurikulum dan mata pelajaran SMA Islam Alam & Sains Al-Jannah.</p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <label className="flex items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:text-white cursor-pointer transition-colors">
            <Upload className="h-4.5 w-4.5" />
            <span>Impor CSV</span>
            <input type="file" accept=".csv" onChange={handleCsvImport} className="hidden" />
          </label>

          <button onClick={handleOpenAdd} className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500">
            <Plus className="h-4.5 w-4.5" />
            <span>Tambah Mapel</span>
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
                <th className="py-4 px-4 w-32">Kode Mapel</th>
                <th className="py-4 px-4">Nama Mata Pelajaran</th>
                <th className="py-4 px-4">Kategori</th>
                <th className="py-4 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {subjects.map((s) => (
                <tr key={s.id} className="hover:bg-slate-900/25 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-xs text-indigo-400">{s.code}</td>
                  <td className="py-3.5 px-4 font-semibold text-white">{s.name}</td>
                  <td className="py-3.5 px-4 text-xs text-slate-400">{s.category || "Wajib"}</td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleOpenEdit(s)} className="rounded-lg p-1.5 text-slate-400 hover:text-white">
                        <Pencil className="h-4.5 w-4.5" />
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-500/10">
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
              <h2 className="text-lg font-bold text-white">{isEditing ? "Edit Mapel" : "Tambah Mapel"}</h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Kode Mapel (e.g. FIS)</label>
                <input type="text" required value={code} onChange={e => setCode(e.target.value)} className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Nama Mata Pelajaran</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Kategori</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none">
                  <option value="Wajib">Wajib</option>
                  <option value="Peminatan IPA">Peminatan IPA</option>
                  <option value="Peminatan IPS">Peminatan IPS</option>
                  <option value="Ekstrakurikuler">Ekstrakurikuler</option>
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