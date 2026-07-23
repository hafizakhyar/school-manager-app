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
import { Student } from "@/types";

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [selectedClassFilter, setSelectedClassFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // CRUD Modal states
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Form fields
  const [nisn, setNisn] = useState("");
  const [fullName, setFullName] = useState("");
  const [classId, setClassId] = useState("");
  const [gender, setGender] = useState<"L" | "P">("L");
  const [status, setStatus] = useState<"Aktif" | "Lulus" | "Pindah">("Aktif");

  // CSV Import States
  const [csvSuccessMessage, setCsvSuccessMessage] = useState<string | null>(null);
  const [csvErrorMessage, setCsvErrorMessage] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch classes for lookup
      const classesSnap = await getDocs(collection(db, "classes"));
      const cMap: Record<string, string> = {};
      classesSnap.forEach(d => cMap[d.id] = d.data().name);
      setClasses(cMap);

      // Fetch students
      const snap = await getDocs(collection(db, "students"));
      const list: Student[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as Student);
      });
      setStudents(list.sort((a, b) => a.fullName.localeCompare(b.fullName)));
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
    setNisn("");
    setFullName("");
    setClassId(Object.keys(classes)[0] || "");
    setGender("L");
    setStatus("Aktif");
    setIsOpen(true);
  };

  const handleOpenEdit = (s: Student) => {
    setIsEditing(true);
    setCurrentId(s.id);
    setNisn(s.nisn);
    setFullName(s.fullName);
    setClassId(s.classId);
    setGender(s.gender);
    setStatus(s.status);
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nisn.trim() || !fullName.trim() || !classId) {
      alert("Semua field wajib diisi!");
      return;
    }

    try {
      if (isEditing && currentId) {
        const docRef = doc(db, "students", currentId);
        await setDoc(docRef, {
          nisn: nisn.trim(),
          fullName: fullName.trim(),
          classId,
          gender,
          status,
          createdAt: Timestamp.now()
        }, { merge: true });
      } else {
        const docId = `STD${String(students.length + 1).padStart(3, "0")}`;
        const docRef = doc(db, "students", docId);
        await setDoc(docRef, {
          nisn: nisn.trim(),
          fullName: fullName.trim(),
          classId,
          gender,
          status,
          createdAt: Timestamp.now()
        });
      }
      setIsOpen(false);
      await fetchData();
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan data siswa!");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data siswa ini?")) return;
    try {
      await deleteDoc(doc(db, "students", id));
      await fetchData();
    } catch (error) {
      console.error(error);
      alert("Gagal menghapus data siswa!");
    }
  };

  // CSV file parse and batch upload
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
        if (cols.length < 4) {
          skipped++;
          continue;
        }

        const studentNisn = cols[0];
        const studentName = cols[1];
        const studentClass = cols[2];
        const studentGender = cols[3] as "L" | "P";

        if (!studentNisn || !studentName || !studentClass) {
          skipped++;
          continue;
        }

        const docId = `STD_CSV_${studentNisn}`;
        const docRef = doc(db, "students", docId);

        batch.set(docRef, {
          nisn: studentNisn,
          fullName: studentName,
          classId: studentClass,
          gender: studentGender === "P" ? "P" : "L",
          status: "Aktif",
          createdAt: Timestamp.now()
        });
        count++;
      }

      if (count > 0) {
        try {
          await batch.commit();
          setCsvSuccessMessage(`Berhasil mengimpor ${count} siswa. (Lewat: ${skipped} baris tak valid)`);
          await fetchData();
        } catch (err: any) {
          console.error(err);
          setCsvErrorMessage(`Gagal mengimpor batch: ${err.message}`);
        }
      }
    };
    reader.readAsText(file);
  };

  const filteredStudents = students.filter(s => {
    if (selectedClassFilter && s.classId !== selectedClassFilter) return false;
    if (searchQuery && !s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) && !s.nisn.includes(searchQuery)) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Data Siswa</h1>
          <p className="text-sm text-slate-400 mt-1">
            Kelola data master murid dan rombongan belajar SMA Islam Alam & Sains Al-Jannah.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {/* CSV Import Button */}
          <label className="flex items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:text-white cursor-pointer hover:border-slate-700 transition-colors">
            <Upload className="h-4.5 w-4.5" />
            <span>Impor CSV</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvImport}
              className="hidden"
            />
          </label>

          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-indigo-500"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Tambah Siswa</span>
          </button>
        </div>
      </div>

      {/* CSV Status Messages */}
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

      {/* Filter and Search Panel */}
      <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-sm flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Cari berdasarkan nama atau NISN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-200 placeholder-slate-700 outline-none focus:border-indigo-500"
          />
        </div>
        <div className="w-full sm:w-60">
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500"
          >
            <option value="">Semua Kelas</option>
            {Object.entries(classes).map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Table */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-10 w-full animate-pulse rounded bg-slate-900" />
          {[1, 2, 3].map(n => (
            <div key={n} className="h-14 w-full animate-pulse rounded bg-slate-900 border border-slate-800" />
          ))}
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="rounded-xl border border-slate-900 border-dashed py-16 text-center">
          <Plus className="mx-auto h-12 w-12 text-slate-600" />
          <h3 className="mt-4 text-sm font-bold text-white">Tidak ada data siswa</h3>
          <p className="mt-1 text-xs text-slate-500">Klik "Tambah Siswa" atau "Impor CSV" untuk mengisi data master.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-900 bg-slate-900/40 backdrop-blur-sm">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800">
              <tr>
                <th className="py-4 px-4 w-40">NISN</th>
                <th className="py-4 px-4">Nama Lengkap</th>
                <th className="py-4 px-4">Kelas</th>
                <th className="py-4 px-4 w-28 text-center">Gender</th>
                <th className="py-4 px-4 w-28 text-center">Status</th>
                <th className="py-4 px-4 w-28 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-900/25 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-400">{student.nisn}</td>
                  <td className="py-3.5 px-4 font-semibold text-white">{student.fullName}</td>
                  <td className="py-3.5 px-4 text-xs text-slate-300">{classes[student.classId] || student.classId}</td>
                  <td className="py-3.5 px-4 text-center text-xs">
                    {student.gender === "L" ? "Laki-laki" : "Perempuan"}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                      student.status === "Aktif"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    }`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(student)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                      >
                        <Pencil className="h-4.5 w-4.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(student.id)}
                        className="rounded-lg p-1.5 text-red-500 hover:bg-red-500/10"
                      >
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

      {/* CRUD Form Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h2 className="text-lg font-bold text-white">
                {isEditing ? "Edit Data Siswa" : "Tambah Siswa Baru"}
              </h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">NISN (10 Digit)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 0061234501"
                  value={nisn}
                  onChange={(e) => setNisn(e.target.value)}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-700 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nama Lengkap Siswa</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aditya Pratama"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-700 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Kelas / Rombel</label>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                  >
                    {Object.entries(classes).map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Jenis Kelamin</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as "L" | "P")}
                    className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Status Siswa</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "Aktif" | "Lulus" | "Pindah")}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Lulus">Lulus</option>
                  <option value="Pindah">Pindah</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-indigo-500"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}