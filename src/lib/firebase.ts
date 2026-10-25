import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  Advokat,
  DAFTAR_JABATAN,
  getPendampingList,
  HARI_URUTAN,
  HariKerja,
  INITIAL_ADVOKAT,
  INITIAL_METADATA,
  ItemDisposisi,
  JabatanAdvokat,
  KategoriAgenda,
  MetadataDisposisi,
  parseCatatanMentah,
  SAMPLE_CATATAN_MENTAH,
} from '../data/dispositionEngine';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

export const WORKSPACE_ID = 'rglf-main';
export const VISIBILITY_TIER = 'firm_internal';

//Blueprint-aligned regex and length constraints
export const ID_REGEX = /^[a-zA-Z0-9_-]+$/;
export const DATE_ISO_REGEX = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export async function loginWithGoogle() {
  return signInWithPopup(auth, googleAuthProvider);
}

export async function logoutUser() {
  return firebaseSignOut(auth);
}

// Defensive payload sanitizers matching firebase-blueprint.json & firestore.rules
function sanitizeId(rawId: string, fallbackPrefix = 'id'): string {
  const cleaned = String(rawId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 128);
  return cleaned && ID_REGEX.test(cleaned)
    ? cleaned
    : `${fallbackPrefix}-${Date.now().toString(36)}`;
}

function clampString(val: string, minLen: number, maxLen: number, fallback = '-'): string {
  const str = String(val ?? '').trim();
  if (str.length < minLen) return fallback.slice(0, maxLen);
  return str.slice(0, maxLen);
}

function sanitizeDateISO(val: string): string {
  const str = String(val ?? '').trim();
  return DATE_ISO_REGEX.test(str) ? str : INITIAL_METADATA.tanggalMulaiMinggu;
}

function sanitizeJabatan(val: string): JabatanAdvokat {
  if (DAFTAR_JABATAN.includes(val as JabatanAdvokat)) {
    return val as JabatanAdvokat;
  }
  return 'Advokat';
}

const VALID_KATEGORI: KategoriAgenda[] = [
  'Sidang Pengadilan',
  'Pendampingan BAP / Penyidikan',
  'Mediasi & Negosiasi',
  'Rapat Kreditur / PKPU',
  'Konsultasi & Legal Drafting',
];

function sanitizeKategori(val: string): KategoriAgenda {
  if (VALID_KATEGORI.includes(val as KategoriAgenda)) {
    return val as KategoriAgenda;
  }
  return 'Sidang Pengadilan';
}

function sanitizeHari(val: string): HariKerja {
  if (HARI_URUTAN.includes(val as HariKerja)) {
    return val as HariKerja;
  }
  return 'Senin';
}

export function buildWorkspaceFields(
  metadata: MetadataDisposisi,
  catatanMentah: string,
  uid: string
) {
  return {
    nomorDokumen: clampString(metadata.nomorDokumen, 1, 120, INITIAL_METADATA.nomorDokumen),
    tanggalMulaiMinggu: sanitizeDateISO(metadata.tanggalMulaiMinggu),
    kepalaKantor: clampString(metadata.kepalaKantor, 1, 160, INITIAL_METADATA.kepalaKantor),
    jabatanKepala: clampString(metadata.jabatanKepala, 1, 100, INITIAL_METADATA.jabatanKepala),
    kotaKantor: clampString(metadata.kotaKantor, 1, 80, INITIAL_METADATA.kotaKantor),
    catatanUmum: clampString(metadata.catatanUmum, 1, 2000, INITIAL_METADATA.catatanUmum),
    catatanMentah: String(catatanMentah ?? '').slice(0, 20000),
    authorUid: uid,
  };
}

export function buildAdvokatFields(adv: Advokat, uid: string) {
  const specs = (Array.isArray(adv.spesialisasi) ? adv.spesialisasi : ['Litigasi Umum'])
    .map((s) => clampString(s, 1, 120, 'Litigasi Umum'))
    .filter(Boolean)
    .slice(0, 25);

  return {
    nama: clampString(adv.nama, 1, 180, 'Advokat RGLF'),
    panggilan: clampString(adv.panggilan, 1, 80, 'Advokat'),
    jabatan: sanitizeJabatan(adv.jabatan),
    spesialisasi: specs.length > 0 ? specs : ['Litigasi Umum'],
    kuotaMingguan: Math.min(25, Math.max(1, Math.round(Number(adv.kuotaMingguan) || 6))),
    nomorInduk: clampString(adv.nomorInduk, 1, 80, 'RGLF-ADV'),
    kontakWa: clampString(adv.telepon, 1, 60, '-'),
    aktif: Boolean(adv.aktif),
    authorUid: uid,
  };
}

