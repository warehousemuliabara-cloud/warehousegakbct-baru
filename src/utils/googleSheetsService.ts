import { getApps, initializeApp, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Item, Transaction, ItemLoan, Employee } from '../types';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Scopes required for Google Sheets & Google Drive File management
export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const provider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach(scope => provider.addScope(scope));
provider.setCustomParameters({ prompt: 'select_account' });

// In-memory access token cache
let cachedAccessToken: string | null = null;
let cachedGoogleUser: User | null = null;
let isSigningIn = false;

export interface GoogleAccountProfile {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export function initGoogleAuth(
  onSuccess?: (user: User, token: string) => void,
  onFailure?: () => void
) {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      cachedGoogleUser = user;
      if (cachedAccessToken) {
        if (onSuccess) onSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onFailure) onFailure();
      }
    } else {
      cachedGoogleUser = null;
      cachedAccessToken = null;
      if (onFailure) onFailure();
    }
  });
}

export async function signInWithGoogleSheets(): Promise<{ user: User; accessToken: string }> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses Google dari autentikasi.');
    }
    cachedAccessToken = credential.accessToken;
    cachedGoogleUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
}

export async function getGoogleAccessToken(): Promise<string | null> {
  return cachedAccessToken;
}

export function getCachedGoogleUser(): User | null {
  return cachedGoogleUser || auth.currentUser;
}

export async function signOutGoogle(): Promise<void> {
  await signOut(auth);
  cachedAccessToken = null;
  cachedGoogleUser = null;
}

/**
 * Extracts clean Google Spreadsheet ID from full URL or returns raw ID
 */
export function extractSpreadsheetId(urlOrId: string): string {
  const trimmed = urlOrId.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

export interface ConnectedSpreadsheetConfig {
  id: string;
  url: string;
  title: string;
  lastSyncTime: string;
  autoSyncEnabled?: boolean;
}

const STORAGE_KEY_CONNECTED_SHEET = 'gudang_ga_connected_spreadsheet';

export function getConnectedSpreadsheetConfig(): ConnectedSpreadsheetConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONNECTED_SHEET);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setConnectedSpreadsheetConfig(config: ConnectedSpreadsheetConfig | null): void {
  try {
    if (config) {
      localStorage.setItem(STORAGE_KEY_CONNECTED_SHEET, JSON.stringify(config));
    } else {
      localStorage.removeItem(STORAGE_KEY_CONNECTED_SHEET);
    }
  } catch (e) {
    console.error('Failed to save connected spreadsheet config', e);
  }
}

/**
 * Ensures required tabs exist in a spreadsheet; adds them if missing
 */
export async function ensureSheetTabsExist(
  spreadsheetId: string,
  requiredTabTitles: string[],
  accessToken: string
): Promise<void> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const info = await getSpreadsheetInfo(cleanId, accessToken);
  const existingTitles = new Set(info.sheets.map(s => s.title));

  const missingTabs = requiredTabTitles.filter(t => !existingTitles.has(t));
  if (missingTabs.length === 0) return;

  // Add missing sheets via batchUpdate
  const requests = missingTabs.map(title => ({
    addSheet: {
      properties: {
        title,
        gridProperties: {
          frozenRowCount: 1,
        },
      },
    },
  }));

  const batchRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!batchRes.ok) {
    console.warn('Failed to add missing sheet tabs:', await batchRes.text());
  }
}

/**
 * Overwrite specific tab with fresh header and rows
 */
export async function writeSheetTabValues(
  spreadsheetId: string,
  sheetTitle: string,
  headers: string[],
  data: (string | number)[][],
  accessToken: string
): Promise<void> {
  const cleanId = extractSpreadsheetId(spreadsheetId);

  // 1. Clear existing range to avoid leftover rows
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(`'${sheetTitle}'!A1:Z5000`)}:clear`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  ).catch(err => console.warn('Clear sheet warning:', err));

  // 2. Put new values
  const range = `'${sheetTitle}'!A1`;
  const values = [headers, ...data];

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    }
  );

  if (!updateRes.ok) {
    const errData = await updateRes.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Gagal menulis data ke tab "${sheetTitle}"`);
  }
}

