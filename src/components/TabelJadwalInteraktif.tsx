import React, { useState } from 'react';
import {
  Advokat,
  formatTanggalIndonesia,
  HARI_URUTAN,
  HariKerja,
   hitungTanggalDariHari,
  ItemDisposisi,
  KategoriAgenda,
  KonflikJadwal,
  pilihAdvokatOtomatis,
  TingkatPrioritas,
} from '../data/dispositionEngine';
import {
  AlertTriangle,
  CheckCircle2,
  Plus,
  Search,
  Trash2,
  UserCheck,
  ArrowRightLeft,
} from 'lucide-react';

interface TabelJadwalInteraktifProps {
  items: ItemDisposisi[];
  advokatList: Advokat[];
  mondayISO: string;
  konflikList: KonflikJadwal[];
  onUpdateItem: (updated: ItemDisposisi) => void;
  onDeleteItem: (id: string) => void;
  onAddItem: (newItem: ItemDisposisi) => void;
  onAutoReassignConflict: (itemId: string) => void;
}

const KATEGORI_LIST: KategoriAgenda[] = [
  'Sidang Pengadilan',
  'Pendampingan BAP / Penyidikan',
  'Mediasi & Negosiasi',
  'Rapat Kreditur / PKPU',
  'Konsultasi & Legal Drafting',
];

