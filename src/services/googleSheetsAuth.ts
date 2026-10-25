import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

let isSigningIn = false;
// In-memory access token cache (never stored in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses dari akun Google.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

/**
 * Mengekstrak ID Spreadsheet dari tautan URL Google Sheets atau ID langsung
 */
export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

export interface SheetMetadata {
  spreadsheetTitle: string;
  sheetNames: string[];
}

/**
 * Mengambil judul spreadsheet dan daftar nama tab/lembar kerja (tanpa mengasumsikan "Sheet1")
 */
export async function fetchSpreadsheetMetadata(
  spreadsheetId: string,
  accessToken: string
): Promise<SheetMetadata> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}?fields=properties.title,sheets.properties(title,sheetId)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        'Sesi akses Google Sheets berakhir atau Anda belum memiliki izin baca pada spreadsheet tersebut.'
      );
    }
    if (res.status === 404) {
      throw new Error(
        'Spreadsheet tidak ditemukan. Pastikan URL atau ID Google Spreadsheet sudah benar.'
      );
    }
    throw new Error(`Gagal memuat metadata Google Sheets (Status ${res.status}).`);
  }

  const data = await res.json();
  const spreadsheetTitle = data?.properties?.title || 'Google Spreadsheet';
  const sheetNames: string[] = Array.isArray(data?.sheets)
    ? data.sheets
        .map((s: { properties?: { title?: string } }) => s?.properties?.title)
        .filter((t: string | undefined): t is string => Boolean(t))
    : [];

  return { spreadsheetTitle, sheetNames };
}

/**
 * Mengambil seluruh baris nilai sel dari lembar kerja (tab) yang dipilih
 */
export async function fetchSheetRows(
  spreadsheetId: string,
  sheetTitle: string,
  accessToken: string
): Promise<string[][]> {
  const range = `'${sheetTitle.replace(/'/g, "''")}'!A1:Z200`;
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent(range)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    throw new Error(`Gagal membaca data dari lembar "${sheetTitle}" (Status ${res.status}).`);
  }

  const data = await res.json();
  return Array.isArray(data?.values) ? data.values : [];
}
