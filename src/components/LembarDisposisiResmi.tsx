import React, { useRef, useState } from 'react';
import { toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';
import {
  Advokat,
  apakahAdvokatTerlibat,
  formatRentangMinggu,
  formatTanggalIndonesia,
  getPendampingList,
  HARI_URUTAN,
  ItemDisposisi,
  MetadataDisposisi,
  ModePengelompokanDisposisi,
  resolveNamaPendamping,
} from '../data/dispositionEngine';
import {
  Printer,
  Download,
  Copy,
  Check,
  AlertTriangle,
  FileSpreadsheet,
  FileDown,
  Loader2,
} from 'lucide-react';

interface LembarDisposisiResmiProps {
  items: ItemDisposisi[];
  advokatList: Advokat[];
  metadata: MetadataDisposisi;
  modeKelompok: ModePengelompokanDisposisi;
  onChangeModeKelompok: (mode: ModePengelompokanDisposisi) => void;
  filterAdvokatId: string;
  onChangeFilterAdvokatId: (advId: string) => void;
  onUpdateMetadata: (updated: MetadataDisposisi) => void;
  onExportCSV: () => void;
  onExportXLSX: () => void;
  onCopyWhatsApp: (advokatFilterId?: string) => void;
  copiedKey: string | null;
  onNotify?: (pesan: string) => void;
}

export const LembarDisposisiResmi: React.FC<LembarDisposisiResmiProps> = ({
  items,
  advokatList,
  metadata,
  modeKelompok,
  onChangeModeKelompok,
  filterAdvokatId,
  onChangeFilterAdvokatId,
  onUpdateMetadata,
  onExportCSV,
  onExportXLSX,
  onCopyWhatsApp,
  copiedKey,
  onNotify,
}) => {
  const [editHeader, setEditHeader] = useState<boolean>(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  const getAdvokat = (id: string) => advokatList.find((a) => a.id === id);

  const filteredItems =
    filterAdvokatId === 'semua'
      ? items
      : items.filter((i) => apakahAdvokatTerlibat(i, filterAdvokatId));

  const unikLokasi: string[] = Array.from(new Set(filteredItems.map((i) => i.lokasi)));

  const handleDownloadPDF = async () => {
    if (!sheetRef.current || isGeneratingPDF) return;
    setIsGeneratingPDF(true);

    const el = sheetRef.current;
    const prevWidth = el.style.width;
    const prevMaxWidth = el.style.maxWidth;

    try {
      // Kunci lebar desktop (1024px) saat pengambilan gambar agar tata letak kolom,
      // Kop Surat, dan Tabel Paraf + Blok Pengesahan selalu rapi dan proporsional seperti tampilan penuh
      if (el.offsetWidth < 960) {
        el.style.width = '1024px';
        el.style.maxWidth = '1024px';
      }

      let canvas: HTMLCanvasElement;
      try {
        canvas = await toCanvas(el, {
          pixelRatio: 2.5,
          backgroundColor: '#ffffff',
          cacheBust: true,
        });
      } catch {
        canvas = await toCanvas(el, {
          pixelRatio: 2.5,
          backgroundColor: '#ffffff',
          cacheBust: true,
          skipFonts: true,
        });
      }

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdfWidthMm = 210; // Lebar standar A4 (mm)
      const marginMm = 8;
      const contentWidthMm = pdfWidthMm - marginMm * 2;
      const contentHeightMm = (canvas.height * contentWidthMm) / canvas.width;
      const pdfHeightMm = Math.max(297, Math.ceil(contentHeightMm + marginMm * 2));

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidthMm, pdfHeightMm],
        compress: true,
      });

      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pdfWidthMm, pdfHeightMm, 'F');
      pdf.addImage(
        imgData,
        'PNG',
        marginMm,
        marginMm,
        contentWidthMm,
        contentHeightMm,
        undefined,
        'FAST'
      );

      pdf.save(`Lembar_Disposisi_Ryan_Gumay_Law_Firm_${metadata.tanggalMulaiMinggu}.pdf`);
      onNotify?.(
        'Berkas PDF Lembar Disposisi berhasil diunduh sama persis seperti tampilan layar.'
      );
    } catch (err) {
      console.error('Gagal membuat PDF:', err);
      window.print();
    } finally {
      el.style.width = prevWidth;
      el.style.maxWidth = prevMaxWidth;
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Toolbar (Hidden when printing) */}
      <div className="no-print bg-white border border-amber-200 rounded-lg p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-amber-900">Pengelompokan Lembar:</span>
          <div className="flex items-center gap-1 p-1 bg-amber-100/80 border border-amber-200 rounded-lg">
            <button
              type="button"
              onClick={() => onChangeModeKelompok('hari')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                modeKelompok === 'hari'
                  ? 'bg-yellow-400 text-slate-950 shadow-2xs'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              Per Hari & Tanggal
            </button>
            <button
              type="button"
              onClick={() => onChangeModeKelompok('advokat')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                modeKelompok === 'advokat'
                  ? 'bg-yellow-400 text-slate-950 shadow-2xs'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              Per Advokat (PIC)
            </button>
            <button
              type="button"
              onClick={() => onChangeModeKelompok('lokasi')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                modeKelompok === 'lokasi'
                  ? 'bg-yellow-400 text-slate-950 shadow-2xs'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              Per Lokasi Pengadilan
            </button>
          </div>

          <div className="h-4 w-px bg-amber-200 hidden sm:block" />

          <div className="flex items-center gap-2">
            <label htmlFor="filter-advokat-disposisi" className="text-xs font-semibold text-slate-700 whitespace-nowrap">
              Tampilan Advokat:
            </label>
            <select
              id="filter-advokat-disposisi"
              value={filterAdvokatId}
              onChange={(e) => onChangeFilterAdvokatId(e.target.value)}
              className="text-xs font-semibold bg-amber-50 border border-amber-300 rounded-md px-2.5 py-1.5 text-slate-950 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value="semua">Seluruh Tim Advokat ({items.length} Agenda)</option>
              {advokatList.map((adv) => {
                const count = items.filter((i) => apakahAdvokatTerlibat(i, adv.id)).length;
                return (
                  <option key={adv.id} value={adv.id}>
                    {adv.nama} ({count} Agenda)
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setEditHeader(!editHeader)}
            className="px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors whitespace-nowrap shrink-0"
          >
            {editHeader ? 'Tutup Pengaturan Kop' : 'Atur Nomor & Instruksi'}
          </button>

          <button
            type="button"
            onClick={() => onCopyWhatsApp(filterAdvokatId === 'semua' ? undefined : filterAdvokatId)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors whitespace-nowrap shrink-0"
          >
            {copiedKey === (filterAdvokatId === 'semua' ? 'wa-all' : `wa-${filterAdvokatId}`) ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-700" />
                <span>Tersalin</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-amber-700" />
                <span>Salin WA</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onExportCSV}
            title="Unduh berkas CSV dengan susunan & format persis seperti Lembar Disposisi ini"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-amber-700" />
            <span>Unduh CSV</span>
          </button>

          <button
            type="button"
            onClick={onExportXLSX}
            title="Unduh berkas Excel (.xlsx) dengan susunan & format persis seperti Lembar Disposisi ini"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Unduh .xlsx</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            title="Unduh berkas PDF yang rapi dan sama persis seperti tampilan Lembar Disposisi ini"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-yellow-400 border border-yellow-500 rounded-lg hover:bg-yellow-500 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menyiapkan PDF...</span>
              </>
            ) : (
              <>
                <FileDown className="w-3.5 h-3.5" />
                <span>Unduh PDF</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            title="Cetak langsung ke printer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-amber-50 border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors whitespace-nowrap shrink-0"
          >
            <Printer className="w-3.5 h-3.5 text-amber-800" />
            <span>Cetak</span>
          </button>
        </div>
      </div>

      {/* Collapsible Metadata Editor (No-Print) */}
      {editHeader && (
        <div className="no-print bg-white border border-amber-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-amber-100 pb-3">
            <h3 className="text-sm font-semibold text-slate-950">
              Pengaturan Atribut Dokumen Disposisi Resmi
            </h3>
            <span className="text-xs text-slate-500">
              Perubahan langsung diterapkan pada lembar cetak di bawah
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nomor Surat Disposisi
              </label>
              <input
                type="text"
                value={metadata.nomorDokumen}
                onChange={(e) =>
                  onUpdateMetadata({ ...metadata, nomorDokumen: e.target.value })
                }
                className="w-full px-3 py-2 text-xs font-mono-tabular border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tanggal Senin (Awal Minggu)
              </label>
              <input
                type="date"
                value={metadata.tanggalMulaiMinggu}
                onChange={(e) =>
                  onUpdateMetadata({ ...metadata, tanggalMulaiMinggu: e.target.value })
                }
                className="w-full px-3 py-2 text-xs font-mono-tabular border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nama Kepala Kantor / pemberi disposisi
              </label>
              <input
                type="text"
                value={metadata.kepalaKantor}
                onChange={(e) =>
                  onUpdateMetadata({ ...metadata, kepalaKantor: e.target.value })
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Jabatan Penandatangan
              </label>
              <input
                type="text"
                value={metadata.jabatanKepala}
                onChange={(e) =>
                  onUpdateMetadata({ ...metadata, jabatanKepala: e.target.value })
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Instruksi Umum Kepala Kantor (Tercantum di Bagian Bawah Lembar Disposisi)
            </label>
            <textarea
              rows={2}
              value={metadata.catatanUmum}
              onChange={(e) =>
                onUpdateMetadata({ ...metadata, catatanUmum: e.target.value })
              }
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>
      )}

      {/* Official Printable Disposition Sheet */}
      <div
        ref={sheetRef}
        className="print-sheet bg-white border border-amber-300 rounded-lg p-8 md:p-12 max-w-5xl mx-auto text-slate-900"
      >
        {/* Kop Surat Resmi (Official Law Firm Letterhead) */}
        <div className="border-b-2 border-yellow-500 pb-6 mb-6 flex flex-col sm:flex-row print:flex-row sm:items-center print:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-lg bg-amber-50/60 border border-amber-200 flex items-center justify-center shrink-0 p-1">
              <img
                src="/assets/aistudio/logo_rg_f_775b191a.png"
                alt="Logo Resmi Ryan Gumay Law Firm"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
                RYAN GUMAY LAW FIRM
              </h1>
              <p className="text-xs font-semibold text-amber-800 mt-0.5">
                Advocates, Litigators & Corporate Legal Consultants
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Jalan Proklamasi Blok J Nomor 9 RT 032 RW 009 Kelurahan Lorok Pakjo Kecamatan Ilir Barat 1 Kota Palembang Sumatera Selatan
              </p>
            </div>
          </div>

          <div className="sm:text-right print:text-right font-mono-tabular text-xs space-y-1 text-slate-700 shrink-0">
            <div>
              <span className="text-slate-500">No. Disposisi: </span>
              <span className="font-semibold text-slate-900">{metadata.nomorDokumen}</span>
            </div>
            <div>
              <span className="text-slate-500">Periode Penugasan: </span>
              <span className="font-semibold text-slate-900">
                {formatRentangMinggu(metadata.tanggalMulaiMinggu)}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Total Agenda Aktif: </span>
              <span className="font-semibold text-slate-900">{filteredItems.length} Penugasan</span>
            </div>
          </div>
        </div>

        {/* Document Title Banner */}
        <div className="mb-6 flex flex-col sm:flex-row print:flex-row sm:items-baseline print:items-baseline justify-between gap-2 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              LEMBAR DISPOSISI PENUGASAN TIM ADVOKAT MINGGUAN
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Diterbitkan oleh {metadata.kepalaKantor} ({metadata.jabatanKepala})
              {filterAdvokatId !== 'semua' && getAdvokat(filterAdvokatId)
                ? ` · Khusus Penugasan: ${getAdvokat(filterAdvokatId)?.nama}`
                : ' · Berlaku untuk Seluruh Advokat & Associate'}
            </p>
          </div>
          <div className="text-xs text-slate-500 font-mono-tabular shrink-0">
            Mode Susunan:{' '}
            <span className="font-semibold text-slate-800">
              {modeKelompok === 'hari'
                ? 'Kronologis Hari & Tanggal'
                : modeKelompok === 'advokat'
                ? 'Per Advokat Penanggung Jawab'
                : 'Per Lokasi Pengadilan / Instansi'}
            </span>
          </div>
        </div>

        {/* Empty State */}
        {filteredItems.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-slate-300 rounded-lg">
            <p className="text-sm font-medium text-slate-700">
              Belum ada jadwal penugasan untuk kriteria yang dipilih.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Tambahkan agenda melalui menu Konverter Cepat atau pilih seluruh tim advokat.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* MODE 1: KELOMPOK PER HARI */}
            {modeKelompok === 'hari' &&
              HARI_URUTAN.map((hari) => {
                const itemsHari = filteredItems.filter((i) => i.hari === hari);
                if (itemsHari.length === 0) return null;
                const tanggalSampel = itemsHari[0].tanggalISO;

                return (
                  <div key={hari} className="space-y-2.5 break-inside-avoid">
                    <div className="flex items-baseline justify-between border-b border-slate-900 pb-1.5">
                      <h3 className="text-sm font-bold text-slate-900">
                        {hari}, {formatTanggalIndonesia(tanggalSampel)}
                      </h3>
                      <span className="text-xs font-mono-tabular text-slate-600">
                        {itemsHari.length} Agenda Terjadwal
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                            <th className="py-2 pr-3 w-28">Jam (WIB)</th>
                            <th className="py-2 px-3 w-48">Lokasi / Pengadilan</th>
                            <th className="py-2 px-3">Perkara & Agenda Sidang</th>
                            <th className="py-2 px-3 w-48">Advokat (PIC)</th>
                            <th className="py-2 pl-3 w-60">Instruksi Disposisi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-xs">
                          {itemsHari.map((item) => {
                            const pic = getAdvokat(item.advokatId);
                            const pendampingNames = getPendampingList(item).map((v) =>
                              resolveNamaPendamping(v, advokatList)
                            );
                            return (
                              <tr key={item.id} className="align-top">
                                <td className="py-3 pr-3 font-mono-tabular font-semibold text-slate-900 whitespace-nowrap">
                                  <div>
                                    {item.waktuMulai} – {item.waktuSelesai}
                                  </div>
                                  {item.prioritas === 'Tinggi' && (
                                    <div className="inline-flex items-center gap-1 text-amber-800 font-sans font-semibold mt-1">
                                      <AlertTriangle className="w-3 h-3 shrink-0" />
                                      <span>Prioritas Tinggi</span>
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  <div className="font-semibold text-slate-900">{item.lokasi}</div>
                                  <div className="text-slate-500 mt-0.5">{item.kategori}</div>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="font-semibold text-slate-900">{item.perkara}</div>
                                  {item.nomorPerkara !== '-' && (
                                    <div className="font-mono-tabular text-slate-600 mt-0.5">
                                      No: {item.nomorPerkara}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  <div className="font-semibold text-slate-900">
                                    {pic?.nama || 'Belum Ditentukan'}
                                  </div>
                                  <div className="text-slate-500 mt-0.5">{pic?.jabatan}</div>
                                  {pendampingNames.length > 0 && (
                                    <div className="text-amber-950 font-medium mt-1 space-y-0.5">
                                      <div className="text-[11px] font-semibold text-amber-900">
                                        Pendamping ({pendampingNames.length}):
                                      </div>
                                      {pendampingNames.map((namaP, idxP) => (
                                        <div key={idxP} className="text-[11px] text-slate-700">
                                          {idxP + 1}. {namaP}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 pl-3 text-slate-700 leading-relaxed">
                                  {item.instruksiKhusus}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

            {/* MODE 2: KELOMPOK PER ADVOKAT */}
            {modeKelompok === 'advokat' &&
              advokatList.map((adv) => {
                const itemsAdv = filteredItems.filter((i) => apakahAdvokatTerlibat(i, adv.id));
                if (itemsAdv.length === 0) return null;

                return (
                  <div key={adv.id} className="space-y-2.5 break-inside-avoid">
                    <div className="flex flex-wrap items-baseline justify-between border-b border-slate-900 pb-1.5 gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{adv.nama}</h3>
                        <p className="text-xs text-slate-600">
                          {adv.jabatan} · {adv.spesialisasi.join(' · ')} · NIA: {adv.nomorInduk}
                        </p>
                      </div>
                      <span className="text-xs font-mono-tabular font-semibold text-slate-800">
                        Total Penugasan: {itemsAdv.length} / {adv.kuotaMingguan} Kuota Mingguan
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                            <th className="py-2 pr-3 w-36">Hari & Tanggal</th>
                            <th className="py-2 px-3 w-28">Jam (WIB)</th>
                            <th className="py-2 px-3 w-48">Lokasi / Pengadilan</th>
                            <th className="py-2 px-3">Perkara & Peran</th>
                            <th className="py-2 pl-3 w-64">Instruksi Disposisi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-xs">
                          {itemsAdv.map((item) => {
                            const sebagaiPendamping = item.advokatId !== adv.id;
                            const pendampingNames = getPendampingList(item).map((v) =>
                              resolveNamaPendamping(v, advokatList)
                            );
                            return (
                              <tr key={item.id} className="align-top">
                                <td className="py-3 pr-3 font-semibold text-slate-900 whitespace-nowrap">
                                  <div>{item.hari}</div>
                                  <div className="font-mono-tabular font-normal text-slate-500">
                                    {formatTanggalIndonesia(item.tanggalISO)}
                                  </div>
                                </td>
                                <td className="py-3 px-3 font-mono-tabular font-semibold text-slate-900 whitespace-nowrap">
                                  {item.waktuMulai} – {item.waktuSelesai}
                                </td>
                                <td className="py-3 px-3">
                                  <div className="font-semibold text-slate-900">{item.lokasi}</div>
                                  <div className="text-slate-500 mt-0.5">{item.kategori}</div>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="font-semibold text-slate-900">{item.perkara}</div>
                                  <div className="text-slate-500 mt-0.5">
                                    Peran:{' '}
                                    {sebagaiPendamping
                                      ? `Advokat Pendamping (PIC: ${getAdvokat(item.advokatId)?.nama})`
                                      : `Advokat Penanggung Jawab Utama (PIC)${
                                          pendampingNames.length > 0
                                            ? ` · Didampingi: ${pendampingNames.join(', ')}`
                                            : ''
                                        }`}
                                    {item.nomorPerkara !== '-' ? ` · No: ${item.nomorPerkara}` : ''}
                                  </div>
                                </td>
                                <td className="py-3 pl-3 text-slate-700 leading-relaxed">
                                  {item.instruksiKhusus}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

            {/* MODE 3: KELOMPOK PER LOKASI PENGADILAN */}
            {modeKelompok === 'lokasi' &&
              unikLokasi.map((lokasi) => {
                const itemsLokasi = filteredItems.filter((i) => i.lokasi === lokasi);
                if (itemsLokasi.length === 0) return null;

                return (
                  <div key={lokasi} className="space-y-2.5 break-inside-avoid">
                    <div className="flex items-baseline justify-between border-b border-slate-900 pb-1.5">
                      <h3 className="text-sm font-bold text-slate-900">{lokasi}</h3>
                      <span className="text-xs font-mono-tabular text-slate-600">
                        {itemsLokasi.length} Agenda di Lokasi Ini
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                            <th className="py-2 pr-3 w-40">Hari & Jam</th>
                            <th className="py-2 px-3">Perkara & Nomor Register</th>
                            <th className="py-2 px-3 w-52">Advokat Bertugas (PIC)</th>
                            <th className="py-2 pl-3 w-64">Instruksi Disposisi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-xs">
                          {itemsLokasi.map((item) => {
                            const pic = getAdvokat(item.advokatId);
                            const pendampingNames = getPendampingList(item).map((v) =>
                              resolveNamaPendamping(v, advokatList)
                            );
                            return (
                              <tr key={item.id} className="align-top">
                                <td className="py-3 pr-3 whitespace-nowrap">
                                  <div className="font-semibold text-slate-900">
                                    {item.hari}, {formatTanggalIndonesia(item.tanggalISO)}
                                  </div>
                                  <div className="font-mono-tabular text-slate-600">
                                    {item.waktuMulai} – {item.waktuSelesai} WIB
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="font-semibold text-slate-900">{item.perkara}</div>
                                  <div className="text-slate-500 mt-0.5">
                                    {item.kategori}
                                    {item.nomorPerkara !== '-' ? ` · No: ${item.nomorPerkara}` : ''}
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="font-semibold text-slate-900">{pic?.nama}</div>
                                  <div className="text-slate-500 mt-0.5">{pic?.telepon}</div>
                                  {pendampingNames.length > 0 && (
                                    <div className="text-slate-700 mt-1 text-[11px]">
                                      <span className="font-semibold text-amber-900">
                                        Pendamping ({pendampingNames.length}):
                                      </span>{' '}
                                      {pendampingNames.join(', ')}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 pl-3 text-slate-700 leading-relaxed">
                                  {item.instruksiKhusus}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* Catatan Instruksi Umum & Blok Tanda Tangan Resmi */}
        <div className="mt-10 pt-6 border-t-2 border-yellow-500 space-y-6 break-inside-avoid">
          <div className="bg-amber-50/70 border border-amber-200 rounded-md p-4">
            <h4 className="text-xs font-bold text-slate-950 mb-1">
              Arahan & Ketentuan Pelaksanaan Disposisi Mingguan:
            </h4>
            <p className="text-xs text-slate-800 leading-relaxed">{metadata.catatanUmum}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 print:grid-cols-12 gap-6 pt-2">
            {/* Tabel Paraf Penerimaan Advokat */}
            <div className="sm:col-span-8 print:col-span-8">
              <h4 className="text-xs font-bold text-slate-950 mb-2">
                Bukti Penerimaan & Paraf Kesiapan Tim Advokat:
              </h4>
              <table className="w-full text-left border border-amber-300 border-collapse text-xs">
                <thead>
                  <tr className="bg-amber-50 border-b border-amber-300 text-amber-950">
                    <th className="py-1.5 px-2.5 border-r border-amber-300">Nama Advokat</th>
                    <th className="py-1.5 px-2.5 border-r border-amber-300 text-right w-24">
                      Jml Tugas
                    </th>
                    <th className="py-1.5 px-2.5 w-32">Paraf / Tgl Terima</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {advokatList
                    .filter((a) => a.aktif)
                    .map((adv) => {
                      const count = items.filter((i) => apakahAdvokatTerlibat(i, adv.id)).length;
                      return (
                        <tr key={adv.id}>
                          <td className="py-2 px-2.5 border-r border-slate-300 font-medium text-slate-900">
                            {adv.nama}
                          </td>
                          <td className="py-2 px-2.5 border-r border-slate-300 text-right font-mono-tabular text-slate-800">
                            {count} Agenda
                          </td>
                          <td className="py-2 px-2.5 text-slate-400 font-mono-tabular">
                            .........................
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Blok Pengesahan Kepala Kantor */}
            <div className="sm:col-span-4 print:col-span-4 flex flex-col justify-between text-xs text-slate-800 border border-amber-200 bg-amber-50/30 rounded-md p-4">
              <div>
                <p>
                  Ditetapkan di: <span className="font-semibold">{metadata.kotaKantor}</span>
                </p>
                <p className="mt-0.5">
                  Tanggal Terbit:{' '}
                  <span className="font-mono-tabular font-semibold">
                    {formatTanggalIndonesia(metadata.tanggalMulaiMinggu)}
                  </span>
                </p>
                <p className="mt-2 font-semibold text-slate-900">
                  Mengetahui & Menugaskan,
                </p>
              </div>

              <div className="pt-14">
                <p className="font-bold text-sm text-slate-900 underline underline-offset-4">
                  {metadata.kepalaKantor}
                </p>
                <p className="text-slate-600 mt-0.5">Managing</p>
                <p className="text-slate-500 font-mono-tabular mt-0.5">Ryan Gumay Law Firm</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