export function buildDisposisiFields(item: ItemDisposisi, uid: string) {
  const pendampingList = getPendampingList(item)
    .map((p) => clampString(p, 1, 180, ''))
    .filter(Boolean)
    .slice(0, 50);

  return {
    hari: sanitizeHari(item.hari),
    tanggalISO: sanitizeDateISO(item.tanggalISO),
    waktuMulai: clampString(item.waktuMulai, 4, 10, '09:00'),
    waktuSelesai: clampString(item.waktuSelesai, 4, 10, '11:00'),
    lokasi: clampString(item.lokasi, 1, 200, 'Kantor Ryan Gumay Law Firm'),
    kategori: sanitizeKategori(item.kategori),
    perkara: clampString(item.perkara, 1, 500, 'Agenda Perkara'),
    nomorPerkara: clampString(item.nomorPerkara, 1, 160, '-'),
    advokatId: sanitizeId(item.advokatId, 'adv-1'),
    advokatPendampingIds: pendampingList,
    prioritas: item.prioritas === 'Tinggi' ? 'Tinggi' : 'Normal',
    instruksiKhusus: clampString(
      item.instruksiKhusus,
      1,
      1000,
      'Laksanakan sesuai SOP kantor.'
    ),
    statusKonfirmasi:
      item.statusKonfirmasi === 'Perlu Koordinasi' ? 'Perlu Koordinasi' : 'Siap Jalan',
    assignedAutomatically: Boolean(item.assignedAutomatically),
    authorUid: uid,
  };
}

