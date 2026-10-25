import React, { useState } from 'react';
import {
  Advokat,
  apakahAdvokatTerlibat,
  DAFTAR_JABATAN,
  ItemDisposisi,
  JabatanAdvokat,
} from '../data/dispositionEngine';
import {
  UserPlus,
  Trash2,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Pencil,
  Save,
  X,
  Phone,
  Plus,
} from 'lucide-react';

interface ManajemenTimAdvokatProps {
  advokatList: Advokat[];
  items: ItemDisposisi[];
  onAddAdvokat: (adv: Advokat) => void;
  onUpdateAdvokat: (adv: Advokat) => void;
  onDeleteAdvokat: (id: string) => void;
  onCopyWhatsAppPerAdvokat: (advId: string) => void;
  copiedKey: string | null;
}

const PRESET_SPESIALISASI = [
  'Litigasi Perdata',
  'Pidana Khusus & Tipikor',
  'Pendampingan BAP',
  'Sengketa Komersial',
  'Kepailitan & PKPU',
  'Hukum Korporasi & Kontrak',
  'Sengketa TUN (PTUN)',
  'Hukum Ketenagakerjaan (PHI)',
  'Hukum Keluarga & Waris',
  'Mediasi & Negosiasi',
  'Legal Drafting & Riset',
];

