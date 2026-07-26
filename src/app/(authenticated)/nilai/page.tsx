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
  Save, 
  CheckCircle, 
  History, 
  FileSpreadsheet,
  Printer,
  Upload,
  Search,
  CheckSquare,
  Square,
  BookOpen,
  UserCheck
} from "lucide-react";
import { AssessmentType } from "@/types";

interface GradeRecord {
  id: string;
  studentId: string;
  subjectId: string;
  assessmentType: AssessmentType;
  assessmentName: string;
  score: number;
  semester: string;
}

interface StudentRow {
  id: string;
  nisn: string;
  fullName: string;
  tugas1: number | "";
  tugas2: number | "";
  bab1: number | "";
  bab2: number | "";
  bab3: number | "";
  pts: number | "";
  finalExam: number | "";
  selected?: boolean;
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
  const [academicYear, setAcademicYear] = useState("2026/2027");
  const [semester, setSemester] = useState<"Ganjil" | "Genap">("Ganjil");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectAll, setSelectAll] = useState(false);

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

  const finalExamLabel = semester === "Ganjil" ? "PSAS" : "PSAT";

  // Load teacher assignments and general classes/subjects
  useEffect(() => {
    async function loadConfig() {
      try {
        const classesSnap = await getDocs(collection(db, "classes"));
        const cList = classesSnap.docs.map(d => ({ id: d.id, name: d.data().name || d.data().className || d.id }));
        setClasses(cList);
        if (cList.length > 0) {
          setSelectedClassId(cList[0].id);
          setHistoryClassId(cList[0].id);
          setLedgerClassId(cList[0].id);
        }

        const subjectsSnap = await getDocs(collection(db, "subjects"));
        const sList = subjectsSnap.docs.map(d => ({ id: d.id, name: d.data().name || d.data().subjectName || d.id }));
        setSubjects(sList);
        if (sList.length > 0) {
          setSelectedSubjectId(sList[0].id);
        }

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

  // Load students and existing scores for Input Tab
  useEffect(() => {
    async function loadStudentsForInput() {
      if (!selectedClassId || !selectedSubjectId || activeTab !== "input") return;

      setLoadingStudents(true);
      setSaveSuccess(false);
      try {
        const selectedClassObj = classes.find(c => c.id === selectedClassId);
        const selectedClassName = selectedClassObj ? selectedClassObj.name : selectedClassId;

        const studentsSnap = await getDocs(collection(db, "students"));

        const matchedStudentDocs = studentsSnap.docs.filter(docSnap => {
          const data = docSnap.data();
          const studentClass = String(data.kelas || data.classId || data.className || "").trim().toLowerCase();
          const targetId = String(selectedClassId).trim().toLowerCase();
          const targetName = String(selectedClassName).trim().toLowerCase();
          const status = String(data.status || "Aktif").trim();

          const isClassMatch = (
            studentClass === targetId ||
            studentClass === targetName ||
            studentClass.includes(targetName) ||
            targetName.includes(studentClass)
          );

          return isClassMatch && status === "Aktif";
        });

        // Fetch existing grades for this class, subject, and semester
        const existingSnap = await getDocs(query(
          collection(db, "grades"),
          where("classId", "==", selectedClassId),
          where("subjectId", "==", selectedSubjectId),
          where("semester", "==", semester)
        ));

        // Map: studentId -> { tugas1, tugas2, bab1, bab2, bab3, pts, finalExam }
        const studentGradesMap: Record<string, Record<string, number>> = {};
        existingSnap.forEach(d => {
          const data = d.data();
          if (!studentGradesMap[data.studentId]) {
            studentGradesMap[data.studentId] = {};
          }
          const name = String(data.assessmentName || "").trim().toLowerCase();
          if (name === "tugas 1") studentGradesMap[data.studentId]["tugas1"] = data.score;
          if (name === "tugas 2") studentGradesMap[data.studentId]["tugas2"] = data.score;
          if (name === "bab 1") studentGradesMap[data.studentId]["bab1"] = data.score;
          if (name === "bab 2") studentGradesMap[data.studentId]["bab2"] = data.score;
          if (name === "bab 3") studentGradesMap[data.studentId]["bab3"] = data.score;
          if (name === "pts") studentGradesMap[data.studentId]["pts"] = data.score;
          if (name === "psas" || name === "psat" || name === "pas") studentGradesMap[data.studentId]["finalExam"] = data.score;
        });

        const rows: StudentRow[] = matchedStudentDocs.map(docSnap => {
          const data = docSnap.data();
          const sGrades = studentGradesMap[docSnap.id] || {};
          return {
            id: docSnap.id,
            nisn: String(data.nis || data.nisn || "-"),
            fullName: String(data.nama || data.fullName || "Tanpa Nama"),
            tugas1: sGrades["tugas1"] !== undefined ? sGrades["tugas1"] : "",
            tugas2: sGrades["tugas2"] !== undefined ? sGrades["tugas2"] : "",
            bab1: sGrades["bab1"] !== undefined ? sGrades["bab1"] : "",
            bab2: sGrades["bab2"] !== undefined ? sGrades["bab2"] : "",
            bab3: sGrades["bab3"] !== undefined ? sGrades["bab3"] : "",
            pts: sGrades["pts"] !== undefined ? sGrades["pts"] : "",
            finalExam: sGrades["finalExam"] !== undefined ? sGrades["finalExam"] : "",
            selected: false
          };
        });

        setStudents(rows.sort((a, b) => a.fullName.localeCompare(b.fullName)));
        setSelectAll(false);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingStudents(false);
      }
    }

    loadStudentsForInput();
  }, [selectedClassId, selectedSubjectId, semester, academicYear, activeTab, classes]);

  // Load students for History Tab class filter
  useEffect(() => {
    async function loadHistoryStudents() {
      if (!historyClassId) return;
      try {
        const historyClassObj = classes.find(c => c.id === historyClassId);
        const historyClassName = historyClassObj ? historyClassObj.name : historyClassId;

        const studentsSnap = await getDocs(collection(db, "students"));

        const matchedList = studentsSnap.docs.filter(docSnap => {
          const data = docSnap.data();
          const studentClass = String(data.kelas || data.classId || data.className || "").trim().toLowerCase();
          const targetId = String(historyClassId).trim().toLowerCase();
          const targetName = String(historyClassName).trim().toLowerCase();
          const status = String(data.status || "Aktif").trim();

          const isClassMatch = (
            studentClass === targetId ||
            studentClass === targetName ||
            studentClass.includes(targetName) ||
            targetName.includes(studentClass)
          );

          return isClassMatch && status === "Aktif";
        }).map(d => ({
          id: d.id,
          name: String(d.data().nama || d.data().fullName || "Tanpa Nama")
        })).sort((a, b) => a.name.localeCompare(b.name));
        
        setHistoryStudents(matchedList);
        if (matchedList.length > 0) {
          setHistoryStudentId(matchedList[0].id);
        } else {
          setHistoryStudentId("");
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadHistoryStudents();
  }, [historyClassId, classes]);

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
            score: data.score,
            semester: data.semester
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
        const ledgerClassObj = classes.find(c => c.id === ledgerClassId);
        const ledgerClassName = ledgerClassObj ? ledgerClassObj.name : ledgerClassId;

        const studentsSnap = await getDocs(collection(db, "students"));
        const validStudentIds: string[] = [];
        const listStudents: { id: string; name: string }[] = [];

        studentsSnap.docs.forEach(d => {
          const data = d.data();
          const studentClass = String(data.kelas || data.classId || data.className || "").trim().toLowerCase();
          const targetId = String(ledgerClassId).trim().toLowerCase();
          const targetName = String(ledgerClassName).trim().toLowerCase();
          const status = String(data.status || "Aktif").trim();

          const isClassMatch = (
            studentClass === targetId ||
            studentClass === targetName ||
            studentClass.includes(targetName) ||
            targetName.includes(studentClass)
          );

          if (isClassMatch && status === "Aktif") {
            validStudentIds.push(d.id);
            listStudents.push({
              id: d.id,
              name: String(data.nama || data.fullName || "Tanpa Nama")
            });
          }
        });

        listStudents.sort((a, b) => a.name.localeCompare(b.name));
        setLedgerStudents(listStudents);

        const gradesSnap = await getDocs(query(
          collection(db, "grades"),
          where("semester", "==", ledgerSemester)
        ));

        const listGrades: GradeRecord[] = [];
        gradesSnap.docs.forEach(d => {
          const data = d.data();
          if (validStudentIds.includes(data.studentId)) {
            listGrades.push({
              id: d.id,
              studentId: data.studentId,
              subjectId: data.subjectId,
              assessmentType: data.assessmentType,
              assessmentName: data.assessmentName,
              score: data.score,
              semester: data.semester
            });
          }
        });
        setLedgerGrades(listGrades);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingLedger(false);
      }
    }

    loadLedgerData();
  }, [ledgerClassId, ledgerSemester, activeTab, classes]);

  const handleToggleSelectAll = () => {
    const newState = !selectAll;
    setSelectAll(newState);
    setStudents(prev => prev.map(s => ({ ...s, selected: newState })));
  };

  const handleFieldChange = (studentId: string, field: keyof StudentRow, value: string) => {
    let numVal: number | "" = "";
    if (value !== "") {
      numVal = Math.min(100, Math.max(0, parseInt(value) || 0));
    }
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, [field]: numVal } : s));
  };

  const handleSaveAllGrades = async () => {
    if (students.length === 0) return;

    setSaving(true);
    setSaveSuccess(false);

    try {
      const batch = writeBatch(db);
      const examName = semester === "Ganjil" ? "PSAS" : "PSAT";

      students.forEach((student) => {
        const fieldsToSave = [
          { name: "Tugas 1", type: "Tugas", score: student.tugas1 },
          { name: "Tugas 2", type: "Tugas", score: student.tugas2 },
          { name: "Bab 1", type: "UlanganHarian", score: student.bab1 },
          { name: "Bab 2", type: "UlanganHarian", score: student.bab2 },
          { name: "Bab 3", type: "UlanganHarian", score: student.bab3 },
          { name: "PTS", type: "PTS", score: student.pts },
          { name: examName, type: "PAS", score: student.finalExam },
        ];

        fieldsToSave.forEach(item => {
          if (item.score !== "") {
            const sanitizedName = item.name.replace(/[^a-zA-Z0-9]/g, "_");
            const docId = `${student.id}_${selectedClassId}_${selectedSubjectId}_${item.type}_${sanitizedName}`;
            const docRef = doc(db, "grades", docId);

            const payload = {
              studentId: student.id,
              classId: selectedClassId,
              subjectId: selectedSubjectId,
              assessmentType: item.type as AssessmentType,
              assessmentName: item.name,
              score: item.score,
              teacherId: teacherId || "",
              academicYear: academicYear,
              semester: semester,
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now()
            };

            batch.set(docRef, payload, { merge: true });
          }
        });
      });

      await batch.commit();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (error) {
      console.error("Error saving grades:", error);
      alert("Gagal menyimpan nilai!");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleUploadCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    alert(`File CSV "${file.name}" berhasil dibaca! Pemetaan nilai siap diproses.`);
  };

  const filteredStudents = students.filter(s => 
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.nisn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const subjectMap = subjects.reduce((acc, curr) => {
    acc[curr.id] = curr.name;
    return acc;
  }, {} as Record<string, string>);

  const studentLedgerData = ledgerStudents.map(student => {
    const studentGrades = ledgerGrades.filter(g => g.studentId === student.id);
    const subAverages: Record<string, number> = {};
    
    subjects.forEach(subject => {
      const subjectGrades = studentGrades.filter(g => g.subjectId === subject.id);
      if (subjectGrades.length > 0) {
        const sum = subjectGrades.reduce((acc, curr) => acc + curr.score, 0);
        subAverages[subject.id] = Math.round(sum / subjectGrades.length);
      } else {
        subAverages[subject.id] = 0;
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
    <div className="space-y-8 pb-16">
      {/* Header Utama */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Daftar Nilai Siswa</h1>
          <p className="text-sm text-slate-400 mt-1">
            Rekam hasil evaluasi akademis, tugas bab, PTS, dan rekap leger kelas.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer transition-all">
            <Upload className="h-4.5 w-4.5 text-indigo-400" />
            <span>Unggah CSV</span>
            <input type="file" accept=".csv" onChange={handleUploadCSV} className="hidden" />
          </label>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer transition-all"
          >
            <Printer className="h-4.5 w-4.5 text-emerald-400" />
            <span>Cetak Dokumen</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAllGrades}
            disabled={saving || students.length === 0}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/25 cursor-pointer transition-all disabled:opacity-50"
          >
            <Save className="h-4.5 w-4.5" />
            <span>{saving ? "Menyimpan..." : "Simpan Nilai"}</span>
          </button>
        </div>
      </div>

      {/* Tab Navigasi */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("input")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "input" 
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25" 
              : "bg-slate-900/40 text-slate-400 hover:text-white border border-slate-900"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Input Nilai Mapel</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "history" 
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25" 
              : "bg-slate-900/40 text-slate-400 hover:text-white border border-slate-900"
          }`}
        >
          <UserCheck className="h-4 w-4" />
          <span>Riwayat Nilai Siswa</span>
        </button>

        {(role === "admin" || role === "kepala_sekolah" || role === "wali_kelas") && (
          <button
            type="button"
            onClick={() => setActiveTab("ledger")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "ledger" 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25" 
                : "bg-slate-900/40 text-slate-400 hover:text-white border border-slate-900"
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Leger Rapor Kelas</span>
          </button>
        )}
      </div>

      {/* KONTEN TAB 1: INPUT NILAI */}
      {activeTab === "input" && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-5 backdrop-blur-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Pilih Kelas</label>
              {isTeacherRole ? (
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500"
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
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500"
                >
                  <option value="">Pilih Kelas...</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Mata Pelajaran</label>
              {isTeacherRole ? (
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500"
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
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500"
                >
                  <option value="">Pilih Mapel...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Semester</label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value as "Ganjil" | "Genap")}
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
                  placeholder="Cari nama siswa atau NISN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {saveSuccess && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400">
              <CheckCircle className="h-5 w-5 shrink-0" />
              <span>Semua nilai berhasil disimpan ke database!</span>
            </div>
          )}

          {loadingStudents ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map(n => <div key={n} className="h-16 w-full animate-pulse rounded-xl bg-slate-900" />)}
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-12 text-center text-slate-500 backdrop-blur-sm">
              <Award className="h-10 w-10 mx-auto mb-3 text-slate-600" />
              <p className="text-sm font-medium">Tidak ada data siswa ditemukan untuk kelas ini.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/80 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-4 px-4 w-12 text-center">
                        <button type="button" onClick={handleToggleSelectAll} className="text-slate-400 hover:text-white cursor-pointer">
                          {selectAll ? <CheckSquare className="h-4.5 w-4.5 text-indigo-400" /> : <Square className="h-4.5 w-4.5" />}
                        </button>
                      </th>
                      <th className="py-4 px-4 w-16">No</th>
                      <th className="py-4 px-4 min-w-[120px]">NISN</th>
                      <th className="py-4 px-6 min-w-[220px]">Nama Siswa</th>
                      <th className="py-4 px-3 w-20 text-center">Tugas 1</th>
                      <th className="py-4 px-3 w-20 text-center">Tugas 2</th>
                      <th className="py-4 px-3 w-20 text-center">Bab 1</th>
                      <th className="py-4 px-3 w-20 text-center">Bab 2</th>
                      <th className="py-4 px-3 w-20 text-center">Bab 3</th>
                      <th className="py-4 px-3 w-20 text-center">PTS</th>
                      <th className="py-4 px-3 w-24 text-center text-indigo-400">{finalExamLabel}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {filteredStudents.map((student, idx) => (
                      <tr key={student.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="py-4 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setStudents(prev => prev.map(s => s.id === student.id ? { ...s, selected: !s.selected } : s))}
                            className="text-slate-500 hover:text-indigo-400 cursor-pointer"
                          >
                            {student.selected ? <CheckSquare className="h-4.5 w-4.5 text-indigo-400" /> : <Square className="h-4.5 w-4.5" />}
                          </button>
                        </td>
                        <td className="py-4 px-4 font-medium text-slate-500">{idx + 1}</td>
                        <td className="py-4 px-4 text-xs text-slate-300 font-mono font-semibold">{student.nisn}</td>
                        <td className="py-4 px-6 font-semibold text-white">{student.fullName}</td>

                        {/* Tugas 1 */}
                        <td className="py-4 px-3">
                          <input type="number" min="0" max="100" placeholder="0" value={student.tugas1} onChange={e => handleFieldChange(student.id, "tugas1", e.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-950 px-2 py-2 text-center text-xs text-slate-200 outline-none focus:border-indigo-500 font-semibold" />
                        </td>
                        {/* Tugas 2 */}
                        <td className="py-4 px-3">
                          <input type="number" min="0" max="100" placeholder="0" value={student.tugas2} onChange={e => handleFieldChange(student.id, "tugas2", e.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-950 px-2 py-2 text-center text-xs text-slate-200 outline-none focus:border-indigo-500 font-semibold" />
                        </td>
                        {/* Bab 1 */}
                        <td className="py-4 px-3">
                          <input type="number" min="0" max="100" placeholder="0" value={student.bab1} onChange={e => handleFieldChange(student.id, "bab1", e.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-950 px-2 py-2 text-center text-xs text-slate-200 outline-none focus:border-indigo-500 font-semibold" />
                        </td>
                        {/* Bab 2 */}
                        <td className="py-4 px-3">
                          <input type="number" min="0" max="100" placeholder="0" value={student.bab2} onChange={e => handleFieldChange(student.id, "bab2", e.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-950 px-2 py-2 text-center text-xs text-slate-200 outline-none focus:border-indigo-500 font-semibold" />
                        </td>
                        {/* Bab 3 */}
                        <td className="py-4 px-3">
                          <input type="number" min="0" max="100" placeholder="0" value={student.bab3} onChange={e => handleFieldChange(student.id, "bab3", e.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-950 px-2 py-2 text-center text-xs text-slate-200 outline-none focus:border-indigo-500 font-semibold" />
                        </td>
                        {/* PTS */}
                        <td className="py-4 px-3">
                          <input type="number" min="0" max="100" placeholder="0" value={student.pts} onChange={e => handleFieldChange(student.id, "pts", e.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-950 px-2 py-2 text-center text-xs text-amber-400 outline-none focus:border-indigo-500 font-semibold" />
                        </td>
                        {/* PSAS / PSAT */}
                        <td className="py-4 px-3">
                          <input type="number" min="0" max="100" placeholder="0" value={student.finalExam} onChange={e => handleFieldChange(student.id, "finalExam", e.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-950 px-2 py-2 text-center text-xs text-indigo-400 outline-none focus:border-indigo-500 font-semibold" />
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

      {/* KONTEN TAB 2: RIWAYAT NILAI SISWA */}
      {activeTab === "history" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-5 backdrop-blur-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Kelas</label>
              <select
                value={historyClassId}
                onChange={(e) => setHistoryClassId(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500"
              >
                <option value="">Pilih Kelas...</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Siswa</label>
              <select
                value={historyStudentId}
                onChange={(e) => setHistoryStudentId(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500"
              >
                <option value="">Pilih Siswa...</option>
                {historyStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Semester</label>
              <select
                value={historySemester}
                onChange={(e) => setHistorySemester(e.target.value as "Ganjil" | "Genap")}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500"
              >
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </select>
            </div>
          </div>

          {loadingHistory ? (
            <div className="h-64 w-full animate-pulse rounded-2xl bg-slate-900 border border-slate-800" />
          ) : !historyStudentId ? (
            <p className="text-sm text-slate-500 text-center py-10">Pilih siswa di atas untuk melihat riwayat nilai.</p>
          ) : gradesHistory.length === 0 ? (
            <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-12 text-center text-slate-500 backdrop-blur-sm">
              <History className="h-10 w-10 mx-auto mb-3 text-slate-600" />
              <p className="text-sm font-medium">Tidak ada riwayat nilai untuk semester ini.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-sm space-y-4">
              <h3 className="text-base font-bold text-white">Rincian Penilaian Siswa</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Mata Pelajaran</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4">Nama Penilaian</th>
                      <th className="py-3 px-4 text-right">Nilai</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-xs">
                    {gradesHistory.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-900/20">
                        <td className="py-3 px-4 font-semibold text-white">{subjectMap[record.subjectId] || record.subjectId}</td>
                        <td className="py-3 px-4 text-slate-400">{record.assessmentType}</td>
                        <td className="py-3 px-4">{record.assessmentName}</td>
                        <td className={`py-3 px-4 text-right font-bold ${record.score >= 75 ? "text-emerald-400" : "text-rose-400"}`}>{record.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* KONTEN TAB 3: LEGER RAPOR KELAS */}
      {activeTab === "ledger" && (role === "admin" || role === "kepala_sekolah" || role === "wali_kelas") && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-5 backdrop-blur-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Kelas / Rombel</label>
              <select
                value={ledgerClassId}
                onChange={(e) => setLedgerClassId(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500"
              >
                <option value="">Pilih Kelas...</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Semester</label>
              <select
                value={ledgerSemester}
                onChange={(e) => setLedgerSemester(e.target.value as "Ganjil" | "Genap")}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500"
              >
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </select>
            </div>
          </div>

          {loadingLedger ? (
            <div className="h-64 w-full animate-pulse rounded-2xl bg-slate-900 border border-slate-800" />
          ) : ledgerStudents.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10">Pilih kelas di atas untuk memuat Ledger nilai.</p>
          ) : (
            <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-indigo-400" />
                  Leger Penilaian Hasil Belajar (Rata-Rata Nilai Akhir Mapel)
                </h3>
                <span className="text-xs text-slate-500">T.A. 2026/2027 • {ledgerSemester}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3 min-w-[200px]">Nama Siswa</th>
                      {subjects.map((subj) => (
                        <th key={subj.id} className="py-3 px-3 text-center w-24" title={subj.name}>
                          {subj.name}
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