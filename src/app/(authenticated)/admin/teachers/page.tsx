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
import { Teacher } from "@/types";

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Form State
  const [nip, setNip] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // CSV Import States
  const [csvSuccessMessage, setCsvSuccessMessage] = useState<string | null>(null);
  const [csvErrorMessage, setCsvErrorMessage] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "teachers"));
      const list: Teacher[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as Teacher);
      });
      setTeachers(list.sort((a, b) => a.fullName.localeCompare(b.fullName)));
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
    setNip("");
    setFullName("");
    setEmail("");
    setPhone("");
    setIsOpen(true);
  };

  const handleOpenEdit = (t: Teacher) => {
    setIsEditing(true);
    setCurrentId(t.id);
    setNip(t.nip || "");
    setFullName(t.fullName);
    setEmail(t.email || "");
    setPhone(t.phone || "");
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      alert("Nama lengkap guru wajib diisi!");
      return;
    }

    try {
      if (isEditing && currentId) {
        const docRef = doc(db, "teachers", currentId);
        await setDoc(docRef, {
          nip: nip.trim(),
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          updatedAt: Timestamp.now()
        }, { merge: true });
      } else {
        const docId = `TCH_${Date.now()}`;
        const docRef = doc(db, "teachers", docId);
        await setDoc(docRef, {
          nip: nip.trim(),
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          createdAt: Timestamp.now()
        });
      }
      setIsOpen(false);
      await fetchData();
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan data guru!");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data guru ini?")) return;
    try {
      await deleteDoc(doc(db, "teachers", id));
      await fetchData();
    } catch (error) {
      console.error(error);
      alert("Gagal menghapus data guru!");
    }
  };

  // CSV Import Parse & Write
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

      // Expecting format: NIP, FullName, Email, Phone
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(",").map(c => c.trim());
        if (cols.length < 2) {
          skipped++;
          continue;
        }

        const teacherNip = cols[0];
        const teacherName = cols[1];
        const teacherEmail = cols[2] || "";
        const teacherPhone = cols[3] || "";

        if (!teacherName) {
          skipped++;
          continue;
        }

        const docId = teacherNip ? `TCH_${teacherNip}` : `TCH_CSV_${Date.now()}_${i}`;
        const docRef = doc(db, "teachers", docId);

        batch.set(docRef, {
          nip: teacherNip,
          fullName: teacherName,
          email: teacherEmail,
          phone: teacherPhone,
          createdAt: Timestamp.now()
        }, { merge: true });
        count++;
      }

      if (count > 0) {
        try {
          await batch.commit();
          setCsvSuccessMessage(`Berhasil mengimpor ${count} data guru. (Dilewati: ${skipped} baris tak valid)`);
          await fetchData();
        } catch (err: any) {
          console.error(err);
          setCsvErrorMessage(`Gagal mengimpor batch: ${err.message}`);
        }
      } else {
        setCsvErrorMessage("Tidak ada data valid yang ditemukan dalam file CSV.");
      }
    };
    reader.readAsText(file);
  };

  const filteredTeachers = teachers.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.fullName.toLowerCase().includes(q) ||
      (t.nip && t.nip.includes(q)) ||
      (t.email && t.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Data Guru</h1>
          <p className="text-sm text-slate-400 mt-1">
            Kelola data pendidik dan staf pengajar SMA Islam Alam & Sains Al-Jannah.
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
            <span>Tambah Guru</span>
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

      {/* Search Bar */}
      <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-sm">
        <input
          type="text"
          placeholder="Cari berdasarkan nama, NIP, atau email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-200 placeholder-slate-700 outline-none focus:border-indigo-500"
        />
      </div>

      {/* Teachers Table */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-10 w-full animate-pulse rounded bg-slate-900" />
          {[1, 2, 3].map(n => (
            <div key={n} className="h-14 w-full animate-pulse rounded bg-slate-900 border border-slate-800" />
          ))}
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div className="rounded-xl border border-slate-900 border-dashed py-16 text-center">
          <Plus className="mx-auto h-12 w-12 text-slate-600" />
          <h3 className="mt-4 text-sm font-bold text-white">Tidak ada data guru</h3>
          <p className="mt-1 text-xs text-slate-500">Klik "Tambah Guru" atau "Impor CSV" untuk mengisi data.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-900 bg-slate-900/40 backdrop-blur-sm">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800">
              <tr>
                <th className="py-4 px-4 w-40">NIP</th>
                <th className="py-4 px-4">Nama Lengkap</th>
                <th className="py-4 px-4">Email</th>
                <th className="py-4 px-4">No. HP / Whatsapp</th>
                <th className="py-4 px-4 w-28 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {filteredTeachers.map((teacher) => (
                <tr key={teacher.id} className="hover:bg-slate-900/25 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-400">{teacher.nip || "-"}</td>
                  <td className="py-3.5 px-4 font-semibold text-white">{teacher.fullName}</td>
                  <td className="py-3.5 px-4 text-xs text-slate-300">{teacher.email || "-"}</td>
                  <td className="py-3.5 px-4 text-xs text-slate-300">{teacher.phone || "-"}</td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(teacher)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                      >
                        <Pencil className="h-4.5 w-4.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(teacher.id)}
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

      {/* Modal Form */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h2 className="text-lg font-bold text-white">
                {isEditing ? "Edit Data Guru" : "Tambah Guru Baru"}
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
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">NIP (Opsional)</label>
                <input
                  type="text"
                  placeholder="e.g. 198501012010011001"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-700 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nama Lengkap & Gelar</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Budi Santoso, S.Pd."
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-700 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Email Sekolah</label>
                <input
                  type="email"
                  placeholder="e.g. budi@aljannah.sch.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-700 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">No. Telepon / WhatsApp</label>
                <input
                  type="text"
                  placeholder="e.g. 081234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-700 outline-none focus:border-indigo-500"
                />
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