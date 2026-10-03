import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Package, 
  Layers, 
  Calendar, 
  Download, 
  FileSpreadsheet, 
  Sparkles, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Building2, 
  PieChart as PieChartIcon, 
  Filter,
  X,
  Printer
} from 'lucide-react';
import { Item, Transaction, Category } from '../types';

interface ProfessionalStatsReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Item[];
  transactions: Transaction[];
}

export const ProfessionalStatsReportModal: React.FC<ProfessionalStatsReportModalProps> = ({
  isOpen,
  onClose,
  items,
  transactions,
}) => {
  const [reportPeriod, setReportPeriod] = useState<'all' | 'this_month' | 'last_30_days' | 'custom'>('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  if (!isOpen) return null;

  // Filter transactions based on date
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  const filteredTransactions = transactions.filter((trx) => {
    const rawDateStr = trx.timestamp ? (trx.timestamp.split(' ')[0] || trx.timestamp.split('T')[0]) : (trx.date || '');
    if (!rawDateStr) return true;

    if (reportPeriod === 'this_month') {
      const d = new Date(rawDateStr);
      if (d.getFullYear() !== currentYear || d.getMonth() !== currentMonth) return false;
    } else if (reportPeriod === 'last_30_days') {
      const d = new Date(rawDateStr).getTime();
      const thirtyDaysAgo = now.getTime() - (30 * 24 * 60 * 60 * 1000);
      if (d < thirtyDaysAgo) return false;
    } else if (reportPeriod === 'custom') {
      if (startDate && rawDateStr < startDate) return false;
      if (endDate && rawDateStr > endDate) return false;
    }

    if (selectedCategory !== 'ALL') {
      const hasCategory = (trx.items || []).some((it) => it.category === selectedCategory);
      if (!hasCategory) return false;
    }

    return true;
  });

  const inTrxList = filteredTransactions.filter((t) => t.type === 'IN');
  const outTrxList = filteredTransactions.filter((t) => t.type === 'OUT');

  const totalInQty = inTrxList.reduce((acc, t) => acc + (t.items || []).reduce((s, it) => s + (it.quantity || 0), 0), 0);
  const totalOutQty = outTrxList.reduce((acc, t) => acc + (t.items || []).reduce((s, it) => s + (it.quantity || 0), 0), 0);

  const totalStockItems = items.length;
  const totalPhysicalStock = items.reduce((acc, it) => acc + it.currentStock, 0);
  const lowStockCount = items.filter((it) => it.currentStock <= it.minStock && it.currentStock > 0).length;
  const outOfStockCount = items.filter((it) => it.currentStock <= 0).length;

  // Most requested items (Top 5 Items Keluar)
  const itemOutMap: Record<string, { name: string; code: string; unit: string; qty: number }> = {};
  outTrxList.forEach((t) => {
    (t.items || []).forEach((it) => {
      if (!itemOutMap[it.itemCode]) {
        itemOutMap[it.itemCode] = { name: it.itemName, code: it.itemCode, unit: it.unit, qty: 0 };
      }
      itemOutMap[it.itemCode].qty += (it.quantity || 0);
    });
  });
  const topOutItems = Object.values(itemOutMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

  // Most restocked items (Top 5 Items Masuk)
  const itemInMap: Record<string, { name: string; code: string; unit: string; qty: number }> = {};
  inTrxList.forEach((t) => {
    (t.items || []).forEach((it) => {
      if (!itemInMap[it.itemCode]) {
        itemInMap[it.itemCode] = { name: it.itemName, code: it.itemCode, unit: it.unit, qty: 0 };
      }
      itemInMap[it.itemCode].qty += (it.quantity || 0);
    });
  });
  const topInItems = Object.values(itemInMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

  // Department distribution for Out items
  const deptOutMap: Record<string, number> = {};
  outTrxList.forEach((t) => {
    const dept = t.department || 'General Affairs';
    const totalQty = (t.items || []).reduce((s, it) => s + (it.quantity || 0), 0);
    deptOutMap[dept] = (deptOutMap[dept] || 0) + totalQty;
  });
  const deptOutList = Object.entries(deptOutMap).sort((a, b) => b[1] - a[1]);

  const handleExportCSV = () => {
    const headers = ['Jenis Laporan', 'No. Transaksi', 'Tanggal', 'Departemen/Supplier', 'Kode Barang', 'Nama Barang', 'Jumlah', 'Satuan'];
    const rows: string[][] = [];

    filteredTransactions.forEach((t) => {
      (t.items || []).forEach((it) => {
        rows.push([
          t.type === 'IN' ? 'BARANG MASUK' : 'BARANG KELUAR',
          `"${t.transactionNumber}"`,
          `"${t.timestamp || t.date || ''}"`,
          `"${t.type === 'IN' ? (t.supplier || '-') : (t.department || '-')}"`,
          `"${it.itemCode}"`,
          `"${it.itemName}"`,
          `${it.quantity}`,
          `"${it.unit}"`,
        ]);
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Laporan_Statistik_Gudang_KBCT_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-b from-blue-500/30 to-indigo-600/30 text-cyan-300 rounded-xl border border-cyan-400/30 shadow-inner">
              <BarChart3 className="w-5 h-5 drop-shadow-xs" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-white">Statistik & Laporan Eksekutif Gudang</h3>
                <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-[10px] font-extrabold rounded-full">
                  Warehouse KBCT
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Analisis mutasi barang keluar/masuk, rasio perputaran stok, dan rekapitulasi inventaris real-time
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="hidden sm:flex px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs items-center gap-1.5 cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="px-4 sm:px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Period Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[11px] font-bold text-slate-600 shrink-0 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" /> Periode:
            </span>
            <button
              type="button"
              onClick={() => setReportPeriod('this_month')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                reportPeriod === 'this_month' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'
              }`}
            >
              Bulan Ini
            </button>
            <button
              type="button"
              onClick={() => setReportPeriod('last_30_days')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                reportPeriod === 'last_30_days' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'
              }`}
            >
              30 Hari Terakhir
            </button>
            <button
              type="button"
              onClick={() => setReportPeriod('all')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                reportPeriod === 'all' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'
              }`}
            >
              Semua Waktu
            </button>
            <button
              type="button"
              onClick={() => setReportPeriod('custom')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                reportPeriod === 'custom' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'
              }`}
            >
              Kustom
            </button>
          </div>

          {/* Custom Date Inputs (stacked cleanly) */}
          {reportPeriod === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white"
              />
              <span className="text-xs text-slate-400">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white"
              />
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-5">
          {/* Top 4 KPI Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* KPI 1: Barang Keluar */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 p-4 rounded-2xl border border-amber-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-800">Total Keluar (OUT)</span>
                <div className="p-2 bg-amber-500 text-slate-950 rounded-xl shadow-xs">
                  <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                </div>
              </div>
              <div className="text-2xl font-black text-amber-950 mt-2">{totalOutQty.toLocaleString()} <span className="text-xs font-bold text-amber-800">Unit</span></div>
              <p className="text-[11px] text-amber-800 mt-0.5">{outTrxList.length} transaksi permintaan</p>
            </div>

            {/* KPI 2: Barang Masuk */}
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 rounded-2xl border border-emerald-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">Total Masuk (IN)</span>
                <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                  <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-950 mt-2">{totalInQty.toLocaleString()} <span className="text-xs font-bold text-emerald-800">Unit</span></div>
              <p className="text-[11px] text-emerald-800 mt-0.5">{inTrxList.length} restock / penerimaan</p>
            </div>

            {/* KPI 3: Total Fisik Stock */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 rounded-2xl border border-blue-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-800">Stok Fisik Tersedia</span>
                <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-blue-950 mt-2">{totalPhysicalStock.toLocaleString()} <span className="text-xs font-bold text-blue-800">Unit</span></div>
              <p className="text-[11px] text-blue-800 mt-0.5">Tersebar di {totalStockItems} SKU master</p>
            </div>

            {/* KPI 4: Kesehatan Stok */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">Status Stok Kritis</span>
                <div className="p-2 bg-rose-500 text-white rounded-xl shadow-xs">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-rose-700 mt-2">{lowStockCount + outOfStockCount} <span className="text-xs font-bold text-slate-600">Item</span></div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {outOfStockCount > 0 ? `${outOfStockCount} habis (0)` : 'Stok dalam batas aman'}
              </p>
            </div>
          </div>

          {/* Section 2: Top Fast Moving & Top Restocked Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top 5 Barang Paling Sering Diminta (Fast Moving) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-700 flex items-center justify-center font-black text-xs">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">Top 5 Permintaan Terbanyak (Barang Keluar)</h4>
                    <p className="text-[10px] text-slate-500">Item dengan mutasi pengeluaran paling aktif</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Fast-Moving
                </span>
              </div>

              {topOutItems.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Belum ada transaksi pengeluaran pada periode ini</p>
              ) : (
                <div className="space-y-2">
                  {topOutItems.map((item, idx) => (
                    <div key={item.code} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/70 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                          <p className="text-[10px] font-mono text-slate-500">{item.code}</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-black text-xs rounded-lg whitespace-nowrap">
                        {item.qty} {item.unit}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top 5 Barang Paling Banyak Masuk / Restock */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-700 flex items-center justify-center font-black text-xs">
                    <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">Top 5 Penerimaan Terbanyak (Barang Masuk)</h4>
                    <p className="text-[10px] text-slate-500">Volume inbound & pengadaan terbesar</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Inbound
                </span>
              </div>

              {topInItems.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Belum ada transaksi penerimaan pada periode ini</p>
              ) : (
                <div className="space-y-2">
                  {topInItems.map((item, idx) => (
                    <div key={item.code} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/70 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                          <p className="text-[10px] font-mono text-slate-500">{item.code}</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 font-black text-xs rounded-lg whitespace-nowrap">
                        {item.qty} {item.unit}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Distribusi Penggunaan Departemen */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-700 flex items-center justify-center font-black text-xs">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900">Distribusi Pemakaian Barang per Departemen / Divisi</h4>
                  <p className="text-[10px] text-slate-500">Rekap total kuantitas barang yang diserahterimakan</p>
                </div>
              </div>
            </div>

            {deptOutList.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Tidak ada data departemen</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {deptOutList.map(([dept, qty]) => {
                  const percent = totalOutQty > 0 ? Math.round((qty / totalOutQty) * 100) : 0;
                  return (
                    <div key={dept} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span className="truncate">{dept}</span>
                        <span className="text-blue-700 font-black">{qty} unit</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-500 text-right">{percent}% dari total keluar</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs px-5">
          <span className="text-[11px] text-slate-500 font-mono">
            Sistem Laporan Otomatis • Warehouse KBCT Terintegrasi Cloud
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all cursor-pointer shadow-xs"
          >
            Tutup Laporan
          </button>
        </div>
      </div>
    </div>
  );
};
