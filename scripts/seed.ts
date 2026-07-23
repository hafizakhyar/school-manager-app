import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  writeBatch, 
  Timestamp 
} from "firebase/firestore";
import * as fs from "fs";
import * as path from "path";

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, "utf-8");
  envFile.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  });
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

console.log("Firebase Config Project ID:", firebaseConfig.projectId);

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("CRITICAL ERROR: Firebase environment variables are missing in .env.local!");
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Seed Data definition
const teachersData = [
  { id: "TCH001", nip: "198001012005011001", fullName: "Ahmad Subarjo, S.Pd.", email: "guru1@aljannah.sch.id", role: "guru" as const, status: "Aktif" as const },
  { id: "TCH002", nip: "198502022010022002", fullName: "Siti Rahma, M.Sc.", email: "guru2@aljannah.sch.id", role: "guru" as const, status: "Aktif" as const },
  { id: "TCH003", nip: "199003032015031003", fullName: "Budi Santoso, S.Kom.", email: "walikelas1@aljannah.sch.id", role: "wali_kelas" as const, status: "Aktif" as const },
  { id: "TCH004", nip: "197504041999042004", fullName: "Dewi Lestari, M.Pd.", email: "guru3@aljannah.sch.id", role: "guru" as const, status: "Aktif" as const },
  { id: "TCH005", nip: "198805052012051005", fullName: "Eko Prasetyo, S.Si.", email: "guru4@aljannah.sch.id", role: "guru" as const, status: "Aktif" as const }
];

const classesData = [
  { id: "10-A", name: "Kelas 10-A", grade: 10 as const, homeroomTeacherId: "TCH003", academicYear: "2026/2027" },
  { id: "11-IPA", name: "Kelas 11 IPA", grade: 11 as const, homeroomTeacherId: "TCH001", academicYear: "2026/2027" },
  { id: "12-IPS", name: "Kelas 12 IPS", grade: 12 as const, homeroomTeacherId: "TCH002", academicYear: "2026/2027" }
];

const subjectsData = [
  { id: "MAT", name: "Matematika", code: "MAT-01" },
  { id: "IND", name: "Bahasa Indonesia", code: "IND-01" },
  { id: "ENG", name: "Bahasa Inggris", code: "ENG-01" },
  { id: "FIS", name: "Fisika", code: "FIS-01" },
  { id: "KIM", name: "Kimia", code: "KIM-01" }
];

// Assignments teacherId_classId_subjectId
const assignmentsData = [
  { teacherId: "TCH003", classId: "10-A", subjectId: "MAT", academicYear: "2026/2027" }, // Budi teaches Math in 10-A
  { teacherId: "TCH003", classId: "10-A", subjectId: "ENG", academicYear: "2026/2027" }, // Budi teaches Eng in 10-A
  { teacherId: "TCH001", classId: "11-IPA", subjectId: "FIS", academicYear: "2026/2027" }, // Ahmad teaches Physics in 11-IPA
  { teacherId: "TCH001", classId: "10-A", subjectId: "FIS", academicYear: "2026/2027" }, // Ahmad teaches Physics in 10-A
  { teacherId: "TCH002", classId: "12-IPS", subjectId: "IND", academicYear: "2026/2027" }, // Siti teaches Indo in 12-IPS
  { teacherId: "TCH004", classId: "11-IPA", subjectId: "KIM", academicYear: "2026/2027" }, // Dewi teaches Chemistry in 11-IPA
  { teacherId: "TCH005", classId: "10-A", subjectId: "IND", academicYear: "2026/2027" }  // Eko teaches Indo in 10-A
];

