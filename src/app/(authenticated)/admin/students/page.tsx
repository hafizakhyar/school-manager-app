'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

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

  // State Filter & Search
  const [search, setSearch] = useState('');
  const [filterKelas, setFilterKelas] = useState('ALL');
  const [filterGender, setFilterGender] = useState('ALL');
  const [selectedNis, setSelectedNis] = useState<string[]>([]);

  useEffect(() => {
    async function fetchSiswa() {
      try {
        setLoading(true);
        const querySnapshot = await getDocs(collection(db, 'students'));
        const fetchedData: Siswa[] = [];
        
        querySnapshot.forEach((doc) => {
          const raw = doc.data() as any;
          const keys = Object.keys(raw);

          // Pencarian otomatis nama kolom berdasarkan kecocokan teks (Case-insensitive)
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
    }

    fetchSiswa();
  }, []);

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

  // Daftar Kelas Unik untuk Dropdown Filter (Otomatis muncul dari data)
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Data Siswa</h1>
          <p className="text-sm text-slate-400">Kelola data master murid SMA Islam Alam & Sains Al-Jannah.</p>
        </div>
      </div>

      {/* Bar Filter */}
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
        <div className="flex items-center justify-between bg-indigo-950/80 border border-indigo-500/50 p-3 rounded-xl">
          <span className="text-sm text-indigo-200 font-medium">
            {selectedNis.length} Siswa Terpilih
          </span>
          <button
            onClick={() => setSelectedNis([])}
            className="text-xs text-slate-300 hover:text-white underline"
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