/**
 * Synchronize Employee Database directly to Connected Google Sheet
 */
export async function syncEmployeesToGoogleSheets(
  employees: Employee[],
  accessToken: string,
  companyName: string = 'Gudang General Affairs'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; count: number }> {
  let activeConfig = getConnectedSpreadsheetConfig();
  const empHeaders = [
    'Nama Lengkap', 
    'Jabatan / Posisi', 
    'Departemen / Divisi', 
    'Nomor Kontak (HP/WA)', 
    'Keterangan Tambahan', 
    'Terakhir Diperbarui'
  ];
  const empData = employees.map(e => [
    e.name,
    e.position,
    e.department || '-',
    e.phone || '-',
    e.notes || '-',
    e.updatedAt ? new Date(e.updatedAt).toLocaleString('id-ID') : new Date().toLocaleString('id-ID')
  ]);

  const tabTitle = 'Daftar Karyawan';

  if (!activeConfig || !activeConfig.id) {
    // If no spreadsheet is connected yet, create a new master spreadsheet
    const created = await createGoogleSpreadsheet(
      `[${companyName}] Database Inventaris & Karyawan`,
      accessToken,
      [{ title: tabTitle, headers: empHeaders, data: empData }]
    );
    activeConfig = {
      id: created.spreadsheetId,
      url: created.spreadsheetUrl,
      title: `[${companyName}] Database Inventaris & Karyawan`,
      lastSyncTime: new Date().toISOString(),
    };
    setConnectedSpreadsheetConfig(activeConfig);
    return {
      spreadsheetId: activeConfig.id,
      spreadsheetUrl: activeConfig.url,
      count: employees.length,
    };
  }

  // Ensure tab exists
  await ensureSheetTabsExist(activeConfig.id, [tabTitle], accessToken);
  // Overwrite values
  await writeSheetTabValues(activeConfig.id, tabTitle, empHeaders, empData, accessToken);

  activeConfig.lastSyncTime = new Date().toISOString();
  setConnectedSpreadsheetConfig(activeConfig);

  return {
    spreadsheetId: activeConfig.id,
    spreadsheetUrl: activeConfig.url,
    count: employees.length,
  };
}

/**
 * Synchronize Stock Master directly to Connected Google Sheet
 */
export async function syncStockToGoogleSheets(
  items: Item[],
  accessToken: string,
  companyName: string = 'Gudang General Affairs'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; count: number }> {
  let activeConfig = getConnectedSpreadsheetConfig();
  const headers = [
    'Kode Barang',
    'Nama Barang',
    'Kategori',
    'Stok Saat Ini',
    'Stok Minimum',
    'Satuan',
    'Lokasi Rak',
    'Estimasi Harga (Rp)',
    'Total Nilai Aset (Rp)',
    'Status Stok',
    'Keterangan',
    'Terakhir Diperbarui'
  ];

  const data = items.map(item => {
    const status = item.currentStock === 0 ? 'HABIS' : item.currentStock <= item.minStock ? 'MENIPIS' : 'AMAN';
    const totalValue = (item.currentStock || 0) * (item.priceEstimate || 0);
    return [
      item.code,
      item.name,
      item.category,
      item.currentStock,
      item.minStock,
      item.unit,
      item.rackLocation,
      item.priceEstimate || 0,
      totalValue,
      status,
      item.description || '-',
      item.updatedAt ? new Date(item.updatedAt).toLocaleString('id-ID') : '-'
    ];
  });

  const tabTitle = 'Master Stok';

  if (!activeConfig || !activeConfig.id) {
    const created = await createGoogleSpreadsheet(
      `[${companyName}] Database Inventaris & Karyawan`,
      accessToken,
      [{ title: tabTitle, headers, data }]
    );
    activeConfig = {
      id: created.spreadsheetId,
      url: created.spreadsheetUrl,
      title: `[${companyName}] Database Inventaris & Karyawan`,
      lastSyncTime: new Date().toISOString(),
    };
    setConnectedSpreadsheetConfig(activeConfig);
    return {
      spreadsheetId: activeConfig.id,
      spreadsheetUrl: activeConfig.url,
      count: items.length,
    };
  }

  await ensureSheetTabsExist(activeConfig.id, [tabTitle], accessToken);
  await writeSheetTabValues(activeConfig.id, tabTitle, headers, data, accessToken);

  activeConfig.lastSyncTime = new Date().toISOString();
  setConnectedSpreadsheetConfig(activeConfig);

  return {
    spreadsheetId: activeConfig.id,
    spreadsheetUrl: activeConfig.url,
    count: items.length,
  };
}

