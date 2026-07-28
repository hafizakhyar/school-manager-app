"use client";

import React, { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useAuth } from "@/context/auth-context";
import { CalendarDays, BookOpen, UserCheck } from "lucide-react";

interface Assignment {
  id: string;
  teacherId: string;
  classId: string;
  subjectId: string;
}

interface JournalEntry {
  id: string;
  teacherId: string;
  classId: string;
  subjectId: string;
  date: string;
  jamKe: number[];
}

interface TeacherMap {
  [key: string]: string;
}

interface ClassMap {
  [key: string]: string;
}

interface SubjectMap {
  [key: string]: string;
}

export default function SchedulePage() {
  const { userData } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [teachers, setTeachers] = useState<TeacherMap>({});
  const [classes, setClasses] = useState<ClassMap>({});
  const [subjects, setSubjects] = useState<SubjectMap>({});
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState("");
  const [filterTeacher, setFilterTeacher] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [activeView, setActiveView] = useState<"list" | "daily">("list");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [teacherSnap, classSnap, subjectSnap, assignmentSnap, journalSnap] = await Promise.all([
          getDocs(collection(db, "teachers")),
          getDocs(collection(db, "classes")),
          getDocs(collection(db, "subjects")),
          getDocs(collection(db, "teachingAssignments")),
          getDocs(collection(db, "journals")),
        ]);

        const teacherMap: TeacherMap = {};
        teacherSnap.forEach((doc) => {
          teacherMap[doc.id] = doc.data().fullName || doc.data().name || "Guru belum tersedia";
        });

        const classMap: ClassMap = {};
        classSnap.forEach((doc) => {
          classMap[doc.id] = doc.data().name || doc.data().gradeLevel || doc.id;
        });

        const subjectMap: SubjectMap = {};
        subjectSnap.forEach((doc) => {
          subjectMap[doc.id] = doc.data().name || doc.id;
        });

        const assignmentList: Assignment[] = [];
        assignmentSnap.forEach((doc) => {
          assignmentList.push({ id: doc.id, ...doc.data() } as Assignment);
        });

        const journalList: JournalEntry[] = [];
        journalSnap.forEach((doc) => {
          const data = doc.data() as any;
          journalList.push({
            id: doc.id,
            teacherId: data.teacherId,
            classId: data.classId,
            subjectId: data.subjectId,
            date: data.date,
            jamKe: data.jamKe || [],
          });
        });

        setTeachers(teacherMap);
        setClasses(classMap);
        setSubjects(subjectMap);
        setAssignments(assignmentList);
        setJournals(journalList);
      } catch (error) {
        console.error("Gagal memuat jadwal pelajaran:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredAssignments = useMemo(
    () =>
      assignments.filter((assignment) => {
        if (filterClass && assignment.classId !== filterClass) return false;
        if (filterTeacher && assignment.teacherId !== filterTeacher) return false;
        if (filterSubject && assignment.subjectId !== filterSubject) return false;
        return true;
      }),
    [assignments, filterClass, filterTeacher, filterSubject]
  );

  const filteredJournals = useMemo(
    () =>
      journals.filter((journal) => {
        if (journal.date !== selectedDate) return false;
        if (filterClass && journal.classId !== filterClass) return false;
        if (filterTeacher && journal.teacherId !== filterTeacher) return false;
        if (filterSubject && journal.subjectId !== filterSubject) return false;
        return true;
      }),
    [journals, selectedDate, filterClass, filterTeacher, filterSubject]
  );

  const scheduleByHour = useMemo(() => {
    const map = new Map<number, JournalEntry[]>();
    for (let i = 1; i <= 8; i++) {
      map.set(i, []);
    }
    filteredJournals.forEach((journal) => {
      journal.jamKe.forEach((jam) => {
        const list = map.get(jam);
        if (list) {
          list.push(journal);
        }
      });
    });
    return map;
  }, [filteredJournals]);

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Jadwal Pelajaran</h1>
          <p className="text-sm text-slate-400 mt-1">Lihat jadwal pelajaran lengkap dengan guru pengampu, mata pelajaran, dan jadwal harian.</p>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 px-4 py-3 inline-flex items-center gap-2 text-sm text-slate-300">
          <CalendarDays className="h-4.5 w-4.5 text-indigo-400" />
          <span>Pengguna: {userData?.displayName || "Tamu"}</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-900 bg-slate-900/40 p-5">
          <p className="text-sm uppercase text-slate-500">Total Penugasan</p>
          <p className="mt-3 text-3xl font-bold text-white">{assignments.length}</p>
        </div>
        <div className="rounded-3xl border border-slate-900 bg-slate-900/40 p-5">
          <p className="text-sm uppercase text-slate-500">Total Guru</p>
          <p className="mt-3 text-3xl font-bold text-white">{Object.keys(teachers).length}</p>
        </div>
        <div className="rounded-3xl border border-slate-900 bg-slate-900/40 p-5">
          <p className="text-sm uppercase text-slate-500">Total Mata Pelajaran</p>
          <p className="mt-3 text-3xl font-bold text-white">{Object.keys(subjects).length}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-900 bg-slate-900/40 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveView("list")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeView === "list"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-950 text-slate-300 hover:bg-slate-900"
              }`}
            >
              Daftar Penugasan
            </button>
            <button
              onClick={() => setActiveView("daily")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeView === "daily"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-950 text-slate-300 hover:bg-slate-900"
              }`}
            >
              Jadwal Harian
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Kelas</label>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
              >
                <option value="">Semua Kelas</option>
                {Object.entries(classes).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Guru</label>
              <select
                value={filterTeacher}
                onChange={(e) => setFilterTeacher(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
              >
                <option value="">Semua Guru</option>
                {Object.entries(teachers).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Mata Pelajaran</label>
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
              >
                <option value="">Semua Mapel</option>
                {Object.entries(subjects).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>
            {activeView === "daily" && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Tanggal</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-28 animate-pulse rounded-3xl bg-slate-900" />
          ))}
        </div>
      ) : activeView === "list" ? (
        <div className="overflow-x-auto rounded-3xl border border-slate-900 bg-slate-900/40 p-1">
          <table className="min-w-full divide-y divide-slate-800 text-left text-sm text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/80 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-4">Kelas</th>
                <th className="px-4 py-4">Mata Pelajaran</th>
                <th className="px-4 py-4">Guru Pengajar</th>
                <th className="px-4 py-4">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">Tidak ada penugasan yang cocok dengan filter.</td>
                </tr>
              ) : (
                filteredAssignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-slate-950/70 transition-colors">
                    <td className="px-4 py-4 font-semibold text-white">{classes[assignment.classId] || assignment.classId || "-"}</td>
                    <td className="px-4 py-4 text-sm text-indigo-300">{subjects[assignment.subjectId] || assignment.subjectId || "-"}</td>
                    <td className="px-4 py-4 text-sm text-slate-200">{teachers[assignment.teacherId] || assignment.teacherId || "-"}</td>
                    <td className="px-4 py-4 text-xs text-slate-500">Jadwal ini menampilkan guru dan mata pelajaran untuk kelas yang ditugaskan.</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-900 bg-slate-900/40 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">Jadwal harian untuk</p>
                <h2 className="text-lg font-semibold text-white">{new Date(selectedDate).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h2>
              </div>
              <div className="text-sm text-slate-400">
                Menampilkan {filteredJournals.length} entri pada tanggal ini.
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            {Array.from({ length: 8 }, (_, index) => index + 1).map((jam) => {
              const entries = scheduleByHour.get(jam) || [];
              return (
                <div key={jam} className="rounded-3xl border border-slate-900 bg-slate-900/40 p-5">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500">Jam {jam}</p>
                      <p className="text-lg font-semibold text-white">{entries.length > 0 ? `${entries.length} kelas` : "Kosong"}</p>
                    </div>
                    <div className="rounded-full bg-slate-950 px-3 py-1 text-xs uppercase tracking-wider text-slate-400">
                      {entries.length > 0 ? "Terisi" : "Tidak ada"}
                    </div>
                  </div>

                  {entries.length === 0 ? (
                    <p className="text-sm text-slate-500">Tidak ada jadwal pada jam ini.</p>
                  ) : (
                    <div className="space-y-3">
                      {entries.map((entry) => (
                        <div key={`${entry.id}-${jam}`} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-2">
                            <span className="rounded-full bg-indigo-500/10 px-2 py-1 text-indigo-300">{classes[entry.classId] || entry.classId}</span>
                            <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-300">{subjects[entry.subjectId] || entry.subjectId}</span>
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-semibold text-white">{teachers[entry.teacherId] || entry.teacherId}</p>
                              <p className="text-sm text-slate-400">{classes[entry.classId] || entry.classId} — {subjects[entry.subjectId] || entry.subjectId}</p>
                            </div>
                            <div className="text-xs uppercase tracking-wider text-slate-500">ID: {entry.id}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
