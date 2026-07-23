'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { UserPlus, Upload } from 'lucide-react';

interface Siswa {
  id?: string;
  nis: string;
  nama: string;
  kelas: string;
  jenis_kelamin: string;
}

export default function AdminSiswaPage() {
  const [dataSiswa, setDataSiswa] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State Filter & Search
  const [search, setSearch] = useState('');
  const [filterKelas, setFilterKelas] = useState('ALL');
  const [filterGender, setFilterGender] = useState('ALL');
  const [selectedNis, setSelectedNis] = useState<string[]>([]);

  const fetchSiswa = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'students'));
      const fetchedData: Siswa[] = [];
      
      querySnapshot.forEach((doc) => {
        const raw = doc.data() as any;
        const keys = Object.keys(raw);

        const nisKey = keys.find(k => k.toLowerCase().includes('nis'));
        const nameKey = keys.find(k => k.toLowerCase().includes('nama') || k.toLowerCase().includes('name'));
        const kelasKey = keys.find(k => k.toLowerCase().includes('kelas') || k.toLowerCase().includes('class') || k.toLowerCase().includes('rombel'));
        const genderKey = keys.find(k => k.toLowerCase().includes('gender') || k.toLowerCase().includes('kelamin') || k.toLowerCase().includes('jk'));

        const nisVal = nisKey ? raw[nisKey] : '';
        const namaVal = nameKey ? raw[nameKey] : '';
        const kelasVal = kelasKey ? raw[kelasKey] : '';
        const genderVal = genderKey ? raw[genderKey] : 'P';

        fetchedData.push({
          id: doc.id,
          nis: String(nisVal || '-'),
          nama: String(namaVal || '-'),
          kelas: String(kelasVal || '-'),
          jenis_kelamin: String(genderVal),
        });
      });
      
      setDataSiswa(fetchedData);
    } catch (error) {
      console.error("Gagal mengambil data siswa:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSiswa();
  }, []);

  // Fungsi Handler Upload & Parse CSV
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(l => l.trim() !== '');
        if (lines.length <= 1) {
          alert("File CSV kosong atau format tidak valid.");
          return;
        }

        // Ambil header kolom baris pertama (misal: nis,nama,kelas,jenis_kelamin)
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        let count = 0;
        setLoading(true);

        for (let i = 1; i < lines.length; i++) {
          const currentLine = lines[i].split(',').map(val => val.trim());
          if (currentLine.length < headers.length) continue;

          const rowData: any = {};
          headers.forEach((header, index) => {
            rowData[header] = currentLine[index];
          });

          const nisVal = rowData.nis || rowData.nisn || rowData.ID || '';
          const namaVal = rowData.nama || rowData.name || rowData.nama_lengkap || '';
          const kelasVal = rowData.kelas || rowData.class || '';
          const genderVal = rowData.jenis_kelamin || rowData.gender || rowData.jk || 'P';

          if (nisVal) {
            await addDoc(collection(db, 'students'), {
              nis: nisVal,
              nama: namaVal,
              kelas: kelasVal,
              jenis_kelamin: genderVal
            });
            count++;
          }
        }

        alert(`Berhasil mengimpor ${count} data siswa baru!`);
        fetchSiswa(); // Refresh tabel otomatis
      } catch (err) {
        console.error("Gagal memproses CSV:", err);
        alert("Terjadi kesalahan saat membaca file CSV.");
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Logika Filtering Data
  const filteredData = useMemo(() => {
    if (!Array.isArray(dataSiswa)) return [];
    return dataSiswa.filter((s) => {
      const matchSearch =
        s.nama.toLowerCase().includes(search.toLowerCase()) ||
        s.nis.includes(search);
      const matchKelas = filterKelas === 'ALL' || s.kelas === filterKelas;
      const matchGender = filterGender === 'ALL' || s.jenis_kelamin === filterGender;

      return matchSearch && matchKelas && matchGender;
    });
  }, [dataSiswa, search, filterKelas, filterGender]);

  // Daftar Kelas Unik untuk Dropdown Filter
  const listKelas = useMemo(() => {
    if (!Array.isArray(dataSiswa)) return [];
    return Array.from(new Set(dataSiswa.map((s) => s.kelas))).filter(k => k && k !== '-').sort();
  }, [dataSiswa]);

  // Checkbox Select All
  const isAllSelected =
    filteredData.length > 0 &&
    filteredData.every((s) => selectedNis.includes(s.nis));

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedNis([]);
    } else {
      setSelectedNis(filteredData.map((s) => s.nis));
    }
  };

  const handleSelectOne = (nis: string) => {
    if (selectedNis.includes(nis)) {
      setSelectedNis(selectedNis.filter((id) => id !== nis));
    } else {
      setSelectedNis([...selectedNis, nis]);
    }
  };

  return (
    <div className="p-6 space-y-6 text-slate-100">
      {/* Hidden File Input untuk CSV */}
      <input
        type="file"
        accept=".csv"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Header dengan Tombol Tambah & CSV */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Data Siswa</h1>
          <p className="text-sm text-slate-400">Kelola data master murid SMA Islam Alam & Sains Al-Jannah.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => alert("Fitur Tambah Siswa Satuan")}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium flex items-center gap-2 transition shadow-lg shadow-indigo-600/20"
          >
            <UserPlus className="w-4 h-4" />
            Tambah Siswa
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-sm font-medium flex items-center gap-2 transition cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            + CSV
          </button>
        </div>
      </div>

      {/* Bar Filter & Pencarian */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <input
          type="text"
          placeholder="Cari nama atau NIS..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
        />

        <select
          value={filterKelas}
          onChange={(e) => setFilterKelas(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
        >
          <option value="ALL">Semua Kelas</option>
          {listKelas.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>

        <select
          value={filterGender}
          onChange={(e) => setFilterGender(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
        >
          <option value="ALL">Semua Gender</option>
          <option value="L">Laki-laki</option>
          <option value="P">Perempuan</option>
        </select>
      </div>

      {/* Action Bar saat Centang Dipilih */}
      {selectedNis.length > 0 && (
        <div className="flex items-center justify-between bg-indigo-950/80 border border-indigo-500/50 p-3 rounded-xl backdrop-blur-md">
          <div className="text-sm font-medium text-indigo-200 flex items-center gap-2">
            <span className="bg-indigo-600 px-2 py-0.5 rounded-full text-xs font-bold text-white">
              {selectedNis.length}
            </span>
            <span>Siswa Terpilih</span>
          </div>
          <button
            onClick={() => setSelectedNis([])}
            className="text-xs text-slate-300 hover:text-white underline px-2 py-1"
          >
            Batal
          </button>
        </div>
      )}

      {/* Tabel Data */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase border-b border-slate-800">
            <tr>
              <th className="p-4 w-10 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </th>
              <th className="p-4">NIS</th>
              <th className="p-4">NAMA LENGKAP</th>
              <th className="p-4">KELAS</th>
              <th className="p-4">GENDER</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  Memuat data siswa...
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  Tidak ada data siswa.
                </td>
              </tr>
            ) : (
              filteredData.map((siswa, idx) => {
                const isSelected = selectedNis.includes(siswa.nis);
                return (
                  <tr
                    key={siswa.nis || idx}
                    className={`hover:bg-slate-900/40 transition ${
                      isSelected ? 'bg-indigo-950/20' : ''
                    }`}
                  >
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectOne(siswa.nis)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                    <td className="p-4 font-mono text-slate-400">{siswa.nis}</td>
                    <td className="p-4 font-bold text-slate-100">{siswa.nama}</td>
                    <td className="p-4">{siswa.kelas}</td>
                    <td className="p-4">
                      {siswa.jenis_kelamin === 'L' || siswa.jenis_kelamin.toLowerCase() === 'laki-laki' ? 'Laki-laki' : 'Perempuan'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}