/**
 * Synchronize All Warehouse Tabs (Stock, Transactions, Loans, Employees) to Connected Google Sheet
 */
export async function syncAllWarehouseToGoogleSheets(
  payload: {
    items: Item[];
    transactions: Transaction[];
    loans: ItemLoan[];
    employees: Employee[];
    companyName?: string;
  },
  accessToken: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; syncedCount: { items: number; employees: number; transactions: number; loans: number } }> {
  let activeConfig = getConnectedSpreadsheetConfig();
  const companyName = payload.companyName || 'Gudang General Affairs';

  // 1. Prepare Tabs Data
  const itemsHeaders = [
    'Kode Barang', 'Nama Barang', 'Kategori', 'Stok Fisik', 'Stok Min', 'Satuan', 
    'Lokasi Rak', 'Estimasi Harga (Rp)', 'Total Nilai (Rp)', 'Status', 'Keterangan', 'Terakhir Diperbarui'
  ];
  const itemsData = payload.items.map(i => [
    i.code,
    i.name,
    i.category,
    i.currentStock,
    i.minStock,
    i.unit,
    i.rackLocation,
    i.priceEstimate || 0,
    (i.currentStock || 0) * (i.priceEstimate || 0),
    i.currentStock === 0 ? 'HABIS' : i.currentStock <= i.minStock ? 'MENIPIS' : 'AMAN',
    i.description || '-',
    i.updatedAt ? new Date(i.updatedAt).toLocaleString('id-ID') : '-'
  ]);

  const trxHeaders = [
    'No. Transaksi', 'Jenis Transaksi', 'Tanggal & Waktu', 'Pemohon / Sumber', 
    'Departemen', 'Status', 'Total Item', 'Daftar Barang & Qty', 'Catatan / Alasan', 'Petugas'
  ];
  const trxData = (payload.transactions || []).map(t => [
    t.transactionNumber,
    t.type === 'IN' ? 'BARANG MASUK' : 'BARANG KELUAR',
    t.timestamp ? new Date(t.timestamp).toLocaleString('id-ID') : (t.dateFormatted || '-'),
    t.requesterName || t.supplier || '-',
    t.department || '-',
    t.status || 'SELESAI',
    (t.items || []).reduce((sum, it) => sum + (Number(it.quantity) || 0), 0),
    (t.items || []).map(it => `${it.itemName} (${it.quantity} ${it.unit})`).join('; '),
    t.purposeDescription || t.purpose || t.notes || '-',
    t.dispatchedBy || t.processedBy || t.receivedByOfficer || t.receivedBy || '-'
  ]);

  const loansHeaders = [
    'No. Pinjaman', 'Nama Barang', 'Qty', 'Satuan', 'Nama Peminjam', 
    'Departemen', 'Tgl Pinjam', 'Tgl Rencana Kembali', 'Status', 'Kondisi Kembali', 'Catatan'
  ];
  const loansData = payload.loans.map(l => [
    l.loanNumber,
    l.itemName,
    l.quantity,
    l.unit,
    l.borrowerName,
    l.borrowerDepartment || '-',
    l.loanDate || '-',
    l.expectedReturnDate || '-',
    l.status === 'BORROWED' ? 'DIPINJAM' : 'DIKEMBALIKAN',
    l.returnCondition || '-',
    l.returnNotes || l.purpose || '-'
  ]);

  const empHeaders = ['Nama Lengkap', 'Jabatan / Posisi', 'Departemen', 'Nomor Kontak', 'Keterangan', 'Terakhir Diperbarui'];
  const empData = payload.employees.map(e => [
    e.name,
    e.position,
    e.department || '-',
    e.phone || '-',
    e.notes || '-',
    e.updatedAt ? new Date(e.updatedAt).toLocaleString('id-ID') : '-'
  ]);

  const allTabs = [
    { title: 'Master Stok', headers: itemsHeaders, data: itemsData },
    { title: 'Daftar Karyawan', headers: empHeaders, data: empData },
    { title: 'Riwayat Transaksi', headers: trxHeaders, data: trxData },
    { title: 'Peminjaman Barang', headers: loansHeaders, data: loansData },
  ];

  if (!activeConfig || !activeConfig.id) {
    const created = await createGoogleSpreadsheet(
      `[${companyName}] Database Inventaris & Karyawan`,
      accessToken,
      allTabs
    );
    activeConfig = {
      id: created.spreadsheetId,
      url: created.spreadsheetUrl,
      title: `[${companyName}] Database Inventaris & Karyawan`,
      lastSyncTime: new Date().toISOString(),
    };
    setConnectedSpreadsheetConfig(activeConfig);
  } else {
    // Ensure all 4 tabs exist
    await ensureSheetTabsExist(activeConfig.id, allTabs.map(t => t.title), accessToken);
    for (const tab of allTabs) {
      await writeSheetTabValues(activeConfig.id, tab.title, tab.headers, tab.data, accessToken);
    }
    activeConfig.lastSyncTime = new Date().toISOString();
    setConnectedSpreadsheetConfig(activeConfig);
  }

  return {
    spreadsheetId: activeConfig.id,
    spreadsheetUrl: activeConfig.url,
    syncedCount: {
      items: (payload.items || []).length,
      employees: (payload.employees || []).length,
      transactions: (payload.transactions || []).length,
      loans: (payload.loans || []).length,
    },
  };
}

