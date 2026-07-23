"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  writeBatch, 
  doc, 
  Timestamp 
} from "firebase/firestore";
import { 
  CalendarCheck, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  Save,
  CheckCircle,
  FileSpreadsheet
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { useSearchParams } from "next/navigation";

interface StudentRow {
  id: string;
  nisn: string;
  fullName: string;
  status: "Hadir" | "Sakit" | "Izin" | "Alpa" | "Terlambat";
  note: string;
}

export default function AbsensiPage() {
  const { role, teacherId } = useAuth();
  const searchParams = useSearchParams();

  // Route/query pre-fill params
  const paramClassId = searchParams.get("classId") || "";
  const paramSubjectId = searchParams.get("subjectId") || "";
  const paramDate = searchParams.get("date") || "";
  const paramJamKe = searchParams.get("jamKe") || "";

  // Core metadata lists
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [assignedOptions, setAssignedOptions] = useState<{ classId: string; className: string; subjectId: string; subjectName: string }[]>([]);

  // Selected parameters for filling
  const [selectedClassId, setSelectedClassId] = useState(paramClassId);
  const [selectedSubjectId, setSelectedSubjectId] = useState(paramSubjectId);
  const [selectedDate, setSelectedDate] = useState(paramDate || new Date().toISOString().split("T")[0]);
  const [selectedJamKe, setSelectedJamKe] = useState<number[]>(
    paramJamKe ? paramJamKe.split(",").map(Number) : [1]
  );

  // Student rows
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"fill" | "summary">("fill");

  // Summary filters
  const [summaryClassId, setSummaryClassId] = useState("");
  const [summarySubjectId, setSummarySubjectId] = useState("");
  const [summaryStartDate, setSummaryStartDate] = useState("");
  const [summaryEndDate, setSummaryEndDate] = useState("");
  const [alpaThreshold, setAlpaThreshold] = useState(3);

  // Computed summary state
  const [summaryList, setSummaryList] = useState<{ id: string; name: string; attendanceRate: number; hadir: number; sakit: number; izin: number; alpa: number; terlambat: number }[]>([]);
  const [attentionList, setAttentionList] = useState<{ id: string; name: string; alpaCount: number }[]>([]);
  const [trendData, setTrendData] = useState<{ date: string; rate: number }[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Load teacher assignments and school classes/subjects
  useEffect(() => {
    async function loadConfig() {
      try {
        const classesSnap = await getDocs(collection(db, "classes"));
        const cList = classesSnap.docs.map(d => ({ id: d.id, name: d.data().name }));
        setClasses(cList);
        if (cList.length > 0 && !selectedClassId) {
          setSummaryClassId(cList[0].id);
        }

        const subjectsSnap = await getDocs(collection(db, "subjects"));
        const sList = subjectsSnap.docs.map(d => ({ id: d.id, name: d.data().name }));
        setSubjects(sList);

        if (teacherId) {
          const assignmentsSnap = await getDocs(query(
            collection(db, "teachingAssignments"),
            where("teacherId", "==", teacherId)
          ));
          const list: typeof assignedOptions = [];
          assignmentsSnap.forEach(d => {
            const data = d.data();
            const classObj = cList.find(c => c.id === data.classId);
            const subjectObj = sList.find(s => s.id === data.subjectId);
            list.push({
              classId: data.classId,
              className: classObj ? classObj.name : data.classId,
              subjectId: data.subjectId,
              subjectName: subjectObj ? subjectObj.name : data.subjectId
            });
          });
          setAssignedOptions(list);
          
          // Pre-fill fields if pre-filled via params, otherwise default to first assignment
          if (!selectedClassId && list.length > 0) {
            setSelectedClassId(list[0].classId);
            setSelectedSubjectId(list[0].subjectId);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadConfig();
  }, [teacherId]);

// Load students when selected parameters change
  useEffect(() => {
    async function loadStudents() {
      if (!selectedClassId) return;

      setLoadingStudents(true);
      setSaveSuccess(false);
      try {
        // Ambil nama kelas yang sedang dipilih dari state 'classes'
        const selectedClassObj = classes.find(c => c.id === selectedClassId);
        const selectedClassName = selectedClassObj ? selectedClassObj.name : selectedClassId;

        // 1. Coba ambil siswa berdasarkan classId ATAU className (agar fleksibel)
        const studentsRef = collection(db, "students");
        
        // Ambil semua siswa aktif terlebih dahulu untuk disaring secara aman di frontend
        const studentsSnap = await getDocs(query(
          studentsRef,
          where("status", "==", "Aktif")
        ));

        // Filter siswa yang kelasnya cocok dengan classId ATAU nama kelas
        const matchedStudentDocs = studentsSnap.docs.filter(docSnap => {
          const data = docSnap.data();
          const studentClass = String(data.kelas || data.classId || "").trim().toLowerCase();
          return (
            studentClass === String(selectedClassId).trim().toLowerCase() ||
            studentClass === String(selectedClassName).trim().toLowerCase()
          );
        });

        // 2. Fetch existing attendance entries for the date
        const existingSnap = await getDocs(query(
          collection(db, "attendance"),
          where("classId", "==", selectedClassId),
          where("subjectId", "==", selectedSubjectId),
          where("date", "==", selectedDate)
        ));

        const existingMap: Record<string, { status: StudentRow["status"]; note: string }> = {};
        existingSnap.forEach(d => {
          const data = d.data();
          existingMap[data.studentId] = {
            status: data.status,
            note: data.note || ""
          };
        });

        const rows: StudentRow[] = matchedStudentDocs.map(docSnap => {
          const data = docSnap.data();
          const exist = existingMap[docSnap.id];
          return {
            id: docSnap.id,
            nisn: data.nisn || data.nis || "-",
            fullName: data.nama || data.fullName || "Tanpa Nama",
            status: exist ? exist.status : "Hadir",
            note: exist ? exist.note : ""
          };
        });

        setStudents(rows.sort((a, b) => a.fullName.localeCompare(b.fullName)));
      } catch (err) {
        console.error("Gagal memuat siswa:", err);
      } finally {
        setLoadingStudents(false);
      }
    }

    if (activeTab === "fill") {
      loadStudents();
    }
  }, [selectedClassId, selectedSubjectId, selectedDate, activeTab, classes]);

  // Load summary metrics when filters change
  useEffect(() => {
    async function loadSummaryData() {
      if (activeTab !== "summary" || !summaryClassId) return;

      setLoadingSummary(true);
      try {
        // Fetch class students
        const studentsSnap = await getDocs(query(
          collection(db, "students"),
          where("classId", "==", summaryClassId),
          where("status", "==", "Aktif")
        ));
        const classStudents: Record<string, string> = {};
        studentsSnap.forEach(d => classStudents[d.id] = d.data().fullName);

        // Query attendance
        let attQuery = query(collection(db, "attendance"), where("classId", "==", summaryClassId));
        if (summarySubjectId) {
          attQuery = query(collection(db, "attendance"), where("classId", "==", summaryClassId), where("subjectId", "==", summarySubjectId));
        }

        const attSnap = await getDocs(attQuery);
        
        // Calculate rates per student
        const statsMap: Record<string, { total: number; hadir: number; sakit: number; izin: number; alpa: number; terlambat: number }> = {};
        studentsSnap.docs.forEach(docSnap => {
          statsMap[docSnap.id] = { total: 0, hadir: 0, sakit: 0, izin: 0, alpa: 0, terlambat: 0 };
        });

        const trendCounts: Record<string, { total: number; present: number }> = {};

        attSnap.docs.forEach(docSnap => {
          const data = docSnap.data();
          
          // Apply local date filters
          if (summaryStartDate && data.date < summaryStartDate) return;
          if (summaryEndDate && data.date > summaryEndDate) return;

          const sid = data.studentId;
          const status = data.status;

          // Track stats per student
          if (statsMap[sid]) {
            statsMap[sid].total += 1;
            if (status === "Hadir") statsMap[sid].hadir += 1;
            else if (status === "Sakit") statsMap[sid].sakit += 1;
            else if (status === "Izin") statsMap[sid].izin += 1;
            else if (status === "Alpa") statsMap[sid].alpa += 1;
            else if (status === "Terlambat") statsMap[sid].terlambat += 1;
          }

          // Track daily stats for trend chart
          const dateStr = data.date;
          if (!trendCounts[dateStr]) {
            trendCounts[dateStr] = { total: 0, present: 0 };
          }
          trendCounts[dateStr].total += 1;
          if (status === "Hadir" || status === "Terlambat") {
            trendCounts[dateStr].present += 1;
          }
        });

        // Map list
        const sList = Object.entries(statsMap).map(([sid, counts]) => {
          const attendanceRate = counts.total > 0
            ? Math.round(((counts.hadir + counts.terlambat) / counts.total) * 100)
            : 100;
          return {
            id: sid,
            name: classStudents[sid] || sid,
            attendanceRate,
            hadir: counts.hadir,
            sakit: counts.sakit,
            izin: counts.izin,
            alpa: counts.alpa,
            terlambat: counts.terlambat
          };
        }).sort((a, b) => a.name.localeCompare(b.name));

        setSummaryList(sList);

        // Filter attention list
        const attList = sList
          .filter(student => student.alpa >= alpaThreshold)
          .map(student => ({
            id: student.id,
            name: student.name,
            alpaCount: student.alpa
          }));
        setAttentionList(attList);

        // Trend calculations
        const tList = Object.entries(trendCounts).map(([date, counts]) => ({
          date,
          rate: Math.round((counts.present / counts.total) * 100)
        })).sort((a, b) => a.date.localeCompare(b.date));

        setTrendData(tList);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSummary(false);
      }
    }

    loadSummaryData();
  }, [summaryClassId, summarySubjectId, summaryStartDate, summaryEndDate, alpaThreshold, activeTab]);

  const handlePeriodToggle = (num: number) => {
    setSelectedJamKe(prev => {
      if (prev.includes(num)) {
        return prev.filter(n => n !== num);
      } else {
        return [...prev, num].sort();
      }
    });
  };

  const handleStatusChange = (studentId: string, newStatus: StudentRow["status"]) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status: newStatus } : s));
  };

  const handleNoteChange = (studentId: string, text: string) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, note: text } : s));
  };

  const handleSaveAttendance = async () => {
    if (students.length === 0) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      const batch = writeBatch(db);

      students.forEach((student) => {
        // Document ID: studentId_classId_subjectId_date
        const docId = `${student.id}_${selectedClassId}_${selectedSubjectId}_${selectedDate}`;
        const docRef = doc(db, "attendance", docId);
        
        const payload = {
          studentId: student.id,
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          date: selectedDate,
          jamKe: selectedJamKe,
          status: student.status,
          note: student.note.trim(),
          teacherId: teacherId || "",
          academicYear: "2026/2027",
          semester: "Ganjil",
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

        batch.set(docRef, payload, { merge: true });
      });

      await batch.commit();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 5000); // clear banner after 5s
    } catch (error) {
      console.error("Error writing attendance:", error);
      alert("Gagal menyimpan absensi!");
    } finally {
      setSaving(false);
    }
  };

  const isTeacher = role === "guru" || role === "wali_kelas";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Daftar Hadir / Absensi</h1>
        <p className="text-sm text-slate-400 mt-1">
          Kelola kehadiran siswa di kelas Anda.
        </p>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-900">
        <button
          onClick={() => setActiveTab("fill")}
          className={`px-6 py-3.5 text-sm font-semibold tracking-wide border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "fill"
              ? "border-indigo-600 text-white font-bold"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <CalendarCheck className="h-4 w-4" />
          Isi Absensi
        </button>
        <button
          onClick={() => setActiveTab("summary")}
          className={`px-6 py-3.5 text-sm font-semibold tracking-wide border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "summary"
              ? "border-indigo-600 text-white font-bold"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Rekap & Tren Kelas
        </button>
      </div>

      {/* -------------------- TAB 1: FILL ATTENDANCE -------------------- */}
      {activeTab === "fill" && (
        <div className="space-y-6">
          {/* Settings / Configuration Panel */}
          <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-sm">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Kelas</label>
                {isTeacher ? (
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                  >
                    {Array.from(new Set(assignedOptions.map(o => o.classId))).map(classId => {
                      const opt = assignedOptions.find(o => o.classId === classId);
                      return <option key={classId} value={classId}>{opt?.className}</option>;
                    })}
                  </select>
                ) : (
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                  >
                    <option value="">Pilih Kelas...</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Mata Pelajaran</label>
                {isTeacher ? (
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                  >
                    {assignedOptions
                      .filter(o => o.classId === selectedClassId)
                      .map(opt => (
                        <option key={opt.subjectId} value={opt.subjectId}>{opt.subjectName}</option>
                      ))}
                  </select>
                ) : (
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                  >
                    <option value="">Pilih Mapel...</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Tanggal</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Jam Mengajar</label>
                <div className="flex flex-wrap gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(num => {
                    const isSelected = selectedJamKe.includes(num);
                    return (
                      <button
                        key={num}
                        onClick={() => handlePeriodToggle(num)}
                        className={`h-8 w-8 text-xs font-bold rounded border transition-all ${
                          isSelected
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Success Banner */}
          {saveSuccess && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm text-emerald-400">
              <CheckCircle className="h-5 w-5 shrink-0" />
              <span>Daftar hadir berhasil disimpan ke database!</span>
            </div>
          )}

          {/* Students Attendance Table */}
          {loadingStudents ? (
            <div className="space-y-4">
              <div className="h-10 w-full animate-pulse rounded bg-slate-900" />
              {[1, 2, 3, 4, 5].map(n => (
                <div key={n} className="h-14 w-full animate-pulse rounded bg-slate-900 border border-slate-800" />
              ))}
            </div>
          ) : students.length === 0 ? (
            <div className="rounded-xl border border-slate-900 border-dashed py-16 text-center">
              <Users className="mx-auto h-12 w-12 text-slate-600" />
              <h3 className="mt-4 text-sm font-bold text-white">Tidak ada siswa aktif</h3>
              <p className="mt-1 text-xs text-slate-500">Pilih kelas di atas untuk memuat daftar siswa.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-xl border border-slate-900 bg-slate-900/40 backdrop-blur-sm">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800">
                    <tr>
                      <th className="py-4 px-4 w-40">NISN</th>
                      <th className="py-4 px-4 min-w-[200px]">Nama Siswa</th>
                      <th className="py-4 px-4 w-[360px] text-center">Status Kehadiran</th>
                      <th className="py-4 px-4 min-w-[150px]">Keterangan / Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-900/25 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs text-slate-400">{student.nisn}</td>
                        <td className="py-3 px-4 font-semibold text-white">{student.fullName}</td>
                        <td className="py-3 px-4">
                          {/* Radio Buttons for Mobile Friendliness */}
                          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                            {[
                              { label: "H", status: "Hadir" as const, color: "hover:bg-hadir/10 focus:ring-hadir border-slate-700 checked:bg-hadir", activeBg: "peer-checked:bg-emerald-600 peer-checked:text-white" },
                              { label: "S", status: "Sakit" as const, color: "hover:bg-sakit/10 focus:ring-sakit border-slate-700 checked:bg-sakit", activeBg: "peer-checked:bg-sky-600 peer-checked:text-white" },
                              { label: "I", status: "Izin" as const, color: "hover:bg-izin/10 focus:ring-izin border-slate-700 checked:bg-izin", activeBg: "peer-checked:bg-amber-600 peer-checked:text-white" },
                              { label: "A", status: "Alpa" as const, color: "hover:bg-alpa/10 focus:ring-alpa border-slate-700 checked:bg-alpa", activeBg: "peer-checked:bg-rose-600 peer-checked:text-white" },
                              { label: "T", status: "Terlambat" as const, color: "hover:bg-terlambat/10 focus:ring-terlambat border-slate-700 checked:bg-terlambat", activeBg: "peer-checked:bg-indigo-600 peer-checked:text-white" }
                            ].map((opt) => (
                              <label key={opt.status} className="relative cursor-pointer">
                                <input
                                  type="radio"
                                  name={`status-${student.id}`}
                                  checked={student.status === opt.status}
                                  onChange={() => handleStatusChange(student.id, opt.status)}
                                  className="peer sr-only"
                                />
                                <span className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-xs font-bold text-slate-400 transition-all ${opt.activeBg} hover:border-slate-700`}>
                                  {opt.label}
                                </span>
                              </label>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            placeholder="Alasan sakit, dll..."
                            value={student.note}
                            onChange={(e) => handleNoteChange(student.id, e.target.value)}
                            className="w-full rounded bg-slate-950 border border-slate-800 px-2 py-1 text-xs text-slate-300 placeholder-slate-700 outline-none focus:border-indigo-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveAttendance}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white shadow-md hover:bg-indigo-500 disabled:opacity-50"
                >
                  <Save className="h-5 w-5" />
                  <span>{saving ? "Menyimpan..." : "Simpan Semua Absensi"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------- TAB 2: SUMMARY & REKAP -------------------- */}
      {activeTab === "summary" && (
        <div className="space-y-8">
          {/* Summary Filters */}
          <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-sm">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Kelas</label>
                <select
                  value={summaryClassId}
                  onChange={(e) => setSummaryClassId(e.target.value)}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                >
                  <option value="">Pilih Kelas...</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Mata Pelajaran (Opsional)</label>
                <select
                  value={summarySubjectId}
                  onChange={(e) => setSummarySubjectId(e.target.value)}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                >
                  <option value="">Semua Mapel</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Mulai Tanggal</label>
                <input
                  type="date"
                  value={summaryStartDate}
                  onChange={(e) => setSummaryStartDate(e.target.value)}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Selesai Tanggal</label>
                <input
                  type="date"
                  value={summaryEndDate}
                  onChange={(e) => setSummaryEndDate(e.target.value)}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Batas Alpa Bulanan</label>
                <input
                  type="number"
                  min={1}
                  value={alpaThreshold}
                  onChange={(e) => setAlpaThreshold(parseInt(e.target.value) || 3)}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {loadingSummary ? (
            <div className="space-y-4">
              <div className="h-64 w-full animate-pulse rounded bg-slate-900" />
              <div className="h-64 w-full animate-pulse rounded bg-slate-900" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* Trend Chart */}
              {trendData.length > 0 && (
                <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-sm">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
                    <TrendingUp className="h-4.5 w-4.5 text-indigo-400" />
                    Tren Kehadiran Kelas Harian
                  </h2>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#f8fafc" }}
                          itemStyle={{ color: "#6366f1" }}
                        />
                        <Line type="monotone" dataKey="rate" stroke="#6366f1" strokeWidth={2} name="Persentase Hadir (%)" dot={{ fill: "#6366f1" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Summary Tables Row */}
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Main Summary Table */}
                <div className="lg:col-span-2 rounded-xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-sm space-y-4">
                  <h2 className="text-base font-bold text-white">Rangkuman Per Siswa</h2>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800">
                        <tr>
                          <th className="py-3 px-3">Nama Siswa</th>
                          <th className="py-3 px-3 text-center">H</th>
                          <th className="py-3 px-3 text-center">S</th>
                          <th className="py-3 px-3 text-center">I</th>
                          <th className="py-3 px-3 text-center">A</th>
                          <th className="py-3 px-3 text-center">T</th>
                          <th className="py-3 px-3 text-right">Rasio Hadir</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900 text-xs">
                        {summaryList.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-900/20">
                            <td className="py-2.5 px-3 font-semibold text-white">{row.name}</td>
                            <td className="py-2.5 px-3 text-center text-emerald-400">{row.hadir}</td>
                            <td className="py-2.5 px-3 text-center text-sky-400">{row.sakit}</td>
                            <td className="py-2.5 px-3 text-center text-amber-400">{row.izin}</td>
                            <td className="py-2.5 px-3 text-center text-rose-400 font-bold">{row.alpa}</td>
                            <td className="py-2.5 px-3 text-center text-indigo-400">{row.terlambat}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-white">{row.attendanceRate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Attention List / Needs Attention */}
                <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-rose-500" />
                    <h2 className="text-base font-bold text-white">Butuh Perhatian Khusus</h2>
                  </div>
                  <p className="text-xs text-slate-400">
                    Siswa dengan jumlah ketidakhadiran tanpa keterangan (Alpa) mencapai atau melebihi {alpaThreshold} kali.
                  </p>

                  {attentionList.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center">Siswa tertib. Tidak ada siswa terdeteksi Alpa melebihi batas.</p>
                  ) : (
                    <div className="space-y-3">
                      {attentionList.map((student) => (
                        <div key={student.id} className="flex items-center justify-between border border-rose-500/20 bg-rose-500/5 rounded-lg p-3">
                          <div>
                            <p className="text-xs font-bold text-white">{student.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Siswa Aktif</p>
                          </div>
                          <div className="text-right">
                            <span className="inline-block rounded bg-red-500/20 px-2 py-0.5 text-xs font-bold text-red-400 border border-red-500/20">
                              {student.alpaCount} Alpa
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
