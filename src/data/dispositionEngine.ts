export type HariKerja = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu';

export type KategoriAgenda =
  | 'Sidang Pengadilan'
  | 'Pendampingan BAP / Penyidikan'
  | 'Mediasi & Negosiasi'
  | 'Rapat Kreditur / PKPU'
  | 'Konsultasi & Legal Drafting';

export type TingkatPrioritas = 'Tinggi' | 'Normal' | 'Terjadwal';

export type JabatanAdvokat = 'Managing' | 'Co Managing' | 'Head Office' | 'Advokat';

export const DAFTAR_JABATAN: JabatanAdvokat[] = [
  'Managing',
  'Co Managing',
  'Head Office',
  'Advokat',
];

export interface Advokat {
  id: string;
  nama: string;
  panggilan: string;
  jabatan: JabatanAdvokat;
  spesialisasi: string[];
  kuotaMingguan: number;
  nomorInduk: string;
  telepon: string;
  aktif: boolean;
}

export interface ItemDisposisi {
  id: string;
  hari: HariKerja;
  tanggalISO: string; // YYYY-MM-DD computed from week start
  waktuMulai: string; // HH:mm
  waktuSelesai: string; // HH:mm
  lokasi: string;
  kategori: KategoriAgenda;
  perkara: string;
  nomorPerkara: string;
  advokatId: string;
  advokatPendampingId?: string;
  advokatPendampingIds?: string[];
  prioritas: TingkatPrioritas;
  instruksiKhusus: string;
  statusKonfirmasi: 'Menunggu Konfirmasi' | 'Siap Jalan' | 'Selesai';
  assignedAutomatically?: boolean;
}

export function getPendampingList(item: ItemDisposisi): string[] {
  if (Array.isArray(item.advokatPendampingIds)) {
    return item.advokatPendampingIds.filter((v) => Boolean(v && v.trim()));
  }
  if (item.advokatPendampingId && item.advokatPendampingId.trim()) {
    return [item.advokatPendampingId.trim()];
  }
  return [];
}

export function resolveNamaPendamping(val: string, advokatList: Advokat[]): string {
  const found = advokatList.find((a) => a.id === val);
  return found ? found.nama : val;
}

export function resolvePanggilanPendamping(val: string, advokatList: Advokat[]): string {
  const found = advokatList.find((a) => a.id === val);
  return found ? found.panggilan : val;
}

export function apakahAdvokatTerlibat(item: ItemDisposisi, advokatId: string): boolean {
  if (item.advokatId === advokatId) return true;
  return getPendampingList(item).includes(advokatId);
}

export interface MetadataDisposisi {
  nomorDokumen: string;
  tanggalMulaiMinggu: string; // Monday YYYY-MM-DD
  kepalaKantor: string;
  jabatanKepala: string;
  catatanUmum: string;
  kotaKantor: string;
}

export interface KonflikJadwal {
  itemId: string;
  rekanItemId: string;
  advokatId: string;
  jenis: 'Bentrok Jam' | 'Jarak Antar Pengadilan Terlalu Dekat';
  pesan: string;
}

