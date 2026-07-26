"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  getDoc, 
  query, 
  where, 
  Timestamp 
} from "firebase/firestore";
import { Wallet, CheckCircle2, XCircle, Search, Save } from "lucide-react";

interface Student {
  id: string;
  fullName: string;
  nis: string;
  classId: string;
  tuitionData?: any;
}

interface ClassItem {
  id: string;
  name: string;
}

const MONTHS = [
  { id: "jan", label: "Jan" },
  { id: "feb", label: "Feb" },
  { id: "mar", label: "Mar" },
  { id: "apr", label: "Apr" },
  { id: "mei", label: "Mei" },
  { id: "jun", label: "Jun" },
  { id: "jul", label: "Jul" },
  { id: "agu", label: "Ags" },
  { id: "sep", label: "Sep" },
  { id: "okt", label: "Okt" },
  { id: "nov", label: "Nov" },
  { id: "des", label: "Des" },
];

const defaultMonths = {
  jan: false, feb: false, mar: false, apr: false,
  mei: false, jun: false, jul: false, agu: false,
  sep: false, okt: false, nov: false, des: false
};

export default function TuitionFeesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [academicYear, setAcademicYear] = useState<string>("2026-2027");
  const [semester, setSemester] = useState<string>("Ganjil");
  
  const [students, setStudents] = useState<Student[]>([]);
  const [feesData, setFeesData] = useState<{ [studentId: string]: any }>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const snap = await getDocs(collection(db, "classes"));
        const list: ClassItem[] = [];
        snap.forEach(d => {
          const data = d.data();
          list.push({ id: d.id, name: data.name || data.className || "Kelas" });
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

    const fetchStudentsAndFees = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "students"), where("classId", "==", selectedClass));
        const studentSnap = await getDocs(q);
        const studentList: Student[] = [];
        const feesMap: { [studentId: string]: any } = {};
        const docKey = `${academicYear}_${semester}`;

        studentSnap.forEach(d => {
          const data = d.data();
          const studentId = d.id;
          studentList.push({ 
            id: studentId, 
            fullName: data.fullName || data.name, 
            nis: data.nis, 
            classId: data.classId,
            tuitionData: data.tuitionData || {}
          });

          const allTuition = data.tuitionData || {};
          const currentRecord = allTuition[docKey];

          if (currentRecord) {
            feesMap[studentId] = {
              uangPangkal: !!currentRecord.uangPangkal,
              uangPendidikan: !!currentRecord.uangPendidikan,
              iuranAkhirussanah: !!currentRecord.iuranAkhirussanah,
              sppMonths: {
                ...defaultMonths,
                ...(currentRecord.sppMonths || {})
              }
            };
          } else {
            feesMap[studentId] = {
              uangPangkal: false,
              uangPendidikan: false,
              iuranAkhirussanah: false,
              sppMonths: { ...defaultMonths }
            };
          }
        });

        studentList.sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
        setStudents(studentList);
        setFeesData(feesMap);
      } catch (err) {
        console.error("Gagal memuat data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentsAndFees();
  }, [selectedClass, academicYear, semester]);

  const handleToggle = (studentId: string, field: string, monthKey?: string) => {
    setFeesData(prev => {
      const current = prev[studentId] || {
        uangPangkal: false,
        uangPendidikan: false,
        iuranAkhirussanah: false,
        sppMonths: { ...defaultMonths }
      };

      const updated = {
        ...current,
        sppMonths: {
          ...(current.sppMonths || { ...defaultMonths })
        }
      };

      if (monthKey) {
        updated.sppMonths[monthKey] = !updated.sppMonths[monthKey];
      } else {
        (updated as any)[field] = !updated[field];
      }

      return {
        ...prev,
        [studentId]: updated
      };
    });
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const docKey = `${academicYear}_${semester}`;
      
      for (const student of students) {
        const studentRef = doc(db, "students", student.id);
        const dataToSave = feesData[student.id] || {
          uangPangkal: false,
          uangPendidikan: false,
          iuranAkhirussanah: false,
          sppMonths: { ...defaultMonths }
        };

        const existingTuition = student.tuitionData || {};

        await setDoc(studentRef, {
          tuitionData: {
            ...existingTuition,
            [docKey]: {
              ...dataToSave,
              updatedAt: Timestamp.now()
            }
          }
        }, { merge: true });
      }

      alert("Semua data keuangan & SPP berhasil disimpan!");
    } catch (err: any) {
      console.error("Gagal menyimpan:", err);
      alert("Terjadi kesalahan saat menyimpan data: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const currentClassName = classes.find(c => c.id === selectedClass)?.name || "";
  const isGrade12 = currentClassName.includes("12") || currentClassName.toUpperCase().includes("XII");

  const filteredStudents = students.filter(s => 
    (s.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.nis && s.nis.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Manajemen Keuangan & SPP</h1>
          <p className="text-sm text-slate-400 mt-1">Rekapitulasi status pembayaran iuran, SPP bulanan, dan administrasi siswa.</p>
        </div>
        
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={saving || students.length === 0}
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/25 cursor-pointer transition-all disabled:opacity-50"
        >
          <Save className="h-4.5 w-4.5" />
          <span>{saving ? "Menyimpan..." : "Simpan Perubahan Keuangan"}</span>
        </button>
      </div>

      <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-5 backdrop-blur-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <option value="2026-2027">2026/2027</option>
            <option value="2025-2026">2025/2026</option>
            <option value="2027-2028">2027/2028</option>
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

        <div>
          <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Cari Siswa</label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input 
              type="text"
              placeholder="Cari nama / NIS..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(n => <div key={n} className="h-20 w-full animate-pulse rounded-xl bg-slate-900" />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-4 px-6 w-16">No</th>
                  <th className="py-4 px-6 min-w-[200px]">Nama Siswa</th>
                  <th className="py-4 px-6 text-center">Uang Pangkal</th>
                  <th className="py-4 px-6 text-center">Uang Pendidikan</th>
                  {isGrade12 && <th className="py-4 px-6 text-center text-amber-400">Iuran Akhirussanah</th>}
                  <th className="py-4 px-6 text-center min-w-[500px]">SPP Bulanan ({semester} {academicYear.replace("-", "/")})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={isGrade12 ? 6 : 5} className="py-12 text-center text-slate-500 text-sm">
                      Tidak ada data siswa ditemukan di kelas ini.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, idx) => {
                    const fee = feesData[student.id] || { 
                      uangPangkal: false, 
                      uangPendidikan: false, 
                      iuranAkhirussanah: false, 
                      sppMonths: { ...defaultMonths } 
                    };
                    const spp = fee.sppMonths || { ...defaultMonths };

                    return (
                      <tr key={student.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="py-4 px-6 font-medium text-slate-500">{idx + 1}</td>
                        <td className="py-4 px-6 font-semibold text-white">
                          {student.fullName}
                          <span className="block text-xs font-normal text-slate-500">NIS: {student.nis || "-"}</span>
                        </td>

                        <td className="py-4 px-6 text-center">
                          <button 
                            type="button"
                            onClick={() => handleToggle(student.id, "uangPangkal")}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                              fee.uangPangkal 
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20" 
                                : "bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-800"
                            }`}
                          >
                            {fee.uangPangkal ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-slate-500" />}
                            <span>{fee.uangPangkal ? "Lunas" : "Belum"}</span>
                          </button>
                        </td>

                        <td className="py-4 px-6 text-center">
                          <button 
                            type="button"
                            onClick={() => handleToggle(student.id, "uangPendidikan")}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                              fee.uangPendidikan 
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20" 
                                : "bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-800"
                            }`}
                          >
                            {fee.uangPendidikan ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-slate-500" />}
                            <span>{fee.uangPendidikan ? "Lunas" : "Belum"}</span>
                          </button>
                        </td>

                        {isGrade12 && (
                          <td className="py-4 px-6 text-center">
                            <button 
                              type="button"
                              onClick={() => handleToggle(student.id, "iuranAkhirussanah")}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                                fee.iuranAkhirussanah 
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20" 
                                  : "bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-800"
                              }`}
                            >
                              {fee.iuranAkhirussanah ? <CheckCircle2 className="h-4 w-4 text-amber-400" /> : <XCircle className="h-4 w-4 text-slate-500" />}
                              <span>{fee.iuranAkhirussanah ? "Lunas" : "Belum"}</span>
                            </button>
                          </td>
                        )}

                        <td className="py-4 px-6">
                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                            {MONTHS.map(m => {
                              const isPaid = !!spp[m.id];
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => handleToggle(student.id, "spp", m.id)}
                                  className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                                    isPaid
                                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                                      : "bg-slate-950/60 text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-300"
                                  }`}
                                  title={`SPP ${m.label}: ${isPaid ? "Lunas" : "Belum"}`}
                                >
                                  <span className="uppercase">{m.label}</span>
                                  <span className={`text-[9px] font-normal ${isPaid ? "text-emerald-300" : "text-slate-600"}`}>
                                    {isPaid ? "✔" : "·"}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
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