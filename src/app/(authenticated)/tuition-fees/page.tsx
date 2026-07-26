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
import { Wallet, CheckCircle2, XCircle, Search, Filter } from "lucide-react";

interface Student {
  id: string;
  fullName: string;
  nis: string;
  classId: string;
}

interface ClassItem {
  id: string;
  name: string;
  className?: string;
}

interface FeeRecord {
  uangPangkal: boolean;
  uangPendidikan: boolean;
  spp: boolean;
  iuranAkhirussanah: boolean;
}

export default function TuitionFeesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [feesData, setFeesData] = useState<{ [studentId: string]: FeeRecord }>({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Ambil daftar kelas saat pertama muat
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

  // Ambil data siswa dan status pembayaran berdasarkan kelas yang dipilih
  useEffect(() => {
    if (!selectedClass) return;

    const fetchStudentsAndFees = async () => {
      setLoading(true);
      try {
        // 1. Ambil siswa di kelas tersebut
        const q = query(collection(db, "students"), where("classId", "==", selectedClass));
        const studentSnap = await getDocs(q);
        const studentList: Student[] = [];
        studentSnap.forEach(d => {
          const data = d.data();
          studentList.push({ id: d.id, fullName: data.fullName || data.name, nis: data.nis, classId: data.classId });
        });
        studentList.sort((a, b) => a.fullName.localeCompare(b.fullName));
        setStudents(studentList);

        // 2. Ambil data keuangan dari koleksi tuitionFees
        const feesMap: { [studentId: string]: FeeRecord } = {};
        for (const student of studentList) {
          const feeDocRef = doc(db, "tuitionFees", student.id);
          const feeSnap = await getDoc(feeDocRef);
          if (feeSnap.exists()) {
            const data = feeSnap.data();
            feesMap[student.id] = {
              uangPangkal: !!data.uangPangkal,
              uangPendidikan: !!data.uangPendidikan,
              spp: !!data.spp,
              iuranAkhirussanah: !!data.iuranAkhirussanah,
            };
          } else {
            // Default belum bayar
            feesMap[student.id] = {
              uangPangkal: false,
              uangPendidikan: false,
              spp: false,
              iuranAkhirussanah: false,
            };
          }
        }
        setFeesData(feesMap);
      } catch (err) {
        console.error("Gagal memuat data keuangan:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentsAndFees();
  }, [selectedClass]);

  // Fungsi mengubah status pembayaran dan langsung simpan ke Firestore
  const handleToggleFee = async (studentId: string, field: keyof FeeRecord) => {
    const currentRecord = feesData[studentId] || { uangPangkal: false, uangPendidikan: false, spp: false, iuranAkhirussanah: false };
    const updatedRecord = {
      ...currentRecord,
      [field]: !currentRecord[field],
    };

    // Update state lokal seketika
    setFeesData(prev => ({
      ...prev,
      [studentId]: updatedRecord
    }));

    try {
      const docRef = doc(db, "tuitionFees", studentId);
      await setDoc(docRef, {
        studentId,
        classId: selectedClass,
        ...updatedRecord,
        updatedAt: Timestamp.now()
      }, { merge: true });
    } catch (err) {
      console.error("Gagal memperbarui status pembayaran:", err);
      alert("Gagal menyimpan perubahan ke database.");
    }
  };

  // Cek apakah kelas yang dipilih adalah kelas 12 (berdasarkan nama kelas mengandung "12" atau "XII")
  const currentClassName = classes.find(c => c.id === selectedClass)?.name || "";
  const isGrade12 = currentClassName.includes("12") || currentClassName.toUpperCase().includes("XII");

  const filteredStudents = students.filter(s => 
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.nis && s.nis.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Manajemen Keuangan & SPP</h1>
          <p className="text-sm text-slate-400 mt-1">Rekapitulasi status pembayaran iuran dan administrasi siswa per kelas.</p>
        </div>
      </div>

      {/* Filter Kelas & Pencarian */}
      <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-5 backdrop-blur-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="w-full sm:w-72">
          <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Pilih Kelas</label>
          <select 
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500"
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-80">
          <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Cari Siswa</label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input 
              type="text"
              placeholder="Cari nama atau NIS siswa..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Tabel Keuangan Siswa */}
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
                  <th className="py-4 px-6 w-16">No</th>
                  <th className="py-4 px-6">Nama Siswa</th>
                  <th className="py-4 px-6 text-center">Uang Pangkal</th>
                  <th className="py-4 px-6 text-center">Uang Pendidikan</th>
                  <th className="py-4 px-6 text-center">SPP Bulanan</th>
                  {isGrade12 && (
                    <th className="py-4 px-6 text-center text-amber-400">Iuran Akhirussanah (Kelas 12)</th>
                  )}
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
                    const fee = feesData[student.id] || { uangPangkal: false, uangPendidikan: false, spp: false, iuranAkhirussanah: false };
                    
                    return (
                      <tr key={student.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="py-4 px-6 font-medium text-slate-500">{idx + 1}</td>
                        <td className="py-4 px-6 font-semibold text-white">
                          {student.fullName}
                          <span className="block text-xs font-normal text-slate-500">NIS: {student.nis || "-"}</span>
                        </td>

                        {/* Uang Pangkal */}
                        <td className="py-4 px-6 text-center">
                          <button 
                            onClick={() => handleToggleFee(student.id, "uangPangkal")}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                              fee.uangPangkal 
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20" 
                                : "bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-800"
                            }`}
                          >
                            {fee.uangPangkal ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-slate-500" />}
                            <span>{fee.uangPangkal ? "Sudah Bayar" : "Belum"}</span>
                          </button>
                        </td>

                        {/* Uang Pendidikan */}
                        <td className="py-4 px-6 text-center">
                          <button 
                            onClick={() => handleToggleFee(student.id, "uangPendidikan")}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                              fee.uangPendidikan 
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20" 
                                : "bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-800"
                            }`}
                          >
                            {fee.uangPendidikan ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-slate-500" />}
                            <span>{fee.uangPendidikan ? "Sudah Bayar" : "Belum"}</span>
                          </button>
                        </td>

                        {/* SPP */}
                        <td className="py-4 px-6 text-center">
                          <button 
                            onClick={() => handleToggleFee(student.id, "spp")}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                              fee.spp 
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20" 
                                : "bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-800"
                            }`}
                          >
                            {fee.spp ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-slate-500" />}
                            <span>{fee.spp ? "Sudah Bayar" : "Belum"}</span>
                          </button>
                        </td>

                        {/* Iuran Akhirussanah (Khusus Kelas 12) */}
                        {isGrade12 && (
                          <td className="py-4 px-6 text-center">
                            <button 
                              onClick={() => handleToggleFee(student.id, "iuranAkhirussanah")}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                                fee.iuranAkhirussanah 
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20" 
                                  : "bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-800"
                              }`}
                            >
                              {fee.iuranAkhirussanah ? <CheckCircle2 className="h-4 w-4 text-amber-400" /> : <XCircle className="h-4 w-4 text-slate-500" />}
                              <span>{fee.iuranAkhirussanah ? "Sudah Bayar" : "Belum"}</span>
                            </button>
                          </td>
                        )}
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