import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Advokat,
  apakahAdvokatTerlibat,
  bangunMatriksLembarDisposisi,
  DAFTAR_JABATAN,
  evaluasiKonflikJadwal,
  formatRentangMinggu,
  formatTanggalIndonesia,
  getPendampingList,
  HARI_URUTAN,
  hitungTanggalDariHari,
  INITIAL_ADVOKAT,
  INITIAL_METADATA,
  ItemDisposisi,
  JabatanAdvokat,
  MetadataDisposisi,
  ModePengelompokanDisposisi,
  parseCatatanMentah,
  pilihAdvokatOtomatis,
  resolveNamaPendamping,
  SAMPLE_CATATAN_MENTAH,
} from './data/dispositionEngine';
import {
  appendDisposisiItemsInCloud,
  auth,
  collection,
  createAdvokatInCloud,
  createDisposisiItemInCloud,
  db,
  deleteAdvokatInCloud,
  deleteDisposisiItemInCloud,
  doc,
  ensureWorkspaceInitialized,
  handleFirestoreError,
  onSnapshot,
  OperationType,
  query,
  replaceAllDisposisiItemsInCloud,
  saveWorkspaceToCloud,
  updateAdvokatInCloud,
  updateDisposisiItemInCloud,
  VISIBILITY_TIER,
  where,
  WORKSPACE_ID,
} from './lib/firebase';
import { LembarDisposisiResmi } from './components/LembarDisposisiResmi';
import { TabelJadwalInteraktif } from './components/TabelJadwalInteraktif';
import { ManajemenTimAdvokat } from './components/ManajemenTimAdvokat';
import { PanelImporData } from './components/PanelImporData';
import {
  ArrowRight,
  Check,
  Copy,
  FileSpreadsheet,
  FileText,
  Printer,
  RotateCcw,
  Wand2,
  AlertTriangle,
  Plus,
} from 'lucide-react';

type TabAktif = 'konverter' | 'jadwal' | 'lembar' | 'advokat';

const DEFAULT_ACTOR_ID = 'rglf-office-sync';