/**
 * Creates a brand new Google Spreadsheet in the user's Google Drive
 */
export async function createGoogleSpreadsheet(
  title: string,
  accessToken: string,
  sheets: { title: string; headers: string[]; data: (string | number)[][] }[]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  // 1. Create spreadsheet structure
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: title || `Inventaris Gudang GA - ${new Date().toLocaleDateString('id-ID')}`,
      },
      sheets: sheets.map((s, idx) => ({
        properties: {
          sheetId: idx,
          title: s.title,
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      })),
    }),
  });

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Gagal membuat Spreadsheet (${createRes.status})`);
  }

  const created = await createRes.json();
  const spreadsheetId = created.spreadsheetId;
  const spreadsheetUrl = created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Populate data into each sheet tab
  for (const sheet of sheets) {
    const range = `'${sheet.title}'!A1`;
    const values = [sheet.headers, ...sheet.data];

    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values }),
      }
    );

    if (!updateRes.ok) {
      console.warn(`Gagal menulis data ke tab ${sheet.title}:`, await updateRes.text());
    }
  }

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Exports Master Items to a new Google Sheet
 */
export async function exportItemsToGoogleSheet(
  items: Item[],
  accessToken: string,
  companyName: string = 'Gudang General Affairs'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const dateStr = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const headers = [
    'Kode Barang',
    'Nama Barang',
    'Kategori',
    'Stok Saat Ini',
    'Stok Minimum',
    'Satuan',
    'Lokasi Rak',
    'Estimasi Harga (Rp)',
    'Total Nilai Aset (Rp)',
    'Status Stok',
    'Keterangan',
    'Terakhir Diperbarui'
  ];

  const data = items.map(item => {
    const status = item.currentStock === 0 ? 'HABIS' : item.currentStock <= item.minStock ? 'MENIPIS' : 'AMAN';
    const totalValue = (item.currentStock || 0) * (item.priceEstimate || 0);
    return [
      item.code,
      item.name,
      item.category,
      item.currentStock,
      item.minStock,
      item.unit,
      item.rackLocation,
      item.priceEstimate || 0,
      totalValue,
      status,
      item.description || '-',
      item.updatedAt ? new Date(item.updatedAt).toLocaleString('id-ID') : '-'
    ];
  });

  const sheetTitle = `Master Stok Barang (${items.length} Item)`;
  return createGoogleSpreadsheet(
    `[${companyName}] Master Stok Barang - ${dateStr}`,
    accessToken,
    [{ title: sheetTitle, headers, data }]
  );
}

/**
 * Exports Full Multi-Tab Warehouse Data (Items, Transactions, Loans, Employees) to Google Sheets
 */
export async function exportFullWarehouseToGoogleSheets(
  payload: {
    items: Item[];
    transactions: Transaction[];
    loans: ItemLoan[];
    employees: Employee[];
    companyName?: string;
  },
  accessToken: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const dateStr = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Tab 1: Master Stok
  const itemsHeaders = [
    'Kode Barang', 'Nama Barang', 'Kategori', 'Stok Fisik', 'Stok Min', 'Satuan', 
    'Lokasi Rak', 'Estimasi Harga (Rp)', 'Total Nilai (Rp)', 'Status', 'Keterangan'
  ];
  const itemsData = payload.items.map(i => [
    i.code,
    i.name,
    i.category,
    i.currentStock,
    i.minStock,
    i.unit,
    i.rackLocation,
    i.priceEstimate || 0,
    (i.currentStock || 0) * (i.priceEstimate || 0),
    i.currentStock === 0 ? 'HABIS' : i.currentStock <= i.minStock ? 'MENIPIS' : 'AMAN',
    i.description || '-'
  ]);

  // Tab 2: Riwayat Transaksi Keluar & Masuk
  const trxHeaders = [
    'No. Transaksi', 'Jenis Transaksi', 'Tanggal & Waktu', 'Pemohon / Sumber', 
    'Departemen', 'Status', 'Total Item', 'Daftar Barang & Qty', 'Catatan / Alasan', 'Petugas'
  ];
  const trxData = (payload.transactions || []).map(t => [
    t.transactionNumber,
    t.type === 'IN' ? 'BARANG MASUK' : 'BARANG KELUAR',
    t.timestamp ? new Date(t.timestamp).toLocaleString('id-ID') : (t.dateFormatted || '-'),
    t.requesterName || t.supplier || '-',
    t.department || '-',
    t.status || 'SELESAI',
    (t.items || []).reduce((sum, it) => sum + (Number(it.quantity) || 0), 0),
    (t.items || []).map(it => `${it.itemName} (${it.quantity} ${it.unit})`).join('; '),
    t.purposeDescription || t.purpose || t.notes || '-',
    t.dispatchedBy || t.processedBy || t.receivedByOfficer || t.receivedBy || '-'
  ]);

  // Tab 3: Peminjaman Barang
  const loansHeaders = [
    'No. Pinjaman', 'Nama Barang', 'Qty', 'Satuan', 'Nama Peminjam', 
    'Departemen', 'Tgl Pinjam', 'Tgl Rencana Kembali', 'Status', 'Kondisi Kembali', 'Catatan'
  ];
  const loansData = payload.loans.map(l => [
    l.loanNumber,
    l.itemName,
    l.quantity,
    l.unit,
    l.borrowerName,
    l.borrowerDepartment || '-',
    l.loanDate || '-',
    l.expectedReturnDate || '-',
    l.status === 'BORROWED' ? 'DIPINJAM' : 'DIKEMBALIKAN',
    l.returnCondition || '-',
    l.returnNotes || l.purpose || '-'
  ]);

  // Tab 4: Database Personil
  const empHeaders = ['Nama Lengkap', 'Jabatan', 'Departemen', 'Nomor Kontak', 'Keterangan'];
  const empData = payload.employees.map(e => [
    e.name,
    e.position,
    e.department || '-',
    e.phone || '-',
    e.notes || '-'
  ]);

  return createGoogleSpreadsheet(
    `[${payload.companyName || 'Gudang GA'}] Laporan Database Lengkap - ${dateStr}`,
    accessToken,
    [
      { title: 'Master Stok', headers: itemsHeaders, data: itemsData },
      { title: 'Riwayat Transaksi', headers: trxHeaders, data: trxData },
      { title: 'Peminjaman Barang', headers: loansHeaders, data: loansData },
      { title: 'Daftar Karyawan', headers: empHeaders, data: empData },
    ]
  );
}

/**
 * Fetches sheet metadata (tabs list) from an existing Google Spreadsheet
 */
export async function getSpreadsheetInfo(
  spreadsheetId: string,
  accessToken: string
): Promise<{ title: string; sheets: { title: string; rowCount: number }[] }> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gagal membaca informasi Spreadsheet (${res.status})`);
  }

  const data = await res.json();
  const title = data.properties?.title || 'Spreadsheet';
  const sheets = (data.sheets || []).map((s: any) => ({
    title: s.properties?.title || 'Sheet1',
    rowCount: s.properties?.gridProperties?.rowCount || 0,
  }));

  return { title, sheets };
}