export const HARI_URUTAN: HariKerja[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const INITIAL_ADVOKAT: Advokat[] = [
  {
    id: 'adv-1',
    nama: 'Dr (C) Ryan Gumay, S.H., M.H., C.HRM., C.TL',
    panggilan: 'Ryan Gumay',
    jabatan: 'Managing',
    spesialisasi: ['Strategi Litigasi Utama', 'Hukum Korporasi & Kepailitan', 'Pidana Khusus'],
    kuotaMingguan: 5,
    nomorInduk: 'RGLF-MNG-001',
    telepon: '0811-7800-001',
    aktif: true,
  },
  {
    id: 'adv-2',
    nama: 'Dr (C) Muhamad Yosi Agustian, S.H., M.H., C.MSP',
    panggilan: 'Yosi',
    jabatan: 'Co Managing',
    spesialisasi: ['Pidana Khusus & Tipikor', 'Litigasi Perdata', 'Sengketa Komersial'],
    kuotaMingguan: 6,
    nomorInduk: 'RGLF-COM-002',
    telepon: '0811-7800-002',
    aktif: true,
  },
  {
    id: 'adv-3',
    nama: 'Verel Amartya, S.H., C.LA',
    panggilan: 'Verel',
    jabatan: 'Head Office',
    spesialisasi: ['Manajemen Perkara & Koordinasi', 'Audit Hukum (Legal Audit)', 'Mediasi'],
    kuotaMingguan: 6,
    nomorInduk: 'RGLF-HO-003',
    telepon: '0812-7800-003',
    aktif: true,
  },
  {
    id: 'adv-4',
    nama: 'Iqbal Yassin, S.H., M.H',
    panggilan: 'Iqbal',
    jabatan: 'Advokat',
    spesialisasi: ['Litigasi Perdata', 'Sengketa Komersial', 'Kepailitan & PKPU'],
    kuotaMingguan: 6,
    nomorInduk: 'RGLF-ADV-004',
    telepon: '0812-7800-004',
    aktif: true,
  },
  {
    id: 'adv-5',
    nama: 'Wahyu Mustika Chandra, S.H',
    panggilan: 'Wahyu Mustika',
    jabatan: 'Advokat',
    spesialisasi: ['Litigasi Pidana', 'Pendampingan BAP', 'Polda & Kejaksaan'],
    kuotaMingguan: 6,
    nomorInduk: 'RGLF-ADV-005',
    telepon: '0812-7800-005',
    aktif: true,
  },
  {
    id: 'adv-6',
    nama: 'Erick Ersi Yusardi, S.H., M.H',
    panggilan: 'Erick',
    jabatan: 'Advokat',
    spesialisasi: ['Pidana Khusus & Tipikor', 'Litigasi Perdata', 'Sengketa Pertanahan'],
    kuotaMingguan: 6,
    nomorInduk: 'RGLF-ADV-006',
    telepon: '0812-7800-006',
    aktif: true,
  },
  {
    id: 'adv-7',
    nama: 'Wahyu Pratama, S.H., M.H',
    panggilan: 'Wahyu Pratama',
    jabatan: 'Advokat',
    spesialisasi: ['Sengketa TUN (PTUN)', 'Hukum Ketenagakerjaan (PHI)', 'Litigasi Perdata'],
    kuotaMingguan: 6,
    nomorInduk: 'RGLF-ADV-007',
    telepon: '0812-7800-007',
    aktif: true,
  },
  {
    id: 'adv-8',
    nama: 'Chatrina Aprilia, S.H., M.Si., C.CD., C.MSP',
    panggilan: 'Chatrina',
    jabatan: 'Advokat',
    spesialisasi: ['Kontrak & Legal Drafting', 'Hukum Korporasi', 'Konsultasi Klien'],
    kuotaMingguan: 6,
    nomorInduk: 'RGLF-ADV-008',
    telepon: '0812-7800-008',
    aktif: true,
  },
  {
    id: 'adv-9',
    nama: 'Asep Nur Firmansyah, S.H',
    panggilan: 'Asep',
    jabatan: 'Advokat',
    spesialisasi: ['Hukum Keluarga & Waris', 'Mediasi & Negosiasi', 'Pengadilan Agama'],
    kuotaMingguan: 6,
    nomorInduk: 'RGLF-ADV-009',
    telepon: '0812-7800-009',
    aktif: true,
  },
  {
    id: 'adv-10',
    nama: 'Muhamad Rafly Ramadhan, S.H',
    panggilan: 'Rafly',
    jabatan: 'Advokat',
    spesialisasi: ['Riset Hukum & Berkas', 'Pendampingan Sidang', 'Legal Drafting'],
    kuotaMingguan: 7,
    nomorInduk: 'RGLF-ADV-010',
    telepon: '0812-7800-010',
    aktif: true,
  },
];

export const SAMPLE_CATATAN_MENTAH = `Senin 09:00 | PN Palembang Kelas IA Khusus | Sidang Pembuktian Gugatan Wanprestasi PT Sriwijaya Makmur (No. 142/Pdt.G/2026/PN PLG) | Iqbal | Prioritas Tinggi - Siapkan 8 bukti surat bermeterai & hadirkan 2 saksi fakta
Senin 10:30 | Pengadilan Tipikor pada PN Palembang | Sidang Pembacaan Eksepsi Perkara Pengadaan Konstruksi (No. 48/Pid.Sus-TPK/2026/PN PLG) | Erick | Prioritas Tinggi - Bawa 6 rangkap berkas eksepsi resmi
Selasa 09:30 | PA Palembang Kelas IA | Mediasi Sengketa Waris Keluarga H. Darmawan (No. 819/Pdt.G/2026/PA.PLG) | Asep | Klien prinsipal wajib hadir, siapkan draf kesepakatan perdamaian
Selasa 14:00 | Kantor Ryan Gumay Law Firm | Rapat Konsultasi & Penyusunan Kontrak Kerjasama PT Musi Energi | Chatrina | Review klausul penyelesaian sengketa dan denda keterlambatan
Rabu 09:00 | PN Palembang Kelas IA Khusus | Sidang Jawaban Tergugat Sengketa Lahan Komersial (No. 91/Pdt.G/2026/PN PLG) | Yosi | Prioritas Tinggi - Koordinasikan bukti sertifikat asli dengan klien
Rabu 13:30 | PTUN Palembang | Sidang Pemeriksaan Persiapan Gugatan Izin Usaha Perkebunan (No. 34/G/2026/PTUN.PLG) | Wahyu Pratama | Perbaiki posita gugatan sesuai saran majelis hakim
Kamis 09:30 | Polda Sumatera Selatan (Ditreskrimsus) | Pendampingan Pemeriksaan BAP Saksi Korporasi PT Global Distribusi | Wahyu Mustika | Prioritas Tinggi - Pastikan dokumen audit internal telah disiapkan
Kamis 14:00 | Kantor Ryan Gumay Law Firm | Evaluasi Berkas Perkara & Koordinasi Tim Litigasi Mingguan | Verel | Rekapitulasi progres persidangan dan kelengkapan surat kuasa khusus
Jumat 09:00 | PHI pada PN Palembang | Sidang Duplik Perselisihan Hubungan Industrial PT Mitra Sawit (No. 27/Pdt.Sus-PHI/2026/PN PLG) | Wahyu Pratama | Koordinasi dengan HRD klien sebelum sidang dibuka
Jumat 14:00 | Kantor Ryan Gumay Law Firm | Penyusunan Memori Banding & Kelengkapan Berkas e-Court | Rafly | Periksa tenggat waktu pengiriman berkas ke Kepaniteraan`;

export const INITIAL_METADATA: MetadataDisposisi = {
  nomorDokumen: '044/RGLF-DISP/X/2026',
  tanggalMulaiMinggu: '2026-10-26', // Monday, Oct 26, 2026
  kepalaKantor: 'Dr (C) Ryan Gumay, S.H., M.H., C.HRM., C.TL',
  jabatanKepala: 'Managing',
  kotaKantor: 'Palembang',
  catatanUmum:
    'Seluruh Advokat Penanggung Jawab wajib memastikan kelengkapan surat kuasa khusus, kartu advokat yang masih berlaku, serta mengunggah dokumen persidangan pada sistem e-Court paling lambat H-1 sebelum jadwal sidang. Laporkan berita acara singkat hasil sidang/agenda ke grup koordinasi kantor maksimal pukul 17.00 WIB pada hari pelaksanaan.',
};

export function hitungTanggalDariHari(mondayISO: string, hari: HariKerja): string {
  const base = new Date(`${mondayISO}T00:00:00`);
  if (Number.isNaN(base.getTime())) return mondayISO;
  const offset = HARI_URUTAN.indexOf(hari);
  const target = new Date(base);
  target.setDate(base.getDate() + (offset >= 0 ? offset : 0));
  const yyyy = target.getFullYear();
  const mm = String(target.getMonth() + 1).padStart(2, '0');
  const dd = String(target.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatTanggalIndonesia(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  const bulan = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatRentangMinggu(mondayISO: string): string {
  const senin = formatTanggalIndonesia(mondayISO);
  const jumatISO = hitungTanggalDariHari(mondayISO, 'Jumat');
  const jumat = formatTanggalIndonesia(jumatISO);
  return `${senin} – ${jumat}`;
}

function tambahJam(waktu: string, durasiMenit: number): string {
  const [hh, mm] = waktu.split(':').map((n) => parseInt(n, 10));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return '11:00';
  const total = hh * 60 + mm + durasiMenit;
  const endH = Math.min(23, Math.floor(total / 60));
  const endM = total % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

function waktuKeMenit(waktu: string): number {
  const [hh, mm] = waktu.split(':').map((n) => parseInt(n, 10));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return 540;
  return hh * 60 + mm;
}

export function deteksiKategori(teks: string): KategoriAgenda {
  const lower = teks.toLowerCase();
  if (
    lower.includes('bap') ||
    lower.includes('polda') ||
    lower.includes('polres') ||
    lower.includes('bareskrim') ||
    lower.includes('penyidik') ||
    lower.includes('kejaksaan') ||
    lower.includes('kpk')
  ) {
    return 'Pendampingan BAP / Penyidikan';
  }
  if (lower.includes('pkpu') || lower.includes('kreditur') || lower.includes('pailit') || lower.includes('niaga')) {
    return 'Rapat Kreditur / PKPU';
  }
  if (lower.includes('mediasi') || lower.includes('negosiasi') || lower.includes('perdamaian') || lower.includes('somasi')) {
    return 'Mediasi & Negosiasi';
  }
  if (
    lower.includes('drafting') ||
    lower.includes('konsultasi') ||
    lower.includes('kontrak') ||
    lower.includes('perjanjian') ||
    lower.includes('review') ||
    lower.includes('evaluasi') ||
    lower.includes('memori kasasi') ||
    lower.includes('kantor')
  ) {
    return 'Konsultasi & Legal Drafting';
  }
  return 'Sidang Pengadilan';
}

export function pilihAdvokatOtomatis(
  teksAgenda: string,
  kategori: KategoriAgenda,
  hari: HariKerja,
  waktuMulai: string,
  advokatList: Advokat[],
  existingItems: ItemDisposisi[]
): string {
  const aktif = advokatList.filter((a) => a.aktif);
  if (aktif.length === 0) return advokatList[0]?.id || 'adv-1';

  const lower = teksAgenda.toLowerCase();

  // Hitung skor kecocokan untuk setiap advokat aktif
  const kandidat = aktif.map((adv) => {
    let skor = 0;

    // 1. Kecocokan spesialisasi
    const specText = adv.spesialisasi.join(' ').toLowerCase();
    if (kategori === 'Pendampingan BAP / Penyidikan' && (specText.includes('pidana') || specText.includes('bap'))) {
      skor += 35;
    }
    if (kategori === 'Rapat Kreditur / PKPU' && (specText.includes('pkpu') || specText.includes('kepailitan'))) {
      skor += 35;
    }
    if (kategori === 'Mediasi & Negosiasi' && (specText.includes('mediasi') || specText.includes('waris'))) {
      skor += 30;
    }
    if (kategori === 'Konsultasi & Legal Drafting' && (specText.includes('korporasi') || specText.includes('drafting'))) {
      skor += 35;
    }
    if ((lower.includes('ptun') || lower.includes('phi') || lower.includes('industrial')) && (specText.includes('ptun') || specText.includes('phi'))) {
      skor += 40;
    }
    if ((lower.includes('tipikor') || lower.includes('pidana')) && specText.includes('pidana')) {
      skor += 40;
    }
    if ((lower.includes('waris') || lower.includes('pa ')) && specText.includes('waris')) {
      skor += 40;
    }

    // 2. Beban kerja minggu ini (semakin sedikit tugas, semakin tinggi skor)
    const jumlahTugas = existingItems.filter((item) => item.advokatId === adv.id).length;
    const sisaKuota = adv.kuotaMingguan - jumlahTugas;
    skor += sisaKuota * 8;

    // 3. Penalti berat jika bentrok di hari & jam yang berdekatan
    const mulaiMenit = waktuKeMenit(waktuMulai);
    const adaBentrokHariItu = existingItems.some((item) => {
      if (item.advokatId !== adv.id || item.hari !== hari) return false;
      const itemMulai = waktuKeMenit(item.waktuMulai);
      return Math.abs(itemMulai - mulaiMenit) < 150; // kurang dari 2.5 jam
    });

    if (adaBentrokHariItu) {
      skor -= 100;
    }

    return { advId: adv.id, skor };
  });

  kandidat.sort((a, b) => b.skor - a.skor);
  return kandidat[0].advId;
}

export function parseCatatanMentah(
  rawText: string,
  mondayISO: string,
  advokatList: Advokat[]
): ItemDisposisi[] {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('//') && !l.startsWith('#'));

  const hasil: ItemDisposisi[] = [];

  lines.forEach((line, idx) => {
    // Hilangkan bullet atau nomor urut di awal baris (mis. "1. ", "- ", "• ")
    const cleanLine = line.replace(/^(\d+[\.\)]\s*|[-•*]\s*)/, '').trim();

    // Deteksi apakah menggunakan pemisah '|' atau ';'
    const parts = cleanLine.includes('|')
      ? cleanLine.split('|').map((s) => s.trim())
      : cleanLine.includes(';')
      ? cleanLine.split(';').map((s) => s.trim())
      : [cleanLine];

    // 1. Ekstrak Hari
    let hari: HariKerja = 'Senin';
    for (const h of HARI_URUTAN) {
      const regex = new RegExp(`\\b${h}\\b`, 'i');
      if (regex.test(cleanLine)) {
        hari = h;
        break;
      }
    }

    // 2. Ekstrak Waktu (mis. 09:00, 09.30, 13:30-15:00)
    let waktuMulai = '09:00';
    let waktuSelesai = '11:00';
    const timeMatch = cleanLine.match(/\b([01]?\d|2[0-3])[:\.]([0-5]\d)(?:\s*-\s*([01]?\d|2[0-3])[:\.]([0-5]\d))?/);
    if (timeMatch) {
      const hh1 = String(timeMatch[1]).padStart(2, '0');
      const mm1 = timeMatch[2];
      waktuMulai = `${hh1}:${mm1}`;
      if (timeMatch[3] && timeMatch[4]) {
        waktuSelesai = `${String(timeMatch[3]).padStart(2, '0')}:${timeMatch[4]}`;
      } else {
        waktuSelesai = tambahJam(waktuMulai, 120);
      }
    }

    // 3. Ekstrak Nomor Perkara jika ada di dalam kurung atau diawali No.
    let nomorPerkara = '-';
    const noPerkaraMatch = cleanLine.match(/(?:No\.?\s*)?(\d+\/[A-Za-z0-9\.\-\/]+\/\d{4}\/[A-Za-z0-9\.\s]+)/i);
    if (noPerkaraMatch) {
      nomorPerkara = noPerkaraMatch[1].trim();
    }

    // 4. Ekstrak Lokasi, Perkara, Advokat, dan Instruksi Khusus
    let lokasi = 'PN Palembang Kelas IA Khusus';
    let perkara = cleanLine;
    let instruksiKhusus = 'Siapkan berkas perkara lengkap & laporkan hasil pelaksanaan.';
    let prioritas: TingkatPrioritas = 'Normal';

    if (/prioritas\s*tinggi|mendesak|urgent|penting/i.test(cleanLine)) {
      prioritas = 'Tinggi';
    }

    const cocokDenganAdvokat = (teks: string, adv: Advokat): boolean => {
      const escapedPanggilan = adv.panggilan.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`\\b${escapedPanggilan}\\b`, 'i').test(teks)) return true;
      const namaTanpaGelar = adv.nama
        .replace(/^Dr\s*\(C\)\s*/i, '')
        .split(',')[0]
        .trim();
      if (namaTanpaGelar && new RegExp(`\\b${namaTanpaGelar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(teks)) {
        return true;
      }
      return false;
    };

    // Cari apakah ada nama advokat di dalam baris
    let matchedAdvokatId: string | null = null;
    for (const adv of advokatList) {
      if (cocokDenganAdvokat(cleanLine, adv)) {
        matchedAdvokatId = adv.id;
        break;
      }
    }

    if (parts.length >= 3) {
      // Format terstruktur: Bagian 0 (Hari & Jam), Bagian 1 (Lokasi), Bagian 2 (Perkara), Bagian 3 (Advokat / Catatan), Bagian 4 (Catatan)
      lokasi = parts[1] || 'Kantor Ryan Gumay Law Firm';
      // Bersihkan nomor perkara dalam kurung dari judul perkara agar rapi
      perkara = (parts[2] || 'Agenda Penugasan Hukum')
        .replace(/\(No\.?\s*[^)]+\)/gi, '')
        .trim();

      if (parts.length === 4) {
        // Cek apakah parts[3] adalah nama advokat atau instruksi
        const isPart3Advokat = advokatList.some((a) => cocokDenganAdvokat(parts[3], a));
        if (!isPart3Advokat) {
          instruksiKhusus = parts[3].replace(/^Prioritas\s*Tinggi\s*[-:]?\s*/i, '').trim() || instruksiKhusus;
        }
      } else if (parts.length >= 5) {
        instruksiKhusus = parts.slice(4).join(' — ').replace(/^Prioritas\s*Tinggi\s*[-:]?\s*/i, '').trim() || instruksiKhusus;
      }
    } else {
      // Format kalimat bebas
      const lokasiMatch = cleanLine.match(
        /\b(PN\s+[A-Za-z\s\(\)]+|PA\s+[A-Za-z\s]+|PTUN\s+[A-Za-z\s]+|Pengadilan\s+[A-Za-z\s]+|PHI\s+[A-Za-z\s]+|Polda\s+[A-Za-z\s]+|Polres\s+[A-Za-z\s]+|Kantor\s+Ryan\s+Gumay[A-Za-z\s]*|Mahkamah\s+[A-Za-z\s]+|BANI)\b/i
      );
      if (lokasiMatch) {
        lokasi = lokasiMatch[1].trim();
      }
      perkara = cleanLine
        .replace(new RegExp(`\\b${hari}\\b`, 'i'), '')
        .replace(/\b([01]?\d|2[0-3])[:\.]([0-5]\d)\b/g, '')
        .replace(/\(No\.?\s*[^)]+\)/gi, '')
        .replace(/^[\s\-|:,]+/, '')
        .trim();
    }

    const kategori = deteksiKategori(`${lokasi} ${perkara}`);
    const assignedAutomatically = !matchedAdvokatId;
    const advokatId =
      matchedAdvokatId ||
      pilihAdvokatOtomatis(`${lokasi} ${perkara}`, kategori, hari, waktuMulai, advokatList, hasil);

    // Cari pendamping otomatis (Advokat) bila perkara Prioritas Tinggi di pengadilan
    let advokatPendampingId: string | undefined = undefined;
    let advokatPendampingIds: string[] = [];
    if (prioritas === 'Tinggi' && kategori === 'Sidang Pengadilan') {
      const pendamping = advokatList.find((a) => a.aktif && a.jabatan === 'Advokat' && a.id !== advokatId);
      if (pendamping) {
        advokatPendampingId = pendamping.id;
        advokatPendampingIds = [pendamping.id];
      }
    }

    hasil.push({
      id: `disp-${idx + 1}-${Date.now().toString(36)}`,
      hari,
      tanggalISO: hitungTanggalDariHari(mondayISO, hari),
      waktuMulai,
      waktuSelesai,
      lokasi,
      kategori,
      perkara,
      nomorPerkara,
      advokatId,
      advokatPendampingId,
      advokatPendampingIds,
      prioritas,
      instruksiKhusus,
      statusKonfirmasi: 'Siap Jalan',
      assignedAutomatically,
    });
  });

  // Urutkan berdasarkan hari kerja lalu jam mulai
  hasil.sort((a, b) => {
    const hariDiff = HARI_URUTAN.indexOf(a.hari) - HARI_URUTAN.indexOf(b.hari);
    if (hariDiff !== 0) return hariDiff;
    return waktuKeMenit(a.waktuMulai) - waktuKeMenit(b.waktuMulai);
  });

  return hasil;
}

export function evaluasiKonflikJadwal(items: ItemDisposisi[]): KonflikJadwal[] {
  const konflik: KonflikJadwal[] = [];

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (a.hari !== b.hari || a.advokatId !== b.advokatId) continue;

      const aStart = waktuKeMenit(a.waktuMulai);
      const aEnd = waktuKeMenit(a.waktuSelesai);
      const bStart = waktuKeMenit(b.waktuMulai);
      const bEnd = waktuKeMenit(b.waktuSelesai);

      const tumpangTindih = aStart < bEnd && bStart < aEnd;
      if (tumpangTindih) {
        konflik.push({
          itemId: a.id,
          rekanItemId: b.id,
          advokatId: a.advokatId,
          jenis: 'Bentrok Jam',
          pesan: `Bentrok waktu langsung pada hari ${a.hari} (${a.waktuMulai} di ${a.lokasi} vs ${b.waktuMulai} di ${b.lokasi}).`,
        });
      } else {
        const jedaMenit = Math.min(Math.abs(bStart - aEnd), Math.abs(aStart - bEnd));
        if (jedaMenit < 90 && a.lokasi.toLowerCase() !== b.lokasi.toLowerCase()) {
          konflik.push({
            itemId: a.id,
            rekanItemId: b.id,
            advokatId: a.advokatId,
            jenis: 'Jarak Antar Pengadilan Terlalu Dekat',
            pesan: `Jeda perpindahan hanya ${jedaMenit} menit antara ${a.lokasi} (${a.waktuSelesai}) dan ${b.lokasi} (${b.waktuMulai}).`,
          });
        }
      }
    }
  }

  return konflik;
}

/**
 * Mem-parsing teks CSV (mendukung tanda kutip ganda dan koma/titik koma) menjadi array 2D string[][]
 */
export function parseCSVKeArray2D(csvText: string): string[][] {
  const cleanText = csvText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const firstLine = cleanText.split('\n')[0] || '';
  const delimiter =
    firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const ch = cleanText[i];
    const next = cleanText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentCell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentCell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (ch === '\n') {
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += ch;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export type ModePengelompokanDisposisi = 'hari' | 'advokat' | 'lokasi';

/**
 * Membangun matriks 2D (baris & kolom) yang merepresentasikan tampilan dan format
 * persis seperti yang terlihat pada Lembar Disposisi Resmi (termasuk Kop Surat,
 * Atribut Dokumen, Pengelompokan aktif Per Hari / Per Advokat / Per Lokasi,
 * Arahan Umum, Tabel Paraf Penerimaan Advokat, dan Blok Pengesahan Kepala Kantor).
 */
export function bangunMatriksLembarDisposisi(
  items: ItemDisposisi[],
  advokatList: Advokat[],
  metadata: MetadataDisposisi,
  modeKelompok: ModePengelompokanDisposisi = 'hari',
  filterAdvokatId: string = 'semua'
): string[][] {
  const getAdvokat = (id: string) => advokatList.find((a) => a.id === id);

  const filteredItems =
    filterAdvokatId === 'semua'
      ? items
      : items.filter((i) => apakahAdvokatTerlibat(i, filterAdvokatId));

  const modeLabel =
    modeKelompok === 'hari'
      ? 'Kronologis Hari & Tanggal'
      : modeKelompok === 'advokat'
      ? 'Per Advokat Penanggung Jawab'
      : 'Per Lokasi Pengadilan / Instansi';

  const penerimaLabel =
    filterAdvokatId !== 'semua' && getAdvokat(filterAdvokatId)
      ? `Khusus Penugasan: ${getAdvokat(filterAdvokatId)?.nama}`
      : 'Berlaku untuk Seluruh Advokat & Associate';

  const rows: string[][] = [];

  // 1. KOP SURAT RESMI (Kiri: Identitas Firma Hukum, Kanan: Atribut Nomor & Periode)
  rows.push([
    'RYAN GUMAY LAW FIRM',
    '',
    '',
    'No. Disposisi:',
    metadata.nomorDokumen,
  ]);
  rows.push([
    'Advocates, Litigators & Corporate Legal Consultants',
    '',
    '',
    'Periode Penugasan:',
    formatRentangMinggu(metadata.tanggalMulaiMinggu),
  ]);
  rows.push([
    'Jalan Proklamasi Blok J Nomor 9 RT 032 RW 009 Kelurahan Lorok Pakjo Kecamatan Ilir Barat 1 Kota Palembang Sumatera Selatan',
    '',
    '',
    'Total Agenda Aktif:',
    `${filteredItems.length} Penugasan`,
  ]);
  rows.push(['', '', '', '', '']);

  // 2. JUDUL DOKUMEN & MODE SUSUNAN
  rows.push([
    'LEMBAR DISPOSISI PENUGASAN TIM ADVOKAT MINGGUAN',
    '',
    '',
    'Mode Susunan:',
    modeLabel,
  ]);
  rows.push([
    `Diterbitkan oleh ${metadata.kepalaKantor} (${metadata.jabatanKepala}) · ${penerimaLabel}`,
    '',
    '',
    '',
    '',
  ]);
  rows.push(['', '', '', '', '']);

  // 3. ISI TABEL DISPOSISI SESUAI MODE PENGELOMPOKAN YANG TAMPIL DI LEMBAR DISPOSISI
  if (filteredItems.length === 0) {
    rows.push(['Belum ada jadwal penugasan untuk kriteria yang dipilih.', '', '', '', '']);
    rows.push(['', '', '', '', '']);
  } else if (modeKelompok === 'hari') {
    HARI_URUTAN.forEach((hari) => {
      const itemsHari = filteredItems.filter((i) => i.hari === hari);
      if (itemsHari.length === 0) return;
      const tanggalSampel = itemsHari[0].tanggalISO;

      rows.push([
        `${hari}, ${formatTanggalIndonesia(tanggalSampel)}`,
        '',
        '',
        '',
        `${itemsHari.length} Agenda Terjadwal`,
      ]);
      rows.push([
        'Jam (WIB)',
        'Lokasi / Pengadilan',
        'Perkara & Agenda Sidang',
        'Advokat (PIC)',
        'Instruksi Disposisi',
      ]);

      itemsHari.forEach((item) => {
        const pic = getAdvokat(item.advokatId);
        const pendampingNames = getPendampingList(item).map((id) =>
          resolveNamaPendamping(id, advokatList)
        );

        const jamCell = `${item.waktuMulai} – ${item.waktuSelesai}${
          item.prioritas === 'Tinggi' ? ' [Prioritas Tinggi]' : ''
        }`;
        const lokasiCell = `${item.lokasi} (${item.kategori})`;
        const perkaraCell = `${item.perkara}${
          item.nomorPerkara !== '-' ? ` — No: ${item.nomorPerkara}` : ''
        }`;
        const advokatCell = `${pic?.nama || 'Belum Ditentukan'} (${pic?.jabatan || '-'}${
          pendampingNames.length > 0 ? ` · Didampingi: ${pendampingNames.join(', ')}` : ''
        })`;

        rows.push([jamCell, lokasiCell, perkaraCell, advokatCell, item.instruksiKhusus]);
      });

      rows.push(['', '', '', '', '']);
    });
  } else if (modeKelompok === 'advokat') {
    advokatList.forEach((adv) => {
      const itemsAdv = filteredItems.filter((i) => apakahAdvokatTerlibat(i, adv.id));
      if (itemsAdv.length === 0) return;

      rows.push([
        adv.nama,
        `${adv.jabatan} · ${adv.spesialisasi.join(' · ')} · NIA: ${adv.nomorInduk}`,
        '',
        '',
        `Total Penugasan: ${itemsAdv.length} / ${adv.kuotaMingguan} Kuota Mingguan`,
      ]);
      rows.push([
        'Hari & Tanggal',
        'Jam (WIB)',
        'Lokasi / Pengadilan',
        'Perkara & Peran',
        'Instruksi Disposisi',
      ]);

      itemsAdv.forEach((item) => {
        const sebagaiPendamping =
          item.advokatId !== adv.id && getPendampingList(item).includes(adv.id);
        const hariCell = `${item.hari}, ${formatTanggalIndonesia(item.tanggalISO)}`;
        const jamCell = `${item.waktuMulai} – ${item.waktuSelesai}`;
        const lokasiCell = `${item.lokasi} (${item.kategori})`;
        const peranStr = sebagaiPendamping
          ? `Advokat Pendamping (PIC: ${getAdvokat(item.advokatId)?.nama})`
          : 'Advokat Penanggung Jawab Utama (PIC)';
        const perkaraCell = `${item.perkara} — Peran: ${peranStr}${
          item.nomorPerkara !== '-' ? ` · No: ${item.nomorPerkara}` : ''
        }`;

        rows.push([hariCell, jamCell, lokasiCell, perkaraCell, item.instruksiKhusus]);
      });

      rows.push(['', '', '', '', '']);
    });
  } else if (modeKelompok === 'lokasi') {
    const unikLokasi: string[] = Array.from(new Set(filteredItems.map((i) => i.lokasi)));
    unikLokasi.forEach((lokasi) => {
      const itemsLokasi = filteredItems.filter((i) => i.lokasi === lokasi);
      if (itemsLokasi.length === 0) return;

      rows.push([lokasi, '', '', `${itemsLokasi.length} Agenda di Lokasi Ini`, '']);
      rows.push([
        'Hari & Jam',
        'Perkara & Nomor Register',
        'Advokat Bertugas (PIC)',
        'Instruksi Disposisi',
        '',
      ]);

      itemsLokasi.forEach((item) => {
        const pic = getAdvokat(item.advokatId);
        const pendampingNames = getPendampingList(item).map((id) =>
          resolveNamaPendamping(id, advokatList)
        );
        const hariJamCell = `${item.hari}, ${formatTanggalIndonesia(item.tanggalISO)} (${
          item.waktuMulai
        } – ${item.waktuSelesai} WIB)`;
        const perkaraCell = `${item.perkara} (${item.kategori}${
          item.nomorPerkara !== '-' ? ` · No: ${item.nomorPerkara}` : ''
        })`;
        const picCell = `${pic?.nama || '-'} (${pic?.telepon || '-'})${
          pendampingNames.length > 0 ? ` · Didampingi: ${pendampingNames.join(', ')}` : ''
        }`;

        rows.push([hariJamCell, perkaraCell, picCell, item.instruksiKhusus, '']);
      });

      rows.push(['', '', '', '', '']);
    });
  }

  // 4. ARAHAN & KETENTUAN PELAKSANAAN DISPOSISI MINGGUAN
  rows.push(['Arahan & Ketentuan Pelaksanaan Disposisi Mingguan:', '', '', '', '']);
  rows.push([metadata.catatanUmum, '', '', '', '']);
  rows.push(['', '', '', '', '']);

  // 5. BUKTI PENERIMAAN & PARAF KESIAPAN TIM ADVOKAT + BLOK PENGESAHAN KEPALA KANTOR
  rows.push([
    'Bukti Penerimaan & Paraf Kesiapan Tim Advokat:',
    '',
    '',
    `Ditetapkan di: ${metadata.kotaKantor}`,
    '',
  ]);
  rows.push([
    'Nama Advokat',
    'Jml Tugas',
    'Paraf / Tgl Terima',
    `Tanggal Terbit: ${formatTanggalIndonesia(metadata.tanggalMulaiMinggu)}`,
    '',
  ]);

  const advokatAktif = advokatList.filter((a) => a.aktif);
  const kananPengesahan: string[] = [
    'Mengetahui & Menugaskan,',
    '',
    '',
    metadata.kepalaKantor,
    'Managing',
    'Ryan Gumay Law Firm',
  ];

  const totalBarisBawah = Math.max(advokatAktif.length, kananPengesahan.length);
  for (let idx = 0; idx < totalBarisBawah; idx++) {
    const adv = advokatAktif[idx];
    const count = adv ? items.filter((i) => apakahAdvokatTerlibat(i, adv.id)).length : 0;
    const teksKanan = kananPengesahan[idx] || '';

    rows.push([
      adv ? adv.nama : '',
      adv ? `${count} Agenda` : '',
      adv ? '.........................' : '',
      teksKanan,
      '',
    ]);
  }

  return rows;
}

/**
 * Mengonversi array 2D (dari CSV atau Google Sheets API) menjadi daftar ItemDisposisi & catatan mentah.
 * Mendukung baik format Tabel Template standar maupun berkas CSV hasil unduhan Lembar Disposisi Resmi.
 */
export function konversiDataTabelKeDisposisi(
  rows: string[][],
  mondayISO: string,
  advokatList: Advokat[]
): { items: ItemDisposisi[]; formattedLines: string[] } {
  const nonEmptyRows = rows.filter(
    (r) => r && r.some((cell) => String(cell || '').trim().length > 0)
  );
  if (nonEmptyRows.length === 0) {
    return { items: [], formattedLines: [] };
  }

  // Cek apakah berkas ini adalah hasil unduhan langsung dari Lembar Disposisi Resmi
  const isLembarDisposisiFormat = nonEmptyRows.some((r) =>
    r.some((cell) =>
      /LEMBAR DISPOSISI PENUGASAN TIM ADVOKAT MINGGUAN|RYAN GUMAY LAW FIRM/i.test(String(cell || ''))
    )
  );

  if (isLembarDisposisiFormat) {
    const extractedLines: string[] = [];
    let currentHariContext: HariKerja = 'Senin';
    let inParafSection = false;

    for (const row of nonEmptyRows) {
      const c0 = String(row[0] || '').trim();
      const c1 = String(row[1] || '').trim();
      const c2 = String(row[2] || '').trim();
      const c3 = String(row[3] || '').trim();
      const c4 = String(row[4] || '').trim();

      if (/^Bukti Penerimaan|^Arahan & Ketentuan/i.test(c0)) {
        inParafSection = true;
        continue;
      }
      if (inParafSection) continue;

      // Deteksi subjudul hari seperti "Senin, 18 Mei 2026"
      const hariHeaderMatch = c0.match(/^(Senin|Selasa|Rabu|Kamis|Jumat)\s*,/i);
      if (hariHeaderMatch && !c1 && !c2) {
        currentHariContext = deteksiHari(hariHeaderMatch[1]) || currentHariContext;
        continue;
      }

      // Lewati baris header tabel
      if (/^(Jam \(WIB\)|Hari & Tanggal|Hari & Jam)$/i.test(c0)) {
        continue;
      }

      // 1) Baris data Mode Per Hari: c0 berisi jam "09:00 – 11:00"
      const jamRangeMatch = c0.match(/^([01]?\d|2[0-3])[:\.]([0-5]\d)\s*[–\-]\s*([01]?\d|2[0-3])[:\.]([0-5]\d)/);
      if (jamRangeMatch && c1 && c2) {
        const jamStr = `${jamRangeMatch[1].padStart(2, '0')}:${jamRangeMatch[2]}-${jamRangeMatch[3].padStart(2, '0')}:${jamRangeMatch[4]}`;
        const isHigh = /Prioritas Tinggi/i.test(c0);
        const lokasiClean = c1.replace(/\s*\([^)]+\)\s*$/, '').trim();
        const perkaraClean = c2.replace(/\s*—\s*No:\s*([^\s]+)$/i, ' (No. $1)').trim();
        const advClean = c3.replace(/\s*\([^)]*\)\s*$/, '').trim();
        const instruksiClean = isHigh && !/Prioritas Tinggi/i.test(c4) ? `Prioritas Tinggi - ${c4}` : c4;
        extractedLines.push(
          `${currentHariContext} ${jamStr} | ${lokasiClean} | ${perkaraClean} | ${advClean} | ${instruksiClean}`
        );
        continue;
      }

      // 2) Baris data Mode Per Advokat: c0 berisi "Senin, ..." dan c1 berisi jam
      const jamCol1Match = c1.match(/^([01]?\d|2[0-3])[:\.]([0-5]\d)\s*[–\-]\s*([01]?\d|2[0-3])[:\.]([0-5]\d)/);
      if (hariHeaderMatch && jamCol1Match && c2 && c3) {
        const hariRow = deteksiHari(hariHeaderMatch[1]) || 'Senin';
        const jamStr = `${jamCol1Match[1].padStart(2, '0')}:${jamCol1Match[2]}-${jamCol1Match[3].padStart(2, '0')}:${jamCol1Match[4]}`;
        const lokasiClean = c2.replace(/\s*\([^)]+\)\s*$/, '').trim();
        const perkaraClean = c3.split(' — Peran:')[0].trim();
        extractedLines.push(`${hariRow} ${jamStr} | ${lokasiClean} | ${perkaraClean} | Otomatis | ${c4}`);
        continue;
      }
    }

    if (extractedLines.length > 0) {
      const items = parseCatatanMentah(extractedLines.join('\n'), mondayISO, advokatList);
      return { items, formattedLines: extractedLines };
    }
  }

  // Periksa apakah baris pertama adalah baris judul kolom (header) standar
  const firstRowLower = nonEmptyRows[0].map((c) => String(c || '').toLowerCase().trim());
  const headerKeywords = [
    'hari',
    'tanggal',
    'jam',
    'waktu',
    'lokasi',
    'pengadilan',
    'instansi',
    'perkara',
    'agenda',
    'advokat',
    'pic',
    'instruksi',
    'disposisi',
    'prioritas',
  ];
  const isHeaderRow = firstRowLower.some((cell) =>
    headerKeywords.some((kw) => cell.includes(kw))
  );

  const dataRows = isHeaderRow ? nonEmptyRows.slice(1) : nonEmptyRows;

  // Pemetaan indeks kolom jika memiliki header
  const findCol = (keywords: string[]): number => {
    if (!isHeaderRow) return -1;
    return firstRowLower.findIndex((cell) => keywords.some((kw) => cell.includes(kw)));
  };

  const idxHari = findCol(['hari']);
  const idxJamMulai = findCol(['jam mulai', 'waktu mulai', 'jam', 'waktu', 'pukul']);
  const idxJamSelesai = findCol(['jam selesai', 'waktu selesai', 'selesai']);
  const idxLokasi = findCol(['lokasi', 'pengadilan', 'instansi', 'tempat']);
  const idxPerkara = findCol(['perkara', 'agenda', 'kegiatan', 'sidang']);
  const idxNomorPerkara = findCol(['nomor perkara', 'no perkara', 'no. perkara', 'register']);
  const idxAdvokat = findCol(['advokat', 'pic', 'penanggung jawab', ' kuasa']);
  const idxPrioritas = findCol(['prioritas', 'tingkat']);
  const idxInstruksi = findCol(['instruksi', 'disposisi', 'catatan', 'keterangan']);

  const formattedLines: string[] = [];

  dataRows.forEach((row) => {
    const getVal = (idx: number) =>
      idx >= 0 && idx < row.length ? String(row[idx] || '').trim() : '';

    if (isHeaderRow && (idxPerkara >= 0 || idxLokasi >= 0 || idxHari >= 0)) {
      const hariVal = getVal(idxHari) || 'Senin';
      const jamMulaiVal = getVal(idxJamMulai) || '09:00';
      const jamSelesaiVal = getVal(idxJamSelesai);
      const jamGabung =
        jamSelesaiVal && !jamMulaiVal.includes('-')
          ? `${jamMulaiVal}-${jamSelesaiVal}`
          : jamMulaiVal;
      const lokasiVal = getVal(idxLokasi) || 'PN Palembang Kelas IA Khusus';
      const perkaraVal = getVal(idxPerkara) || 'Agenda Penugasan Hukum';
      const noPerkaraVal = getVal(idxNomorPerkara);
      const perkaraLengkap =
        noPerkaraVal && noPerkaraVal !== '-' && !perkaraVal.includes(noPerkaraVal)
          ? `${perkaraVal} (No. ${noPerkaraVal})`
          : perkaraVal;
      const advVal = getVal(idxAdvokat) || 'Otomatis';
      const prioVal = getVal(idxPrioritas);
      const instruksiVal =
        getVal(idxInstruksi) || 'Siapkan berkas perkara lengkap & laporkan hasil pelaksanaan.';
      const instruksiLengkap =
        /tinggi|mendesak|urgent/i.test(prioVal) && !/prioritas\s*tinggi/i.test(instruksiVal)
          ? `Prioritas Tinggi - ${instruksiVal}`
          : instruksiVal;

      formattedLines.push(
        `${hariVal} ${jamGabung} | ${lokasiVal} | ${perkaraLengkap} | ${advVal} | ${instruksiLengkap}`
      );
    } else {
      // Jika tanpa header, gabungkan kolom dengan '|'
      const cleanedCells = row.map((c) => String(c || '').trim()).filter(Boolean);
      if (cleanedCells.length > 0) {
        formattedLines.push(cleanedCells.join(' | '));
      }
    }
  });

  const rawCombined = formattedLines.join('\n');
  const items = parseCatatanMentah(rawCombined, mondayISO, advokatList);
  return { items, formattedLines };
}