export const ManajemenTimAdvokat: React.FC<ManajemenTimAdvokatProps> = ({
  advokatList,
  items,
  onAddAdvokat,
  onUpdateAdvokat,
  onDeleteAdvokat,
  onCopyWhatsAppPerAdvokat,
  copiedKey,
}) => {
  // State Form Tambah Advokat Baru
  const [showAddForm, setShowAddForm] = useState(false);
  const [nama, setNama] = useState('');
  const [panggilan, setPanggilan] = useState('');
  const [jabatan, setJabatan] = useState<JabatanAdvokat>('Advokat');
  const [spesialisasiStr, setSpesialisasiStr] = useState(
    'Litigasi Perdata, Sengketa Komersial'
  );
  const [kuota, setKuota] = useState(6);
  const [nomorInduk, setNomorInduk] = useState('RGLF-ADV-011');
  const [telepon, setTelepon] = useState('0812-7800-011');

  // State Edit Advokat yang Sedang Aktif
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNama, setEditNama] = useState('');
  const [editPanggilan, setEditPanggilan] = useState('');
  const [editJabatan, setEditJabatan] = useState<JabatanAdvokat>('Advokat');
  const [editTelepon, setEditTelepon] = useState('');
  const [editNomorInduk, setEditNomorInduk] = useState('');
  const [editSpesialisasiStr, setEditSpesialisasiStr] = useState('');
  const [editKuota, setEditKuota] = useState(6);
  const [editAktif, setEditAktif] = useState(true);

  const mulaiEdit = (adv: Advokat) => {
    setEditingId(adv.id);
    setEditNama(adv.nama);
    setEditPanggilan(adv.panggilan);
    setEditJabatan(adv.jabatan);
    setEditTelepon(adv.telepon);
    setEditNomorInduk(adv.nomorInduk);
    setEditSpesialisasiStr(adv.spesialisasi.join(', '));
    setEditKuota(adv.kuotaMingguan);
    setEditAktif(adv.aktif);
  };

  const batalEdit = () => {
    setEditingId(null);
  };

  const simpanEdit = (id: string) => {
    if (!editNama.trim() || !editPanggilan.trim()) return;
    const specs = editSpesialisasiStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    onUpdateAdvokat({
      id,
      nama: editNama.trim(),
      panggilan: editPanggilan.trim(),
      jabatan: editJabatan,
      telepon: editTelepon.trim() || '-',
      nomorInduk: editNomorInduk.trim() || '-',
      spesialisasi: specs.length > 0 ? specs : ['Litigasi Umum'],
      kuotaMingguan: Math.max(1, Number(editKuota) || 6),
      aktif: editAktif,
    });
    setEditingId(null);
  };

  const togglePresetPadaEdit = (bidang: string) => {
    const current = editSpesialisasiStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const exists = current.some((c) => c.toLowerCase() === bidang.toLowerCase());
    const next = exists
      ? current.filter((c) => c.toLowerCase() !== bidang.toLowerCase())
      : [...current, bidang];
    setEditSpesialisasiStr(next.join(', '));
  };

  const handleTambah = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !panggilan.trim()) return;

    const specs = spesialisasiStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const baru: Advokat = {
      id: `adv-${Date.now().toString(36)}`,
      nama: nama.trim(),
      panggilan: panggilan.trim(),
      jabatan,
      spesialisasi: specs.length > 0 ? specs : ['Litigasi Umum'],
      kuotaMingguan: Math.max(1, Number(kuota) || 6),
      nomorInduk: nomorInduk.trim() || 'RGLF-ADV',
      telepon: telepon.trim() || '-',
      aktif: true,
    };

    onAddAdvokat(baru);
    setNama('');
    setPanggilan('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Form Tambah Advokat Baru */}
      <div className="bg-white border border-amber-200 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-950">
              Manajemen Data Personel, Nomor WhatsApp & Spesialisasi Advokat
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Klik tombol <strong>Edit Data</strong> pada baris personel untuk mengubah nama,
              jabatan, nomor WhatsApp (WA), nomor induk, bidang spesialisasi, maupun kuota mingguan.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-mono-tabular text-amber-900 font-medium">
              {advokatList.filter((a) => a.aktif).length} Aktif / {advokatList.length} Personel
            </span>
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-1.5 py-2 px-3.5 text-xs font-bold text-slate-950 bg-yellow-400 border border-yellow-500 rounded-lg hover:bg-yellow-500 transition-colors whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'Tutup Form Tambah' : 'Tambah Personel Baru'}</span>
            </button>
          </div>
        </div>

        {showAddForm && (
          <form
            onSubmit={handleTambah}
            className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-3"
          >
            <div className="md:col-span-4">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nama Lengkap & Gelar
              </label>
              <input
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Reza Mahendra, S.H., M.H."
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nama Panggilan (Kata Kunci)
              </label>
              <input
                type="text"
                required
                value={panggilan}
                onChange={(e) => setPanggilan(e.target.value)}
                placeholder="Contoh: Reza"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Jabatan</label>
              <select
                value={jabatan}
                onChange={(e) => setJabatan(e.target.value as JabatanAdvokat)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
              >
                {DAFTAR_JABATAN.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nomor WhatsApp (WA)
              </label>
              <input
                type="text"
                value={telepon}
                onChange={(e) => setTelepon(e.target.value)}
                placeholder="Contoh: 0812-7800-011"
                className="w-full px-3 py-1.5 text-xs font-mono-tabular border border-slate-300 rounded-md"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nomor Induk / ID
              </label>
              <input
                type="text"
                value={nomorInduk}
                onChange={(e) => setNomorInduk(e.target.value)}
                placeholder="Contoh: RGLF-ADV-011"
                className="w-full px-3 py-1.5 text-xs font-mono-tabular border border-slate-300 rounded-md"
              />
            </div>

            <div className="md:col-span-8">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Bidang Spesialisasi (Pisahkan dengan Koma)
              </label>
              <input
                type="text"
                value={spesialisasiStr}
                onChange={(e) => setSpesialisasiStr(e.target.value)}
                placeholder="Contoh: Litigasi Perdata, Pidana Khusus & Tipikor, Pendampingan BAP"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Kuota Mingguan
              </label>
              <input
                type="number"
                min={1}
                max={25}
                value={kuota}
                onChange={(e) => setKuota(parseInt(e.target.value, 10) || 6)}
                className="w-full px-3 py-1.5 text-xs font-mono-tabular border border-slate-300 rounded-md"
              />
            </div>
            <div className="md:col-span-2 flex items-end">
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-bold text-slate-950 bg-yellow-400 border border-yellow-500 rounded-md hover:bg-yellow-500 transition-colors whitespace-nowrap"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Personel</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Tabel Roster Tim Advokat dengan Mode Edit Lengkap */}
      <div className="bg-white border border-amber-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-amber-50 border-b border-amber-200 text-xs font-bold text-amber-950">
                <th className="py-3 px-4">Nama Lengkap, Jabatan & Kata Kunci</th>
                <th className="py-3 px-4 w-48">Nomor WhatsApp & ID</th>
                <th className="py-3 px-4">Bidang Spesialisasi Hukum</th>
                <th className="py-3 px-4 text-right w-36">Beban / Kuota</th>
                <th className="py-3 px-4 w-36">Status</th>
                <th className="py-3 px-4 text-right w-56">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-100 text-xs">
              {advokatList.map((adv) => {
                const beban = items.filter((i) => apakahAdvokatTerlibat(i, adv.id)).length;
                const persentase = Math.min(100, Math.round((beban / adv.kuotaMingguan) * 100));
                const sedangDiedit = editingId === adv.id;

                if (sedangDiedit) {
                  return (
                    <tr key={adv.id} className="bg-amber-50/70">
                      <td colSpan={6} className="p-5">
                        <div className="bg-white border border-amber-300 rounded-lg p-4 space-y-4">
                          <div className="flex items-center justify-between border-b border-amber-100 pb-2.5">
                            <h3 className="text-xs font-bold text-slate-950">
                              Edit Data Advokat: {adv.nama}
                            </h3>
                            <button
                              type="button"
                              onClick={batalEdit}
                              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Tutup</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                            <div className="md:col-span-4">
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Nama Lengkap & Gelar
                              </label>
                              <input
                                type="text"
                                value={editNama}
                                onChange={(e) => setEditNama(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Nama Panggilan (Kata Kunci)
                              </label>
                              <input
                                type="text"
                                value={editPanggilan}
                                onChange={(e) => setEditPanggilan(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs font-mono-tabular border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Jabatan
                              </label>
                              <select
                                value={editJabatan}
                                onChange={(e) => setEditJabatan(e.target.value as JabatanAdvokat)}
                                className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
                              >
                                {DAFTAR_JABATAN.map((j) => (
                                  <option key={j} value={j}>
                                    {j}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Nomor WhatsApp (WA)
                              </label>
                              <input
                                type="text"
                                value={editTelepon}
                                onChange={(e) => setEditTelepon(e.target.value)}
                                placeholder="0812-xxxx-xxxx"
                                className="w-full px-3 py-1.5 text-xs font-mono-tabular border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Nomor Induk / ID Kantor
                              </label>
                              <input
                                type="text"
                                value={editNomorInduk}
                                onChange={(e) => setEditNomorInduk(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs font-mono-tabular border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
                              />
                            </div>

                            <div className="md:col-span-8">
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Bidang Spesialisasi Hukum (Pisahkan dengan Koma)
                              </label>
                              <input
                                type="text"
                                value={editSpesialisasiStr}
                                onChange={(e) => setEditSpesialisasiStr(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
                              />
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                <span className="text-[11px] text-slate-500 mr-1">
                                  Klik untuk tambah/hapus bidang:
                                </span>
                                {PRESET_SPESIALISASI.map((bidang) => {
                                  const aktifBidang = editSpesialisasiStr
                                    .toLowerCase()
                                    .includes(bidang.toLowerCase());
                                  return (
                                    <button
                                      key={bidang}
                                      type="button"
                                      onClick={() => togglePresetPadaEdit(bidang)}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded border transition-colors ${
                                        aktifBidang
                                          ? 'bg-yellow-400 text-slate-950 border-yellow-500 font-semibold'
                                          : 'bg-amber-50/60 text-slate-700 border-amber-300 hover:bg-amber-100'
                                      }`}
                                    >
                                      <Plus className="w-2.5 h-2.5" />
                                      <span>{bidang}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Kuota Tugas / Minggu
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={25}
                                value={editKuota}
                                onChange={(e) =>
                                  setEditKuota(Math.max(1, parseInt(e.target.value, 10) || 6))
                                }
                                className="w-full px-3 py-1.5 text-xs font-mono-tabular border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Status Ketersediaan
                              </label>
                              <select
                                value={editAktif ? 'aktif' : 'cuti'}
                                onChange={(e) => setEditAktif(e.target.value === 'aktif')}
                                className="w-full px-2.5 py-1.5 text-xs border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                              >
                                <option value="aktif">Aktif Bertugas</option>
                                <option value="cuti">Cuti / Izin</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-100">
                            <button
                              type="button"
                              onClick={batalEdit}
                              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-amber-300 rounded-md hover:bg-amber-50 transition-colors"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              onClick={() => simpanEdit(adv.id)}
                              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-slate-950 bg-yellow-400 border border-yellow-500 rounded-md hover:bg-yellow-500 transition-colors"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Simpan Perubahan Data Advokat</span>
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={adv.id} className="hover:bg-amber-50/50 transition-colors align-top">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-950">{adv.nama}</div>
                      <div className="flex flex-wrap items-center gap-1.5 text-slate-500 mt-1">
                        <span className="font-semibold text-amber-900">{adv.jabatan}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          Kata Kunci:{' '}
                          <strong className="font-mono-tabular text-slate-900">
                            {adv.panggilan}
                          </strong>
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono-tabular">
                      <div className="inline-flex items-center gap-1.5 font-semibold text-slate-950">
                        <Phone className="w-3 h-3 text-emerald-700 shrink-0" />
                        <span>{adv.telepon}</span>
                      </div>
                      <div className="text-slate-500 mt-0.5">ID: {adv.nomorInduk}</div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 leading-relaxed">
                      {adv.spesialisasi.join(' · ')}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono-tabular">
                      <div className="font-semibold text-slate-950">
                        {beban} / {adv.kuotaMingguan} Agenda
                      </div>
                      <div className="w-full bg-amber-100 h-1.5 rounded-full overflow-hidden mt-1.5">
                        <div
                          className={`h-full transition-all ${
                            beban > adv.kuotaMingguan
                              ? 'bg-red-600'
                              : persentase >= 80
                              ? 'bg-amber-600'
                              : 'bg-yellow-500'
                          }`}
                          style={{ width: `${persentase}%` }}
                        />
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => onUpdateAdvokat({ ...adv, aktif: !adv.aktif })}
                        className={`inline-flex items-center gap-1.5 font-medium ${
                          adv.aktif ? 'text-emerald-800' : 'text-slate-500'
                        }`}
                      >
                        {adv.aktif ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Aktif Bertugas</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-slate-400" />
                            <span>Cuti / Izin</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => mulaiEdit(adv)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-950 bg-yellow-400 hover:bg-yellow-500 border border-yellow-500 rounded-md transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit Data</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onCopyWhatsAppPerAdvokat(adv.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-amber-300 rounded-md hover:bg-amber-50 transition-colors"
                        >
                          {copiedKey === `wa-${adv.id}` ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Salin WA</span>
                            </>
                          )}
                        </button>

                        {advokatList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onDeleteAdvokat(adv.id)}
                            className="p-1.5 text-xs font-medium text-red-700 hover:bg-red-50 rounded-md transition-colors"
                            title="Hapus advokat"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
