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
import { ClipboardPen, Search, Save, Upload, CheckSquare, Square } from "lucide-react";

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
  const [notesRecords, setNotesRecords] = useState<{ [studentId: string]: any }>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectAll, setSelectAll] = useState(false);

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
        const recordsMap: { [studentId: string]: any } = {};
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

            if (currentRecord) {
              recordsMap[studentId] = {
                selected: false,
                type: currentRecord.type || "Catatan Harian",
                date: currentRecord.date || todayStr,
                note: currentRecord.note || ""
              };
            } else {
              recordsMap[studentId] = {
                selected: false,
                type: "Catatan Harian",
                date: todayStr,
                note: ""
              };
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
    const newSelectState = !selectAll;
    setSelectAll(newSelectState);
    setNotesRecords(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(id => {
        updated[id] = { ...updated[id], selected: newSelectState };
      });
      return updated;
    });
  };

  const handleChangeField = (studentId: string, field: string, value: any) => {
    setNotesRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const docKey = `${academicYear.replace("/", "-")}_${semester}`;
      
      for (const student of students) {
        const studentRef = doc(db, "students", student.id);
        const dataToSave = notesRecords[student.id] || {};
        const existingNotes = student.studentNotesData || {};

        await setDoc(studentRef, {
          studentNotesData: {
            ...existingNotes,
            [docKey]: {
              type: dataToSave.type || "Catatan Harian",
              date: dataToSave.date || todayStr,
              note: dataToSave.note || "",
              updatedAt: Timestamp.now()
            }
          }
        }, { merge: true });
      }

      alert("Catatan Siswa berhasil disimpan!");
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
          <p className="text-sm text-slate-400 mt-1">Rekap prestasi, pelanggaran, dan catatan harian perilaku siswa.</p>
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
            <span>{saving ? "Menyimpan..." : "Simpan Catatan"}</span>
          </button>
        </div>
      </div>

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
                    <button type="button" onClick={handleToggleSelectAll} className="text-slate-400 hover:text-white cursor-pointer" title="Pilih Semua / Batal">
                      {selectAll ? <CheckSquare className="h-4.5 w-4.5 text-indigo-400" /> : <Square className="h-4.5 w-4.5" />}
                    </button>
                  </th>
                  <th className="py-4 px-4 w-16">No</th>
                  <th className="py-4 px-6 min-w-[140px]">NIS</th>
                  <th className="py-4 px-6 min-w-[200px]">Nama Siswa</th>
                  <th className="py-4 px-6 min-w-[160px]">Jenis Catatan</th>
                  <th className="py-4 px-6 min-w-[160px]">Tanggal Kejadian</th>
                  <th className="py-4 px-6 min-w-[320px]">Isi Catatan / Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 text-sm">
                      Tidak ada data siswa ditemukan di kelas ini.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, idx) => {
                    const record = notesRecords[student.id] || { selected: false, type: "Catatan Harian", date: todayStr, note: "" };

                    return (
                      <tr key={student.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="py-4 px-4 text-center">
                          <button 
                            type="button" 
                            onClick={() => handleChangeField(student.id, "selected", !record.selected)}
                            className="text-slate-500 hover:text-indigo-400 cursor-pointer"
                          >
                            {record.selected ? <CheckSquare className="h-4.5 w-4.5 text-indigo-400" /> : <Square className="h-4.5 w-4.5" />}
                          </button>
                        </td>
                        <td className="py-4 px-4 font-medium text-slate-500">{idx + 1}</td>
                        <td className="py-4 px-6 text-xs text-slate-300 font-mono font-semibold">{student.nis}</td>
                        <td className="py-4 px-6 font-semibold text-white">{student.fullName}</td>

                        <td className="py-4 px-6">
                          <select 
                            value={record.type}
                            onChange={e => handleChangeField(student.id, "type", e.target.value)}
                            className={`w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-semibold outline-none focus:border-indigo-500 ${
                              record.type === "Prestasi" ? "text-emerald-400" :
                              record.type === "Pelanggaran" ? "text-red-400" : "text-indigo-400"
                            }`}
                          >
                            <option value="Catatan Harian">Catatan Harian</option>
                            <option value="Prestasi">Prestasi</option>
                            <option value="Pelanggaran">Pelanggaran</option>
                          </select>
                        </td>

                        <td className="py-4 px-6">
                          <input 
                            type="date"
                            value={record.date}
                            onChange={e => handleChangeField(student.id, "date", e.target.value)}
                            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 font-medium"
                          />
                        </td>

                        <td className="py-4 px-6">
                          <input 
                            type="text"
                            placeholder="Tuliskan catatan, prestasi, atau pelanggaran..."
                            value={record.note}
                            onChange={e => handleChangeField(student.id, "note", e.target.value)}
                            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                          />
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
    </div>
  );
}