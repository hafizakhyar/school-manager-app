import { Timestamp } from "firebase/firestore";

export type UserRole = "admin" | "kepala_sekolah" | "guru" | "wali_kelas";

export interface UserDoc {
  id: string; // Auth UID
  email: string;
  role: UserRole;
  teacherId: string | null; // Only for guru and wali_kelas
  displayName: string;
  createdAt: Timestamp;
}

export interface Teacher {
  id: string; // TCHxxx or unique id
  nip: string;
  fullName: string;
  email: string;
  status: "Aktif" | "Nonaktif";
  createdAt: Timestamp;
}

export interface Student {
  id: string; // STDxxx or unique id
  nisn: string;
  fullName: string;
  classId: string;
  status: "Aktif" | "Lulus" | "Pindah";
  gender: "L" | "P";
  createdAt: Timestamp;
}

export interface Class {
  id: string; // e.g. "10-A", "11-IPA"
  name: string;
  grade: 10 | 11 | 12;
  homeroomTeacherId: string | null; // references Teacher.id
  academicYear: string; // e.g. "2026/2027"
  createdAt: Timestamp;
}

export interface Subject {
  id: string; // e.g. "MAT", "FIS"
  name: string;
  code: string;
  createdAt: Timestamp;
}

export interface TeachingAssignment {
  id: string; // Format: teacherId_classId_subjectId
  teacherId: string;
  classId: string;
  subjectId: string;
  academicYear: string;
}

export interface Journal {
  id: string;
  teacherId: string;
  classId: string;
  subjectId: string;
  date: string; // YYYY-MM-DD
  jamKe: number[]; // e.g. [1, 2]
  materi: string;
  kegiatanPembelajaran: string;
  mediaAlat: string;
  tugasPR: string;
  catatanRefleksi: string;
  academicYear: string;
  semester: "Ganjil" | "Genap";
  createdAt: Timestamp;
}

export type AttendanceStatus = "Hadir" | "Sakit" | "Izin" | "Alpa" | "Terlambat";

export interface Attendance {
  id: string; // studentId_classId_subjectId_date
  studentId: string;
  classId: string;
  subjectId: string;
  date: string; // YYYY-MM-DD
  jamKe: number[];
  status: AttendanceStatus;
  note: string;
  teacherId: string;
  academicYear: string;
  semester: "Ganjil" | "Genap";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type AssessmentType = "Tugas" | "UlanganHarian" | "PTS" | "PAS" | "Praktik" | "Project";

export interface Grade {
  id: string; // studentId_classId_subjectId_assessmentId
  studentId: string;
  classId: string;
  subjectId: string;
  assessmentType: AssessmentType;
  assessmentName: string;
  score: number; // 0-100
  teacherId: string;
  academicYear: string;
  semester: "Ganjil" | "Genap";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