function normalisasiJabatan(jabatanLama: string): JabatanAdvokat {
  if (DAFTAR_JABATAN.includes(jabatanLama as JabatanAdvokat)) {
    return jabatanLama as JabatanAdvokat;
  }
  if (jabatanLama === 'Senior Partner' || jabatanLama === 'Partner') return 'Managing';
  if (jabatanLama === 'Senior Associate') return 'Co Managing';
  return 'Advokat';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabAktif>('lembar');
  const [cloudReady, setCloudReady] = useState<boolean>(false);

  // Pastikan saat dibuka atau beralih ke tampilan mobile (< 768px), langsung tampil di halaman Lembar Disposisi
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth < 768) {
      setActiveTab('lembar');
    }
    const mql = window.matchMedia('(max-width: 767px)');
    const handleViewportChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setActiveTab('lembar');
      }
    };
    mql.addEventListener('change', handleViewportChange);
    return () => mql.removeEventListener('change', handleViewportChange);
  }, []);

  const [advokatList, setAdvokatList] = useState<Advokat[]>(INITIAL_ADVOKAT);
  const [metadata, setMetadata] = useState<MetadataDisposisi>(INITIAL_METADATA);
  const [catatanMentah, setCatatanMentah] = useState<string>(SAMPLE_CATATAN_MENTAH);
  const [items, setItems] = useState<ItemDisposisi[]>(() =>
    parseCatatanMentah(
      SAMPLE_CATATAN_MENTAH,
      INITIAL_METADATA.tanggalMulaiMinggu,
      INITIAL_ADVOKAT
    )
  );

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [notifikasi, setNotifikasi] = useState<string | null>(null);
  const [advokatPilihanKonverter, setAdvokatPilihanKonverter] = useState<string>('adv-4');
  const [modeKelompokDisposisi, setModeKelompokDisposisi] =
    useState<ModePengelompokanDisposisi>('hari');
  const [filterAdvokatDisposisi, setFilterAdvokatDisposisi] = useState<string>('semua');

  const isTypingCatatanRef = useRef<boolean>(false);
  const catatanDebounceRef = useRef<number | null>(null);

  const getActorUid = () => auth.currentUser?.uid || DEFAULT_ACTOR_ID;

  const tampilkanPesan = (pesan: string) => {
    setNotifikasi(pesan);
    setTimeout(() => {
      setNotifikasi((curr) => (curr === pesan ? null : curr));
    }, 3200);
  };

  // Sinkronisasi Real-Time Multi-Pengguna Langsung Tanpa Gerbang Login
  useEffect(() => {
    let unsubWorkspace: (() => void) | undefined;
    let unsubAdvokat: (() => void) | undefined;
    let unsubDisposisi: (() => void) | undefined;
    let cancelled = false;

    const startSync = async () => {
      try {
        await ensureWorkspaceInitialized(getActorUid());
        if (cancelled) return;

        const wsPath = `workspaces/${WORKSPACE_ID}`;
        unsubWorkspace = onSnapshot(
          doc(db, 'workspaces', WORKSPACE_ID),
          (snap) => {
            if (!snap.exists()) return;
            const data = snap.data();
            setMetadata({
              nomorDokumen: String(data.nomorDokumen || INITIAL_METADATA.nomorDokumen),
              tanggalMulaiMinggu: String(
                data.tanggalMulaiMinggu || INITIAL_METADATA.tanggalMulaiMinggu
              ),
              kepalaKantor: String(data.kepalaKantor || INITIAL_METADATA.kepalaKantor),
              jabatanKepala:
                data.jabatanKepala === 'Managing Partner / Kepala Kantor'
                  ? 'Managing'
                  : String(data.jabatanKepala || 'Managing'),
              kotaKantor: String(data.kotaKantor || INITIAL_METADATA.kotaKantor),
              catatanUmum: String(data.catatanUmum || INITIAL_METADATA.catatanUmum),
            });
            if (!isTypingCatatanRef.current && typeof data.catatanMentah === 'string') {
              setCatatanMentah(data.catatanMentah);
            }
            setCloudReady(true);
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, wsPath);
          }
        );

        const advPath = `workspaces/${WORKSPACE_ID}/advokat`;
        const advQuery = query(
          collection(db, 'workspaces', WORKSPACE_ID, 'advokat'),
          where('workspaceId', '==', WORKSPACE_ID),
          where('visibility', '==', VISIBILITY_TIER)
        );
        unsubAdvokat = onSnapshot(
          advQuery,
          (snap) => {
            if (snap.empty) return;
            const list: Advokat[] = snap.docs.map((d) => {
              const raw = d.data();
              return {
                id: String(raw.id || d.id),
                nama: String(raw.nama || ''),
                panggilan: String(raw.panggilan || ''),
                jabatan: normalisasiJabatan(String(raw.jabatan || 'Advokat')),
                spesialisasi: Array.isArray(raw.spesialisasi)
                  ? raw.spesialisasi.map(String)
                  : ['Litigasi Umum'],
                kuotaMingguan: Number(raw.kuotaMingguan) || 6,
                nomorInduk: String(raw.nomorInduk || '-'),
                telepon: String(raw.kontakWa || raw.telepon || '-'),
                aktif: Boolean(raw.aktif),
              };
            });
            list.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
            setAdvokatList(list);
          },
          (error) => {
            handleFirestoreError(error, OperationType.LIST, advPath);
          }
        );

        const dispPath = `workspaces/${WORKSPACE_ID}/disposisi`;
        const dispQuery = query(
          collection(db, 'workspaces', WORKSPACE_ID, 'disposisi'),
          where('workspaceId', '==', WORKSPACE_ID),
          where('visibility', '==', VISIBILITY_TIER)
        );
        unsubDisposisi = onSnapshot(
          dispQuery,
          (snap) => {
            const list: ItemDisposisi[] = snap.docs.map((d) => {
              const raw = d.data();
              const pendampingArr = Array.isArray(raw.advokatPendampingIds)
                ? raw.advokatPendampingIds.map(String).filter(Boolean)
                : [];
              return {
                id: String(raw.id || d.id),
                hari: (raw.hari as ItemDisposisi['hari']) || 'Senin',
                tanggalISO: String(raw.tanggalISO || INITIAL_METADATA.tanggalMulaiMinggu),
                waktuMulai: String(raw.waktuMulai || '09:00'),
                waktuSelesai: String(raw.waktuSelesai || '11:00'),
                lokasi: String(raw.lokasi || 'Kantor Ryan Gumay Law Firm'),
                kategori: (raw.kategori as ItemDisposisi['kategori']) || 'Sidang Pengadilan',
                perkara: String(raw.perkara || ''),
                nomorPerkara: String(raw.nomorPerkara || '-'),
                advokatId: String(raw.advokatId || 'adv-1'),
                advokatPendampingIds: pendampingArr,
                advokatPendampingId: pendampingArr[0] || undefined,
                prioritas: raw.prioritas === 'Tinggi' ? 'Tinggi' : 'Normal',
                instruksiKhusus: String(raw.instruksiKhusus || 'Laksanakan sesuai SOP kantor.'),
                statusKonfirmasi:
                  raw.statusKonfirmasi === 'Perlu Koordinasi'
                    ? 'Perlu Koordinasi'
                    : 'Siap Jalan',
                assignedAutomatically: Boolean(raw.assignedAutomatically),
              };
            });
            list.sort((a, b) => {
              const dayDiff = HARI_URUTAN.indexOf(a.hari) - HARI_URUTAN.indexOf(b.hari);
              if (dayDiff !== 0) return dayDiff;
              return a.waktuMulai.localeCompare(b.waktuMulai);
            });
            setItems(list);
          },
          (error) => {
            handleFirestoreError(error, OperationType.LIST, dispPath);
          }
        );
      } catch (err) {
        console.error('Gagal menginisialisasi sinkronisasi database:', err);
      }
    };

    startSync();

    return () => {
      cancelled = true;
      unsubWorkspace?.();
      unsubAdvokat?.();
      unsubDisposisi?.();
    };
  }, []);

  // Simpan perubahan teks catatanMentah ke Cloud secara otomatis (debounced)
  const handleUbahCatatanMentah = (teksBaru: string) => {
    isTypingCatatanRef.current = true;
    setCatatanMentah(teksBaru);
    if (catatanDebounceRef.current) {
      window.clearTimeout(catatanDebounceRef.current);
    }
    catatanDebounceRef.current = window.setTimeout(async () => {
      isTypingCatatanRef.current = false;
      try {
        await saveWorkspaceToCloud(metadata, teksBaru, getActorUid());
      } catch (err) {
        console.error('Gagal menyinkronkan catatan mentah:', err);
      }
    }, 900);
  };

  // Sinkronkan tanggalISO jika Kepala Kantor mengubah tanggal Senin awal minggu
  const handleUpdateMetadata = async (updated: MetadataDisposisi) => {
    const mingguBerubah = updated.tanggalMulaiMinggu !== metadata.tanggalMulaiMinggu;
    setMetadata(updated);
    const actorUid = getActorUid();

    try {
      await saveWorkspaceToCloud(updated, catatanMentah, actorUid);
      if (mingguBerubah) {
        const updatedItems = items.map((item) => ({
          ...item,
          tanggalISO: hitungTanggalDariHari(updated.tanggalMulaiMinggu, item.hari),
        }));
        setItems(updatedItems);
        await Promise.all(
          updatedItems.map((it) => updateDisposisiItemInCloud(it, actorUid))
        );
      }
    } catch (err) {
      console.error('Gagal memperbarui metadata disposisi:', err);
    }
  };

  // Pratinjau langsung dari teks catatan mentah yang sedang diketik
  const hasilPratinjau = useMemo(() => {
    return parseCatatanMentah(catatanMentah, metadata.tanggalMulaiMinggu, advokatList);
  }, [catatanMentah, metadata.tanggalMulaiMinggu, advokatList]);

  const konflikJadwal = useMemo(() => evaluasiKonflikJadwal(items), [items]);

  const handleKonversiGanti = async () => {
    const baru = parseCatatanMentah(catatanMentah, metadata.tanggalMulaiMinggu, advokatList);
    setItems(baru);
    try {
      await replaceAllDisposisiItemsInCloud(baru, catatanMentah, metadata, getActorUid());
      tampilkanPesan(
        `${baru.length} agenda berhasil dikonversi & disinkronkan untuk seluruh pengguna.`
      );
    } catch (err) {
      console.error('Gagal menyinkronkan konversi:', err);
    }
  };

  const handleKonversiTambah = async () => {
    const tambahan = parseCatatanMentah(catatanMentah, metadata.tanggalMulaiMinggu, advokatList);
    setItems((prev) => [...prev, ...tambahan]);
    try {
      await appendDisposisiItemsInCloud(tambahan, catatanMentah, metadata, getActorUid());
      tampilkanPesan(
        `${tambahan.length} agenda baru ditambahkan & disinkronkan ke database.`
      );
    } catch (err) {
      console.error('Gagal menambahkan agenda ke database:', err);
    }
  };

  const handleSisipkanTemplateBaris = (baris: string) => {
    const nextText = catatanMentah.trim() ? `${catatanMentah.trim()}\n${baris}` : baris;
    handleUbahCatatanMentah(nextText);
  };

  const formatItemKeBarisCatatan = (item: ItemDisposisi, advIdBaru?: string): string => {
    const targetAdvId = advIdBaru || item.advokatId;
    const adv = advokatList.find((a) => a.id === targetAdvId);
    const namaAdv = adv ? adv.panggilan : 'Otomatis';
    const noStr =
      item.nomorPerkara && item.nomorPerkara !== '-' ? ` (No. ${item.nomorPerkara})` : '';
    const prioStr = item.prioritas === 'Tinggi' ? 'Prioritas Tinggi - ' : '';
    return `${item.hari} ${item.waktuMulai} | ${item.lokasi} | ${item.perkara}${noStr} | ${namaAdv} | ${prioStr}${item.instruksiKhusus}`;
  };

  const handleUbahAdvokatPadaPratinjau = async (
    itemTarget: ItemDisposisi,
    advokatIdBaru: string
  ) => {
    const updatedList = hasilPratinjau.map((it) =>
      it.id === itemTarget.id
        ? { ...it, advokatId: advokatIdBaru, assignedAutomatically: false }
        : it
    );
    const nextCatatan = updatedList.map((it) => formatItemKeBarisCatatan(it)).join('\n');
    setItems(updatedList);
    setCatatanMentah(nextCatatan);
    try {
      await replaceAllDisposisiItemsInCloud(
        updatedList,
        nextCatatan,
        metadata,
        getActorUid()
      );
    } catch (err) {
      console.error('Gagal memperbarui PIC pratinjau:', err);
    }
    const namaAdv = advokatList.find((a) => a.id === advokatIdBaru)?.nama || 'Advokat';
    tampilkanPesan(`PIC perkara "${itemTarget.perkara}" diubah ke ${namaAdv}.`);
  };

  const handleTerapkanAdvokatKeSemuaBaris = async () => {
    if (advokatPilihanKonverter === 'auto') {
      const resetOtomatis = hasilPratinjau.map(
        (it) =>
          `${it.hari} ${it.waktuMulai} | ${it.lokasi} | ${it.perkara}${
            it.nomorPerkara !== '-' ? ` (No. ${it.nomorPerkara})` : ''
          } | Otomatis | ${
            it.prioritas === 'Tinggi' ? 'Prioritas Tinggi - ' : ''
          }${it.instruksiKhusus}`
      );
      const nextCatatan = resetOtomatis.join('\n');
      const yeni = parseCatatanMentah(
        nextCatatan,
        metadata.tanggalMulaiMinggu,
        advokatList
      );
      setCatatanMentah(nextCatatan);
      setItems(yeni);
      await replaceAllDisposisiItemsInCloud(yeni, nextCatatan, metadata, getActorUid());
      tampilkanPesan(
        'Seluruh baris diatur ke pembagian otomatis berdasarkan spesialisasi & beban.'
      );
      return;
    }

    const adv = advokatList.find((a) => a.id === advokatPilihanKonverter);
    if (!adv) return;
    const updatedList = hasilPratinjau.map((it) => ({
      ...it,
      advokatId: adv.id,
      assignedAutomatically: false,
    }));
    const nextCatatan = updatedList
      .map((it) => formatItemKeBarisCatatan(it, adv.id))
      .join('\n');
    setItems(updatedList);
    setCatatanMentah(nextCatatan);
    await replaceAllDisposisiItemsInCloud(
      updatedList,
      nextCatatan,
      metadata,
      getActorUid()
    );
    tampilkanPesan(`Seluruh agenda pada konverter ditugaskan kepada ${adv.nama}.`);
  };

  const handleResetKeContoh = async () => {
    setCatatanMentah(SAMPLE_CATATAN_MENTAH);
    const baru = parseCatatanMentah(
      SAMPLE_CATATAN_MENTAH,
      metadata.tanggalMulaiMinggu,
      advokatList
    );
    setItems(baru);
    await replaceAllDisposisiItemsInCloud(
      baru,
      SAMPLE_CATATAN_MENTAH,
      metadata,
      getActorUid()
    );
    tampilkanPesan('Contoh jadwal mingguan Ryan Gumay Law Firm berhasil dimuat ulang.');
  };

  const handleAutoReassignConflict = async (itemId: string) => {
    const target = items.find((i) => i.id === itemId);
    if (!target) return;
    const otherItems = items.filter((i) => i.id !== itemId);
    const kandidatLain = advokatList.filter(
      (a) => a.aktif && a.id !== target.advokatId
    );
    const advokatBaruId = pilihAdvokatOtomatis(
      `${target.lokasi} ${target.perkara}`,
      target.kategori,
      target.hari,
      target.waktuMulai,
      kandidatLain.length > 0 ? kandidatLain : advokatList,
      otherItems
    );
    const updatedItem: ItemDisposisi = {
      ...target,
      advokatId: advokatBaruId,
      assignedAutomatically: true,
    };
    const namaAdv = advokatList.find((a) => a.id === advokatBaruId)?.nama || 'Advokat Cadangan';
    setItems((prev) => prev.map((i) => (i.id === itemId ? updatedItem : i)));
    await updateDisposisiItemInCloud(updatedItem, getActorUid());
    tampilkanPesan(`Penugasan "${target.perkara}" dialihkan ke ${namaAdv}.`);
  };

  const handleExportCSV = () => {
    const matrix = bangunMatriksLembarDisposisi(
      items,
      advokatList,
      metadata,
      modeKelompokDisposisi,
      filterAdvokatDisposisi
    );

    const escapeCsv = (val: string) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const csvContent =
      '\uFEFF' + matrix.map((row) => row.map(escapeCsv).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Lembar_Disposisi_Ryan_Gumay_Law_Firm_${metadata.tanggalMulaiMinggu}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    tampilkanPesan(
      'Berkas CSV berhasil diunduh sesuai tampilan & susunan Lembar Disposisi.'
    );
  };

  const handleExportXLSX = () => {
    const matrix = bangunMatriksLembarDisposisi(
      items,
      advokatList,
      metadata,
      modeKelompokDisposisi,
      filterAdvokatDisposisi
    );

    const worksheet = XLSX.utils.aoa_to_sheet(matrix);
    worksheet['!cols'] = [
      { wch: 28 },
      { wch: 36 },
      { wch: 48 },
      { wch: 40 },
      { wch: 52 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lembar Disposisi');
    XLSX.writeFile(
      workbook,
      `Lembar_Disposisi_Ryan_Gumay_Law_Firm_${metadata.tanggalMulaiMinggu}.xlsx`
    );
    tampilkanPesan(
      'Berkas Excel (.xlsx) berhasil diunduh sesuai tampilan & susunan Lembar Disposisi.'
    );
  };

  const handleCopyWhatsApp = (advokatFilterId?: string) => {
    const targetItems = advokatFilterId
      ? items.filter((i) => apakahAdvokatTerlibat(i, advokatFilterId))
      : items;

    const advTarget = advokatFilterId
      ? advokatList.find((a) => a.id === advokatFilterId)
      : undefined;

    const lines: string[] = [
      `*LEMBAR DISPOSISI MINGGUAN — RYAN GUMAY LAW FIRM*`,
      `No. Dokumen: ${metadata.nomorDokumen}`,
      `Periode: ${formatRentangMinggu(metadata.tanggalMulaiMinggu)}`,
      advTarget
        ? `Penerima Tugas: *${advTarget.nama}*`
        : `Penerima: *Seluruh Tim Advokat & Associate*`,
      `----------------------------------------`,
    ];

    HARI_URUTAN.forEach((hari) => {
      const hariItems = targetItems.filter((i) => i.hari === hari);
      if (hariItems.length === 0) return;
      lines.push(`\n*${hari.toUpperCase()}, ${formatTanggalIndonesia(hariItems[0].tanggalISO)}*`);
      hariItems.forEach((item, idx) => {
        const pic = advokatList.find((a) => a.id === item.advokatId);
        const pendampingNames = getPendampingList(item).map((v) =>
          resolveNamaPendamping(v, advokatList)
        );
        lines.push(
          `${idx + 1}. *${item.waktuMulai}–${item.waktuSelesai} WIB* | *${item.lokasi}*`
        );
        lines.push(
          `   Perkara: ${item.perkara}${item.nomorPerkara !== '-' ? ` (${item.nomorPerkara})` : ''}`
        );
        lines.push(
          `   PIC: ${pic?.nama || '-'}${item.prioritas === 'Tinggi' ? ' [PRIORITAS TINGGI]' : ''}`
        );
        if (pendampingNames.length > 0) {
          lines.push(`   Pendamping: ${pendampingNames.join(', ')}`);
        }
        lines.push(`   Disposisi: _${item.instruksiKhusus}_`);
      });
    });

    lines.push(`\n----------------------------------------`);
    lines.push(`*Catatan Kepala Kantor (${metadata.kepalaKantor}):*`);
    lines.push(metadata.catatanUmum);

    navigator.clipboard.writeText(lines.join('\n'));
    const key = advokatFilterId ? `wa-${advokatFilterId}` : 'wa-all';
    setCopiedKey(key);
    tampilkanPesan('Format pesan disposisi WhatsApp berhasil disalin ke clipboard.');
    setTimeout(() => {
      setCopiedKey((curr) => (curr === key ? null : curr));
    }, 2500);
  };

  const handlePrintLangsung = () => {
    if (activeTab !== 'lembar') {
      setActiveTab('lembar');
      setTimeout(() => {
        window.print();
      }, 250);
    } else {
      window.print();
    }
  };

  // Ringkasan Statistik Mingguan untuk KPI Bar
  const totalSidangPengadilan = items.filter((i) => i.kategori === 'Sidang Pengadilan').length;
  const totalPrioritasTinggi = items.filter((i) => i.prioritas === 'Tinggi').length;
  const totalLokasiUnik = new Set(items.map((i) => i.lokasi)).size;

  return (
    <div className="min-h-screen flex flex-col bg-amber-50/40 text-slate-900">
      {/* Top Bar Contract: Responsive on mobile while preserving 3 zones */}
      <header className="no-print sticky top-0 z-30 bg-white border-b-2 border-yellow-400 px-3.5 sm:px-6 py-2.5 sm:py-3.5 flex flex-wrap md:flex-nowrap items-center justify-between gap-y-2.5 gap-x-3 md:gap-8 shadow-2xs">
        {/* Zone 1: Brand with official Ryan Gumay Law Firm logo */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('lembar');
          }}
          className="order-1 flex items-center gap-2 sm:gap-3 font-display text-base sm:text-xl font-bold tracking-tight text-slate-950 whitespace-nowrap shrink-0"
        >
          <img
            src="/assets/aistudio/logo_rg_f_775b191a.png"
            alt="Logo Ryan Gumay Law Firm"
            referrerPolicy="no-referrer"
            className="w-8 h-8 sm:w-10 sm:h-10 object-contain shrink-0"
          />
          <span>Ryan Gumay Law Firm</span>
        </a>

        {/* Zone 2: 4 concise single-line navigation links */}
        <nav className="order-3 md:order-2 w-full md:w-auto flex items-center justify-between sm:justify-start gap-1 sm:gap-6 text-xs sm:text-sm font-medium text-slate-600 overflow-x-auto pt-2 md:pt-0 border-t md:border-t-0 border-amber-100">
          <button
            type="button"
            onClick={() => setActiveTab('konverter')}
            className={`px-2 py-1.5 md:px-0 md:py-1 rounded-md md:rounded-none border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'konverter'
                ? 'bg-yellow-400/25 md:bg-transparent border-yellow-500 text-slate-950 font-bold'
                : 'border-transparent hover:text-slate-950'
            }`}
          >
            Konverter Cepat
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('jadwal')}
            className={`px-2 py-1.5 md:px-0 md:py-1 rounded-md md:rounded-none border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'jadwal'
                ? 'bg-yellow-400/25 md:bg-transparent border-yellow-500 text-slate-950 font-bold'
                : 'border-transparent hover:text-slate-950'
            }`}
          >
            Tabel Jadwal ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('lembar')}
            className={`px-2 py-1.5 md:px-0 md:py-1 rounded-md md:rounded-none border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'lembar'
                ? 'bg-yellow-400/25 md:bg-transparent border-yellow-500 text-slate-950 font-bold'
                : 'border-transparent hover:text-slate-950'
            }`}
          >
            Lembar Disposisi
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('advokat')}
            className={`px-2 py-1.5 md:px-0 md:py-1 rounded-md md:rounded-none border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'advokat'
                ? 'bg-yellow-400/25 md:bg-transparent border-yellow-500 text-slate-950 font-bold'
                : 'border-transparent hover:text-slate-950'
            }`}
          >
            Tim Advokat ({advokatList.filter((a) => a.aktif).length})
          </button>
        </nav>

        {/* Zone 3: 1 primary action button */}
        <div className="order-2 md:order-3 flex items-center shrink-0">
          <button
            type="button"
            onClick={handlePrintLangsung}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold text-slate-950 bg-yellow-400 border border-yellow-500 rounded-lg hover:bg-yellow-500 transition-colors whitespace-nowrap shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cetak Lembar Disposisi</span>
            <span className="sm:hidden">Cetak</span>
          </button>
        </div>
      </header>

      {/* Workspace Context & Summary Strip (Hidden on Print, Compact on Mobile when on Lembar Disposisi) */}
      <section
        className={`no-print bg-gradient-to-b from-amber-50/90 to-white border-b border-amber-200 px-3.5 sm:px-6 py-3 sm:py-5 ${
          activeTab === 'lembar' ? 'hidden md:block' : ''
        }`}
      >
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 sm:gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-amber-900 font-semibold">
                <span>Sistem Internal Kepala Kantor</span>
                <span aria-hidden="true">·</span>
                <span>
                  {cloudReady ? 'Tersinkronisasi untuk Semua Pengguna' : 'Menghubungkan Data...'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular">No. {metadata.nomorDokumen}</span>
              </div>
              <h1 className="text-lg sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-950 mt-1">
                Konverter Daftar Agenda Cepat ke Lembar Disposisi Mingguan
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 rounded-lg px-2.5 sm:px-3 py-1.5">
                <label
                  htmlFor="global-week-picker"
                  className="text-xs font-medium text-amber-950 whitespace-nowrap"
                >
                  Minggu Mulai (Senin):
                </label>
                <input
                  id="global-week-picker"
                  type="date"
                  value={metadata.tanggalMulaiMinggu}
                  onChange={(e) =>
                    handleUpdateMetadata({
                      ...metadata,
                      tanggalMulaiMinggu: e.target.value,
                    })
                  }
                  className="text-xs font-mono-tabular font-semibold text-slate-950 bg-transparent focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => handleCopyWhatsApp()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold text-slate-900 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors whitespace-nowrap shrink-0"
              >
                {copiedKey === 'wa-all' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Pesan WA Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-amber-700" />
                    <span>Salin Ringkasan WA</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold text-slate-900 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors whitespace-nowrap shrink-0"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-700" />
                <span>Ekspor CSV</span>
              </button>
            </div>
          </div>

          {/* 4-Column Metric Summary Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-amber-200/80">
            <div className="py-1">
              <div className="text-xs text-amber-900/80 font-medium">Periode Penugasan Mingguan</div>
              <div className="text-sm font-bold font-mono-tabular text-slate-950 mt-0.5">
                {formatRentangMinggu(metadata.tanggalMulaiMinggu)}
              </div>
            </div>
            <div className="py-1">
              <div className="text-xs text-amber-900/80 font-medium">Total Agenda & Persidangan</div>
              <div className="text-sm font-bold font-mono-tabular text-slate-950 mt-0.5">
                {items.length} Penugasan · {totalSidangPengadilan} Sidang Pengadilan
              </div>
            </div>
            <div className="py-1">
              <div className="text-xs text-amber-900/80 font-medium">Sebaran Instansi & Prioritas</div>
              <div className="text-sm font-bold font-mono-tabular text-slate-950 mt-0.5">
                {totalLokasiUnik} Lokasi Pengadilan · {totalPrioritasTinggi} Prioritas Tinggi
              </div>
            </div>
            <div className="py-1">
              <div className="text-xs text-amber-900/80 font-medium">Status Kesiapan Jadwal</div>
              <div className="text-sm font-bold font-mono-tabular mt-0.5">
                {konflikJadwal.length === 0 ? (
                  <span className="text-emerald-800">0 Bentrok · Siap Disposisi</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveTab('jadwal')}
                    className="text-amber-800 underline underline-offset-2"
                  >
                    {konflikJadwal.length} Potensi Bentrok (Periksa)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Toast Notification Banner */}
      {notifikasi && (
        <div className="no-print fixed bottom-5 right-5 z-40 bg-yellow-400 text-slate-950 px-4 py-2.5 rounded-lg shadow-md border border-yellow-500 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-slate-950 shrink-0" />
          <span>{notifikasi}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="print-container flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6">
        {/* Panel Impor CSV & Google Spreadsheet (Tampil di Tab Konverter & Tabel Jadwal) */}
        {(activeTab === 'konverter' || activeTab === 'jadwal') && (
          <div className="no-print">
            <PanelImporData
              mondayISO={metadata.tanggalMulaiMinggu}
              advokatList={advokatList}
              onImportSuccess={async (importedItems, formattedLines, mode, sumberLabel) => {
                const actorUid = getActorUid();
                if (mode === 'replace') {
                  const nextCatatan = formattedLines.join('\n');
                  setItems(importedItems);
                  setCatatanMentah(nextCatatan);
                  await replaceAllDisposisiItemsInCloud(
                    importedItems,
                    nextCatatan,
                    metadata,
                    actorUid
                  );
                  tampilkanPesan(
                    `${importedItems.length} agenda dari ${sumberLabel} berhasil menggantikan jadwal & disinkronkan.`
                  );
                } else {
                  const nextCatatan = catatanMentah.trim()
                    ? `${catatanMentah.trim()}\n${formattedLines.join('\n')}`
                    : formattedLines.join('\n');
                  setItems((prev) => [...prev, ...importedItems]);
                  setCatatanMentah(nextCatatan);
                  await appendDisposisiItemsInCloud(
                    importedItems,
                    nextCatatan,
                    metadata,
                    actorUid
                  );
                  tampilkanPesan(
                    `${importedItems.length} agenda dari ${sumberLabel} berhasil ditambahkan & disinkronkan.`
                  );
                }
              }}
            />
          </div>
        )}

        {/* TAB 1: KONVERTER DAFTAR AGENDA CEPAT */}
        {activeTab === 'konverter' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Column: Raw Fast Agenda Input */}
            <div className="lg:col-span-6 bg-white border border-amber-200 rounded-lg p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2 border-b border-amber-100 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-950">
                      1. Catatan Agenda Mentah Mingguan
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Ketik atau tempel daftar agenda rapat mingguan. Pisahkan dengan tanda{' '}
                      <code className="font-mono bg-amber-100 text-amber-950 px-1 py-0.5 rounded">
                        |
                      </code>{' '}
                      atau tulis dalam kalimat bebas per baris.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetKeContoh}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-md transition-colors whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Muat Contoh</span>
                  </button>
                </div>

                {/* Pilihan Advokat & Tombol Sisipkan Cepat */}
                <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label
                      htmlFor="konverter-pilih-advokat"
                      className="text-xs font-semibold text-slate-900 whitespace-nowrap"
                    >
                      Pilih Advokat Penugasan (PIC):
                    </label>
                    <div className="flex flex-wrap items-center gap-2 flex-1 sm:justify-end">
                      <select
                        id="konverter-pilih-advokat"
                        value={advokatPilihanKonverter}
                        onChange={(e) => setAdvokatPilihanKonverter(e.target.value)}
                        className="text-xs font-semibold bg-white border border-amber-300 rounded-md px-2.5 py-1.5 text-slate-950 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      >
                        <option value="auto">Otomatis (Sesuai Spesialisasi & Beban)</option>
                        {advokatList.map((adv) => (
                          <option key={adv.id} value={adv.id}>
                            {adv.nama} ({adv.jabatan})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleTerapkanAdvokatKeSemuaBaris}
                        disabled={hasilPratinjau.length === 0}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-950 bg-yellow-400 border border-yellow-500 rounded-md hover:bg-yellow-500 disabled:opacity-40 transition-colors whitespace-nowrap"
                      >
                        Terapkan ke Semua Baris
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-amber-200/80">
                    <span className="text-xs text-amber-900 mr-1 font-medium">
                      Tambah Baris untuk Advokat Ini:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const adv = advokatList.find((a) => a.id === advokatPilihanKonverter);
                        const picStr = adv ? adv.panggilan : 'Otomatis';
                        handleSisipkanTemplateBaris(
                          `Senin 09:30 | PN Palembang Kelas IA Khusus | Sidang Pembuktian Perdata PT ... (No. .../Pdt.G/2026/PN PLG) | ${picStr} | Prioritas Tinggi - Siapkan bukti surat & saksi`
                        );
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-800 bg-white border border-amber-300 hover:bg-amber-100 rounded-md transition-colors whitespace-nowrap"
                    >
                      <Plus className="w-3 h-3 text-amber-700" />
                      <span>Sidang Pengadilan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const adv = advokatList.find((a) => a.id === advokatPilihanKonverter);
                        const picStr = adv ? adv.panggilan : 'Otomatis';
                        handleSisipkanTemplateBaris(
                          `Rabu 10:00 | Polda Sumatera Selatan | Pendampingan Pemeriksaan BAP Saksi Klien ... | ${picStr} | Koordinasi dengan penyidik sebelum pemeriksaan`
                        );
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-800 bg-white border border-amber-300 hover:bg-amber-100 rounded-md transition-colors whitespace-nowrap"
                    >
                      <Plus className="w-3 h-3 text-amber-700" />
                      <span>Pendampingan BAP</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const adv = advokatList.find((a) => a.id === advokatPilihanKonverter);
                        const picStr = adv ? adv.panggilan : 'Otomatis';
                        handleSisipkanTemplateBaris(
                          `Kamis 14:00 | Kantor Ryan Gumay Law Firm | Konsultasi & Review Kontrak Komersial PT ... | ${picStr} | Siapkan draf perjanjian terbaru`
                        );
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-800 bg-white border border-amber-300 hover:bg-amber-100 rounded-md transition-colors whitespace-nowrap"
                    >
                      <Plus className="w-3 h-3 text-amber-700" />
                      <span>Konsultasi & Kontrak</span>
                    </button>
                  </div>
                </div>

                {/* Raw Textarea */}
                <div>
                  <textarea
                    rows={14}
                    value={catatanMentah}
                    onChange={(e) => handleUbahCatatanMentah(e.target.value)}
                    placeholder="Contoh: Senin 09:00 | PN Palembang | Sidang Gugatan Wanprestasi PT Maju Jaya | Iqbal | Siapkan bukti surat..."
                    className="w-full p-3.5 text-xs font-mono-tabular leading-relaxed bg-amber-50/40 border border-amber-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 mt-1.5 gap-2">
                    <span>
                      Format otomatis mengenali: <strong>Hari</strong> · <strong>Jam</strong> ·{' '}
                      <strong>Lokasi Pengadilan</strong> · <strong>Perkara</strong> ·{' '}
                      <strong>Nama Advokat</strong> · <strong>Instruksi</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUbahCatatanMentah('')}
                      className="text-slate-500 hover:text-red-700 font-medium"
                    >
                      Bersihkan Catatan
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="pt-3 border-t border-amber-200 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-600">
                  Terbaca{' '}
                  <span className="font-mono-tabular font-bold text-slate-950">
                    {hasilPratinjau.length}
                  </span>{' '}
                  baris agenda siap dikonversi
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleKonversiTambah}
                    disabled={hasilPratinjau.length === 0}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-900 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 disabled:opacity-40 transition-colors whitespace-nowrap"
                  >
                    Tambahkan ke Jadwal Aktif
                  </button>
                  <button
                    type="button"
                    onClick={handleKonversiGanti}
                    disabled={hasilPratinjau.length === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-yellow-400 border border-yellow-500 rounded-lg hover:bg-yellow-500 disabled:opacity-40 transition-colors whitespace-nowrap"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Terapkan ke Lembar Disposisi</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Instant Structured Disposition Preview */}
            <div className="lg:col-span-6 bg-white border border-amber-200 rounded-lg p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2 border-b border-amber-100 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-950">
                      2. Pratinjau Hasil Pengelompokan & Penugasan
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Bila baris catatan tidak mencantumkan nama advokat, sistem otomatis memilih
                      advokat sesuai spesialisasi dan beban kerja terendah.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await handleKonversiGanti();
                      setActiveTab('lembar');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-950 bg-yellow-400 hover:bg-yellow-500 border border-yellow-500 rounded-md transition-colors whitespace-nowrap shrink-0"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Buka Lembar Resmi</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Live Parsed Preview List */}
                {hasilPratinjau.length === 0 ? (
                  <div className="py-16 text-center border border-dashed border-amber-300 bg-amber-50/30 rounded-lg">
                    <img
                      src="/assets/aistudio/logo_rg_f_775b191a.png"
                      alt="Logo Ryan Gumay Law Firm"
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 object-contain mx-auto mb-2"
                    />
                    <p className="text-sm font-medium text-slate-700">
                      Catatan agenda masih kosong
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Ketik agenda di sebelah kiri atau klik tombol "Muat Contoh" untuk melihat
                      konversi instan.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[430px] overflow-y-auto pr-1 space-y-4 divide-y divide-amber-100">
                    {HARI_URUTAN.map((hari) => {
                      const grupHari = hasilPratinjau.filter((i) => i.hari === hari);
                      if (grupHari.length === 0) return null;

                      return (
                        <div key={hari} className="pt-3 first:pt-0 space-y-2">
                          <div className="flex items-baseline justify-between">
                            <h3 className="text-xs font-bold text-slate-950">
                              {hari}, {formatTanggalIndonesia(grupHari[0].tanggalISO)}
                            </h3>
                            <span className="text-xs font-mono-tabular text-amber-900 font-medium">
                              {grupHari.length} Penugasan
                            </span>
                          </div>

                          <div className="space-y-2">
                            {grupHari.map((item) => {
                              return (
                                <div
                                  key={item.id}
                                  className="p-3 rounded-lg bg-amber-50/60 border border-amber-200 text-xs space-y-1.5"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="font-mono-tabular font-semibold text-slate-950">
                                      {item.waktuMulai}–{item.waktuSelesai} WIB ·{' '}
                                      <span className="font-sans">{item.lokasi}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <label
                                        htmlFor={`pic-select-${item.id}`}
                                        className="text-slate-700 font-medium"
                                      >
                                        Advokat (PIC):
                                      </label>
                                      <select
                                        id={`pic-select-${item.id}`}
                                        value={item.advokatId}
                                        onChange={(e) =>
                                          handleUbahAdvokatPadaPratinjau(item, e.target.value)
                                        }
                                        className="font-semibold text-slate-950 bg-white border border-amber-300 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                      >
                                        {advokatList.map((adv) => (
                                          <option key={adv.id} value={adv.id}>
                                            {adv.nama} ({adv.jabatan})
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>

                                  <div className="font-semibold text-slate-950">
                                    {item.perkara}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2 text-slate-600">
                                    <span>{item.kategori}</span>
                                    {item.nomorPerkara !== '-' && (
                                      <>
                                        <span aria-hidden="true">·</span>
                                        <span className="font-mono-tabular">
                                          No: {item.nomorPerkara}
                                        </span>
                                      </>
                                    )}
                                    {item.prioritas === 'Tinggi' && (
                                      <>
                                        <span aria-hidden="true">·</span>
                                        <span className="inline-flex items-center gap-1 text-amber-800 font-semibold">
                                          <AlertTriangle className="w-3 h-3" />
                                          Prioritas Tinggi
                                        </span>
                                      </>
                                    )}
                                  </div>

                                  <div className="text-slate-700 pt-0.5">
                                    <span className="font-semibold text-slate-900">Disposisi:</span>{' '}
                                    {item.instruksiKhusus}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick Workload Balance Bar across Advocates */}
              <div className="pt-3 border-t border-amber-200">
                <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                  <span className="font-semibold text-slate-900">
                    Distribusi Beban Kerja Tim Saat Ini:
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('jadwal')}
                    className="text-amber-900 font-bold hover:underline"
                  >
                    Ubah Manual di Tabel Jadwal →
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {advokatList
                    .filter((a) => a.aktif)
                    .map((adv) => {
                      const count = items.filter((i) => apakahAdvokatTerlibat(i, adv.id)).length;
                      return (
                        <div
                          key={adv.id}
                          className="px-2.5 py-1.5 bg-amber-50/70 border border-amber-200 rounded flex items-center justify-between text-xs"
                        >
                          <span className="font-medium text-slate-900 truncate">
                            {adv.panggilan}
                          </span>
                          <span className="font-mono-tabular font-bold text-slate-950">
                            {count}/{adv.kuotaMingguan}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TABEL JADWAL INTERAKTIF & DETEKSI BENTROK */}
        {activeTab === 'jadwal' && (
          <TabelJadwalInteraktif
            items={items}
            advokatList={advokatList}
            mondayISO={metadata.tanggalMulaiMinggu}
            konflikList={konflikJadwal}
            onUpdateItem={async (updated) => {
              setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
              await updateDisposisiItemInCloud(updated, getActorUid());
            }}
            onDeleteItem={async (id) => {
              setItems((prev) => prev.filter((i) => i.id !== id));
              await deleteDisposisiItemInCloud(id);
              tampilkanPesan('Baris agenda dihapus dari jadwal bersama.');
            }}
            onAddItem={async (newItem) => {
              setItems((prev) => [...prev, newItem]);
              await createDisposisiItemInCloud(newItem, getActorUid());
              tampilkanPesan(`Agenda "${newItem.perkara}" berhasil ditambahkan & disinkronkan.`);
            }}
            onAutoReassignConflict={handleAutoReassignConflict}
          />
        )}

        {/* TAB 3: LEMBAR DISPOSISI RESMI (SIAP CETAK / PDF / CSV) */}
        {activeTab === 'lembar' && (
          <LembarDisposisiResmi
            items={items}
            advokatList={advokatList}
            metadata={metadata}
            modeKelompok={modeKelompokDisposisi}
            onChangeModeKelompok={setModeKelompokDisposisi}
            filterAdvokatId={filterAdvokatDisposisi}
            onChangeFilterAdvokatId={setFilterAdvokatDisposisi}
            onUpdateMetadata={handleUpdateMetadata}
            onExportCSV={handleExportCSV}
            onExportXLSX={handleExportXLSX}
            onCopyWhatsApp={handleCopyWhatsApp}
            copiedKey={copiedKey}
            onNotify={tampilkanPesan}
          />
        )}

        {/* TAB 4: MANAJEMEN TIM ADVOKAT */}
        {activeTab === 'advokat' && (
          <ManajemenTimAdvokat
            advokatList={advokatList}
            items={items}
            onAddAdvokat={async (baru) => {
              setAdvokatList((prev) => [...prev, baru]);
              await createAdvokatInCloud(baru, getActorUid());
              tampilkanPesan(`Advokat ${baru.nama} berhasil ditambahkan & disinkronkan.`);
            }}
            onUpdateAdvokat={async (updated) => {
              setAdvokatList((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
              await updateAdvokatInCloud(updated, getActorUid());
              tampilkanPesan(`Data personel ${updated.nama} berhasil diperbarui & disinkronkan.`);
            }}
            onDeleteAdvokat={async (id) => {
              setAdvokatList((prev) => prev.filter((a) => a.id !== id));
              await deleteAdvokatInCloud(id);
              tampilkanPesan('Data advokat dihapus dari database bersama.');
            }}
            onCopyWhatsAppPerAdvokat={(advId) => handleCopyWhatsApp(advId)}
            copiedKey={copiedKey}
          />
        )}
      </main>

      {/* Quiet Footer (Hidden on Print) */}
      <footer className="no-print border-t border-amber-200 bg-amber-50/70 px-6 py-4 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-amber-950/80">
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/aistudio/logo_rg_f_775b191a.png"
              alt="Logo Ryan Gumay Law Firm"
              referrerPolicy="no-referrer"
              className="w-6 h-6 object-contain shrink-0"
            />
            <span className="font-medium text-slate-900">
              Ryan Gumay Law Firm · Sistem Internal Disposisi & Penugasan Mingguan Tim Advokat
            </span>
          </div>
          <div>
            Penyimpanan Cloud Terpusat · Data tersinkronisasi secara real-time untuk seluruh pengguna
          </div>
        </div>
      </footer>
    </div>
  );
}