const studentsData = [
  // Class 10-A (8 students)
  { id: "STD001", nisn: "0061234501", fullName: "Aditya Pratama", classId: "10-A", status: "Aktif" as const, gender: "L" as const },
  { id: "STD002", nisn: "0061234502", fullName: "Anisa Rahmawati", classId: "10-A", status: "Aktif" as const, gender: "P" as const },
  { id: "STD003", nisn: "0061234503", fullName: "Bagus Cahyono", classId: "10-A", status: "Aktif" as const, gender: "L" as const },
  { id: "STD004", nisn: "0061234504", fullName: "Citra Kirana", classId: "10-A", status: "Aktif" as const, gender: "P" as const },
  { id: "STD005", nisn: "0061234505", fullName: "Dimas Anggara", classId: "10-A", status: "Aktif" as const, gender: "L" as const },
  { id: "STD006", nisn: "0061234506", fullName: "Elsa Fitriani", classId: "10-A", status: "Aktif" as const, gender: "P" as const },
  { id: "STD007", nisn: "0061234507", fullName: "Fajar Nugraha", classId: "10-A", status: "Aktif" as const, gender: "L" as const },
  { id: "STD008", nisn: "0061234508", fullName: "Gita Lestari", classId: "10-A", status: "Aktif" as const, gender: "P" as const },

  // Class 11-IPA (6 students)
  { id: "STD009", nisn: "0051234501", fullName: "Hadi Syahputra", classId: "11-IPA", status: "Aktif" as const, gender: "L" as const },
  { id: "STD010", nisn: "0051234502", fullName: "Indah Permatasari", classId: "11-IPA", status: "Aktif" as const, gender: "P" as const },
  { id: "STD011", nisn: "0051234503", fullName: "Joko Susilo", classId: "11-IPA", status: "Aktif" as const, gender: "L" as const },
  { id: "STD012", nisn: "0051234504", fullName: "Kartika Putri", classId: "11-IPA", status: "Aktif" as const, gender: "P" as const },
  { id: "STD013", nisn: "0051234505", fullName: "Lukman Hakim", classId: "11-IPA", status: "Aktif" as const, gender: "L" as const },
  { id: "STD014", nisn: "0051234506", fullName: "Mega Utami", classId: "11-IPA", status: "Aktif" as const, gender: "P" as const },

  // Class 12-IPS (6 students)
  { id: "STD015", nisn: "0041234501", fullName: "Naufal Zaki", classId: "12-IPS", status: "Aktif" as const, gender: "L" as const },
  { id: "STD016", nisn: "0041234502", fullName: "Olivia Sandra", classId: "12-IPS", status: "Aktif" as const, gender: "P" as const },
  { id: "STD017", nisn: "0041234503", fullName: "Pandu Wijaya", classId: "12-IPS", status: "Aktif" as const, gender: "L" as const },
  { id: "STD018", nisn: "0041234504", fullName: "Qori Amelia", classId: "12-IPS", status: "Aktif" as const, gender: "P" as const },
  { id: "STD019", nisn: "0041234505", fullName: "Rian Hidayat", classId: "12-IPS", status: "Aktif" as const, gender: "L" as const },
  { id: "STD020", nisn: "0041234506", fullName: "Salsa Bila", classId: "12-IPS", status: "Aktif" as const, gender: "P" as const }
];

async function getOrCreateUser(email: string, pass: string): Promise<string> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    console.log(`Created Auth user: ${email} (${cred.user.uid})`);
    return cred.user.uid;
  } catch (error: any) {
    if (error.code === "auth/email-already-in-use") {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      console.log(`User already exists, signed in: ${email} (${cred.user.uid})`);
      return cred.user.uid;
    }
    throw error;
  }
}