export async function ensureWorkspaceInitialized(uid: string): Promise<void> {
  const wsPath = `workspaces/${WORKSPACE_ID}`;
  const wsRef = doc(db, 'workspaces', WORKSPACE_ID);

  let snap;
  try {
    snap = await getDoc(wsRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, wsPath);
  }

  if (snap.exists()) {
    return;
  }

  // Create root workspace document first
  try {
    await setDoc(wsRef, {
      workspaceId: WORKSPACE_ID,
      visibility: VISIBILITY_TIER,
      ...buildWorkspaceFields(INITIAL_METADATA, SAMPLE_CATATAN_MENTAH, uid),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, wsPath);
  }

  // Seed initial advocate roster and initial disposition schedule items
  const initialItems = parseCatatanMentah(
    SAMPLE_CATATAN_MENTAH,
    INITIAL_METADATA.tanggalMulaiMinggu,
    INITIAL_ADVOKAT
  );

  const batch = writeBatch(db);

  for (const adv of INITIAL_ADVOKAT) {
    const cleanAdvId = sanitizeId(adv.id, 'adv');
    const advRef = doc(db, 'workspaces', WORKSPACE_ID, 'advokat', cleanAdvId);
    batch.set(advRef, {
      id: cleanAdvId,
      workspaceId: WORKSPACE_ID,
      visibility: VISIBILITY_TIER,
      ...buildAdvokatFields({ ...adv, id: cleanAdvId }, uid),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  for (const item of initialItems) {
    const cleanItemId = sanitizeId(item.id, 'disp');
    const itemRef = doc(db, 'workspaces', WORKSPACE_ID, 'disposisi', cleanItemId);
    batch.set(itemRef, {
      id: cleanItemId,
      workspaceId: WORKSPACE_ID,
      visibility: VISIBILITY_TIER,
      ...buildDisposisiFields({ ...item, id: cleanItemId }, uid),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, wsPath);
  }
}

export async function saveWorkspaceToCloud(
  metadata: MetadataDisposisi,
  catatanMentah: string,
  uid: string
): Promise<void> {
  const wsPath = `workspaces/${WORKSPACE_ID}`;
  const wsRef = doc(db, 'workspaces', WORKSPACE_ID);
  try {
    await updateDoc(wsRef, {
      ...buildWorkspaceFields(metadata, catatanMentah, uid),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, wsPath);
  }
}

export async function createAdvokatInCloud(adv: Advokat, uid: string): Promise<void> {
  const cleanId = sanitizeId(adv.id, 'adv');
  const path = `workspaces/${WORKSPACE_ID}/advokat/${cleanId}`;
  const ref = doc(db, 'workspaces', WORKSPACE_ID, 'advokat', cleanId);
  try {
    await setDoc(ref, {
      id: cleanId,
      workspaceId: WORKSPACE_ID,
      visibility: VISIBILITY_TIER,
      ...buildAdvokatFields({ ...adv, id: cleanId }, uid),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateAdvokatInCloud(adv: Advokat, uid: string): Promise<void> {
  const cleanId = sanitizeId(adv.id, 'adv');
  const path = `workspaces/${WORKSPACE_ID}/advokat/${cleanId}`;
  const ref = doc(db, 'workspaces', WORKSPACE_ID, 'advokat', cleanId);
  try {
    await updateDoc(ref, {
      ...buildAdvokatFields({ ...adv, id: cleanId }, uid),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteAdvokatInCloud(advId: string): Promise<void> {
  const cleanId = sanitizeId(advId, 'adv');
  const path = `workspaces/${WORKSPACE_ID}/advokat/${cleanId}`;
  const ref = doc(db, 'workspaces', WORKSPACE_ID, 'advokat', cleanId);
  try {
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createDisposisiItemInCloud(item: ItemDisposisi, uid: string): Promise<void> {
  const cleanId = sanitizeId(item.id, 'disp');
  const path = `workspaces/${WORKSPACE_ID}/disposisi/${cleanId}`;
  const ref = doc(db, 'workspaces', WORKSPACE_ID, 'disposisi', cleanId);
  try {
    await setDoc(ref, {
      id: cleanId,
      workspaceId: WORKSPACE_ID,
      visibility: VISIBILITY_TIER,
      ...buildDisposisiFields({ ...item, id: cleanId }, uid),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateDisposisiItemInCloud(item: ItemDisposisi, uid: string): Promise<void> {
  const cleanId = sanitizeId(item.id, 'disp');
  const path = `workspaces/${WORKSPACE_ID}/disposisi/${cleanId}`;
  const ref = doc(db, 'workspaces', WORKSPACE_ID, 'disposisi', cleanId);
  try {
    await updateDoc(ref, {
      ...buildDisposisiFields({ ...item, id: cleanId }, uid),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteDisposisiItemInCloud(itemId: string): Promise<void> {
  const cleanId = sanitizeId(itemId, 'disp');
  const path = `workspaces/${WORKSPACE_ID}/disposisi/${cleanId}`;
  const ref = doc(db, 'workspaces', WORKSPACE_ID, 'disposisi', cleanId);
  try {
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function replaceAllDisposisiItemsInCloud(
  newItems: ItemDisposisi[],
  catatanMentah: string,
  metadata: MetadataDisposisi,
  uid: string
): Promise<void> {
  const dispPath = `workspaces/${WORKSPACE_ID}/disposisi`;
  const q = query(
    collection(db, 'workspaces', WORKSPACE_ID, 'disposisi'),
    where('workspaceId', '==', WORKSPACE_ID),
    where('visibility', '==', VISIBILITY_TIER)
  );

  let existingSnap;
  try {
    existingSnap = await getDocs(q);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, dispPath);
  }

  const batch = writeBatch(db);

  // Delete all existing items first
  existingSnap.docs.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });

  // Insert new items with unique IDs
  const usedIds = new Set<string>();
  newItems.forEach((item, idx) => {
    let cleanId = sanitizeId(item.id, `disp-${idx + 1}`);
    if (usedIds.has(cleanId)) {
      cleanId = `${cleanId}-${idx + 1}-${Date.now().toString(36)}`;
    }
    usedIds.add(cleanId);

    const ref = doc(db, 'workspaces', WORKSPACE_ID, 'disposisi', cleanId);
    batch.set(ref, {
      id: cleanId,
      workspaceId: WORKSPACE_ID,
      visibility: VISIBILITY_TIER,
      ...buildDisposisiFields({ ...item, id: cleanId }, uid),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  // Update workspace raw notes & metadata
  const wsRef = doc(db, 'workspaces', WORKSPACE_ID);
  batch.update(wsRef, {
    ...buildWorkspaceFields(metadata, catatanMentah, uid),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, dispPath);
  }
}

export async function appendDisposisiItemsInCloud(
  addedItems: ItemDisposisi[],
  catatanMentah: string,
  metadata: MetadataDisposisi,
  uid: string
): Promise<void> {
  const dispPath = `workspaces/${WORKSPACE_ID}/disposisi`;
  const batch = writeBatch(db);
  const stamp = Date.now().toString(36);

  addedItems.forEach((item, idx) => {
    const cleanId = sanitizeId(`${item.id}-${stamp}-${idx + 1}`, 'disp');
    const ref = doc(db, 'workspaces', WORKSPACE_ID, 'disposisi', cleanId);
    batch.set(ref, {
      id: cleanId,
      workspaceId: WORKSPACE_ID,
      visibility: VISIBILITY_TIER,
      ...buildDisposisiFields({ ...item, id: cleanId }, uid),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  const wsRef = doc(db, 'workspaces', WORKSPACE_ID);
  batch.update(wsRef, {
    ...buildWorkspaceFields(metadata, catatanMentah, uid),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, dispPath);
  }
}

export { onSnapshot, doc, collection, query, where };