export const TabelJadwalInteraktif: React.FC<TabelJadwalInteraktifProps> = ({
  items,
  advokatList,
  mondayISO,
  konflikList,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  onAutoReassignConflict,
}) => {
  const [filterHari, setFilterHari] = useState<string>('Semua');
  const [filterAdvokat, setFilterAdvokat] = useState<string>('Semua');
  const [kataKunci, setKataKunci] = useState<string>('');
  const [showFormTambah, setShowFormTambah] = useState<boolean>(false);

  // State form tambah agenda manual
  const [hariBaru, setHariBaru] = useState<HariKerja>('Senin');
  const [mulaiBaru, setMulaiBaru] = useState<string>('09:00');
  const [selesaiBaru, setSelesaiBaru] = useState<string>('11:00');
  const [lokasiBaru, setLokasiBaru] = useState<string>('PN Jakarta Selatan');
  const [kategoriBaru, setKategoriBaru] = useState<KategoriAgenda>('Sidang Pengadilan');
  const [perkaraBaru, setPerkaraBaru] = useState<string>('');
  const [noPerkaraBaru, setNoPerkaraBaru] = useState<string>('');
  const [advokatIdBaru, setAdvokatIdBaru] = useState<string>('auto');
  const [prioritasBaru, setPrioritasBaru] = useState<TingkatPrioritas>('Normal');
  const [instruksiBaru, setInstruksiBaru] = useState<string>(
    'Siapkan berkas persidangan lengkap & laporkan hasil pelaksanaan.'
  );

  const handleTambahManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!perkaraBaru.trim()) return;

    const chosenAdvId =
      advokatIdBaru === 'auto'
        ? pilihAdvokatOtomatis(
            `${lokasiBaru} ${perkaraBaru}`,
            kategoriBaru,
            hariBaru,
            mulaiBaru,
            advokatList,
            items
          )
        : advokatIdBaru;

    const itemBaru: ItemDisposisi = {
      id: `disp-manual-${Date.now().toString(36)}`,
      hari: hariBaru,
      tanggalISO: hitungTanggalDariHari(mondayISO, hariBaru),
      waktuMulai: mulaiBaru,
      waktuSelesai: selesaiBaru,
      lokasi: lokasiBaru.trim() || 'Kantor Ryan Gumay Law Firm',
      kategori: kategoriBaru,
      perkara: perkaraBaru.trim(),
      nomorPerkara: noPerkaraBaru.trim() || '-',
      advokatId: chosenAdvId,
      prioritas: prioritasBaru,
      instruksiKhusus: instruksiBaru.trim() || 'Laksanakan sesuai SOP kantor.',
      statusKonfirmasi: 'Siap Jalan',
      assignedAutomatically: advokatIdBaru === 'auto',
    };

    onAddItem(itemBaru);
    setPerkaraBaru('');
    setNoPerkaraBaru('');
    setShowFormTambah(false);
  };

  const filtered = items.filter((item) => {
    if (filterHari !== 'Semua' && item.hari !== filterHari) return false;
    if (
      filterAdvokat !== 'Semua' &&
      item.advokatId !== filterAdvokat &&
      item.advokatPendampingId !== filterAdvokat
    ) {
      return false;
    }
    if (kataKunci.trim() !== '') {
      const q = kataKunci.toLowerCase();
      const matchPerkara = item.perkara.toLowerCase().includes(q);
      const matchLokasi = item.lokasi.toLowerCase().includes(q);
      const matchNo = item.nomorPerkara.toLowerCase().includes(q);
      const matchInstruksi = item.instruksiKhusus.toLowerCase().includes(q);
      return matchPerkara || matchLokasi || matchNo || matchInstruksi;
    }
    return true;
  });

  const getAdvokat = (id: string) => advokatList.find((a) => a.id === id);

  return (
    <div className="space-y-6">
      {/* Alert Konflik Jadwal jika ditemukan */}
      {konflikList.length > 0 ? (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-900">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700" />
              <h3 className="text-xs font-bold">
                Terdeteksi {konflikList.length} Potensi Bentrok Penugasan Advokat
              </h3>
            </div>
            <span className="text-xs text-amber-800">
              Gunakan tombol alihkan otomatis di bawah untuk menyeimbangkan jadwal
            </span>
          </div>
          <div className="divide-y divide-amber-200/70 text-xs">
            {konflikList.map((k, i) => {
              const adv = getAdvokat(k.advokatId);
              return (
                <div
                  key={`${k.itemId}-${k.rekanItemId}-${i}`}
                  className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="text-amber-950">
                    <span className="font-semibold">{adv?.nama}:</span> {k.pesan}
                  </div>
                  <button
                    type="button"
                    onClick={() => onAutoReassignConflict(k.rekanItemId)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-950 bg-white border border-amber-400 rounded-md hover:bg-amber-100 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Alihkan ke Advokat Cadangan</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-amber-50/70 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              <strong className="font-semibold text-slate-950">Status Jadwal Aman:</strong> Tidak
              ada bentrok jam persidangan maupun perpindahan pengadilan antar advokat minggu ini.
            </span>
          </div>
          <span className="text-xs font-mono-tabular text-amber-900 font-medium">
            {items.length} Agenda Terverifikasi
          </span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white border border-amber-200 rounded-lg p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Segmented Day Filter */}
          <div className="flex items-center gap-1 p-1 bg-amber-100/80 border border-amber-200 rounded-lg overflow-x-auto">
            {['Semua', ...HARI_URUTAN].map((h) => {
              const count =
                h === 'Semua' ? items.length : items.filter((i) => i.hari === h).length;
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => setFilterHari(h)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    filterHari === h
                      ? 'bg-yellow-400 text-slate-950 shadow-2xs'
                      : 'text-slate-700 hover:text-slate-950'
                  }`}
                >
                  {h}{' '}
                  <span
                    className={`font-mono-tabular ml-0.5 ${
                      filterHari === h ? 'text-slate-900' : 'text-amber-800/80'
                    }`}
                  >
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-amber-700 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={kataKunci}
                onChange={(e) => setKataKunci(e.target.value)}
                placeholder="Cari perkara, pengadilan, nomor..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>

            {/* Filter Advokat */}
            <select
              value={filterAdvokat}
              onChange={(e) => setFilterAdvokat(e.target.value)}
              aria-label="Filter berdasarkan Advokat"
              className="text-xs font-semibold bg-amber-50 border border-amber-300 rounded-lg px-3 py-1.5 text-slate-950 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value="Semua">Semua Advokat</option>
              {advokatList.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.panggilan} — {a.nama}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowFormTambah(!showFormTambah)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-yellow-400 border border-yellow-500 rounded-lg hover:bg-yellow-500 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showFormTambah ? 'Tutup Form' : 'Tambah Agenda'}</span>
            </button>
          </div>
        </div>

        {/* Form Tambah Baris Manual */}
        {showFormTambah && (
          <form
            onSubmit={handleTambahManual}
            className="pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-3"
          >
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Hari Kerja</label>
              <select
                value={hariBaru}
                onChange={(e) => setHariBaru(e.target.value as HariKerja)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
              >
                {HARI_URUTAN.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Jam Mulai</label>
              <input
                type="time"
                value={mulaiBaru}
                onChange={(e) => setMulaiBaru(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-mono-tabular border border-slate-300 rounded-md"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Jam Selesai</label>
              <input
                type="time"
                value={selesaiBaru}
                onChange={(e) => setSelesaiBaru(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-mono-tabular border border-slate-300 rounded-md"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Lokasi Pengadilan / Instansi
              </label>
              <input
                type="text"
                required
                value={lokasiBaru}
                onChange={(e) => setLokasiBaru(e.target.value)}
                placeholder="Contoh: PN Jakarta Selatan"
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Kategori Agenda
              </label>
              <select
                value={kategoriBaru}
                onChange={(e) => setKategoriBaru(e.target.value as KategoriAgenda)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
              >
                {KATEGORI_LIST.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-5">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nama Perkara & Agenda Sidang
              </label>
              <input
                type="text"
                required
                value={perkaraBaru}
                onChange={(e) => setPerkaraBaru(e.target.value)}
                placeholder="Contoh: Sidang Replik Gugatan Perdata PT Nusantara"
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nomor Register Perkara (Opsional)
              </label>
              <input
                type="text"
                value={noPerkaraBaru}
                onChange={(e) => setNoPerkaraBaru(e.target.value)}
                placeholder="Contoh: 142/Pdt.G/2026/PN JKT.SEL"
                className="w-full px-2.5 py-1.5 text-xs font-mono-tabular border border-slate-300 rounded-md"
              />
            </div>
            <div className="md:col-span-4">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Advokat Penanggung Jawab (PIC)
              </label>
              <select
                value={advokatIdBaru}
                onChange={(e) => setAdvokatIdBaru(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
              >
                <option value="auto">Otomatis (Sesuai Spesialisasi & Beban Terendah)</option>
                {advokatList
                  .filter((a) => a.aktif)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nama} ({a.spesialisasi[0]})
                    </option>
                  ))}
              </select>
            </div>

            <div className="md:col-span-8">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Instruksi Disposisi Kepala Kantor
              </label>
              <input
                type="text"
                value={instruksiBaru}
                onChange={(e) => setInstruksiBaru(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Prioritas</label>
              <select
                value={prioritasBaru}
                onChange={(e) => setPrioritasBaru(e.target.value as TingkatPrioritas)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
              >
                <option value="Normal">Normal</option>
                <option value="Tinggi">Prioritas Tinggi</option>
              </select>
            </div>
            <div className="md:col-span-2 flex items-end">
              <button
                type="submit"
                className="w-full py-1.5 px-3 text-xs font-bold text-slate-950 bg-yellow-400 border border-yellow-500 rounded-md hover:bg-yellow-500 transition-colors"
              >
                Simpan ke Jadwal
              </button>
            </div>
          </form>
        )}
      </div>

      {/* High-Density Data Grid */}
      <div className="bg-white border border-amber-200 rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-slate-800">
              Tidak ada jadwal penugasan yang cocok dengan filter
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Ubah filter pencarian di atas atau tambahkan agenda baru.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-amber-50 border-b border-amber-200 text-xs font-bold text-amber-950">
                  <th className="py-3 px-4 w-36">Hari & Jam</th>
                  <th className="py-3 px-4 w-48">Lokasi Pengadilan</th>
                  <th className="py-3 px-4">Perkara & Nomor Register</th>
                  <th className="py-3 px-4 w-56">Advokat Bertugas (PIC)</th>
                  <th className="py-3 px-4 w-64">Instruksi Disposisi</th>
                  <th className="py-3 px-4 w-28 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100 text-xs">
                {filtered.map((item) => {
                  const adaKonflik = konflikList.some(
                    (k) => k.itemId === item.id || k.rekanItemId === item.id
                  );

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-amber-50/50 transition-colors align-top ${
                        adaKonflik ? 'bg-amber-100/50' : ''
                      }`}
                    >
                      {/* Kolom 1: Hari & Jam */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <select
                            value={item.hari}
                            aria-label="Ubah Hari"
                            onChange={(e) => {
                              const h = e.target.value as HariKerja;
                              onUpdateItem({
                                ...item,
                                hari: h,
                                tanggalISO: hitungTanggalDariHari(mondayISO, h),
                              });
                            }}
                            className="font-semibold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-900 focus:outline-none py-0.5"
                          >
                            {HARI_URUTAN.map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="text-slate-500 font-mono-tabular mt-0.5">
                          {formatTanggalIndonesia(item.tanggalISO)}
                        </div>
                        <div className="font-mono-tabular text-slate-800 font-medium mt-1 flex items-center gap-1">
                          <input
                            type="time"
                            value={item.waktuMulai}
                            onChange={(e) =>
                              onUpdateItem({ ...item, waktuMulai: e.target.value })
                            }
                            className="bg-slate-100 rounded px-1 py-0.5 text-xs w-16"
                          />
                          <span>–</span>
                          <input
                            type="time"
                            value={item.waktuSelesai}
                            onChange={(e) =>
                              onUpdateItem({ ...item, waktuSelesai: e.target.value })
                            }
                            className="bg-slate-100 rounded px-1 py-0.5 text-xs w-16"
                          />
                        </div>
                      </td>

                      {/* Kolom 2: Lokasi & Kategori */}
                      <td className="py-3.5 px-4">
                        <input
                          type="text"
                          value={item.lokasi}
                          onChange={(e) => onUpdateItem({ ...item, lokasi: e.target.value })}
                          className="w-full font-semibold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-900 focus:outline-none pb-0.5"
                        />
                        <div className="text-slate-500 mt-1">{item.kategori}</div>
                      </td>

                      {/* Kolom 3: Perkara & Prioritas */}
                      <td className="py-3.5 px-4">
                        <input
                          type="text"
                          value={item.perkara}
                          onChange={(e) => onUpdateItem({ ...item, perkara: e.target.value })}
                          className="w-full font-semibold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-900 focus:outline-none pb-0.5"
                        />
                        <div className="flex flex-wrap items-center gap-2 text-slate-500 mt-1">
                          <span className="font-mono-tabular">
                            No: {item.nomorPerkara !== '-' ? item.nomorPerkara : 'Belum dicantumkan'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateItem({
                                ...item,
                                prioritas: item.prioritas === 'Tinggi' ? 'Normal' : 'Tinggi',
                              })
                            }
                            className={`font-medium hover:underline ${
                              item.prioritas === 'Tinggi' ? 'text-amber-800 font-semibold' : 'text-slate-600'
                            }`}
                          >
                            {item.prioritas === 'Tinggi' ? 'Prioritas Tinggi' : 'Prioritas Normal'}
                          </button>
                        </div>
                      </td>

                      {/* Kolom 4: Advokat PIC & Pendamping */}
                      <td className="py-3.5 px-4 space-y-1.5">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                            Advokat Utama (PIC):
                          </label>
                          <select
                            value={item.advokatId}
                            aria-label="Pilih Advokat PIC"
                            onChange={(e) =>
                              onUpdateItem({
                                ...item,
                                advokatId: e.target.value,
                                assignedAutomatically: false,
                              })
                            }
                            className="w-full font-semibold text-slate-950 bg-amber-50/70 border border-amber-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                          >
                            {advokatList.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.nama} ({a.jabatan})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                            Advokat Pendamping:
                          </label>
                          <select
                            value={item.advokatPendampingId || ''}
                            aria-label="Pilih Advokat Pendamping"
                            onChange={(e) =>
                              onUpdateItem({
                                ...item,
                                advokatPendampingId: e.target.value || undefined,
                              })
                            }
                            className="w-full text-slate-800 bg-white border border-amber-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                          >
                            <option value="">-- Tanpa Pendamping --</option>
                            {advokatList
                              .filter((a) => a.id !== item.advokatId)
                              .map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.nama} ({a.jabatan})
                                </option>
                              ))}
                          </select>
                        </div>

                        <div className="flex items-center justify-between text-slate-500 pt-0.5">
                          {item.assignedAutomatically ? (
                            <span className="inline-flex items-center gap-1 text-emerald-800 font-medium">
                              <UserCheck className="w-3 h-3" />
                              Dipilih Otomatis
                            </span>
                          ) : (
                            <span>Penunjukan Langsung</span>
                          )}
                        </div>
                      </td>

                      {/* Kolom 5: Instruksi Disposisi */}
                      <td className="py-3.5 px-4">
                        <textarea
                          rows={2}
                          value={item.instruksiKhusus}
                          onChange={(e) =>
                            onUpdateItem({ ...item, instruksiKhusus: e.target.value })
                          }
                          className="w-full text-slate-700 bg-transparent border border-transparent hover:border-slate-300 focus:border-slate-900 focus:bg-white rounded p-1 focus:outline-none leading-relaxed resize-none"
                        />
                      </td>

                      {/* Kolom 6: Tindakan */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onDeleteItem(item.id)}
                          title="Hapus baris penugasan"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