async function runSeed() {
  try {
    console.log("Starting Seeding Process...");

    // 1. Create Admin Account and get UID
    console.log("Bootstrap Admin account...");
    const adminUid = await getOrCreateUser("admin@aljannah.sch.id", "admin123");
    
    // Create/Update Admin User Profile
    await setDoc(doc(db, "users", adminUid), {
      email: "admin@aljannah.sch.id",
      role: "admin",
      teacherId: null,
      displayName: "Admin Al-Jannah",
      createdAt: Timestamp.now()
    });
    console.log("Admin user profile written to Firestore.");

    // Sign out to clear session before proceeding, or keep signed in to write everything.
    // Since adminUid has 'admin' role in Firestore now, we are authorized to write everything!
    // We will keep signed in as admin to do all other writes.

    // 2. Create other accounts
    console.log("Creating Principal account...");
    const principalUid = await getOrCreateUser("principal@aljannah.sch.id", "principal123");
    
    console.log("Creating Teacher accounts in Auth...");
    const teacherUids: Record<string, string> = {};
    for (const teacher of teachersData) {
      const password = teacher.email.split("@")[0] === "walikelas1" ? "walikelas123" : `${teacher.email.split("@")[0]}123`;
      const uid = await getOrCreateUser(teacher.email, password);
      teacherUids[teacher.id] = uid;
    }

    // Sign back in as Admin to make sure we have permissions for other collections
    await signInWithEmailAndPassword(auth, "admin@aljannah.sch.id", "admin123");
    console.log("Re-signed in as admin to proceed with master data writes.");

    // 3. Write User Documents for Principal and Teachers
    await setDoc(doc(db, "users", principalUid), {
      email: "principal@aljannah.sch.id",
      role: "kepala_sekolah",
      teacherId: null,
      displayName: "Kepsek Al-Jannah",
      createdAt: Timestamp.now()
    });

    for (const teacher of teachersData) {
      const uid = teacherUids[teacher.id];
      await setDoc(doc(db, "users", uid), {
        email: teacher.email,
        role: teacher.role,
        teacherId: teacher.id,
        displayName: teacher.fullName,
        createdAt: Timestamp.now()
      });
    }
    console.log("Principal and Teacher User Profiles written to Firestore.");

    // 4. Batch write Teachers
    console.log("Seeding Teachers...");
    const batchTeachers = writeBatch(db);
    teachersData.forEach((t) => {
      batchTeachers.set(doc(db, "teachers", t.id), {
        nip: t.nip,
        fullName: t.fullName,
        email: t.email,
        status: t.status,
        createdAt: Timestamp.now()
      });
    });
    await batchTeachers.commit();

    // 5. Batch write Classes
    console.log("Seeding Classes...");
    const batchClasses = writeBatch(db);
    classesData.forEach((c) => {
      batchClasses.set(doc(db, "classes", c.id), {
        name: c.name,
        grade: c.grade,
        homeroomTeacherId: c.homeroomTeacherId,
        academicYear: c.academicYear,
        createdAt: Timestamp.now()
      });
    });
    await batchClasses.commit();

    // 6. Batch write Subjects
    console.log("Seeding Subjects...");
    const batchSubjects = writeBatch(db);
    subjectsData.forEach((s) => {
      batchSubjects.set(doc(db, "subjects", s.id), {
        name: s.name,
        code: s.code,
        createdAt: Timestamp.now()
      });
    });
    await batchSubjects.commit();

    // 7. Batch write Teaching Assignments
    console.log("Seeding Teaching Assignments...");
    const batchAssignments = writeBatch(db);
    assignmentsData.forEach((a) => {
      const docId = `${a.teacherId}_${a.classId}_${a.subjectId}`;
      batchAssignments.set(doc(db, "teachingAssignments", docId), a);
    });
    await batchAssignments.commit();

    // 8. Batch write Students (using multiple batches since there are 20 students)
    console.log("Seeding Students...");
    const batchStudents = writeBatch(db);
    studentsData.forEach((s) => {
      batchStudents.set(doc(db, "students", s.id), {
        nisn: s.nisn,
        fullName: s.fullName,
        classId: s.classId,
        status: s.status,
        gender: s.gender,
        createdAt: Timestamp.now()
      });
    });
    await batchStudents.commit();

    // 9. Seed some journals, attendance, and grade logs for Budi (TCH003) & Ahmad (TCH001)
    console.log("Seeding initial journals...");
    // Budi teaches Math in 10-A
    const j1Id = "JRN001";
    await setDoc(doc(db, "journals", j1Id), {
      teacherId: "TCH003",
      classId: "10-A",
      subjectId: "MAT",
      date: "2026-07-20",
      jamKe: [1, 2],
      materi: "Sistem Persamaan Linier Dua Variabel",
      kegiatanPembelajaran: "Diskusi kelompok memecahkan SPLDV dengan metode eliminasi.",
      mediaAlat: "Papan tulis, LKPD (Lembar Kerja Peserta Didik)",
      tugasPR: "Latihan soal hal 42 nomor 1-5",
      catatanRefleksi: "Sebagian besar siswa sudah mengerti, hanya 2 siswa butuh bimbingan tambahan.",
      academicYear: "2026/2027",
      semester: "Ganjil",
      createdAt: Timestamp.now()
    });

    // Seed attendance for 10-A SPLDV Math session (2026-07-20)
    console.log("Seeding initial attendance...");
    const batchAttendance = writeBatch(db);
    const dateStr = "2026-07-20";
    studentsData.filter(s => s.classId === "10-A").forEach((student) => {
      // Let's make Aditya Pratama (STD001) "Alpa", Anisa (STD002) "Sakit", and others "Hadir"
      let status: "Hadir" | "Sakit" | "Izin" | "Alpa" | "Terlambat" = "Hadir";
      let note = "";
      if (student.id === "STD001") {
        status = "Alpa";
        note = "Tanpa keterangan";
      } else if (student.id === "STD002") {
        status = "Sakit";
        note = "Surat sakit menyusul";
      } else if (student.id === "STD005") {
        status = "Terlambat";
        note = "Terlambat 10 menit";
      }

      const attId = `${student.id}_10-A_MAT_${dateStr}`;
      batchAttendance.set(doc(db, "attendance", attId), {
        studentId: student.id,
        classId: "10-A",
        subjectId: "MAT",
        date: dateStr,
        jamKe: [1, 2],
        status,
        note,
        teacherId: "TCH003",
        academicYear: "2026/2027",
        semester: "Ganjil",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    });
    await batchAttendance.commit();

    // Seed grades for 10-A Tugas 1
    console.log("Seeding initial grades...");
    const batchGrades = writeBatch(db);
    studentsData.filter(s => s.classId === "10-A").forEach((student) => {
      // Random score between 70 and 95, except Alpa student gets 0 or low
      let score = Math.floor(Math.random() * 25) + 70;
      if (student.id === "STD001") score = 50; // Aditya
      if (student.id === "STD002") score = 75; // Anisa

      const gradeId = `${student.id}_10-A_MAT_TUGAS1`;
      batchGrades.set(doc(db, "grades", gradeId), {
        studentId: student.id,
        classId: "10-A",
        subjectId: "MAT",
        assessmentType: "Tugas",
        assessmentName: "Tugas SPLDV 1",
        score,
        teacherId: "TCH003",
        academicYear: "2026/2027",
        semester: "Ganjil",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    });
    await batchGrades.commit();

    console.log("Signing out Admin...");
    await signOut(auth);

    console.log("SEEDING COMPLETED SUCCESSFULLY!");
    process.exit(0);
  } catch (error) {
    console.error("SEEDING FAILED WITH ERROR:", error);
    process.exit(1);
  }
}

runSeed();
