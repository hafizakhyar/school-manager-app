"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  orderBy, 
  Timestamp 
} from "firebase/firestore";
import { 
  Plus, 
  Filter, 
  Calendar, 
  ArrowRight,
  BookOpen,
  CheckCircle,
  X
} from "lucide-react";
import Link from "next/link";

interface JournalEntry {
  id: string;
  teacherId: string;
  teacherName?: string;
  classId: string;
  className?: string;
  subjectId: string;
  subjectName?: string;
  date: string;
  jamKe: number[];
  materi: string;
  kegiatanPembelajaran: string;
  mediaAlat: string;
  tugasPR: string;
  catatanRefleksi: string;
}

export default function JurnalMengajarPage() {
  const { role, teacherId } = useAuth();
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [teachers, setTeachers] = useState<Record<string, string>>({});
  const [classes, setClasses] = useState<Record<string, string>>({});
  const [subjects, setSubjects] = useState<Record<string, string>>({});
   
  // Teaching assignments for current teacher form dropdown
  const [assignedOptions, setAssignedOptions] = useState<{ classId: string; className: string; subjectId: string; subjectName: string }[]>([]);

  // Filter States
  const [filterClass, setFilterClass] = useState("");
  const [filterTeacher, setFilterTeacher] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // Loading States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form States
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    selectedAssignmentIdx: "",
    date: new Date().toISOString().split("T")[0],
    jamKe: [] as number[],
    materi: "",
    kegiatanPembelajaran: "",
    mediaAlat: "",
    tugasPR: "",
    catatanRefleksi: ""
  });

  // Success Prompt Modal
  const [savedJournalId, setSavedJournalId] = useState<string | null>(null);
  const [savedClassId, setSavedClassId] = useState("");
  const [savedSubjectId, setSavedSubjectId] = useState("");
  const [savedDate, setSavedDate] = useState("");
  const [savedJamKe, setSavedJamKe] = useState<number[]>([]);

  useEffect(() => {
    async function loadMetadataAndJournals() {
      try {
        setLoading(true);

        // 1. Fetch metadata lookup maps
        const teachersSnap = await getDocs(collection(db, "teachers"));
        const tMap: Record<string, string> = {};
        teachersSnap.forEach(d => tMap[d.id] = d.data().fullName);
        setTeachers(tMap);

        const classesSnap = await getDocs(collection(db, "classes"));
        const cMap: Record<string, string> = {};
        classesSnap.forEach(d => cMap[d.id] = d.data().name || d.data().className || d.id);
        setClasses(cMap);

        const subjectsSnap = await getDocs(collection(db, "subjects"));
        const sMap: Record<string, string> = {};
        subjectsSnap.forEach(d => sMap[d.id] = d.data().name || d.data().subjectName || d.id);
        setSubjects(sMap);

        // 2. Fetch teaching assignments or fallback to all classes & subjects if none assigned
        const options: typeof assignedOptions = [];
        if (teacherId) {
          const assignmentsSnap = await getDocs(query(
            collection(db, "teachingAssignments"),
            where("teacherId", "==", teacherId)
          ));
          
          assignmentsSnap.forEach(d => {
            const data = d.data();
            options.push({
              classId: data.classId,
              className: cMap[data.classId] || data.classId,
              subjectId: data.subjectId,
              subjectName: sMap[data.subjectId] || data.subjectId
            });
          });
        }

        // Fallback: If no specific teaching assignments found, combine all classes and subjects so form is never empty
        if (options.length === 0) {
          const classEntries = Object.entries(cMap);
          const subjectEntries = Object.entries(sMap);
          
          // Pair them up or list combinations
          classEntries.forEach(([cId, cName]) => {
            subjectEntries.forEach(([sId, sName]) => {
              options.push({
                classId: cId,
                className: cName,
                subjectId: sId,
                subjectName: sName
              });
            });
          });
        }
        setAssignedOptions(options);

        // 3. Fetch Journals
        await fetchJournals(tMap, cMap, sMap);
      } catch (err) {
        console.error("Error loading journal data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadMetadataAndJournals();
  }, [teacherId, role]);

  const fetchJournals = async (
    tMap: Record<string, string> = teachers, 
    cMap: Record<string, string> = classes, 
    sMap: Record<string, string> = subjects
  ) => {
    let journalsQuery;
     
    if (role === "admin" || role === "kepala_sekolah") {
      journalsQuery = query(collection(db, "journals"), orderBy("date", "desc"));
    } else {
      journalsQuery = query(
        collection(db, "journals"), 
        where("teacherId", "==", teacherId || ""), 
        orderBy("date", "desc")
      );
    }

    const snap = await getDocs(journalsQuery);
    const list: JournalEntry[] = [];
    snap.forEach(d => {
      const data = d.data();
      list.push({
        id: d.id,
        teacherId: data.teacherId,
        teacherName: tMap[data.teacherId] || data.teacherId,
        classId: data.classId,
        className: cMap[data.classId] || data.classId,
        subjectId: data.subjectId,
        subjectName: sMap[data.subjectId] || data.subjectId,
        date: data.date,
        jamKe: data.jamKe || [],
        materi: data.materi,
        kegiatanPembelajaran: data.kegiatanPembelajaran || "",
        mediaAlat: data.mediaAlat || "",
        tugasPR: data.tugasPR || "",
        catatanRefleksi: data.catatanRefleksi || ""
      });
    });
    setJournals(list);
  };

  const handleFilter = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetchJournals();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodToggle = (periodNum: number) => {
    setFormData(prev => {
      const exists = prev.jamKe.includes(periodNum);
      if (exists) {
        return { ...prev, jamKe: prev.jamKe.filter(n => n !== periodNum) };
      } else {
        return { ...prev, jamKe: [...prev.jamKe, periodNum].sort() };
      }
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.selectedAssignmentIdx) {
      alert("Silakan pilih Kelas & Mata Pelajaran!");
      return;
    }
    if (!formData.materi.trim()) {
      alert("Materi Pembelajaran wajib diisi!");
      return;
    }
    if (formData.jamKe.length === 0) {
      alert("Silakan pilih jam mengajar!");
      return;
    }

    setSubmitting(true);
    try {
      const selectedOption = assignedOptions[parseInt(formData.selectedAssignmentIdx)];
       
      const journalPayload = {
        teacherId: teacherId || "",
        classId: selectedOption.classId,
        subjectId: selectedOption.subjectId,
        date: formData.date,
        jamKe: formData.jamKe,
        materi: formData.materi.trim(),
        kegiatanPembelajaran: formData.kegiatanPembelajaran.trim(),
        mediaAlat: formData.mediaAlat.trim(),
        tugasPR: formData.tugasPR.trim(),
        catatanRefleksi: formData.catatanRefleksi.trim(),
        academicYear: "2026/2027",
        semester: "Ganjil",
        createdAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, "journals"), journalPayload);

      setSavedJournalId(docRef.id);
      setSavedClassId(selectedOption.classId);
      setSavedSubjectId(selectedOption.subjectId);
      setSavedDate(formData.date);
      setSavedJamKe(formData.jamKe);

      setFormData({
        selectedAssignmentIdx: "",
        date: new Date().toISOString().split("T")[0],
        jamKe: [],
        materi: "",
        kegiatanPembelajaran: "",
        mediaAlat: "",
        tugasPR: "",
        catatanRefleksi: ""
      });
      setShowForm(false);

      await fetchJournals();
    } catch (error) {
      console.error("Error creating journal entry:", error);
      alert("Gagal menyimpan jurnal!");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredJournals = journals.filter(j => {
    if (filterClass && j.classId !== filterClass) return false;
    if (filterSubject && j.subjectId !== filterSubject) return false;
    if (filterTeacher && j.teacherId !== filterTeacher) return false;
    if (filterStartDate && j.date < filterStartDate) return false;
    if (filterEndDate && j.date > filterEndDate) return false;
    return true;
  });

  const isAdminOrKepsek = role === "admin" || role === "kepala_sekolah";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Jurnal Mengajar</h1>
          <p className="text-sm text-slate-400 mt-1">
            Catatan harian proses pembelajaran guru di dalam kelas.
          </p>
        </div>
         
        {!isAdminOrKepsek && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-indigo-500 cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Tambah Entri Jurnal</span>
          </button>
        )}
      </div>

      <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-sm">
        <form onSubmit={handleFilter} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end">
          {isAdminOrKepsek && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Guru</label>
              <select
                value={filterTeacher}
                onChange={(e) => setFilterTeacher(e.target.value)}
                className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500"
              >
                <option value="">Semua Guru</option>
                {Object.entries(teachers).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>
          )}
           
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Kelas</label>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500"
            >
              <option value="">Semua Kelas</option>
              {Object.entries(classes).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Mata Pelajaran</label>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500"
            >
              <option value="">Semua Mapel</option>
              {Object.entries(subjects).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Mulai Tanggal</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Selesai Tanggal</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500"
            />
          </div>
        </form>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-44 w-full animate-pulse rounded-xl bg-slate-900 border border-slate-800" />
          ))}
        </div>
      ) : filteredJournals.length === 0 ? (
        <div className="rounded-xl border border-slate-900 border-dashed py-16 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-slate-600" />
          <h3 className="mt-4 text-sm font-bold text-white">Tidak ada data jurnal</h3>
          <p className="mt-1 text-xs text-slate-500">Silakan sesuaikan filter Anda atau buat entri jurnal baru.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJournals.map((journal) => (
            <div 
              key={journal.id} 
              className="rounded-xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-sm flex flex-col md:flex-row justify-between gap-6 hover:border-slate-800 transition-colors"
            >
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded bg-indigo-500/10 px-2 py-0.5 font-bold text-indigo-400 border border-indigo-500/10">
                    {journal.className}
                  </span>
                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-bold text-emerald-400 border border-emerald-500/10">
                    {journal.subjectName}
                  </span>
                  <span className="text-slate-500 font-medium">•</span>
                  <span className="text-slate-400 font-semibold flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {journal.date} (Jam: {journal.jamKe.join(",")})
                  </span>
                  {isAdminOrKepsek && (
                    <>
                      <span className="text-slate-500 font-medium">•</span>
                      <span className="text-indigo-300 font-semibold">Oleh: {journal.teacherName}</span>
                    </>
                  )}
                </div>

                <div>
                  <h3 className="text-base font-bold text-white">{journal.materi}</h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 text-xs text-slate-300 mt-2">
                  <div>
                    <span className="font-bold text-slate-400 block mb-0.5">Kegiatan Pembelajaran:</span>
                    <p className="line-clamp-2">{journal.kegiatanPembelajaran || "-"}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 block mb-0.5">Tugas / PR:</span>
                    <p className="line-clamp-2">{journal.tugasPR || "-"}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 block mb-0.5">Media & Alat:</span>
                    <p className="line-clamp-1">{journal.mediaAlat || "-"}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 block mb-0.5">Catatan Refleksi:</span>
                    <p className="line-clamp-2">{journal.catatanRefleksi || "-"}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
           
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h2 className="text-lg font-bold text-white">Tambah Jurnal Mengajar Baru</h2>
              <button 
                onClick={() => setShowForm(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Kelas & Mata Pelajaran</label>
                  <select
                    required
                    value={formData.selectedAssignmentIdx}
                    onChange={(e) => setFormData(prev => ({ ...prev, selectedAssignmentIdx: e.target.value }))}
                    className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                  >
                    <option value="">Pilih Rombel / Mapel...</option>
                    {assignedOptions.map((opt, idx) => (
                      <option key={idx} value={idx}>
                        {opt.className} — {opt.subjectName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Tanggal Pelaksanaan</label>
                  <input
                    required
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Jam Ke- (Bisa pilih lebih dari satu)</label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((periodNum) => {
                    const isSelected = formData.jamKe.includes(periodNum);
                    return (
                      <button
                        key={periodNum}
                        type="button"
                        onClick={() => handlePeriodToggle(periodNum)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        Jam {periodNum}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Materi Pokok (Wajib)</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Pembahasan SPLDV metode eliminasi"
                  value={formData.materi}
                  onChange={(e) => setFormData(prev => ({ ...prev, materi: e.target.value }))}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Kegiatan Pembelajaran</label>
                <textarea
                  rows={2}
                  placeholder="Deskripsikan proses KBM..."
                  value={formData.kegiatanPembelajaran}
                  onChange={(e) => setFormData(prev => ({ ...prev, kegiatanPembelajaran: e.target.value }))}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Media & Alat Peraga</label>
                  <input
                    type="text"
                    placeholder="e.g. Proyektor, Google Slides"
                    value={formData.mediaAlat}
                    onChange={(e) => setFormData(prev => ({ ...prev, mediaAlat: e.target.value }))}
                    className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Tugas / PR Siswa</label>
                  <input
                    type="text"
                    placeholder="Tulis instruksi tugas..."
                    value={formData.tugasPR}
                    onChange={(e) => setFormData(prev => ({ ...prev, tugasPR: e.target.value }))}
                    className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Catatan Refleksi Guru</label>
                <textarea
                  rows={2}
                  placeholder="Catatan kelebihan, kekurangan, hambatan selama KBM..."
                  value={formData.catatanRefleksi}
                  onChange={(e) => setFormData(prev => ({ ...prev, catatanRefleksi: e.target.value }))}
                  className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Menyimpan..." : "Simpan Jurnal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {savedJournalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" />
           
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
              <CheckCircle className="h-6 w-6" />
            </div>
             
            <h3 className="mt-4 text-lg font-bold text-white">Jurnal Berhasil Disimpan!</h3>
            <p className="mt-2 text-sm text-slate-400">
              Apakah Anda ingin segera mengisi absensi (daftar hadir) siswa untuk kelas, mata pelajaran, dan tanggal yang sama?
            </p>

            <div className="flex flex-col gap-2 mt-6">
              <Link
                href={`/attendance?classId=${savedClassId}&subjectId=${savedSubjectId}&date=${savedDate}&jamKe=${savedJamKe.join(",")}&journalId=${savedJournalId}`}
                onClick={() => setSavedJournalId(null)}
                className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-500"
              >
                <span>Ya, Isi Absensi Sekarang</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
               
              <button
                onClick={() => setSavedJournalId(null)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                Tidak, Nanti Saja
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}