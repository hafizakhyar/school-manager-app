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
  Award, 
  Users, 
  Save, 
  CheckCircle, 
  History, 
  FileSpreadsheet,
  HelpCircle,
  TrendingUp
} from "lucide-react";
import { AssessmentType } from "@/types";

interface StudentRow {
  id: string;
  nisn: string;
  fullName: string;
  score: number | "";
}

interface GradeRecord {
  id: string;
  studentId: string;
  subjectId: string;
  assessmentType: AssessmentType;
  assessmentName: string;
  score: number;
}

export default function NilaiPage() {
  const { role, teacherId } = useAuth();

  // Core metadata
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [assignedOptions, setAssignedOptions] = useState<{ classId: string; className: string; subjectId: string; subjectName: string }[]>([]);

  // Selected parameters for filling
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedType, setSelectedType] = useState<AssessmentType>("Tugas");
  const [assessmentName, setAssessmentName] = useState("");

  // Student rows for Input
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"input" | "history" | "ledger">("input");

  // History Tab states
  const [historyClassId, setHistoryClassId] = useState("");
  const [historyStudentId, setHistoryStudentId] = useState("");
  const [historyStudents, setHistoryStudents] = useState<{ id: string; name: string }[]>([]);
  const [historySemester, setHistorySemester] = useState<"Ganjil" | "Genap">("Ganjil");
  const [gradesHistory, setGradesHistory] = useState<GradeRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Ledger Tab states
  const [ledgerClassId, setLedgerClassId] = useState("");
  const [ledgerSemester, setLedgerSemester] = useState<"Ganjil" | "Genap">("Ganjil");
  const [ledgerStudents, setLedgerStudents] = useState<{ id: string; name: string }[]>([]);
  const [ledgerGrades, setLedgerGrades] = useState<GradeRecord[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Load teacher assignments and general classes/subjects
  useEffect(() => {
    async function loadConfig() {
      try {
        const classesSnap = await getDocs(collection(db, "classes"));
        const cList = classesSnap.docs.map(d => ({ id: d.id, name: d.data().name }));
        setClasses(cList);
        if (cList.length > 0) {
          setSelectedClassId(cList[0].id);
          setHistoryClassId(cList[0].id);
          setLedgerClassId(cList[0].id);
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
          
          if (list.length > 0) {
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

  // Load students for Input Tab when class changes
  useEffect(() => {
    async function loadStudentsForInput() {
      if (!selectedClassId || activeTab !== "input") return;

      setLoadingStudents(true);
      setSaveSuccess(false);
      try {
        const studentsSnap = await getDocs(query(
          collection(db, "students"),
          where("classId", "==", selectedClassId),
          where("status", "==", "Aktif")
        ));

        // Attempt to load existing scores if editing an existing assessment
        let existingScores: Record<string, number> = {};
        if (assessmentName.trim() !== "") {
          const existingSnap = await getDocs(query(
            collection(db, "grades"),
            where("classId", "==", selectedClassId),
            where("subjectId", "==", selectedSubjectId),
            where("assessmentType", "==", selectedType),
            where("assessmentName", "==", assessmentName.trim())
          ));
          existingSnap.forEach(d => {
            existingScores[d.data().studentId] = d.data().score;
          });
        }

        const rows: StudentRow[] = studentsSnap.docs.map(docSnap => {
          const data = docSnap.data();
          const score = existingScores[docSnap.id];
          return {
            id: docSnap.id,
            nisn: data.nisn,
            fullName: data.fullName,
            score: score !== undefined ? score : ""
          };
        });

        setStudents(rows.sort((a, b) => a.fullName.localeCompare(b.fullName)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingStudents(false);
      }
    }

    loadStudentsForInput();
  }, [selectedClassId, selectedSubjectId, selectedType, assessmentName, activeTab]);

  // Load students for History Tab class filter
  useEffect(() => {
    async function loadHistoryStudents() {
      if (!historyClassId) return;
      try {
        const studentsSnap = await getDocs(query(
          collection(db, "students"),
          where("classId", "==", historyClassId),
          where("status", "==", "Aktif")
        ));
        const list = studentsSnap.docs.map(d => ({
          id: d.id,
          name: d.data().fullName
        })).sort((a, b) => a.name.localeCompare(b.name));
        
        setHistoryStudents(list);
        if (list.length > 0) {
          setHistoryStudentId(list[0].id);
        } else {
          setHistoryStudentId("");
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadHistoryStudents();
  }, [historyClassId]);

  // Load Grade History for student
  useEffect(() => {
    async function loadGradeHistory() {
      if (!historyStudentId || activeTab !== "history") return;

      setLoadingHistory(true);
      try {
        const gradesSnap = await getDocs(query(
          collection(db, "grades"),
          where("studentId", "==", historyStudentId),
          where("semester", "==", historySemester)
        ));

        const list: GradeRecord[] = gradesSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            studentId: data.studentId,
            subjectId: data.subjectId,
            assessmentType: data.assessmentType,
            assessmentName: data.assessmentName,
            score: data.score
          };
        });
        setGradesHistory(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingHistory(false);
      }
    }

    loadGradeHistory();
  }, [historyStudentId, historySemester, activeTab]);

  // Load Ledger Data
  useEffect(() => {
    async function loadLedgerData() {
      if (!ledgerClassId || activeTab !== "ledger") return;

      setLoadingLedger(true);
      try {
        // 1. Get class active students
        const studentsSnap = await getDocs(query(
          collection(db, "students"),
          where("classId", "==", ledgerClassId),
          where("status", "==", "Aktif")
        ));
        const listStudents = studentsSnap.docs.map(d => ({
          id: d.id,
          name: d.data().fullName
        })).sort((a, b) => a.name.localeCompare(b.name));
        setLedgerStudents(listStudents);

        // 2. Query grades for this class + semester
        const gradesSnap = await getDocs(query(
          collection(db, "grades"),
          where("classId", "==", ledgerClassId),
          where("semester", "==", ledgerSemester)
        ));

        const listGrades: GradeRecord[] = gradesSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            studentId: data.studentId,
            subjectId: data.subjectId,
            assessmentType: data.assessmentType,
            assessmentName: data.assessmentName,
            score: data.score
          };
        });
        setLedgerGrades(listGrades);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingLedger(false);
      }
    }

    loadLedgerData();
  }, [ledgerClassId, ledgerSemester, activeTab]);

  const handleScoreChange = (studentId: string, value: string) => {
    let scoreVal: number | "" = "";
    if (value !== "") {
      scoreVal = Math.min(100, Math.max(0, parseInt(value) || 0));
    }
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, score: scoreVal } : s));
  };

  const handleSaveGrades = async () => {
    if (students.length === 0) return;
    if (assessmentName.trim() === "") {
      alert("Silakan masukkan nama penilaian (e.g. Ulangan Harian 1)!");
      return;
    }

    // Verify all scores are filled
    const unfilled = students.some(s => s.score === "");
    if (unfilled) {
      if (!confirm("Beberapa siswa belum memiliki nilai. Simpan sebagai 0?")) {
        return;
      }
    }

    setSaving(true);
    setSaveSuccess(false);

    try {
      const batch = writeBatch(db);

      students.forEach((student) => {
        // Document ID: studentId_classId_subjectId_assessmentType_assessmentName
        // Sanitizing assessmentName for ID string
        const sanitizedName = assessmentName.trim().replace(/[^a-zA-Z0-9]/g, "_");
        const docId = `${student.id}_${selectedClassId}_${selectedSubjectId}_${selectedType}_${sanitizedName}`;
        const docRef = doc(db, "grades", docId);

        const payload = {
          studentId: student.id,
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          assessmentType: selectedType,
          assessmentName: assessmentName.trim(),
          score: student.score === "" ? 0 : student.score,
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
      setAssessmentName(""); // clear input
      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (error) {
      console.error("Error writing grades:", error);
      alert("Gagal menyimpan nilai!");
    } finally {
      setSaving(false);
    }
  };

  // Helper calculations for History Tab
  const subjectAverages: Record<string, { total: number; count: number }> = {};
  gradesHistory.forEach(record => {
    if (!subjectAverages[record.subjectId]) {
      subjectAverages[record.subjectId] = { total: 0, count: 0 };
    }
    subjectAverages[record.subjectId].total += record.score;
    subjectAverages[record.subjectId].count += 1;
  });

  const subjectMap = subjects.reduce((acc, curr) => {
    acc[curr.id] = curr.name;
    return acc;
  }, {} as Record<string, string>);

  // Helper calculations for Ledger Ledger/Rapor Tab
  // Generates final average score per student per subject per semester client-side
  const studentLedgerData = ledgerStudents.map(student => {
    const studentGrades = ledgerGrades.filter(g => g.studentId === student.id);
    
    // Group by subject to compute average
    const subAverages: Record<string, number> = {};
    subjects.forEach(subject => {
      const subjectGrades = studentGrades.filter(g => g.subjectId === subject.id);
      if (subjectGrades.length > 0) {
        const sum = subjectGrades.reduce((acc, curr) => acc + curr.score, 0);
        subAverages[subject.id] = Math.round(sum / subjectGrades.length);
      } else {
        subAverages[subject.id] = 0; // default 0 if no grades
      }
    });

    const scoresArray = Object.values(subAverages).filter(s => s > 0);
    const overallAverage = scoresArray.length > 0
      ? Math.round(scoresArray.reduce((acc, curr) => acc + curr, 0) / scoresArray.length)
      : 0;

    return {
      id: student.id,
      name: student.name,
      averages: subAverages,
      overallAverage
    };
  });

  const isTeacherRole = role === "guru" || role === "wali_kelas";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Daftar Nilai Siswa</h1>
        <p className="text-sm text-slate-400 mt-1">
          Rekam hasil evaluasi akademis dan rekap leger kelas.
        </p>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-900">
        <button
          onClick={() => setActiveTab("input")}
          className={`px-6 py-3.5 text-sm font-semibold tracking-wide border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "input"
              ? "border-indigo-600 text-white font-bold"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Award className="h-4 w-4" />
          Input Nilai
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-6 py-3.5 text-sm font-semibold tracking-wide border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "history"
              ? "border-indigo-600 text-white font-bold"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <History className="h-4 w-4" />
          Riwayat Nilai Siswa
        </button>
        {(role === "admin" || role === "kepala_sekolah" || role === "wali_kelas") && (
          <button
            onClick={() => setActiveTab("ledger")}
            className={`px-6 py-3.5 text-sm font-semibold tracking-wide border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "ledger"
                ? "border-indigo-600 text-white font-bold"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Leger Rapor Kelas
          </button>
        )}
      </div>

      {/* -------------------- TAB 1: INPUT GRADES -------------------- */}
      {activeTab === "input" && (
        <div className="space-y-6">
          {/* Settings Panel */}
          <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-sm">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Kelas</label>
                {isTeacherRole ? (
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
                {isTeacherRole ? (
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
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Jenis Penilaian</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as AssessmentType)}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                >
                  <option value="Tugas">Tugas</option>
                  <option value="UlanganHarian">Ulangan Harian</option>
                  <option value="PTS">PTS (Tengah Semester)</option>
                  <option value="PAS">PAS (Akhir Semester)</option>
                  <option value="Praktik">Praktik</option>
                  <option value="Project">Project</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Nama Penilaian</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tugas 1 Aljabar"
                  value={assessmentName}
                  onChange={(e) => setAssessmentName(e.target.value)}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-700 outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Success banner */}
          {saveSuccess && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm text-emerald-400">
              <CheckCircle className="h-5 w-5 shrink-0" />
              <span>Nilai berhasil disimpan ke database!</span>
            </div>
          )}

          {/* Grades Table */}
          {loadingStudents ? (
            <div className="space-y-4">
              <div className="h-10 w-full animate-pulse rounded bg-slate-900" />
              {[1, 2, 3].map(n => (
                <div key={n} className="h-14 w-full animate-pulse rounded bg-slate-900 border border-slate-800" />
              ))}
            </div>
          ) : students.length === 0 ? (
            <div className="rounded-xl border border-slate-900 border-dashed py-16 text-center">
              <Award className="mx-auto h-12 w-12 text-slate-600" />
              <h3 className="mt-4 text-sm font-bold text-white">Tidak ada siswa</h3>
              <p className="mt-1 text-xs text-slate-500">Pilih kelas di atas untuk memuat daftar siswa.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-xl border border-slate-900 bg-slate-900/40 backdrop-blur-sm">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800">
                    <tr>
                      <th className="py-4 px-4 w-40">NISN</th>
                      <th className="py-4 px-4 min-w-[250px]">Nama Siswa</th>
                      <th className="py-4 px-4 w-48 text-right">Nilai (0-100)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-900/25 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-400">{student.nisn}</td>
                        <td className="py-3.5 px-4 font-semibold text-white">{student.fullName}</td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-block relative">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              required
                              placeholder="0"
                              value={student.score}
                              onChange={(e) => handleScoreChange(student.id, e.target.value)}
                              className="w-28 rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-sm text-right text-indigo-400 font-bold outline-none focus:border-indigo-500"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveGrades}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white shadow-md hover:bg-indigo-500 disabled:opacity-50"
                >
                  <Save className="h-5 w-5" />
                  <span>{saving ? "Menyimpan..." : "Simpan Semua Nilai"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------- TAB 2: HISTORY PER STUDENT -------------------- */}
      {activeTab === "history" && (
        <div className="space-y-6">
          {/* History Selection Card */}
          <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-sm">
            <div className="grid gap-4 sm:grid-cols-3 items-end">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Kelas</label>
                <select
                  value={historyClassId}
                  onChange={(e) => setHistoryClassId(e.target.value)}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                >
                  <option value="">Pilih Kelas...</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Siswa</label>
                <select
                  value={historyStudentId}
                  onChange={(e) => setHistoryStudentId(e.target.value)}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                >
                  <option value="">Pilih Siswa...</option>
                  {historyStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Semester</label>
                <select
                  value={historySemester}
                  onChange={(e) => setHistorySemester(e.target.value as "Ganjil" | "Genap")}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                >
                  <option value="Ganjil">Ganjil</option>
                  <option value="Genap">Genap</option>
                </select>
              </div>
            </div>
          </div>

          {/* History Details */}
          {loadingHistory ? (
            <div className="h-64 w-full animate-pulse rounded bg-slate-900 border border-slate-800" />
          ) : !historyStudentId ? (
            <p className="text-sm text-slate-500 text-center py-10">Pilih siswa di atas untuk melihat riwayat nilai.</p>
          ) : gradesHistory.length === 0 ? (
            <div className="rounded-xl border border-slate-900 border-dashed py-16 text-center">
              <History className="mx-auto h-12 w-12 text-slate-600" />
              <h3 className="mt-4 text-sm font-bold text-white">Tidak ada riwayat nilai</h3>
              <p className="mt-1 text-xs text-slate-500">Nilai akademis siswa ini belum dimasukkan untuk semester ini.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3 items-start">
              {/* Summary cards: Subject Averages */}
              <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-sm space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Rata-Rata Nilai Mapel</h3>
                <div className="space-y-3">
                  {Object.entries(subjectAverages).map(([subId, data]) => {
                    const avg = Math.round(data.total / data.count);
                    return (
                      <div key={subId} className="flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-900">
                        <span className="text-xs font-semibold text-slate-300">{subjectMap[subId] || subId}</span>
                        <span className={`text-sm font-bold ${avg >= 75 ? "text-emerald-400" : "text-rose-400"}`}>{avg}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detail Table */}
              <div className="md:col-span-2 rounded-xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-sm space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Rincian Penilaian</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Mata Pelajaran</th>
                        <th className="py-2.5 px-3">Kategori</th>
                        <th className="py-2.5 px-3">Nama Tugas/Ulangan</th>
                        <th className="py-2.5 px-3 text-right">Nilai</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 text-xs">
                      {gradesHistory.map((record) => (
                        <tr key={record.id} className="hover:bg-slate-900/20">
                          <td className="py-2.5 px-3 font-semibold text-white">{subjectMap[record.subjectId] || record.subjectId}</td>
                          <td className="py-2.5 px-3 text-slate-400">{record.assessmentType}</td>
                          <td className="py-2.5 px-3">{record.assessmentName}</td>
                          <td className={`py-2.5 px-3 text-right font-bold ${record.score >= 75 ? "text-emerald-400" : "text-rose-400"}`}>{record.score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------- TAB 3: LEGER RApor / LEDGER CLASS -------------------- */}
      {activeTab === "ledger" && (role === "admin" || role === "kepala_sekolah" || role === "wali_kelas") && (
        <div className="space-y-6">
          {/* Ledger filters */}
          <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-sm">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-end">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Kelas / Rombel</label>
                <select
                  value={ledgerClassId}
                  onChange={(e) => setLedgerClassId(e.target.value)}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                >
                  <option value="">Pilih Kelas...</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Semester</label>
                <select
                  value={ledgerSemester}
                  onChange={(e) => setLedgerSemester(e.target.value as "Ganjil" | "Genap")}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                >
                  <option value="Ganjil">Ganjil</option>
                  <option value="Genap">Genap</option>
                </select>
              </div>
            </div>
          </div>

          {/* Ledger Display */}
          {loadingLedger ? (
            <div className="h-64 w-full animate-pulse rounded bg-slate-900 border border-slate-800" />
          ) : ledgerStudents.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10">Pilih kelas di atas untuk memuat Ledger nilai.</p>
          ) : (
            <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-indigo-400" />
                  Leger Penilaian Hasil Belajar (Rata-Rata Nilai Akhir Mapel)
                </h3>
                <span className="text-xs text-slate-500">T.A. 2026/2027 • Ganjil</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3 min-w-[200px]">Nama Siswa</th>
                      {subjects.map((subj) => (
                        <th key={subj.id} className="py-3 px-3 text-center w-24" title={subj.name}>
                          {subj.id}
                        </th>
                      ))}
                      <th className="py-3 px-3 text-right w-28">Rata-Rata Umum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-xs">
                    {studentLedgerData.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-900/20">
                        <td className="py-3 px-3 font-semibold text-white">{row.name}</td>
                        {subjects.map((subj) => {
                          const val = row.averages[subj.id];
                          return (
                            <td 
                              key={subj.id} 
                              className={`py-3 px-3 text-center font-bold ${
                                val === 0 ? "text-slate-700" : val >= 75 ? "text-emerald-500" : "text-rose-500"
                              }`}
                            >
                              {val === 0 ? "-" : val}
                            </td>
                          );
                        })}
                        <td className="py-3 px-3 text-right font-extrabold text-white bg-indigo-950/15">
                          {row.overallAverage || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
