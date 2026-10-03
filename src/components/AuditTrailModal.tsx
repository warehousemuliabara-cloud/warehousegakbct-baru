import React, { useState, useRef } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  ShieldCheck, 
  Calendar, 
  User, 
  Clock, 
  Download, 
  Upload,
  X,
  Activity,
  Layers,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { AuditLogEntry, UserRole } from '../types';

interface AuditTrailModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AuditLogEntry[];
  onImportLogs?: (newLogs: AuditLogEntry[], mode: 'append' | 'replace') => void;
}

export const AuditTrailModal: React.FC<AuditTrailModalProps> = ({
  isOpen,
  onClose,
  logs,
  onImportLogs,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState<string>('ALL');

  // Import Modal state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [parsedImportLogs, setParsedImportLogs] = useState<AuditLogEntry[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    const matchesModule = filterModule === 'ALL' || log.targetModule === filterModule;
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      log.action.toLowerCase().includes(term) ||
      log.details.toLowerCase().includes(term) ||
      log.userName.toLowerCase().includes(term) ||
      log.targetModule.toLowerCase().includes(term);
    return matchesModule && matchesSearch;
  });

  const handleExportLogs = () => {
    const headers = ['Waktu', 'Pengguna', 'Role', 'Modul', 'Aksi', 'Keterangan Detail'];
    const rows = filteredLogs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.userName}"`,
      `"${l.userRole}"`,
      `"${l.targetModule}"`,
      `"${l.action}"`,
      `"${l.details.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Audit_Trail_Log_Gudang_GA_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTemplate = () => {
    const headers = ['Waktu', 'Pengguna', 'Role', 'Modul', 'Aksi', 'Keterangan Detail'];
    const sampleRows = [
      ['"2026-10-02 14:30:00"', '"WARDHANA"', '"ADMIN"', '"STOCK"', '"Update Master Barang"', '"Memperbarui data stok ATK"'],
      ['"2026-10-02 15:00:00"', '"SUPERVISOR GA"', '"MASTER_ADMIN"', '"TRANSACTIONS"', '"Approval Permintaan"', '"Menyetujui permintaan barang REQ-GA-001"'],
      ['"2026-10-02 15:30:00"', '"ADMIN LOGISTIK"', '"USER_OPERATIONAL"', '"LOANS"', '"Peminjaman Alat"', '"Peminjaman Hand Pallet oleh Divisi Operasional"'],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...sampleRows.map((e) => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Template_Import_Audit_Log.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseTextToLogs = (text: string): AuditLogEntry[] => {
    if (!text.trim()) return [];

    // Try parsing as JSON first
    if (text.trim().startsWith('[') || text.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(text);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        return list.map((item: any, idx: number) => ({
          id: item.id || `import_log_${Date.now()}_${idx}`,
          timestamp: item.timestamp || item.Waktu || new Date().toISOString(),
          userName: item.userName || item.Pengguna || item.user || 'Sistem',
          userRole: (item.userRole || item.Role || 'ADMIN') as UserRole,
          targetModule: (item.targetModule || item.Modul || 'STOCK') as any,
          action: item.action || item.Aksi || 'Aktivitas Import',
          details: item.details || item.Keterangan || item['Keterangan Detail'] || '-',
        }));
      } catch {
        // continue to CSV parser
      }
    }

    // CSV parsing
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];

    let delimiter = ',';
    if (lines[0].includes('\t')) delimiter = '\t';
    else if (lines[0].includes(';') && !lines[0].includes(',')) delimiter = ';';

    const result: AuditLogEntry[] = [];
    const startIndex = (lines[0].toLowerCase().includes('waktu') || lines[0].toLowerCase().includes('timestamp') || lines[0].toLowerCase().includes('pengguna') || lines[0].toLowerCase().includes('user')) ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const regex = delimiter === ',' 
        ? /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g
        : new RegExp(`(?:${delimiter}|\n|^)("(?:(?:"")*[^"]*)*"|[^"${delimiter}\n]*|(?:\n|$))`, 'g');

      const cells: string[] = [];
      let match;
      while ((match = regex.exec(line)) !== null) {
        let val = match[1] || '';
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1).replace(/""/g, '"');
        }
        cells.push(val.trim());
        if (match.index === regex.lastIndex) regex.lastIndex++;
      }

      const row = cells.length > 1 ? cells : line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
      if (row.length < 2) continue;

      // Layout: Waktu, Pengguna, Role, Modul, Aksi, Keterangan Detail
      const timestamp = row[0] || new Date().toISOString();
      const userName = row[1] || 'Sistem';
      const rawRole = (row[2] || 'ADMIN').toUpperCase();
      const userRole: UserRole = rawRole.includes('MASTER') ? 'MASTER_ADMIN' : rawRole.includes('USER') ? 'USER_OPERATIONAL' : 'ADMIN';
      
      let targetModule: any = 'STOCK';
      const rawMod = (row[3] || 'STOCK').toUpperCase();
      if (rawMod.includes('TRANS') || rawMod.includes('APPROV')) targetModule = 'TRANSACTIONS';
      else if (rawMod.includes('LOAN') || rawMod.includes('PINJAM')) targetModule = 'LOANS';
      else if (rawMod.includes('USER')) targetModule = 'USERS';
      else if (rawMod.includes('SET') || rawMod.includes('PENGATUR')) targetModule = 'SETTINGS';
      else if (rawMod.includes('EMP') || rawMod.includes('KARYAWAN') || rawMod.includes('PERSONIL')) targetModule = 'EMPLOYEES';

      const action = row[4] || 'Log Aktivitas';
      const details = row[5] || row[4] || '-';

      result.push({
        id: `log_imp_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp,
        userName,
        userRole,
        targetModule,
        action,
        details,
      });
    }

    return result;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportText(content);
      const parsed = parseTextToLogs(content);
      setParsedImportLogs(parsed);
      if (parsed.length === 0) {
        setImportError('Format file tidak dikenali atau kosong. Silakan gunakan format CSV atau JSON sesuai template.');
      } else {
        setImportError(null);
      }
    };
    reader.readAsText(file);
  };

  const handleApplyImport = () => {
    if (parsedImportLogs.length === 0) {
      setImportError('Belum ada data log yang valid untuk diimpor.');
      return;
    }

    if (onImportLogs) {
      onImportLogs(parsedImportLogs, importMode);
    }
    setIsImportOpen(false);
    setImportText('');
    setParsedImportLogs([]);
    setImportError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-400/30">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Log Aktivitas Sistem & Audit Trail Global</h3>
              <p className="text-xs text-slate-300">
                Pencatatan transparan seluruh mutasi stok, approval, peminjaman, dan perubahan konfigurasi sistem
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters & Actions Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari aktivitas, pengguna, modul..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white"
            >
              <option value="ALL">Semua Modul</option>
              <option value="STOCK">Master Stok</option>
              <option value="TRANSACTIONS">Transaksi & Approval</option>
              <option value="LOANS">Peminjaman</option>
              <option value="USERS">Manajemen User</option>
              <option value="SETTINGS">Pengaturan</option>
              <option value="EMPLOYEES">Database Personil</option>
            </select>

            {onImportLogs && (
              <button
                type="button"
                onClick={() => setIsImportOpen(true)}
                className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Impor catatan riwayat log dari file CSV / JSON"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Log</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportLogs}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="p-4 overflow-y-auto flex-1">
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-36">Waktu</th>
                  <th className="py-2.5 px-3 w-48">Pengguna & Role</th>
                  <th className="py-2.5 px-3 w-28">Modul</th>
                  <th className="py-2.5 px-3 w-40">Aksi</th>
                  <th className="py-2.5 px-3">Keterangan Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-medium">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      Tidak ada data log audit yang sesuai dengan filter
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                        {log.timestamp}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{log.userName}</div>
                        <span className="text-[10px] text-slate-500 font-mono">[{log.userRole}]</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {log.targetModule}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-600">
            Total <b>{filteredLogs.length}</b> catatan aktivitas tersimpan dalam audit trail.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Sub-Modal: Import Data Log Audit */}
      {isImportOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-purple-900 text-white p-4 px-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Upload className="w-5 h-5 text-purple-300" />
                <h4 className="font-bold text-sm">Impor Riwayat Log & Audit Trail</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsImportOpen(false)}
                className="p-1 text-purple-200 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="bg-purple-50 p-3.5 rounded-xl border border-purple-200 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="font-bold text-purple-950 block">Petunjuk Format File Impor:</span>
                  <p className="text-[11px] text-purple-900 leading-relaxed">
                    Unggah file <b>.CSV</b> atau <b>.JSON</b> yang berisi riwayat log aktivitas. Format kolom yang didukung: <br/>
                    <code className="bg-purple-100 px-1 py-0.5 rounded font-mono text-[10px]">Waktu, Pengguna, Role, Modul, Aksi, Keterangan Detail</code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 bg-white hover:bg-purple-100 text-purple-900 border border-purple-300 font-bold rounded-lg shrink-0 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-purple-700" />
                  <span>Unduh Template CSV</span>
                </button>
              </div>

              {/* Upload Drop Area */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.json,.tsv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-purple-300 hover:border-purple-500 rounded-xl p-5 bg-purple-50/40 hover:bg-purple-50/80 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="w-8 h-8 text-purple-600" />
                  <span className="font-bold text-slate-800 text-xs">Klik untuk Memilih File CSV atau JSON</span>
                  <span className="text-[10px] text-slate-500">Mendukung file ekspor dari sistem, spreadsheet, atau backup JSON</span>
                </button>
              </div>

              {/* Mode Selection */}
              <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700">Mode Impor:</span>
                <label className="flex items-center gap-1.5 font-bold cursor-pointer text-slate-800">
                  <input
                    type="radio"
                    name="importMode"
                    value="append"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                    className="text-purple-600"
                  />
                  <span>Gabungkan (Append)</span>
                </label>
                <label className="flex items-center gap-1.5 font-bold cursor-pointer text-slate-800">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="text-purple-600"
                  />
                  <span>Ganti Seluruh Log (Replace)</span>
                </label>
              </div>

              {/* Validation Status & Preview */}
              {importError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {parsedImportLogs.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{parsedImportLogs.length} Catatan Log Terdeteksi Siap Diimpor</span>
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 text-slate-700 font-bold">
                        <tr>
                          <th className="p-2">Waktu</th>
                          <th className="p-2">Pengguna</th>
                          <th className="p-2">Modul</th>
                          <th className="p-2">Aksi</th>
                          <th className="p-2">Detail</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {parsedImportLogs.slice(0, 5).map((log, idx) => (
                          <tr key={idx}>
                            <td className="p-2 font-mono text-[10px]">{log.timestamp}</td>
                            <td className="p-2 font-bold">{log.userName}</td>
                            <td className="p-2">{log.targetModule}</td>
                            <td className="p-2 font-semibold text-purple-900">{log.action}</td>
                            <td className="p-2 text-slate-500 truncate max-w-xs">{log.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedImportLogs.length > 5 && (
                    <p className="text-[10px] text-slate-400 italic text-right">
                      Menampilkan 5 dari total {parsedImportLogs.length} data.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsImportOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={parsedImportLogs.length === 0}
                onClick={handleApplyImport}
                className="px-5 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white font-bold rounded-xl shadow-sm cursor-pointer transition-all flex items-center gap-1.5 text-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Terapkan Impor ({parsedImportLogs.length} Data)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

