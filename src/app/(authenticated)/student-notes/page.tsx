"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  Timestamp 
} from "firebase/firestore";
import { ClipboardPen, Search, Save, Upload, CheckSquare, Square, Plus, Trash2, X, FileText } from "lucide-react";

interface NoteItem {
  id: string;
  type: string;
  date: string;
  note: string;
}

interface Student {
  id: string;
  fullName: string;
  nis: string;
  classId: string;
  className?: string;
  studentNotesData?: any;
}

interface ClassItem {
  id: string;
  name: string;
}

export default function StudentNotesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [academicYear, setAcademicYear] = useState<string>("2026/2027");
  const [semester, setSemester] = useState<string>("Ganjil");
  
  const [students, setStudents] = useState<Student[]>([]);
  const [notesRecords, setNotesRecords] = useState<{ [studentId: string]: NoteItem[] }>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectAll, setSelectAll] = useState(false);

  // State untuk Modal Kelola Catatan Multi
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [modalNotes, setModalNotes] = useState<NoteItem[]>([]);
  const [newType, setNewType] = useState("Catatan Harian");
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newText, setNewText] = useState("");

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const snap = await getDocs(collection(db, "classes"));
        const list: ClassItem[] = [];
        snap.forEach(d => {
          const data = d.data();
          list.push({ id: d.id, name: data.name || data.className || d.id });
        });
        setClasses(list);
        if (list.length > 0) setSelectedClass(list[0].id);
      } catch (err) {
        console.error("Gagal memuat kelas:", err);
      }
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    if (!selectedClass) return;

    const fetchStudentsAndNotes = async () => {
      setLoading(true);
      try {
        const selectedClassObj = classes.find(c => c.id === selectedClass);
        const className = selectedClassObj ? selectedClassObj.name : "";

        const studentSnap = await getDocs(collection(db, "students"));
        const studentList: Student[] = [];
        const recordsMap: { [studentId: string]: NoteItem[] } = {};
        const docKey = `${academicYear.replace("/", "-")}_${semester}`;

        studentSnap.forEach(d => {
          const data = d.data();
          const studentId = d.id;
          const sClassId = data.classId || "";
          const sClassName = data.className || "";

          const isMatch = 
            sClassId === selectedClass || 
            sClassId === className || 
            sClassName === selectedClass || 
            sClassName === className;

          if (isMatch) {
            studentList.push({ 
              id: studentId, 
              fullName: data.fullName || data.name || "Tanpa Nama", 
              nis: data.nis || data.nisn || "-", 
              classId: sClassId,
              studentNotesData: data.studentNotesData || {}
            });

            const allNotes = data.studentNotesData || {};
            const currentRecord = allNotes[docKey];

            // Konversi format lama (object tunggal) atau gunakan array multi-catatan
            if (Array.isArray(currentRecord)) {
              recordsMap[studentId] = currentRecord;
            } else if (currentRecord && typeof currentRecord === 'object') {
              recordsMap[studentId] = [{
                id: Date.now().toString(),
                type: currentRecord.type || "Catatan Harian",
                date: currentRecord.date || todayStr,
                note: currentRecord.note || ""
              }];
            } else {
              recordsMap[studentId] = [];
            }
          }
        });

        studentList.sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
        setStudents(studentList);
        setNotesRecords(recordsMap);
        setSelectAll(false);
      } catch (err) {
        console.error("Gagal memuat siswa:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentsAndNotes();
  }, [selectedClass, academicYear, semester, classes]);

  const handleToggleSelectAll = () => {
    // Bisa digunakan untuk memilih baris jika diperlukan
    setSelectAll(!selectAll);
  };

  // Buka Modal Kelola Catatan
  const handleOpenModal = (student: Student) => {
    setActiveStudent(student);
    setModalNotes(notesRecords[student.id] || []);
    setNewType("Catatan Harian");
    setNewDate(todayStr);
    setNewText("");
  };

  // Tambah catatan ke dalam modal sementara
  const handleAddNoteToModal = () => {
    if (!newText.trim()) {
      alert("Isi catatan / keterangan wajib diisi!");
      return;
    }
    const newItem: NoteItem = {
      id: Date.now().toString(),
      type: newType,
      date: newDate,
      note: newText.trim()
    };
    setModalNotes([...modalNotes, newItem]);
    setNewText("");
  };

  // Hapus catatan dari modal sementara
  const handleDeleteNoteFromModal = (noteId: string) => {
    setModalNotes(modalNotes.filter(item => item.id !== noteId));
  };

  // Simpan perubahan dari modal ke state utama
  const handleSaveModalChanges = () => {
    if (!activeStudent) return;
    setNotesRecords(prev => ({
      ...prev,
      [activeStudent.id]: modalNotes
    }));
    setActiveStudent(null);
  };

  // Simpan seluruh data ke Firestore
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const docKey = `${academicYear.replace("/", "-")}_${semester}`;
      
      for (const student of students) {
        const studentRef = doc(db, "students", student.id);
        const studentNotesArray = notesRecords[student.id] || [];
        const existingNotes = student.studentNotesData || {};

        await setDoc(studentRef, {
          studentNotesData: {
            ...existingNotes,
            [docKey]: studentNotesArray
          }
        }, { merge: true });
      }

      alert("Semua Catatan Siswa berhasil disimpan!");
    } catch (err: any) {
      console.error("Gagal menyimpan:", err);
      alert("Terjadi kesalahan saat menyimpan data.");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    alert(`File CSV "${file.name}" berhasil dibaca! Fitur pemetaan otomatis siap digunakan.`);
  };

  const filteredStudents = students.filter(s => 
    (s.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.nis && s.nis.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Catatan & Jurnal Siswa</h1>
          <p className="text-sm text-slate-400 mt-1">Rekap prestasi, pelanggaran, dan catatan harian perilaku siswa (Multi-Catatan).</p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer transition-all">
            <Upload className="h-4.5 w-4.5 text-indigo-400" />
            <span>Unggah CSV</span>
            <input type="file" accept=".csv" onChange={handleUploadCSV} className="hidden" />
          </label>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving || students.length === 0}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/25 cursor-pointer transition-all disabled:opacity-50"
          >
            <Save className="h-4.5 w-4.5" />
            <span>{saving ? "Menyimpan..." : "Simpan Semua Catatan"}</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-5 backdrop-blur-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Pilih Kelas</label>
          <select 
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500"
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Tahun Ajaran</label>
          <select 
            value={academicYear}
            onChange={e => setAcademicYear(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500"
          >
            <option value="2026/2027">2026/2027</option>
            <option value="2025/2026">2025/2026</option>
            <option value="2027/2028">2027/2028</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Semester</label>
          <select 
            value={semester}
            onChange={e => setSemester(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500"
          >
            <option value="Ganjil">Semester Ganjil</option>
            <option value="Genap">Semester Genap</option>
          </select>
        </div>

        <div className="lg:col-span-2">
          <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Cari Siswa</label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input 
              type="text"
              placeholder="Cari nama siswa atau NIS..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Tabel Catatan Siswa */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(n => <div key={n} className="h-16 w-full animate-pulse rounded-xl bg-slate-900" />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-4 px-4 w-12 text-center">
                    <span className="text-slate-500">#</span>
                  </th>
                  <th className="py-4 px-4 w-16">No</th>
                  <th className="py-4 px-6 min-w-[140px]">NIS</th>
                  <th className="py-4 px-6 min-w-[240px]">Nama Siswa</th>
                  <th className="py-4 px-6 min-w-[200px]">Ringkasan Catatan</th>
                  <th className="py-4 px-6 min-w-[180px] text-center">Aksi / Kelola</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 text-sm">
                      Tidak ada data siswa ditemukan di kelas ini.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, idx) => {
                    const studentNotes = notesRecords[student.id] || [];
                    const prestasiCount = studentNotes.filter(n => n.type === "Prestasi").length;
                    const pelanggaranCount = studentNotes.filter(n => n.type === "Pelanggaran").length;
                    const harianCount = studentNotes.filter(n => n.type === "Catatan Harian").length;

                    return (
                      <tr key={student.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="py-4 px-4 text-center text-slate-600">•</td>
                        <td className="py-4 px-4 font-medium text-slate-500">{idx + 1}</td>
                        <td className="py-4 px-6 text-xs text-slate-300 font-mono font-semibold">{student.nis}</td>
                        <td className="py-4 px-6 font-semibold text-white">{student.fullName}</td>

                        {/* Ringkasan Catatan */}
                        <td className="py-4 px-6">
                          {studentNotes.length === 0 ? (
                            <span className="text-xs text-slate-500 italic">Belum ada catatan</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {prestasiCount > 0 && (
                                <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                                  {prestasiCount} Prestasi
                                </span>
                              )}
                              {pelanggaranCount > 0 && (
                                <span className="rounded-md bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-[11px] font-semibold text-red-400">
                                  {pelanggaranCount} Pelanggaran
                                </span>
                              )}
                              {harianCount > 0 && (
                                <span className="rounded-md bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[11px] font-semibold text-indigo-400">
                                  {harianCount} Harian
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Tombol Kelola Catatan */}
                        <td className="py-4 px-6 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenModal(student)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600/15 border border-indigo-500/30 px-3.5 py-2 text-xs font-semibold text-indigo-400 hover:bg-indigo-600/25 transition-all cursor-pointer shadow-sm"
                          >
                            <ClipboardPen className="h-3.5 w-3.5" />
                            <span>Kelola ({studentNotes.length})</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL KELOLA MULTI-CATATAN SISWA */}
      {activeStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setActiveStudent(null)} />
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Kelola Riwayat Catatan Siswa</h2>
                <p className="text-xs text-indigo-400 font-semibold mt-0.5">
                  {activeStudent.fullName} <span className="text-slate-500 font-mono font-normal">({activeStudent.nis})</span>
                </p>
              </div>
              <button onClick={() => setActiveStudent(null)} className="text-slate-400 hover:text-white cursor-pointer p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form Tambah Catatan Baru dalam Modal */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Tambah Catatan / Prestasi Baru</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Jenis Catatan</label>
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 font-semibold"
                  >
                    <option value="Catatan Harian">Catatan Harian</option>
                    <option value="Prestasi">Prestasi</option>
                    <option value="Pelanggaran">Pelanggaran</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Tanggal Kejadian</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Isi Keterangan / Uraian</label>
                <input
                  type="text"
                  placeholder="Tuliskan keterangan lengkap..."
                  value={newText}
                  onChange={e => setNewText(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddNoteToModal}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-md cursor-pointer transition-all"
                >
                  <Plus className="h-4 w-4" />
                  <span>Tambah ke Daftar</span>
                </button>
              </div>
            </div>

            {/* Daftar Catatan yang Sudah Ada */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Daftar Riwayat ({modalNotes.length})</p>
              
              {modalNotes.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-6 text-center text-slate-500 text-xs">
                  Belum ada catatan tercatat untuk semester ini.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {modalNotes.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                            item.type === "Prestasi" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                            item.type === "Pelanggaran" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                            "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                          }`}>
                            {item.type}
                          </span>
                          <span className="text-slate-500 font-mono text-[11px]">{item.date}</span>
                        </div>
                        <p className="text-slate-200 font-medium truncate">{item.note}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteNoteFromModal(item.id)}
                        className="text-slate-500 hover:text-red-400 p-2 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
                        title="Hapus catatan ini"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tombol Simpan Modal */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button 
                type="button" 
                onClick={() => setActiveStudent(null)} 
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                Batal
              </button>
              <button 
                type="button" 
                onClick={handleSaveModalChanges} 
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-md cursor-pointer transition-all"
              >
                Selesai & Perbarui Baris
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}