import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Plus, 
  RefreshCw,
  HelpCircle,
  Table
} from 'lucide-react';
import { Item, Category } from '../types';
import { CATEGORIES, UNITS } from '../data/initialData';
import { generateItemCode } from '../utils/helpers';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Item[];
  categories?: string[];
  onImportItems: (newItems: Item[], mode: 'append' | 'replace') => void;
  onOpenGoogleSheets?: () => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  items,
  categories,
  onImportItems,
  onOpenGoogleSheets,
}) => {
  const activeCategories = categories && categories.length > 0 ? categories : CATEGORIES;
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'export'>('upload');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  
  const [pastedText, setPastedText] = useState('');
  const [parsedItems, setParsedItems] = useState<Item[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Download Sample CSV Template
  const handleDownloadTemplate = () => {
    const headers = 'Kode Barang,Nama Barang,Kategori,Stok Awal,Stok Minimum,Satuan,Lokasi Rak,Harga Satuan,Keterangan';
    const sampleRows = [
      'GA-ATK-001,Kertas HVS A4 80gr PaperOne,Alat Tulis Kantor (ATK),50,10,Rim,Rak A1-01,55000,Kertas putih standar kantor',
      'GA-ATK-002,Pulpen Gel Joyko Hitam 0.5mm,Alat Tulis Kantor (ATK),120,24,Pcs,Rak A1-02,3500,Tinta hitam',
      'GA-CLN-001,Hand Soap Yuri 410ml Apple,Kebersihan & Sanitasi,30,5,Botol,Lemari B1-01,24500,Sabun cuci tangan toilet',
      'GA-PAN-001,Kopi Nescafe Classic Jar 100gr,Pantry & Konsumsi,15,3,Jar,Lemari Pantry C,42000,Konsumsi pantry karyawan',
      'GA-K3-001,Kotak P3K Dinding Lengkap Type A,Perlengkapan K3 & Medis,5,2,Unit,Dinding Pos GA,185000,Standar Kemenaker'
    ];

    const csvContent = '\uFEFF' + [headers, ...sampleRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_import_barang_ga.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export current inventory to CSV
  const handleExportCurrentData = () => {
    const headers = 'Kode Barang,Nama Barang,Kategori,Stok Saat Ini,Stok Minimum,Satuan,Lokasi Rak,Estimasi Harga,Keterangan,Terakhir Diperbarui';
    const rows = items.map(item => {
      const cleanName = `"${item.name.replace(/"/g, '""')}"`;
      const cleanDesc = `"${(item.description || '').replace(/"/g, '""')}"`;
      const cleanLoc = `"${item.rackLocation.replace(/"/g, '""')}"`;
      return [
        item.code,
        cleanName,
        item.category,
        item.currentStock,
        item.minStock,
        item.unit,
        cleanLoc,
        item.priceEstimate || 0,
        cleanDesc,
        item.updatedAt
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `data_master_stok_ga_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper to parse CSV/TSV raw text
  const parseRawTextToItems = (text: string): Item[] => {
    if (!text.trim()) return [];

    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return [];

    // Determine delimiter: comma, tab, or semicolon
    const firstLine = lines[0];
    let delimiter = ',';
    if (firstLine.includes('\t')) delimiter = '\t';
    else if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';

    const resultItems: Item[] = [];
    const startIndex = (lines[0].toLowerCase().includes('nama') || lines[0].toLowerCase().includes('name') || lines[0].toLowerCase().includes('kode') || lines[0].toLowerCase().includes('kategori')) ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle quoted CSV cells
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

      // Simple fallback split if regex produced empty array
      const row = cells.length > 1 ? cells : line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));

      if (row.length < 2) continue;

      // Mapping columns
      // Expected layout: Kode, Nama, Kategori, Stok, MinStok, Satuan, Lokasi, Harga, Deskripsi
      // OR: Nama, Kategori, Stok, Satuan, Lokasi, Harga
      let code = '';
      let name = '';
      let category: Category = activeCategories[0] || 'ATK (Alat Tulis Kantor)';
      let currentStock = 0;
      let minStock = 5;
      let unit = UNITS[0];
      let rackLocation = 'Gudang GA';
      let priceEstimate = 0;
      let description = '';

      if (row.length >= 7) {
        // Standard full template
        code = row[0] || '';
        name = row[1] || '';
        const rawCat = row[2] || '';
        const matched = activeCategories.find(c => c.toLowerCase().includes(rawCat.toLowerCase()));
        category = (matched || rawCat || activeCategories[0]) as Category;
        currentStock = parseInt(row[3], 10) || 0;
        minStock = parseInt(row[4], 10) || 5;
        unit = row[5] || UNITS[0];
        rackLocation = row[6] || 'Gudang GA';
        priceEstimate = parseInt((row[7] || '0').replace(/[^0-9]/g, ''), 10) || 0;
        description = row[8] || '';
      } else {
        // Shorter format: Nama, Kategori, Stok, Satuan, Lokasi
        name = row[0] || '';
        const rawCat = row[1] || '';
        const matched = activeCategories.find(c => c.toLowerCase().includes(rawCat.toLowerCase()));
        category = (matched || rawCat || activeCategories[0]) as Category;
        currentStock = parseInt(row[2], 10) || 0;
        unit = row[3] || UNITS[0];
        rackLocation = row[4] || 'Gudang GA';
        priceEstimate = parseInt((row[5] || '0').replace(/[^0-9]/g, ''), 10) || 0;
      }

      if (!name) continue;

      if (!code) {
        let prefix = 'GEN';
        if (category.includes('ATK')) prefix = 'ATK';
        else if (category.includes('Kebersihan')) prefix = 'CLN';
        else if (category.includes('K3')) prefix = 'K3';
        else if (category.includes('Pantry')) prefix = 'PAN';
        else if (category.includes('Elektronik')) prefix = 'ELC';
        else if (category.includes('Logistik')) prefix = 'LOG';
        code = generateItemCode(prefix);
      }

      const now = new Date().toISOString();
      resultItems.push({
        id: 'item_' + Date.now() + '_' + i + '_' + Math.random().toString(36).substr(2, 4),
        code: code.toUpperCase().trim(),
        name: name.trim(),
        category,
        unit: unit.trim() || 'Pcs',
        currentStock: Math.max(0, currentStock),
        minStock: Math.max(1, minStock),
        rackLocation: rackLocation.trim() || 'Gudang GA',
        description: description.trim(),
        priceEstimate,
        createdAt: now,
        updatedAt: now,
      });
    }

    return resultItems;
  };

  // Handle File Input Selection
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParseError(null);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseRawTextToItems(text);
        if (parsed.length === 0) {
          setParseError('Tidak ada data barang yang valid ditemukan dalam file ini. Silakan periksa format baris atau gunakan template CSV.');
          setParsedItems([]);
        } else {
          setParsedItems(parsed);
          setParseError(null);
        }
      } catch (err) {
        setParseError('Gagal membaca file. Pastikan file berformat CSV (.csv) atau teks (.txt).');
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setParseError('Terjadi kesalahan saat membaca file.');
      setIsProcessing(false);
    };

    reader.readAsText(file);
  };

  // Handle Paste Parse
  const handleParsePaste = () => {
    setParseError(null);
    if (!pastedText.trim()) {
      setParseError('Silakan tempel (paste) data teks dari Excel terlebih dahulu.');
      return;
    }

    const parsed = parseRawTextToItems(pastedText);
    if (parsed.length === 0) {
      setParseError('Format data yang ditempel tidak dapat dikenali. Pastikan menyertakan Nama Barang dan Stok.');
      setParsedItems([]);
    } else {
      setParsedItems(parsed);
      setParseError(null);
    }
  };

  // Submit and save items to app
  const handleConfirmImport = () => {
    if (parsedItems.length === 0) return;
    onImportItems(parsedItems, importMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-[#112f50] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-xl">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">
                Import & Export Data Barang (Excel / CSV)
              </h3>
              <p className="text-xs text-slate-300">
                Masukkan data inventaris secara massal atau unduh cadangan data stok saat ini
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-t-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-white text-blue-700 border-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload File CSV / Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-t-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'paste'
                ? 'bg-white text-blue-700 border-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>Copy-Paste dari Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-t-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'export'
                ? 'bg-white text-emerald-700 border-emerald-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Export Data Stok ({items.length})</span>
          </button>

          {onOpenGoogleSheets && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenGoogleSheets();
              }}
              className="ml-auto px-3.5 py-1.5 my-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="Buka Ekspor & Impor langsung ke Google Sheets"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Google Sheets API</span>
            </button>
          )}
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* TAB 1: UPLOAD CSV FILE */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {/* Template Download Banner */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-blue-950">Unduh Format Template CSV</h4>
                    <p className="text-xs text-blue-800/80 mt-0.5">
                      Gunakan template ini untuk mengisi data barang Anda di Excel agar kolom sesuai secara otomatis.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Template</span>
                </button>
              </div>

              {/* Upload Drop Zone */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/30 rounded-2xl p-8 text-center cursor-pointer transition-all group"
              >
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv, .txt"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-800">
                  {fileName ? `File terpilih: ${fileName}` : 'Klik untuk memilih file CSV atau seret ke sini'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Mendukung format file <b>.csv</b> (Comma/Semicolon Separated) atau <b>.txt</b>
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: COPY-PASTE FROM EXCEL */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Salin (Copy) tabel dari Excel atau Google Sheets lalu tempel (Paste) di bawah:
                </label>
                <span className="text-[11px] text-slate-500">
                  Kolom: Kode, Nama, Kategori, Stok, MinStok, Satuan, Rak, Harga
                </span>
              </div>
              <textarea
                rows={6}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={`GA-ATK-001\tKertas HVS A4\tAlat Tulis Kantor (ATK)\t50\t10\tRim\tRak A1\t55000\nGA-CLN-001\tHand Soap Yuri\tKebersihan & Sanitasi\t20\t5\tBotol\tLemari B\t25000`}
                className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleParsePaste}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Proses & Tampilkan Preview</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: EXPORT CURRENT DATA */}
          {activeTab === 'export' && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-slate-900">
                  Export Seluruh Master Data Stok ({items.length} Barang)
                </h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
                  Unduh seluruh daftar barang beserta kode barcode, stok terkini, satuan, lokasi rak, dan estimasi harga dalam format file CSV siap buka di Microsoft Excel.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportCurrentData}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 mx-auto transition-all active:scale-98 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh File CSV Data Stok</span>
              </button>
            </div>
          )}

          {/* Error Message if Any */}
          {parseError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{parseError}</span>
            </div>
          )}

          {/* PREVIEW TABLE (Shown if items are parsed) */}
          {parsedItems.length > 0 && activeTab !== 'export' && (
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-extrabold text-slate-800">
                    Preview Data Siap Diimpor ({parsedItems.length} Barang Ditemukan)
                  </h4>
                </div>

                {/* Import Mode Radio */}
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-700">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="text-blue-600"
                    />
                    <span>Tambahkan ke data yang ada</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-amber-700">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-amber-600"
                    />
                    <span>Ganti / Timpa semua data master</span>
                  </label>
                </div>
              </div>

              {/* Table Preview */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Kode / SKU</th>
                      <th className="py-2 px-3">Nama Barang</th>
                      <th className="py-2 px-3">Kategori</th>
                      <th className="py-2 px-3 text-center">Stok</th>
                      <th className="py-2 px-3 text-center">Satuan</th>
                      <th className="py-2 px-3">Lokasi Rak</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 font-mono font-bold text-blue-700">{item.code}</td>
                        <td className="py-2 px-3 font-bold text-slate-800">{item.name}</td>
                        <td className="py-2 px-3 text-slate-600">{item.category}</td>
                        <td className="py-2 px-3 text-center font-bold text-slate-900">{item.currentStock}</td>
                        <td className="py-2 px-3 text-center text-slate-600">{item.unit}</td>
                        <td className="py-2 px-3 text-slate-600">{item.rackLocation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 cursor-pointer"
          >
            Tutup
          </button>

          {activeTab !== 'export' && (
            <button
              type="button"
              disabled={parsedItems.length === 0}
              onClick={handleConfirmImport}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-extrabold rounded-xl shadow-md transition-all active:scale-98 flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan & Masukkan {parsedItems.length > 0 ? `(${parsedItems.length})` : ''} ke Master Stok</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
