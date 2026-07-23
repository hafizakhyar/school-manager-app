# SMA Islam Alam & Sains Al-Jannah - School Manager

Sistem manajemen sekolah berbasis Next.js 14 (App Router) dan Firebase (Auth & Firestore) untuk mencatat **Jurnal Mengajar**, **Daftar Hadir (Absensi)**, dan **Daftar Nilai Siswa** Tahun Ajaran 2026/2027.

---

## Fitur Utama
1. **Otentikasi & Keamanan Multi-Role**: Pembagian hak akses otomatis untuk `admin`, `kepala_sekolah`, `guru`, dan `wali_kelas`.
2. **Jurnal Mengajar**: Pencatatan materi KBM, tugas, alat peraga, dan catatan refleksi guru, yang secara otomatis memandu pengisian absensi.
3. **Absensi Interaktif (Daftar Hadir)**: Pencatatan presensi siswa terintegrasi secara batch, rekapitulasi, grafik tren mingguan, dan alarm siswa dengan jumlah Alpa berlebih.
4. **Daftar Nilai**: Input nilai akademis secara batch per jenis penilaian (Tugas, Ulangan, PTS, PAS, dll.) serta kompilasi Leger Rapor Kelas secara otomatis di sisi klien.
5. **Master Data CRUD (Admin)**: Manajemen mandiri data Guru, Siswa (mendukung impor CSV), Kelas/Rombel, Mata Pelajaran, dan Penugasan Mengajar.

---

## Langkah Instalasi & Konfigurasi

### 1. Kloning dan Struktur Proyek
Aplikasi diinisialisasi dalam direktori workspace lokal Anda:
`C:\Users\XBOOK\.gemini\antigravity\scratch\school-manager-app`

### 2. Konfigurasi Proyek Firebase
1. Buka [Firebase Console](https://console.firebase.google.com/) dan buat proyek baru bernama `sma-aljannah-portal`.
2. Aktifkan **Authentication** dan aktifkan metode masuk **Email/Password**.
3. Buat database **Cloud Firestore** dalam mode produksi.
4. Buat aplikasi Web di dalam proyek Firebase Anda untuk mendapatkan konfigurasi SDK.

### 3. Konfigurasi Variabel Lingkungan (Environment Variables)
Salin konfigurasi Firebase Web App Anda ke dalam file `.env.local` di direktori akar proyek:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyA...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=sma-aljannah-portal.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sma-aljannah-portal
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=sma-aljannah-portal.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abc123xyz
```

### 4. Deploy Aturan Keamanan & Indeks Firestore
Salin konfigurasi file aturan dan indeks ke Firebase melalui CLI atau secara manual di konsol Firebase:
*   **Rules**: Terapkan isi file `firestore.rules` ke menu *Rules* di Firestore Console.
*   **Indexes**: Indeks komposit didefinisikan di `firestore.indexes.json`.

---

## Menjalankan Pengisian Data Contoh (Seeding)

Naskah seed otomatis `scripts/seed.ts` akan membuat data master contoh (3 Kelas, 5 Guru, 5 Mapel, 20 Siswa, serta draf riwayat KBM) beserta 7 akun login untuk demo.

Jalankan perintah berikut di terminal proyek:
```bash
# Pastikan Anda telah mengisi .env.local dengan kredensial Firebase asli
npx tsx scripts/seed.ts
```

### Akun Contoh Hasil Seeding (Password Default: `nama123` / tertera di bawah)
1.  **Admin**: `admin@aljannah.sch.id` (Sandi: `admin123`) - Hak akses CRUD data master.
2.  **Kepala Sekolah**: `principal@aljannah.sch.id` (Sandi: `principal123`) - Hak akses baca rekap dan laporan seluruh sekolah.
3.  **Guru / Wali Kelas**: `walikelas1@aljannah.sch.id` (Sandi: `walikelas123`, Guru: Budi Santoso) - Dapat menulis jurnal kelasnya, mengabsen, menginput nilai, serta melihat Leger Rapor Kelas 10-A.
4.  **Guru Bidang Studi**: `guru1@aljannah.sch.id` (Sandi: `guru123`, Guru: Ahmad Subarjo) - Mengajar Fisika di kelas 11-IPA dan 10-A.

---

## Menjalankan Aplikasi Secara Lokal

Jalankan server pengembangan lokal:
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) di peramban Anda untuk menguji aplikasi.

---

## Penyebaran (Deployment)

### Vercel (Rekomendasi Tercepat)
1. Pasang Vercel CLI: `npm install -g vercel`
2. Jalankan perintah `vercel` di direktori proyek.
3. Masukkan variabel lingkungan dari `.env.local` saat diminta di dashboard Vercel.

### Firebase Hosting
1. Inisialisasi Firebase: `npx firebase-tools init`
2. Pilih *Hosting* dan konfigurasikan direktori publik Next.js hasil build (`.next` atau `out`).
