import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  UploadCloud, 
  Download, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  LogIn, 
  LogOut, 
  Copy, 
  Database,
  ArrowRight,
  Layers,
  Sparkles,
  HelpCircle,
  Users,
  Check,
  Zap,
  ArrowUpRight,
  Link2,
  Calendar
} from 'lucide-react';
import { Item, Transaction, ItemLoan, Employee } from '../types';
import { 
  signInWithGoogleSheets, 
  signOutGoogle, 
  getGoogleAccessToken, 
  getCachedGoogleUser, 
  initGoogleAuth,
  exportItemsToGoogleSheet,
  exportFullWarehouseToGoogleSheets,
  getSpreadsheetInfo,
  fetchSheetValues,
  parseSheetRowsToItems,
  extractSpreadsheetId,
  getConnectedSpreadsheetConfig,
  setConnectedSpreadsheetConfig,
  syncEmployeesToGoogleSheets,
  syncStockToGoogleSheets,
  syncAllWarehouseToGoogleSheets,
  ConnectedSpreadsheetConfig
} from '../utils/googleSheetsService';
import { User } from 'firebase/auth';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Item[];
  transactions: Transaction[];
  loans: ItemLoan[];
  employees: Employee[];
  companyName: string;
  onImportItems: (newItems: Item[], mode: 'append' | 'replace') => void;
  showToast: (text: string, type: 'success' | 'info' | 'warning') => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  items,
  transactions,
  loans,
  employees,
  companyName,
  onImportItems,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'sync' | 'export' | 'import' | 'guide'>('sync');
  
  // Auth state
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Connected Spreadsheet config state
  const [connectedConfig, setConnectedConfig] = useState<ConnectedSpreadsheetConfig | null>(null);
  const [customSheetInput, setCustomSheetInput] = useState<string>('');
  const [isLinkingCustom, setIsLinkingCustom] = useState<boolean>(false);
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);
  const [isSyncingEmployees, setIsSyncingEmployees] = useState<boolean>(false);
  const [isSyncingStock, setIsSyncingStock] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Export state
  const [exportType, setExportType] = useState<'items' | 'full'>('full');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportedSheetUrl, setExportedSheetUrl] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  // Import state
  const [spreadsheetUrlOrId, setSpreadsheetUrlOrId] = useState<string>('');
  const [availableSheets, setAvailableSheets] = useState<{ title: string; rowCount: number }[]>([]);
  const [selectedSheetName, setSelectedSheetName] = useState<string>('');
  const [isFetchingInfo, setIsFetchingInfo] = useState<boolean>(false);
  const [isFetchingRows, setIsFetchingRows] = useState<boolean>(false);
  const [importedPreviewItems, setImportedPreviewItems] = useState<Item[]>([]);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [importError, setImportError] = useState<string | null>(null);
  const [showConfirmReplace, setShowConfirmReplace] = useState<boolean>(false);

  // Init auth listener & load connected sheet on open
  useEffect(() => {
    if (!isOpen) return;

    setConnectedConfig(getConnectedSpreadsheetConfig());

    const currentUser = getCachedGoogleUser();
    if (currentUser) {
      setGoogleUser(currentUser);
      getGoogleAccessToken().then(tok => {
        if (tok) setAccessToken(tok);
      });
    }

    const unsubscribe = initGoogleAuth(
      (user, tok) => {
        setGoogleUser(user);
        setAccessToken(tok);
        setAuthError(null);
      },
      () => {
        setGoogleUser(null);
        setAccessToken(null);
      }
    );

    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLoginGoogle = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const res = await signInWithGoogleSheets();
      setGoogleUser(res.user);
      setAccessToken(res.accessToken);
      showToast(`Terhubung dengan Google: ${res.user.email}`, 'success');
    } catch (err: any) {
      console.error(err);
      setAuthError(err?.message || 'Gagal login dengan akun Google. Pastikan popup tidak diblokir.');
      showToast('Gagal menghubungkan Google Account.', 'warning');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogoutGoogle = async () => {
    try {
      await signOutGoogle();
      setGoogleUser(null);
      setAccessToken(null);
      setExportedSheetUrl(null);
      setImportedPreviewItems([]);
      showToast('Akun Google berhasil diputuskan.', 'info');
    } catch (err: any) {
      console.error(err);
    }
  };

  // Sync All Data
  const handleSyncAll = async () => {
    if (!accessToken) {
      showToast('Harap login ke Google terlebih dahulu.', 'warning');
      return;
    }

    setIsSyncingAll(true);
    setSyncFeedback(null);
    try {
      const res = await syncAllWarehouseToGoogleSheets({
        items,
        transactions,
        loans,
        employees,
        companyName,
      }, accessToken);

      const updatedCfg = getConnectedSpreadsheetConfig();
      setConnectedConfig(updatedCfg);
      setSyncFeedback(`✅ Sukses! ${res.syncedCount.items} Stok, ${res.syncedCount.employees} Karyawan, ${res.syncedCount.transactions} Transaksi, dan ${res.syncedCount.loans} Pinjaman tersinkronisasi ke Google Sheets.`);
      showToast('Semua data berhasil disinkronkan ke Google Sheets!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(`Gagal sinkronisasi: ${err?.message || 'Terjadi kesalahan'}`, 'warning');
      setSyncFeedback(`❌ Gagal: ${err?.message}`);
    } finally {
      setIsSyncingAll(false);
    }
  };

  // Sync Employees Only
  const handleSyncEmployees = async () => {
    if (!accessToken) {
      showToast('Harap login ke Google terlebih dahulu.', 'warning');
      return;
    }

    setIsSyncingEmployees(true);
    setSyncFeedback(null);
    try {
      const res = await syncEmployeesToGoogleSheets(employees, accessToken, companyName);
      const updatedCfg = getConnectedSpreadsheetConfig();
      setConnectedConfig(updatedCfg);
      setSyncFeedback(`✅ Sukses! ${res.count} Karyawan tersinkronisasi ke tab "Daftar Karyawan" di Google Sheets.`);
      showToast(`Berhasil mencatat ${res.count} Database Karyawan ke Google Sheets!`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast(`Gagal sinkronisasi karyawan: ${err?.message}`, 'warning');
      setSyncFeedback(`❌ Gagal: ${err?.message}`);
    } finally {
      setIsSyncingEmployees(false);
    }
  };

  // Sync Stock Only
  const handleSyncStock = async () => {
    if (!accessToken) {
      showToast('Harap login ke Google terlebih dahulu.', 'warning');
      return;
    }

    setIsSyncingStock(true);
    setSyncFeedback(null);
    try {
      const res = await syncStockToGoogleSheets(items, accessToken, companyName);
      const updatedCfg = getConnectedSpreadsheetConfig();
      setConnectedConfig(updatedCfg);
      setSyncFeedback(`✅ Sukses! ${res.count} Data Stok Barang tersinkronisasi ke tab "Master Stok" di Google Sheets.`);
      showToast(`Berhasil mencatat ${res.count} Data Stok ke Google Sheets!`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast(`Gagal sinkronisasi stok: ${err?.message}`, 'warning');
      setSyncFeedback(`❌ Gagal: ${err?.message}`);
    } finally {
      setIsSyncingStock(false);
    }
  };

  // Link Custom Sheet
  const handleLinkCustomSheet = async () => {
    if (!customSheetInput.trim() || !accessToken) return;
    setIsLinkingCustom(true);
    try {
      const id = extractSpreadsheetId(customSheetInput);
      const info = await getSpreadsheetInfo(id, accessToken);
      const newConfig: ConnectedSpreadsheetConfig = {
        id,
        url: `https://docs.google.com/spreadsheets/d/${id}/edit`,
        title: info.title,
        lastSyncTime: new Date().toISOString(),
      };
      setConnectedSpreadsheetConfig(newConfig);
      setConnectedConfig(newConfig);
      setCustomSheetInput('');
      showToast(`Berhasil menautkan Spreadsheet: "${info.title}"`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast(`Gagal menautkan spreadsheet: ${err?.message || 'Pastikan URL valid dan memiliki izin akses'}`, 'warning');
    } finally {
      setIsLinkingCustom(false);
    }
  };

  // Export handler
  const handlePerformExport = async () => {
    if (!accessToken) {
      showToast('Harap login ke Google terlebih dahulu.', 'warning');
      return;
    }

    setIsExporting(true);
    setExportedSheetUrl(null);
    try {
      let resultUrl = '';
      if (exportType === 'items') {
        const res = await exportItemsToGoogleSheet(items, accessToken, companyName);
        resultUrl = res.spreadsheetUrl;
        showToast(`Berhasil mengekspor ${items.length} master barang ke Google Sheets baru!`, 'success');
      } else {
        const res = await exportFullWarehouseToGoogleSheets({
          items,
          transactions,
          loans,
          employees,
          companyName,
        }, accessToken);
        resultUrl = res.spreadsheetUrl;
        showToast('Berhasil mengekspor seluruh database (4 Tab) ke Google Sheets baru!', 'success');
      }
      setExportedSheetUrl(resultUrl);
    } catch (err: any) {
      console.error(err);
      showToast(`Gagal mengekspor: ${err?.message || 'Terjadi kesalahan'}`, 'warning');
    } finally {
      setIsExporting(false);
    }
  };

  // Copy Link
  const handleCopyLink = () => {
    const targetUrl = exportedSheetUrl || connectedConfig?.url;
    if (!targetUrl) return;
    navigator.clipboard.writeText(targetUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
    showToast('Tautan Spreadsheet berhasil disalin!', 'info');
  };

  // Inspect Spreadsheet (load tabs for import)
  const handleInspectSpreadsheet = async () => {
    if (!spreadsheetUrlOrId.trim()) {
      setImportError('Masukkan URL atau ID Spreadsheet Google terlebih dahulu.');
      return;
    }
    if (!accessToken) {
      setImportError('Harap hubungkan akun Google terlebih dahulu.');
      return;
    }

    setIsFetchingInfo(true);
    setImportError(null);
    setAvailableSheets([]);
    setImportedPreviewItems([]);
    
    try {
      const info = await getSpreadsheetInfo(spreadsheetUrlOrId, accessToken);
      setAvailableSheets(info.sheets);
      if (info.sheets.length > 0) {
        setSelectedSheetName(info.sheets[0].title);
        await handleFetchSheetRows(info.sheets[0].title);
      }
      showToast(`Spreadsheet "${info.title}" berhasil diakses (${info.sheets.length} Tab)!`, 'success');
    } catch (err: any) {
      console.error(err);
      setImportError(err?.message || 'Gagal membaca Spreadsheet. Pastikan URL benar dan Anda memiliki izin akses.');
    } finally {
      setIsFetchingInfo(false);
    }
  };

  // Fetch sheet rows and parse to items
  const handleFetchSheetRows = async (sheetName: string) => {
    if (!accessToken || !spreadsheetUrlOrId.trim() || !sheetName) return;
    setIsFetchingRows(true);
    setImportError(null);

    try {
      const rows = await fetchSheetValues(spreadsheetUrlOrId, sheetName, accessToken);
      const parsed = parseSheetRowsToItems(rows);
      if (parsed.length === 0) {
        setImportError(`Tab "${sheetName}" tidak memiliki baris data barang yang valid atau format header tidak sesuai.`);
      } else {
        setImportedPreviewItems(parsed);
      }
    } catch (err: any) {
      console.error(err);
      setImportError(err?.message || 'Gagal membaca data baris pada tab tersebut.');
    } finally {
      setIsFetchingRows(false);
    }
  };

  // Execute Import
  const handleExecuteImport = () => {
    if (importedPreviewItems.length === 0) {
      showToast('Tidak ada data barang yang valid untuk diimpor.', 'warning');
      return;
    }

    if (importMode === 'replace' && !showConfirmReplace) {
      setShowConfirmReplace(true);
      return;
    }

    onImportItems(importedPreviewItems, importMode);
    setShowConfirmReplace(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-emerald-950/50 via-slate-900 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Integrasi Google Sheets
                </h2>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live Cloud API
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pencatatan real-time Stok & Database Karyawan langsung ke Google Spreadsheet Anda
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Google Account Bar */}
        <div className="px-6 py-3 bg-slate-800/60 border-b border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
          {googleUser ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                {googleUser.photoURL ? (
                  <img 
                    src={googleUser.photoURL} 
                    alt={googleUser.displayName || 'Google'} 
                    className="w-8 h-8 rounded-full border border-emerald-500/40"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                    {(googleUser.email || 'G')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">
                      {googleUser.displayName || 'Google User'}
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-medium">
                      Terhubung
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono truncate max-w-xs sm:max-w-md">
                    {googleUser.email}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogoutGoogle}
                className="flex items-center gap-1.5 text-xs text-rose-300 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Putuskan Akun</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-3">
              <div className="text-xs text-slate-300">
                <span className="font-semibold text-white">Belum Terhubung:</span> Hubungkan akun Google untuk sinkronisasi otomatis ke Google Spreadsheet Anda.
              </div>
              <button
                onClick={handleLoginGoogle}
                disabled={isAuthenticating}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isAuthenticating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-700" />
                    <span>Menghubungkan...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                    <span>Masuk dengan Google</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {authError && (
          <div className="mx-6 mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 pt-3 bg-slate-900/50">
          <button
            onClick={() => setActiveTab('sync')}
            className={`flex items-center gap-2 px-4 py-2.5 font-medium text-xs border-b-2 transition-all cursor-pointer ${
              activeTab === 'sync'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Sinkronisasi Langsung (Live Sync)</span>
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-2 px-4 py-2.5 font-medium text-xs border-b-2 transition-all cursor-pointer ${
              activeTab === 'export'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Buat Spreadsheet Baru</span>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 px-4 py-2.5 font-medium text-xs border-b-2 transition-all cursor-pointer ${
              activeTab === 'import'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Impor Data Stok</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 px-4 py-2.5 font-medium text-xs border-b-2 transition-all cursor-pointer ${
              activeTab === 'guide'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Cara Melihat & Memeriksa</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'sync' && (
            <div className="space-y-6">
              {/* Connected Target Spreadsheet Banner */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">
                        {connectedConfig ? connectedConfig.title : 'Spreadsheet Google Belum Terhubung'}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {connectedConfig ? `ID: ${connectedConfig.id}` : 'Klik sinkronkan untuk membuat/menautkan Google Sheet secara otomatis'}
                      </p>
                    </div>
                  </div>

                  {connectedConfig && (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <a
                        href={connectedConfig.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                        title="Buka langsung file Google Sheets di tab browser baru"
                      >
                        <span>Buka di Google Sheets</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={handleCopyLink}
                        className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs border border-slate-600 transition-all cursor-pointer"
                        title="Salin tautan spreadsheet"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {connectedConfig?.lastSyncTime && (
                  <div className="flex items-center gap-2 text-[11px] text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-md">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Terakhir sinkronisasi: <strong>{new Date(connectedConfig.lastSyncTime).toLocaleString('id-ID')}</strong></span>
                  </div>
                )}
              </div>

              {/* Action Buttons for Direct Sync */}
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                  Pilih Data yang Ingin Disinkronkan ke Google Sheet
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Sync Employees */}
                  <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 flex flex-col justify-between hover:border-emerald-500/40 transition-all">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                          <Users className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-bold">
                          {employees.length} Karyawan
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white mb-1">
                        Database Karyawan
                      </h4>
                      <p className="text-[11px] text-slate-400 mb-4">
                        Mencatat seluruh nama, jabatan, divisi, dan kontak personil ke tab <strong>"Daftar Karyawan"</strong>.
                      </p>
                    </div>
                    <button
                      onClick={handleSyncEmployees}
                      disabled={!accessToken || isSyncingEmployees}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isSyncingEmployees ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Zap className="w-3.5 h-3.5" />
                      )}
                      <span>Sinkronkan Karyawan</span>
                    </button>
                  </div>

                  {/* Sync Stock Master */}
                  <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 flex flex-col justify-between hover:border-emerald-500/40 transition-all">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                          <Database className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-bold">
                          {items.length} Barang
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white mb-1">
                        Master Stok Barang
                      </h4>
                      <p className="text-[11px] text-slate-400 mb-4">
                        Mencatat seluruh kode barang, stok fisik, rak, harga, dan status ke tab <strong>"Master Stok"</strong>.
                      </p>
                    </div>
                    <button
                      onClick={handleSyncStock}
                      disabled={!accessToken || isSyncingStock}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isSyncingStock ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Zap className="w-3.5 h-3.5" />
                      )}
                      <span>Sinkronkan Stok</span>
                    </button>
                  </div>

                  {/* Sync All 4 Tabs */}
                  <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 flex flex-col justify-between hover:border-emerald-400 transition-all">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                          <Layers className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">
                          Semua Data (4 Tab)
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white mb-1">
                        Sinkronisasi Penuh
                      </h4>
                      <p className="text-[11px] text-slate-300 mb-4">
                        Memperbarui 4 Tab sekaligus: <strong>Stok, Karyawan, Transaksi, & Pinjaman</strong>.
                      </p>
                    </div>
                    <button
                      onClick={handleSyncAll}
                      disabled={!accessToken || isSyncingAll}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isSyncingAll ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>Sinkronkan Semua Tab</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Sync Feedback Message */}
              {syncFeedback && (
                <div className="p-3.5 rounded-xl bg-slate-800 border border-emerald-500/50 text-xs text-white flex items-center justify-between gap-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <span>{syncFeedback}</span>
                  </div>
                  {connectedConfig && (
                    <a
                      href={connectedConfig.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 font-bold underline inline-flex items-center gap-1 shrink-0"
                    >
                      <span>Buka Sheet</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {/* Custom Spreadsheet Link Form */}
              <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 space-y-2">
                <label className="block text-xs font-semibold text-white">
                  Ingin menggunakan Google Spreadsheet Anda yang sudah ada?
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customSheetInput}
                    onChange={(e) => setCustomSheetInput(e.target.value)}
                    placeholder="Tempel URL atau ID Google Spreadsheet Anda..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <button
                    onClick={handleLinkCustomSheet}
                    disabled={!accessToken || isLinkingCustom || !customSheetInput.trim()}
                    className="px-3.5 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Tautkan</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Saat Anda menautkan spreadsheet, sistem akan otomatis mencatat data ke tab "Master Stok" dan "Daftar Karyawan" di dalam file tersebut.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-white mb-2">
                  Pilih Format Spreadsheet Baru
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    onClick={() => setExportType('full')}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      exportType === 'full'
                        ? 'bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/30'
                        : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <Layers className="w-4 h-4" />
                      </div>
                      <input
                        type="radio"
                        checked={exportType === 'full'}
                        onChange={() => setExportType('full')}
                        className="text-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                    <h4 className="text-xs font-bold text-white mb-1">
                      Laporan Lengkap Gudang (4 Tab Sheet)
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                      Mencakup Master Stok ({items.length}), Riwayat Transaksi ({transactions.length}), Peminjaman ({loans.length}), dan Karyawan ({employees.length}).
                    </p>
                  </div>

                  <div
                    onClick={() => setExportType('items')}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      exportType === 'items'
                        ? 'bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/30'
                        : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                        <Database className="w-4 h-4" />
                      </div>
                      <input
                        type="radio"
                        checked={exportType === 'items'}
                        onChange={() => setExportType('items')}
                        className="text-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                    <h4 className="text-xs font-bold text-white mb-1">
                      Katalog Master Stok Saja (1 Tab)
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                      Hanya mengekspor daftar seluruh barang inventaris, kode barcode, stok fisik, rak, estimasi harga, dan status stok ({items.length} Item).
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                <div className="text-xs text-slate-400">
                  File spreadsheet baru akan dibuat di Google Drive akun Anda.
                </div>
                <button
                  onClick={handlePerformExport}
                  disabled={!accessToken || isExporting}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Membuat Spreadsheet...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Buat Google Spreadsheet Baru</span>
                    </>
                  )}
                </button>
              </div>

              {exportedSheetUrl && (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 animate-in fade-in duration-300">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-white mb-1">
                        Spreadsheet Berhasil Dibuat!
                      </h4>
                      <p className="text-xs text-emerald-200/80 mb-3">
                        File spreadsheet telah dibuat di Google Drive Anda.
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={exportedSheetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all"
                        >
                          <span>Buka di Google Sheets</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={handleCopyLink}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-600 transition-all cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedUrl ? 'Tautan Disalin!' : 'Salin Tautan'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-5">
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-white">
                  URL atau ID Google Spreadsheet untuk Diimpor:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={spreadsheetUrlOrId}
                    onChange={(e) => setSpreadsheetUrlOrId(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit..."
                    className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <button
                    onClick={handleInspectSpreadsheet}
                    disabled={!accessToken || isFetchingInfo || !spreadsheetUrlOrId.trim()}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isFetchingInfo ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        <span>Baca Sheet</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {availableSheets.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
                  <label className="block text-xs font-semibold text-white">
                    Pilih Tab Sheet yang Berisi Data Barang:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableSheets.map((sh) => (
                      <button
                        key={sh.title}
                        onClick={() => {
                          setSelectedSheetName(sh.title);
                          handleFetchSheetRows(sh.title);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                          selectedSheetName === sh.title
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {sh.title} ({sh.rowCount} baris)
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {importError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {importedPreviewItems.length > 0 && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400">
                      Terbaca {importedPreviewItems.length} Data Barang Siap Diimpor:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">Mode:</span>
                      <button
                        type="button"
                        onClick={() => setImportMode('append')}
                        className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                          importMode === 'append'
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        Tambahkan (Append)
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportMode('replace')}
                        className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                          importMode === 'replace'
                            ? 'bg-amber-600 text-white font-bold'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        Ganti Semua (Replace)
                      </button>
                    </div>
                  </div>

                  <div className="border border-slate-700/80 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-800 text-slate-300 font-semibold sticky top-0">
                        <tr>
                          <th className="p-2">Kode</th>
                          <th className="p-2">Nama Barang</th>
                          <th className="p-2">Kategori</th>
                          <th className="p-2 text-right">Stok</th>
                          <th className="p-2">Satuan</th>
                          <th className="p-2">Lokasi Rak</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {importedPreviewItems.slice(0, 15).map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/40">
                            <td className="p-2 font-mono text-emerald-400">{item.code}</td>
                            <td className="p-2 font-medium text-white">{item.name}</td>
                            <td className="p-2 text-slate-400">{item.category}</td>
                            <td className="p-2 text-right font-bold">{item.currentStock}</td>
                            <td className="p-2 text-slate-400">{item.unit}</td>
                            <td className="p-2 text-slate-400">{item.rackLocation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {showConfirmReplace && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between gap-3">
                      <span>
                        ⚠️ Perhatian: Mode <strong>Ganti Semua</strong> akan menggantikan seluruh {items.length} barang lama dengan {importedPreviewItems.length} barang baru.
                      </span>
                      <button
                        onClick={handleExecuteImport}
                        className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shrink-0 cursor-pointer"
                      >
                        Ya, Timpa Data
                      </button>
                    </div>
                  )}

                  {!showConfirmReplace && (
                    <button
                      onClick={handleExecuteImport}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-98"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        Impor {importedPreviewItems.length} Barang ke Sistem Inventaris
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                <h4 className="text-sm font-bold text-emerald-400 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Bagaimana Cara Melihat Data yang Sudah Disinkronkan?
                </h4>
                <p className="mb-3">
                  Setelah Anda menekan tombol <strong>"Sinkronkan Karyawan"</strong> atau <strong>"Sinkronkan Stok"</strong>, data langsung terkirim ke server Google Spreadsheet Anda.
                </p>
                <ol className="list-decimal pl-5 space-y-2 text-slate-200">
                  <li>
                    Klik tombol hijau <strong>"Buka di Google Sheets"</strong> di bagian atas modal ini atau di halaman Database Karyawan / Stok.
                  </li>
                  <li>
                    Browser Anda akan langsung membuka file Google Spreadsheet secara otomatis di tab baru.
                  </li>
                  <li>
                    Di bagian bawah Spreadsheet Google, Anda akan melihat tab sheet:
                    <ul className="list-disc pl-5 mt-1 space-y-1 text-slate-300 font-mono text-[11px]">
                      <li><strong className="text-white">Daftar Karyawan:</strong> Berisi Nama, Jabatan, Divisi, No. Kontak, Keterangan, dan Waktu Update.</li>
                      <li><strong className="text-white">Master Stok:</strong> Berisi Kode Barcode, Nama Barang, Stok Fisik, Lokasi Rak, Harga Satuan, Total Nilai Aset, dan Status Stok.</li>
                      <li><strong className="text-white">Riwayat Transaksi:</strong> Berisi Nomor Transaksi, Jenis (Masuk/Keluar), Petugas, dan Daftar Barang.</li>
                      <li><strong className="text-white">Peminjaman Barang:</strong> Berisi Data Peminjam, Tanggal Pinjam/Kembali, dan Kondisi.</li>
                    </ul>
                  </li>
                  <li>
                    Anda juga dapat membuka Google Drive (<a href="https://drive.google.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline">drive.google.com</a>) dengan akun <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-300">warehousemuliabara@gmail.com</code> dan menemukan file bernama <strong>"[Nama Perusahaan] Database Inventaris & Karyawan"</strong>.
                  </li>
                </ol>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Tombol Pintas di Antarmuka Aplikasi
                </h4>
                <p>
                  Untuk memudahkan kerja harian Anda:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-300">
                  <li>Di dalam modal <strong>Database Karyawan</strong>, sudah tersedia tombol <strong>"Sinkronkan ke Google Sheet"</strong> dan <strong>"Buka Google Sheet"</strong>.</li>
                  <li>Di tabel <strong>Stok Barang</strong>, sudah tersedia tombol <strong>"Google Sheets"</strong> untuk melihat dan memperbarui data stok kapan saja.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">
              Powered by Google Sheets API v4
            </span>
            {connectedConfig && (
              <a
                href={connectedConfig.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-emerald-400 hover:text-emerald-300 underline font-semibold flex items-center gap-1"
              >
                <span>Buka Spreadsheet Aktif</span>
                <ArrowUpRight className="w-3 h-3" />
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