/**
 * Reads row values from a Google Sheet range (e.g. 'Sheet1!A1:Z500')
 */
export async function fetchSheetValues(
  spreadsheetId: string,
  sheetName: string,
  accessToken: string
): Promise<string[][]> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const range = `'${sheetName}'!A1:Z1000`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(range)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gagal mengambil data baris Sheet (${res.status})`);
  }

  const data = await res.json();
  return (data.values || []) as string[][];
}

/**
 * Parses 2D Google Sheets values array into Item array
 */
export function parseSheetRowsToItems(rows: string[][]): Item[] {
  if (!rows || rows.length < 2) return [];

  const headers = rows[0].map(h => (h || '').toString().trim().toLowerCase());
  
  // Find column indices
  const findCol = (...keywords: string[]) => {
    return headers.findIndex(h => keywords.some(k => h.includes(k.toLowerCase())));
  };

  const colCode = findCol('kode', 'code', 'id barang', 'sku');
  const colName = findCol('nama', 'name', 'item', 'deskripsi barang', 'barang');
  const colCat = findCol('kategori', 'category', 'jenis');
  const colStock = findCol('stok saat ini', 'stok fisik', 'stok awal', 'current stock', 'stok', 'qty', 'jumlah');
  const colMin = findCol('stok minimum', 'stok min', 'min stock', 'minimum');
  const colUnit = findCol('satuan', 'unit', 'uom');
  const colRack = findCol('lokasi rak', 'lokasi', 'rak', 'rack', 'posisi');
  const colPrice = findCol('harga', 'price', 'estimasi harga', 'nilai');
  const colDesc = findCol('keterangan', 'deskripsi', 'catatan', 'note', 'description');

  const parsedItems: Item[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || row.every(cell => !cell || cell.toString().trim() === '')) {
      continue;
    }

    const name = (colName !== -1 ? row[colName] : row[1]) || '';
    if (!name || name.trim() === '') continue;

    const rawCode = (colCode !== -1 ? row[colCode] : row[0]) || '';
    const code = rawCode.trim() ? rawCode.trim().toUpperCase() : `GA-IMP-${Date.now().toString().slice(-4)}${i}`;

    const rawCategory = (colCat !== -1 ? row[colCat] : '') || 'Umum & Operasional';
    const category = rawCategory.trim() || 'Umum & Operasional';

    const rawStock = (colStock !== -1 ? row[colStock] : '0') || '0';
    const currentStock = Math.max(0, parseInt(rawStock.toString().replace(/[^\d-]/g, ''), 10) || 0);

    const rawMin = (colMin !== -1 ? row[colMin] : '5') || '5';
    const minStock = Math.max(0, parseInt(rawMin.toString().replace(/[^\d-]/g, ''), 10) || 5);

    const unit = ((colUnit !== -1 ? row[colUnit] : 'Pcs') || 'Pcs').trim();
    const rackLocation = ((colRack !== -1 ? row[colRack] : 'Gudang Utama') || 'Gudang Utama').trim();

    const rawPrice = (colPrice !== -1 ? row[colPrice] : '0') || '0';
    const priceEstimate = Math.max(0, parseInt(rawPrice.toString().replace(/[^\d]/g, ''), 10) || 0);

    const description = (colDesc !== -1 ? row[colDesc] : '') || '';

    parsedItems.push({
      id: `item_gsheet_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
      code,
      name: name.trim(),
      category: category as any,
      currentStock,
      minStock,
      unit,
      rackLocation,
      priceEstimate,
      description: description.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return parsedItems;
}
