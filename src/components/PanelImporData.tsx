import React, { useEffect, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import * as XLSX from 'xlsx';
import {
  Advokat,
  ItemDisposisi,
  konversiDataTabelKeDisposisi,
  parseCSVKeArray2D,
} from '../data/dispositionEngine';
import {
  extractSpreadsheetId,
  fetchSheetRows,
  fetchSpreadsheetMetadata,
  getAccessToken,
  googleSignIn,
  initAuth,
  logout,
} from '../services/googleSheetsAuth';
import {
  Download,
  FileSpreadsheet,
  FolderUp,
  Link2,
  LogOut,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface PanelImporDataProps {
  mondayISO: string;
  advokatList: Advokat[];
  onImportSuccess: (
    items: ItemDisposisi[],
    formattedLines: string[],
    mode: 'replace' | 'append',
    sumberLabel: string
  ) => void;
}

const TEMPLATE_HEADERS = [
  'Hari',
  'Jam Mulai',
  'Jam Selesai',
  'Lokasi Pengadilan / Instansi',
  'Perkara',
  'Nomor Perkara',
  'Advokat (PIC)',
  'Prioritas',
  'Instruksi Disposisi',
];

const TEMPLATE_SAMPLE_ROWS = [
  [
    'Senin',
    '09:00',
    '11:00',
    'PN Palembang Kelas IA Khusus',
    'Sidang Pembuktian Gugatan Wanprestasi PT Sriwijaya Makmur',
    '142/Pdt.G/2026/PN PLG',
    'Iqbal',
    'Tinggi',
    'Siapkan 8 bukti surat bermeterai & hadirkan 2 saksi fakta',
  ],
  [
    'Selasa',
    '09:30',
    '11:30',
    'PA Palembang Kelas IA',
    'Mediasi Sengketa Waris Keluarga H. Darmawan',
    '819/Pdt.G/2026/PA.PLG',
    'Asep',
    'Normal',
    'Klien prinsipal wajib hadir, siapkan draf kesepakatan perdamaian',
  ],
  [
    'Kamis',
    '10:00',
    '12:00',
    'Polda Sumatera Selatan (Ditreskrimsus)',
    'Pendampingan Pemeriksaan BAP Saksi Korporasi',
    '-',
    'Wahyu Mustika',
    'Tinggi',
    'Pastikan dokumen audit internal telah disiapkan',
  ],
];

export const PanelImporData: React.FC<PanelImporDataProps> = ({
  mondayISO,
  advokatList,
  onImportSuccess,
}) => {
  const [metodeAktif, setMetodeAktif] = useState<'lokal' | 'sheets'>('lokal');
  const [modeImpor, setModeImpor] = useState<'replace' | 'append'>('replace');
  const [advokatImporId, setAdvokatImporId] = useState<string>('auto');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // State untuk workbook Excel (.xlsx) yang memiliki beberapa sheet
  const [excelWorkbook, setExcelWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [excelFileName, setExcelFileName] = useState<string>('');
  const [excelSheetNames, setExcelSheetNames] = useState<string[]>([]);
  const [selectedExcelSheet, setSelectedExcelSheet] = useState<string>('');

  // State Auth Google Sheets
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // State Google Spreadsheet
  const [sheetUrlOrId, setSheetUrlOrId] = useState<string>('');
  const [spreadsheetTitle, setSpreadsheetTitle] = useState<string>('');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [isLoadingMeta, setIsLoadingMeta] = useState<boolean>(false);
  const [isImportingSheet, setIsImportingSheet] = useState<boolean>(false);
  const [pesanError, setPesanError] = useState<string | null>(null);
  const [infoTerakhir, setInfoTerakhir] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (loggedInUser, accessToken) => {
        setUser(loggedInUser);
        setToken(accessToken);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setPesanError(null);
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setNeedsAuth(false);
      }
    } catch (err: any) {
      setPesanError(
        err?.message || 'Gagal masuk dengan Google. Pastikan jendela pop-up tidak diblokir.'
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setNeedsAuth(true);
    setSheetNames([]);
    setSpreadsheetTitle('');
  };

  const handleDownloadTemplateCSV = () => {
    const escapeCsv = (val: string) => `"${String(val).replace(/"/g, '""')}"`;
    const csvContent =
      '\uFEFF' +
      [
        TEMPLATE_HEADERS.map(escapeCsv).join(','),
        ...TEMPLATE_SAMPLE_ROWS.map((r) => r.map(escapeCsv).join(',')),
      ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Template_Agenda_Ryan_Gumay_Law_Firm.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadTemplateXLSX = () => {
    const aoa = [TEMPLATE_HEADERS, ...TEMPLATE_SAMPLE_ROWS];
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    worksheet['!cols'] = [
      { wch: 10 },
      { wch: 11 },
      { wch: 12 },
      { wch: 32 },
      { wch: 45 },
      { wch: 24 },
      { wch: 18 },
      { wch: 12 },
      { wch: 48 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Jadwal Mingguan');
    XLSX.writeFile(workbook, 'Template_Agenda_Ryan_Gumay_Law_Firm.xlsx');
  };

  const imporDariSheetExcel = (
    wb: XLSX.WorkBook,
    sheetName: string,
    namaFile: string
  ) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) {
      setPesanError(`Sheet "${sheetName}" tidak ditemukan di dalam berkas Excel.`);
      return;
    }

    const rawRows = XLSX.utils.sheet_to_json<string[]>(ws, {
      header: 1,
      raw: false,
      defval: '',
    });

    const rows2D: string[][] = rawRows.map((row) =>
      Array.isArray(row) ? row.map((cell) => String(cell ?? '').trim()) : []
    );

    const { items, formattedLines } = konversiDataTabelKeDisposisi(
      rows2D,
      mondayISO,
      advokatList
    );

    if (items.length === 0) {
      setPesanError(
        `Sheet "${sheetName}" pada berkas "${namaFile}" tidak berisi baris jadwal yang valid.`
      );
      return;
    }

    const advDipilih =
      advokatImporId !== 'auto'
        ? advokatList.find((a) => a.id === advokatImporId)
        : undefined;

    const finalItems = advDipilih
      ? items.map((it) => ({
          ...it,
          advokatId: advDipilih.id,
          assignedAutomatically: false,
        }))
      : items;

    const finalLines = advDipilih
      ? finalItems.map(
          (it) =>
            `${it.hari} ${it.waktuMulai}-${it.waktuSelesai} | ${it.lokasi} | ${it.perkara}${
              it.nomorPerkara !== '-' ? ` (No. ${it.nomorPerkara})` : ''
            } | ${advDipilih.panggilan} | ${
              it.prioritas === 'Tinggi' ? 'Prioritas Tinggi - ' : ''
            }${it.instruksiKhusus}`
        )
      : formattedLines;

    onImportSuccess(
      finalItems,
      finalLines,
      modeImpor,
      `Berkas Excel (${namaFile} - ${sheetName})`
    );
    setInfoTerakhir(
      `Berhasil mengimpor ${finalItems.length} baris agenda dari berkas Excel "${namaFile}" (Sheet: ${sheetName})${
        advDipilih ? ` untuk Advokat ${advDipilih.nama}` : ''
      }.`
    );
  };

  const handleFileLokalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPesanError(null);
    setInfoTerakhir(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isExcel = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls');

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const buffer = event.target?.result;
          if (!buffer) throw new Error('Berkas Excel kosong.');
          const wb = XLSX.read(buffer, { type: 'array' });
          const names = wb.SheetNames || [];
          if (names.length === 0) {
            setPesanError('Berkas Excel tidak memiliki lembar kerja (sheet).');
            return;
          }

          setExcelWorkbook(wb);
          setExcelFileName(file.name);
          setExcelSheetNames(names);
          setSelectedExcelSheet(names[0]);

          imporDariSheetExcel(wb, names[0], file.name);
        } catch (err: any) {
          setPesanError(err?.message || 'Gagal membaca berkas Excel (.xlsx).');
        } finally {
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Berkas CSV
      setExcelWorkbook(null);
      setExcelSheetNames([]);
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = String(event.target?.result || '');
          const rows = parseCSVKeArray2D(text);
          const { items, formattedLines } = konversiDataTabelKeDisposisi(
            rows,
            mondayISO,
            advokatList
          );

          if (items.length === 0) {
            setPesanError(
              'Berkas CSV tidak berisi baris jadwal yang valid. Gunakan tombol Unduh Template sebagai acuan.'
            );
            return;
          }

          const advDipilih =
            advokatImporId !== 'auto'
              ? advokatList.find((a) => a.id === advokatImporId)
              : undefined;

          const finalItems = advDipilih
            ? items.map((it) => ({
                ...it,
                advokatId: advDipilih.id,
                assignedAutomatically: false,
              }))
            : items;

          const finalLines = advDipilih
            ? finalItems.map(
                (it) =>
                  `${it.hari} ${it.waktuMulai}-${it.waktuSelesai} | ${it.lokasi} | ${it.perkara}${
                    it.nomorPerkara !== '-' ? ` (No. ${it.nomorPerkara})` : ''
                  } | ${advDipilih.panggilan} | ${
                    it.prioritas === 'Tinggi' ? 'Prioritas Tinggi - ' : ''
                  }${it.instruksiKhusus}`
              )
            : formattedLines;

          onImportSuccess(
            finalItems,
            finalLines,
            modeImpor,
            `Berkas CSV (${file.name})`
          );
          setInfoTerakhir(
            `Berhasil mengimpor ${finalItems.length} baris agenda dari berkas CSV "${file.name}"${
              advDipilih ? ` untuk Advokat ${advDipilih.nama}` : ''
            }.`
          );
        } catch (err: any) {
          setPesanError(err?.message || 'Gagal membaca berkas CSV.');
        } finally {
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      };
      reader.readAsText(file, 'UTF-8');
    }
  };

  const handleMuatMetadataSheets = async (e: React.FormEvent) => {
    e.preventDefault();
    setPesanError(null);
    setInfoTerakhir(null);

    if (!sheetUrlOrId.trim()) {
      setPesanError('Masukkan tautan URL atau ID Google Spreadsheet terlebih dahulu.');
      return;
    }

    const activeToken = token || (await getAccessToken());
    if (!activeToken) {
      setNeedsAuth(true);
      setPesanError('Silakan masuk dengan akun Google terlebih dahulu.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(sheetUrlOrId);
    setIsLoadingMeta(true);
    try {
      const meta = await fetchSpreadsheetMetadata(spreadsheetId, activeToken);
      setSpreadsheetTitle(meta.spreadsheetTitle);
      setSheetNames(meta.sheetNames);
      if (meta.sheetNames.length > 0) {
        setSelectedSheet(meta.sheetNames[0]);
      } else {
        setPesanError('Spreadsheet tidak memiliki lembar kerja (sheet) yang dapat dibaca.');
      }
    } catch (err: any) {
      if (String(err?.message || '').includes('401')) {
        setNeedsAuth(true);
      }
      setPesanError(err?.message || 'Gagal memuat daftar lembar dari Google Sheets.');
    } finally {
      setIsLoadingMeta(false);
    }
  };

  const handleImporDariSheet = async () => {
    setPesanError(null);
    setInfoTerakhir(null);

    const activeToken = token || (await getAccessToken());
    if (!activeToken) {
      setNeedsAuth(true);
      return;
    }

    const spreadsheetId = extractSpreadsheetId(sheetUrlOrId);
    if (!spreadsheetId || !selectedSheet) return;

    setIsImportingSheet(true);
    try {
      const rows = await fetchSheetRows(spreadsheetId, selectedSheet, activeToken);
      const { items, formattedLines } = konversiDataTabelKeDisposisi(
        rows,
        mondayISO,
        advokatList
      );

      if (items.length === 0) {
        setPesanError(
          `Lembar "${selectedSheet}" kosong atau belum memiliki baris jadwal agenda.`
        );
        return;
      }

      const advDipilih =
        advokatImporId !== 'auto'
          ? advokatList.find((a) => a.id === advokatImporId)
          : undefined;

      const finalItems = advDipilih
        ? items.map((it) => ({
            ...it,
            advokatId: advDipilih.id,
            assignedAutomatically: false,
          }))
        : items;

      const finalLines = advDipilih
        ? finalItems.map(
            (it) =>
              `${it.hari} ${it.waktuMulai}-${it.waktuSelesai} | ${it.lokasi} | ${it.perkara}${
                it.nomorPerkara !== '-' ? ` (No. ${it.nomorPerkara})` : ''
              } | ${advDipilih.panggilan} | ${
                it.prioritas === 'Tinggi' ? 'Prioritas Tinggi - ' : ''
              }${it.instruksiKhusus}`
          )
        : formattedLines;

      onImportSuccess(
        finalItems,
        finalLines,
        modeImpor,
        `Google Sheets (${spreadsheetTitle} - ${selectedSheet})`
      );
      setInfoTerakhir(
        `Berhasil menarik ${finalItems.length} agenda dari Google Sheets "${spreadsheetTitle}" (${selectedSheet})${
          advDipilih ? ` untuk Advokat ${advDipilih.nama}` : ''
        }.`
      );
    } catch (err: any) {
      setPesanError(err?.message || 'Gagal membaca isi data Google Spreadsheet.');
    } finally {
      setIsImportingSheet(false);
    }
  };

  return (
    <div className="bg-white border border-amber-200 rounded-lg p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-100 pb-3.5">
        <div>
          <h2 className="text-sm font-bold text-slate-950">
            Impor Data Jadwal dari Excel (.xlsx), CSV, atau Google Spreadsheet
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Unggah berkas Microsoft Excel (<code>.xlsx</code>) / CSV (<code>.csv</code>) dari
            komputer atau tarik data langsung dari Google Sheets tim kantor.
          </p>
        </div>

        {/* Pilihan Metode Impor & Mode Penempatan */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 p-1 bg-amber-100/80 border border-amber-200 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setMetodeAktif('lokal');
                setPesanError(null);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                metodeAktif === 'lokal'
                  ? 'bg-yellow-400 text-slate-950 shadow-2xs'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              <FolderUp className="w-3.5 h-3.5" />
              <span>Unggah Excel (.xlsx) / CSV</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMetodeAktif('sheets');
                setPesanError(null);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                metodeAktif === 'sheets'
                  ? 'bg-yellow-400 text-slate-950 shadow-2xs'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Google Spreadsheet</span>
            </button>
          </div>

          <select
            value={advokatImporId}
            onChange={(e) => setAdvokatImporId(e.target.value)}
            aria-label="Pilih Advokat untuk data impor"
            className="text-xs font-semibold bg-amber-50 border border-amber-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            <option value="auto">Advokat: Sesuai Kolom File / Otomatis</option>
            {advokatList.map((adv) => (
              <option key={adv.id} value={adv.id}>
                Tetapkan ke: {adv.nama} ({adv.jabatan})
              </option>
            ))}
          </select>

          <select
            value={modeImpor}
            onChange={(e) => setModeImpor(e.target.value as 'replace' | 'append')}
            aria-label="Mode penerapan data impor"
            className="text-xs font-semibold bg-amber-50 border border-amber-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            <option value="replace">Mode: Ganti Jadwal Minggu Ini</option>
            <option value="append">Mode: Tambahkan ke Jadwal Saat Ini</option>
          </select>
        </div>
      </div>

      {/* Pesan Error / Sukses */}
      {pesanError && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
          <span>{pesanError}</span>
        </div>
      )}

      {infoTerakhir && (
        <div className="p-3 rounded-md bg-amber-50 border border-yellow-400 text-xs text-slate-950 font-medium flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>{infoTerakhir}</span>
        </div>
      )}

      {/* PANEL 1: UNGGAH BERKAS EXCEL (.XLSX) ATAU CSV */}
      {metodeAktif === 'lokal' && (
        <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-950">
                Pilih Berkas Excel (.xlsx / .xls) atau CSV (.csv) dari Perangkat Anda
              </div>
              <p className="text-xs text-slate-600">
                Mendukung kolom: <strong>Hari</strong>, <strong>Jam Mulai</strong>,{' '}
                <strong>Jam Selesai</strong>, <strong>Lokasi Pengadilan</strong>,{' '}
                <strong>Perkara</strong>, <strong>Nomor Perkara</strong>,{' '}
                <strong>Advokat (PIC)</strong>, <strong>Prioritas</strong>, dan{' '}
                <strong>Instruksi Disposisi</strong>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadTemplateXLSX}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700" />
                <span>Template .xlsx</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadTemplateCSV}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 text-amber-700" />
                <span>Template .csv</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={handleFileLokalChange}
                className="hidden"
                id="local-file-upload-input"
              />
              <label
                htmlFor="local-file-upload-input"
                className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-yellow-400 border border-yellow-500 rounded-lg hover:bg-yellow-500 transition-colors whitespace-nowrap"
              >
                <FolderUp className="w-3.5 h-3.5" />
                <span>Pilih File (.xlsx / .csv)</span>
              </label>
            </div>
          </div>

          {/* Pemilih Sheet apabila file Excel (.xlsx) memiliki lebih dari 1 sheet */}
          {excelWorkbook && excelSheetNames.length > 1 && (
            <div className="pt-3 border-t border-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-600">
                  Berkas Excel: <strong className="text-slate-950">{excelFileName}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <label htmlFor="excel-sheet-picker" className="font-medium text-slate-700">
                  Pilih Sheet:
                </label>
                <select
                  id="excel-sheet-picker"
                  value={selectedExcelSheet}
                  onChange={(e) => {
                    const chosen = e.target.value;
                    setSelectedExcelSheet(chosen);
                    imporDariSheetExcel(excelWorkbook, chosen, excelFileName);
                  }}
                  className="text-xs font-semibold bg-white border border-amber-300 rounded-md px-2.5 py-1 text-slate-950"
                >
                  {excelSheetNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() =>
                  imporDariSheetExcel(excelWorkbook, selectedExcelSheet, excelFileName)
                }
                className="px-3 py-1 text-xs font-bold text-slate-950 bg-yellow-400 border border-yellow-500 rounded-md hover:bg-yellow-500 transition-colors"
              >
                Muat Ulang Sheet "{selectedExcelSheet}"
              </button>
            </div>
          )}
        </div>
      )}

      {/* PANEL 2: HUBUNGKAN GOOGLE SPREADSHEET */}
      {metodeAktif === 'sheets' && (
        <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-4 space-y-4">
          {needsAuth ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-950">
                  Hubungkan Akun Google Anda untuk Membaca Google Spreadsheet
                </div>
                <p className="text-xs text-slate-600">
                  Aplikasi akan mengakses data spreadsheet Anda secara aman (hanya-baca) dengan izin
                  dari akun Google Anda.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="inline-flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-900 bg-white border border-amber-300 rounded-lg shadow-2xs hover:bg-amber-50 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
              >
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  className="w-4 h-4 shrink-0"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                <span>{isLoggingIn ? 'Menghubungkan...' : 'Sign in with Google'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="text-slate-600">
                  Terhubung dengan Google Sheets sebagai:{' '}
                  <strong className="text-slate-950">{user?.email || user?.displayName}</strong>
                </div>
                <button
                  type="button"
                  onClick={handleGoogleLogout}
                  className="inline-flex items-center gap-1 text-slate-600 hover:text-red-700 font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Putuskan Akun</span>
                </button>
              </div>

              <form
                onSubmit={handleMuatMetadataSheets}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
              >
                <div className="relative flex-1">
                  <Link2 className="w-3.5 h-3.5 text-amber-700 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={sheetUrlOrId}
                    onChange={(e) => setSheetUrlOrId(e.target.value)}
                    placeholder="Tempel tautan URL Google Spreadsheet (https://docs.google.com/spreadsheets/d/...) atau ID Spreadsheet"
                    className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoadingMeta}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-900 bg-white border border-amber-300 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMeta ? 'animate-spin' : ''}`} />
                  <span>{isLoadingMeta ? 'Memuat Sheet...' : 'Cek Daftar Sheet'}</span>
                </button>
              </form>

              {sheetNames.length > 0 && (
                <div className="pt-2 border-t border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-600">
                      Dokumen: <strong className="text-slate-950">{spreadsheetTitle}</strong>
                    </span>
                    <span aria-hidden="true">·</span>
                    <label htmlFor="select-sheet-tab" className="font-medium text-slate-700">
                      Pilih Lembar (Tab):
                    </label>
                    <select
                      id="select-sheet-tab"
                      value={selectedSheet}
                      onChange={(e) => setSelectedSheet(e.target.value)}
                      className="text-xs font-semibold bg-white border border-amber-300 rounded-md px-2.5 py-1.5 text-slate-950 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                      {sheetNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleImporDariSheet}
                    disabled={isImportingSheet}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-yellow-400 border border-yellow-500 rounded-lg hover:bg-yellow-500 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>
                      {isImportingSheet
                        ? 'Mengimpor Jadwal...'
                        : `Impor dari "${selectedSheet}"`}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
