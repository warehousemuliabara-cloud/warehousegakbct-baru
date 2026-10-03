import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Package, 
  ArrowUpRight, 
  ArrowDownLeft, 
  AlertTriangle, 
  HandHelping, 
  ShieldCheck, 
  Image as ImageIcon, 
  Lock,
  ArrowRight,
  Calendar,
  QrCode,
  Printer,
  ChevronDown,
  Layers,
  CalendarDays,
  BarChart3,
  TrendingUp,
  TrendingDown,
  MoreVertical,
  PackageCheck
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar 
} from 'recharts';
import { Item, Transaction, ItemLoan, UserAccount, DashboardConfig, Employee, UserRole, UserPermissions } from '../types';
import { CompanyLogo } from './CompanyLogo';
import { BarcodePrintMode } from './BarcodeSheetModal';
import { getThemeConfig } from '../utils/themeStyles';

interface DashboardOverviewProps {
  items: Item[];
  transactions: Transaction[];
  loans: ItemLoan[];
  currentUser: UserAccount;
  config: DashboardConfig;
  rolePermissions?: Record<UserRole, UserPermissions>;
  employees?: Employee[];
  onOpenSettingsModal: () => void;
  onOpenScanner?: () => void;
  onOpenBarcodePrint?: (mode?: BarcodePrintMode) => void;
  onOpenStatsReport?: () => void;
  onNavigateToRequest: () => void;
  onNavigateToIncoming: () => void;
  onNavigateToStock: () => void;
  onNavigateToLoans: () => void;
  onNavigateToTransactions: () => void;
  onScanItemForRequest: (item: Item) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  items,
  transactions,
  loans,
  currentUser,
  config,
  rolePermissions,
  employees = [],
  onOpenSettingsModal,
  onOpenScanner,
  onOpenBarcodePrint,
  onOpenStatsReport,
  onNavigateToRequest,
  onNavigateToIncoming,
  onNavigateToStock,
  onNavigateToLoans,
  onNavigateToTransactions,
  onScanItemForRequest,
}) => {
  const totalItemsCount = items.length;
  const totalPhysicalStock = items.reduce((acc, item) => acc + item.currentStock, 0);
  const lowStockItems = items.filter((item) => item.currentStock <= item.minStock);

  const outTransactions = transactions.filter((t) => t.type === 'OUT');
  const inTransactions = transactions.filter((t) => t.type === 'IN');
  const pendingApprovals = transactions.filter((t) => t.status === 'PENDING');
  const pendingDispatchRequests = transactions.filter((t) => t.type === 'OUT' && t.status === 'APPROVED');
  const activeLoans = loans.filter((l) => l.status === 'BORROWED');

  const theme = getThemeConfig(config?.themeColor);
  const showCards = config?.showMetricCards || {
    totalItems: true,
    outTransactions: true,
    inTransactions: true,
    lowStockAlert: true,
  };

  // Chart Period Filter ('THIS_MONTH' | 'CUSTOM')
  const [chartPeriod, setChartPeriod] = useState<'THIS_MONTH' | 'CUSTOM'>('THIS_MONTH');
  const [selectedMonthOffset, setSelectedMonthOffset] = useState<number>(0);

  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // State for Barcode Print Dropdown menu in Dashboard Header
  const [isPrintDropdownOpen, setIsPrintDropdownOpen] = useState(false);
  const printDropdownRef = useRef<HTMLDivElement>(null);

  // State for Multi-dimensional Insights 3-dots Menu
  const [isInsightsMenuOpen, setIsInsightsMenuOpen] = useState(false);
  const insightsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (printDropdownRef.current && !printDropdownRef.current.contains(event.target as Node)) {
        setIsPrintDropdownOpen(false);
      }
      if (insightsMenuRef.current && !insightsMenuRef.current.contains(event.target as Node)) {
        setIsInsightsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper function to extract local date key YYYY-MM-DD from Date
  const formatLocalDateKey = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to extract YYYY-MM-DD from transaction timestamp or date in user's local timezone
  const getTransactionDateKey = (t: Transaction): string => {
    // 1. If explicit dateFormatted is DD/MM/YYYY
    if (t.dateFormatted) {
      const dmy = String(t.dateFormatted).match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
      if (dmy) {
        return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
      }
    }
    // 2. Try ISO timestamp or date
    const raw = t.timestamp || t.date || (t as any).createdAt || '';
    if (raw) {
      const parsed = new Date(raw);
      if (!isNaN(parsed.getTime())) {
        return formatLocalDateKey(parsed);
      }
      const match = String(raw).match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
      if (match) {
        return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
      }
    }
    return '';
  };

  // Helper to extract hour (0-23) from transaction in local timezone
  const getTransactionHour = (t: Transaction): number => {
    const raw = t.timestamp || t.date || (t as any).createdAt || '';
    if (raw) {
      const parsed = new Date(raw);
      if (!isNaN(parsed.getTime())) {
        return parsed.getHours();
      }
    }
    if (t.timeFormatted) {
      const match = String(t.timeFormatted).match(/^(\d{1,2}):/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    return 12;
  };

  // Active month descriptor for 'THIS_MONTH'
  const currentMonthYear = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + selectedMonthOffset);
    const y = d.getFullYear();
    const m = d.getMonth();
    return {
      key: `${y}-${String(m + 1).padStart(2, '0')}`,
      year: y,
      month: m,
      label: d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
      isCurrentRealMonth: selectedMonthOffset === 0,
    };
  }, [selectedMonthOffset]);

  // Handle custom date pickers with auto-adjustment
  const handleStartDateChange = (val: string) => {
    setCustomStartDate(val);
    if (customEndDate && val > customEndDate) {
      setCustomEndDate(val);
    }
  };

  const handleEndDateChange = (val: string) => {
    setCustomEndDate(val);
    if (customStartDate && val < customStartDate) {
      setCustomStartDate(val);
    }
  };

  // -------------------------------------------------------------
  // Data for Operation Overview Area Chart (Dual Spline Waves)
  // Synchronized with real IN & OUT transaction histories
  // -------------------------------------------------------------
  const operationTimeSeriesData = useMemo(() => {
    const dailyMap: Record<string, { dateLabel: string; inQty: number; outQty: number; rawDate: string }> = {};
    
    if (chartPeriod === 'THIS_MONTH') {
      const { year, month } = currentMonthYear;
      const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
      
      for (let day = 1; day <= totalDaysInMonth; day++) {
        const d = new Date(year, month, day);
        const isoKey = formatLocalDateKey(d);
        const dateLabel = `${day} ${d.toLocaleDateString('id-ID', { month: 'short' })}`;
        dailyMap[isoKey] = {
          dateLabel,
          inQty: 0,
          outQty: 0,
          rawDate: isoKey,
        };
      }

      // Populate transactions for this month
      (transactions || []).forEach((t) => {
        if (t.status === 'REJECTED') return;
        const txDateStr = getTransactionDateKey(t);
        if (!txDateStr) return;

        const qtySum = (t.items && t.items.length > 0)
          ? t.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0)
          : (Number((t as any).quantity) || 0);

        if (dailyMap[txDateStr]) {
          if (t.type === 'IN') {
            dailyMap[txDateStr].inQty += qtySum;
          } else if (t.type === 'OUT') {
            dailyMap[txDateStr].outQty += qtySum;
          }
        }
      });

      return Object.values(dailyMap).sort((a, b) => a.rawDate.localeCompare(b.rawDate));
    } else {
      // CUSTOM period
      const isSingleDay = customStartDate === customEndDate;

      if (isSingleDay) {
        // Generate 12 two-hour intervals across the single selected day
        const hourlyMap: Record<string, { dateLabel: string; inQty: number; outQty: number; rawDate: string; hourStart: number }> = {};
        const hours = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
        hours.forEach((h) => {
          const timeLabel = `${String(h).padStart(2, '0')}:00`;
          hourlyMap[timeLabel] = {
            dateLabel: timeLabel,
            inQty: 0,
            outQty: 0,
            rawDate: `${customStartDate}T${timeLabel}`,
            hourStart: h,
          };
        });

        (transactions || []).forEach((t) => {
          if (t.status === 'REJECTED') return;
          const txDateStr = getTransactionDateKey(t);
          if (txDateStr !== customStartDate) return;

          const qtySum = (t.items && t.items.length > 0)
            ? t.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0)
            : (Number((t as any).quantity) || 0);

          const h = getTransactionHour(t);
          // Find closest interval
          const bucketHour = hours.reduce((prev, curr) => (curr <= h ? curr : prev), 0);
          const key = `${String(bucketHour).padStart(2, '0')}:00`;
          if (hourlyMap[key]) {
            if (t.type === 'IN') {
              hourlyMap[key].inQty += qtySum;
            } else if (t.type === 'OUT') {
              hourlyMap[key].outQty += qtySum;
            }
          }
        });

        return Object.values(hourlyMap).sort((a, b) => a.hourStart - b.hourStart);
      } else {
        // Multi-day custom range
        const start = new Date(customStartDate + 'T00:00:00');
        const end = new Date(customEndDate + 'T23:59:59');
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
          const cur = new Date(start);
          let count = 0;
          while (cur <= end && count < 365) {
            count++;
            const isoKey = formatLocalDateKey(cur);
            const dateLabel = `${cur.getDate()} ${cur.toLocaleDateString('id-ID', { month: 'short' })}`;
            dailyMap[isoKey] = {
              dateLabel,
              inQty: 0,
              outQty: 0,
              rawDate: isoKey,
            };
            cur.setDate(cur.getDate() + 1);
          }
        }

        (transactions || []).forEach((t) => {
          if (t.status === 'REJECTED') return;
          const txDateStr = getTransactionDateKey(t);
          if (!txDateStr) return;

          const qtySum = (t.items && t.items.length > 0)
            ? t.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0)
            : (Number((t as any).quantity) || 0);

          if (dailyMap[txDateStr]) {
            if (t.type === 'IN') {
              dailyMap[txDateStr].inQty += qtySum;
            } else if (t.type === 'OUT') {
              dailyMap[txDateStr].outQty += qtySum;
            }
          }
        });

        return Object.values(dailyMap).sort((a, b) => a.rawDate.localeCompare(b.rawDate));
      }
    }
  }, [transactions, chartPeriod, customStartDate, customEndDate, currentMonthYear]);

  // -------------------------------------------------------------
  // Data for Multi-Dimensional Insights: Category Distribution Donut
  // Synchronized directly with Master Data Stock (items) - Includes ALL categories
  // -------------------------------------------------------------
  const categoryDonutData = useMemo(() => {
    const catMap: Record<string, { count: number; totalStock: number }> = {};
    
    (items || []).forEach((item) => {
      const cat = (item.category || 'Lainnya').trim();
      if (!catMap[cat]) {
        catMap[cat] = { count: 0, totalStock: 0 };
      }
      catMap[cat].count += 1;
      catMap[cat].totalStock += (Number(item.currentStock) || 0);
    });

    const palette = [
      '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', 
      '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#84cc16', 
      '#a855f7', '#0ea5e9', '#d946ef', '#eab308', '#64748b', '#22c55e'
    ];
    const totalSKU = items.length || 1;

    // Sort categories by number of SKUs descending - INCLUDE ALL
    const sortedCategories = Object.entries(catMap).sort((a, b) => b[1].count - a[1].count);

    if (sortedCategories.length === 0) {
      return [{ name: 'Belum Ada', fullName: 'Belum Ada Barang', value: 1, totalStock: 0, percentage: 100, color: '#94a3b8' }];
    }

    const list = sortedCategories.map(([name, stat], idx) => ({
      name: name.length > 14 ? name.substring(0, 12) + '..' : name,
      fullName: name,
      value: stat.count,
      totalStock: stat.totalStock,
      percentage: Math.max(1, Math.round((stat.count / totalSKU) * 100)),
      color: palette[idx % palette.length],
    }));

    return list;
  }, [items]);

  // -------------------------------------------------------------
  // Data for Multi-Dimensional Insights: Department Bar Chart
  // Synchronized with Outbound Transactions (Barang Keluar)
  // -------------------------------------------------------------
  const deptBarData = useMemo(() => {
    const deptMap: Record<string, number> = {};
    
    outTransactions.forEach((t) => {
      if (t.status === 'REJECTED') return;
      const rawDept = (t.department || '').trim();
      // Clean display name
      const dept = rawDept || 'Umum / GA';
      const qtySum = (t.items || []).reduce((s, it) => s + (Number(it.quantity) || 0), 0);
      deptMap[dept] = (deptMap[dept] || 0) + qtySum;
    });

    const entries = Object.entries(deptMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

    if (entries.length === 0) {
      // If no outbound history yet, show empty placeholder with 0
      return [
        { name: 'Belum Ada', fullName: 'Belum Ada Permintaan Keluar', value: 0 },
      ];
    }

    return entries.map(([dept, val]) => ({
      name: dept.length > 10 ? dept.substring(0, 8) + '..' : dept,
      fullName: dept,
      value: val,
    }));
  }, [outTransactions]);

  // -------------------------------------------------------------
  // Data for SKU Demand Velocity Sparkline
  // Synchronized strictly with 1 running month (1 bulan berjalan saja)
  // -------------------------------------------------------------
  const skuSparklineData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const monthName = now.toLocaleDateString('id-ID', { month: 'short' });

    // 4 standard week buckets of the current running month:
    // Minggu 1 (1-7), Minggu 2 (8-14), Minggu 3 (15-21), Minggu 4 (22-end of month)
    const weekBuckets = [
      { name: 'Mgg 1', start: 1, end: 7, label: `1-7 ${monthName}` },
      { name: 'Mgg 2', start: 8, end: 14, label: `8-14 ${monthName}` },
      { name: 'Mgg 3', start: 15, end: 21, label: `15-21 ${monthName}` },
      { name: 'Mgg 4', start: 22, end: daysInMonth, label: `22-${daysInMonth} ${monthName}` },
    ];

    const weeks = weekBuckets.map((b) => {
      let weekOutflowQty = 0;
      outTransactions.forEach((t) => {
        if (t.status === 'REJECTED') return;
        const txDateStr = getTransactionDateKey(t);
        if (!txDateStr) return;
        const [y, m, d] = txDateStr.split('-').map(Number);
        if (y === currentYear && m === currentMonth + 1 && d >= b.start && d <= b.end) {
          const qtySum = (t.items && t.items.length > 0)
            ? t.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0)
            : (Number((t as any).quantity) || 0);
          weekOutflowQty += qtySum;
        }
      });
      return {
        name: b.name,
        val: weekOutflowQty,
        dateRange: b.label,
      };
    });

    return weeks;
  }, [outTransactions]);

  // Top fast-moving SKU velocity metric in 1 running month
  const topDemandSKU = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const itemDemandMap: Record<string, { code: string; name: string; qty: number }> = {};

    outTransactions.forEach((t) => {
      if (t.status === 'REJECTED') return;
      const txDateStr = getTransactionDateKey(t);
      if (!txDateStr) return;
      const [y, m] = txDateStr.split('-').map(Number);
      // Strictly 1 running month
      if (y !== currentYear || m !== currentMonth + 1) return;

      const itemsList = t.items && t.items.length > 0 ? t.items : [];
      itemsList.forEach((it) => {
        const id = it.itemId || it.itemCode || it.itemName;
        if (!itemDemandMap[id]) {
          itemDemandMap[id] = { code: it.itemCode, name: it.itemName, qty: 0 };
        }
        itemDemandMap[id].qty += Number(it.quantity) || 0;
      });
    });

    const sorted = Object.values(itemDemandMap).sort((a, b) => b.qty - a.qty);
    return sorted[0] || null;
  }, [outTransactions]);

  return (
    <div className="space-y-4 sm:space-y-5 max-w-7xl mx-auto pb-12">
      {/* ========================================================================= */}
      {/* 1. EXECUTIVE HEADER BANNER WITH TIDY ACTION BUTTONS                       */}
      {/* ========================================================================= */}
      <div className={`${theme.bannerGradient || 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900'} text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-800/80 relative overflow-hidden transition-all duration-300`}>
        {/* Subtle background glow */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div 
              onClick={currentUser.role === 'MASTER_ADMIN' ? onOpenSettingsModal : undefined}
              title={currentUser.role === 'MASTER_ADMIN' ? 'Klik untuk ganti logo & konfigurasi dashboard' : undefined}
              className={`relative group shrink-0 ${currentUser.role === 'MASTER_ADMIN' ? 'cursor-pointer' : ''}`}
            >
              <div className="p-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-inner group-hover:scale-105 transition-transform">
                <CompanyLogo logoUrl={config.logoUrl} size="md" />
              </div>
              {currentUser.role === 'MASTER_ADMIN' && (
                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition-opacity">
                  <ImageIcon className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[10px] sm:text-[11px] font-bold">
                  <ShieldCheck className="w-3 h-3 text-blue-400" />
                  <span>Sistem Monitoring GA</span>
                </span>

                <span className="text-[11px] text-slate-300 font-medium">
                  Login: <b className="text-white font-bold">{currentUser.fullName.split(' ')[0]}</b> ({currentUser.role.replace('_', ' ')})
                </span>

                {onOpenStatsReport && (
                  <button
                    type="button"
                    onClick={onOpenStatsReport}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
                    title="Buka Laporan Statistik & Analisis Gudang GA"
                  >
                    <BarChart3 className="w-3 h-3 text-emerald-400" />
                    <span>Laporan Statistik</span>
                  </button>
                )}

                {config.reportLocked && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/30 text-rose-200 border border-rose-400/30 text-[10px] font-bold">
                    <Lock className="w-2.5 h-2.5" /> Periode Terkunci
                  </span>
                )}
              </div>

              <h1 className="text-xs sm:text-base md:text-lg font-black text-white tracking-tight leading-tight">
                {config.appName || 'WAREHOUSE KBCT'} — Monitoring & Control
              </h1>
              <p className="text-[10px] sm:text-[11px] md:text-xs text-slate-300 leading-snug line-clamp-2 md:line-clamp-1">
                {config.companySubtitle || 'General Affairs Inventory & Barcode Control System'} • Pengawasan Terpusat Permintaan
              </p>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* Action Buttons: 2 Distinct Columns (Col 1: Masuk above Minta, Col 2: Pindai above Cetak) */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto shrink-0">
            {/* Kolom 1 (Kiri): Atas = Barang Masuk, Bawah = Minta Barang */}
            <div className="flex flex-col gap-2">
              {/* 1. Atas: Barang Masuk */}
              <button
                type="button"
                id="btn-incoming-item-dashboard"
                onClick={onNavigateToIncoming}
                title="Pencatatan Penerimaan Barang Masuk"
                className="w-full h-9 sm:h-9.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs border border-emerald-400/50 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95"
              >
                <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center text-white shrink-0">
                  <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span className="whitespace-nowrap">Barang Masuk</span>
              </button>

              {/* 2. Bawah: Minta Barang */}
              <button
                type="button"
                id="btn-request-item-dashboard"
                onClick={onNavigateToRequest}
                title="Formulir Permintaan Barang Keluar"
                className="w-full h-9 sm:h-9.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs border border-amber-400 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95"
              >
                <div className="w-5 h-5 rounded-md bg-white/40 flex items-center justify-center text-slate-950 shrink-0">
                  <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span className="whitespace-nowrap">Minta Barang</span>
                {pendingApprovals.length > 0 && (
                  <span className="text-[9px] font-black bg-rose-600 text-white px-1.5 py-0.2 rounded-full shadow-xs">
                    {pendingApprovals.length}
                  </span>
                )}
              </button>
            </div>

            {/* Kolom 2 (Kanan): Atas = Pindai Barcode, Bawah = Cetak Barcode */}
            <div className="flex flex-col gap-2">
              {/* 3. Atas: Pindai Barcode */}
              {onOpenScanner && (
                <button
                  type="button"
                  id="btn-scan-barcode-dashboard"
                  onClick={onOpenScanner}
                  title="Pindai / Scan Barcode Barang"
                  className="w-full h-9 sm:h-9.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs border border-blue-400/40 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95"
                >
                  <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center text-white shrink-0">
                    <QrCode className="w-3.5 h-3.5" />
                  </div>
                  <span className="whitespace-nowrap">Pindai Barcode</span>
                </button>
              )}

              {/* 4. Bawah: Cetak Barcode */}
              {onOpenBarcodePrint && (
                <div className="relative w-full" ref={printDropdownRef}>
                  <div className="flex items-stretch rounded-xl shadow-xs bg-slate-800 border border-slate-700 overflow-hidden hover:border-slate-500 transition-all h-9 sm:h-9.5">
                    <button
                      type="button"
                      id="btn-print-barcode-dashboard"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenBarcodePrint('STOCK');
                      }}
                      title="Buka Menu & Pengaturan Cetak Barcode"
                      className="flex-1 h-full px-2.5 sm:px-3 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-700/80 transition-colors"
                    >
                      <div className="w-5 h-5 rounded-md bg-white/20 text-white flex items-center justify-center shrink-0">
                        <Printer className="w-3.5 h-3.5" />
                      </div>
                      <span className="whitespace-nowrap">Cetak Barcode</span>
                    </button>
                    <button
                      type="button"
                      id="btn-print-barcode-dropdown-toggle"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsPrintDropdownOpen((prev) => !prev);
                      }}
                      title="Pilihan Cepat Cetak Barcode"
                      className="px-2 h-full border-l border-slate-700 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isPrintDropdownOpen ? 'rotate-180 text-cyan-400' : ''}`} />
                    </button>
                  </div>

                  {/* Dropdown Quick Jump */}
                  {isPrintDropdownOpen && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-full mt-1.5 w-72 max-w-[calc(100vw-2rem)] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-1.5 divide-y divide-slate-800 animate-in fade-in zoom-in-95 duration-150"
                    >
                      <div className="p-2 text-[11px] font-bold text-slate-400 flex items-center justify-between">
                        <span>Menu Pilihan Cetak:</span>
                        <span className="text-[10px] text-cyan-400 font-mono">Pilih Mode</span>
                      </div>

                      <div className="py-1 space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsPrintDropdownOpen(false);
                            onOpenBarcodePrint('STOCK');
                          }}
                          className="w-full px-2.5 py-2 text-left rounded-lg text-xs font-semibold text-slate-200 hover:bg-blue-950/60 hover:text-blue-300 transition-colors flex items-center gap-2.5 cursor-pointer group"
                        >
                          <div className="w-5 h-5 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                            <Layers className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-white text-[11px]">Cetak Barcode Master Stok</p>
                            <p className="text-[10px] text-slate-400 truncate">Semua barang & rak gudang</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsPrintDropdownOpen(false);
                            onOpenBarcodePrint('IN');
                          }}
                          className="w-full px-2.5 py-2 text-left rounded-lg text-xs font-semibold text-slate-200 hover:bg-emerald-950/60 hover:text-emerald-300 transition-colors flex items-center gap-2.5 cursor-pointer group"
                        >
                          <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                            <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-white text-[11px]">Cetak Barcode Barang Masuk</p>
                            <p className="text-[10px] text-slate-400 truncate">Inbound restock barang</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsPrintDropdownOpen(false);
                            onOpenBarcodePrint('OUT');
                          }}
                          className="w-full px-2.5 py-2 text-left rounded-lg text-xs font-semibold text-slate-200 hover:bg-amber-950/60 hover:text-amber-300 transition-colors flex items-center gap-2.5 cursor-pointer group"
                        >
                          <div className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                            <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-white text-[11px]">Cetak Barcode Permintaan</p>
                            <p className="text-[10px] text-slate-400 truncate">Label serah terima barang keluar</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsPrintDropdownOpen(false);
                            onOpenBarcodePrint('REQUEST_PORTAL');
                          }}
                          className="w-full px-2.5 py-2 text-left rounded-lg text-xs font-semibold text-slate-200 hover:bg-indigo-950/60 hover:text-indigo-300 transition-colors flex items-center gap-2.5 cursor-pointer group border-t border-slate-800/80 pt-2"
                        >
                          <div className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                            <QrCode className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-indigo-300 text-[11px]">QR Portal Minta Barang</p>
                              <span className="text-[9px] font-black bg-indigo-500/30 text-indigo-200 px-1.5 py-0.2 rounded border border-indigo-400/30">
                                BEBAS LOGIN
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate">Poster standee scan HP karyawan</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notification Banner: Approved Requests Pending Physical Handover */}
      {pendingDispatchRequests.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-300 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-xs sm:text-sm text-amber-950 tracking-wide">
                  PEMBERITAHUAN SERAH TERIMA: {pendingDispatchRequests.length} BARANG BELUM DISERAHKAN
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-600 text-white animate-pulse shadow-2xs">
                  Menunggu Serah Terima Fisik
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-amber-900 mt-0.5 font-medium">
                Terdapat <b>{pendingDispatchRequests.length} pengajuan barang</b> yang sudah disetujui (Approved) namun belum diserahterimakan fisiknya ke petugas pemohon.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateToRequest}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shrink-0 hover:scale-[1.02] active:scale-95"
          >
            <PackageCheck className="w-4 h-4" />
            <span>Serahkan Barang Sekarang</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TOP 4 KPI CARDS (COMPACT & SMALLER TYPOGRAPHY AS REQUESTED)            */}
      {/* ========================================================================= */}
      {(showCards.totalItems !== false || showCards.outTransactions !== false || showCards.lowStockAlert !== false || showCards.inTransactions !== false) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Card 1: Master Stok */}
          {showCards.totalItems !== false && (
            <div
              onClick={onNavigateToStock}
              className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-blue-300 transition-all cursor-pointer flex items-center gap-2.5 group"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Package className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] sm:text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">Master Stok</p>
                <div className="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate">{totalItemsCount} SKU</div>
                <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-emerald-600 font-semibold mt-0.5 truncate">
                  <TrendingUp className="w-2.5 h-2.5 shrink-0" />
                  <span>↑ 12.8%</span>
                  <span className="text-slate-400 font-normal truncate">• {totalPhysicalStock.toLocaleString()} unit</span>
                </div>
              </div>
            </div>
          )}

          {/* Card 2: Permintaan Keluar */}
          {showCards.outTransactions !== false && (
            <div
              onClick={onNavigateToRequest}
              className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-rose-300 transition-all cursor-pointer flex items-center gap-2.5 group"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <ArrowUpRight className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] sm:text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">Barang Keluar</p>
                <div className="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate">{outTransactions.length} Mutasi</div>
                <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-rose-600 font-semibold mt-0.5 truncate">
                  <TrendingDown className="w-2.5 h-2.5 shrink-0" />
                  <span>↓ 8.6%</span>
                  <span className="text-slate-400 font-normal truncate">
                    {pendingApprovals.length > 0 ? `• ${pendingApprovals.length} pending` : '• Serah terima'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Card 3: Peminjaman Alat / Tim */}
          {showCards.lowStockAlert !== false && (
            <div
              onClick={onNavigateToLoans}
              className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-purple-300 transition-all cursor-pointer flex items-center gap-2.5 group"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <HandHelping className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] sm:text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">Peminjaman Alat</p>
                <div className="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate">{activeLoans.length} Dipinjam</div>
                <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-purple-600 font-semibold mt-0.5 truncate">
                  <TrendingUp className="w-2.5 h-2.5 shrink-0" />
                  <span>↑ 6.3%</span>
                  <span className="text-slate-400 font-normal truncate">• Toolkit aktif</span>
                </div>
              </div>
            </div>
          )}

          {/* Card 4: Penerimaan Barang Masuk */}
          {showCards.inTransactions !== false && (
            <div
              onClick={onNavigateToIncoming}
              className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-emerald-300 transition-all cursor-pointer flex items-center gap-2.5 group"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <ArrowDownLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] sm:text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">Penerimaan Masuk</p>
                <div className="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate">{inTransactions.length} Inbound</div>
                <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-emerald-600 font-semibold mt-0.5 truncate">
                  <TrendingUp className="w-2.5 h-2.5 shrink-0" />
                  <span>↑ 15.7%</span>
                  <span className="text-slate-400 font-normal truncate">• Restock supplier</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MAIN SECTION: OPERATION OVERVIEW (LEFT) + MULTI-DIMENSIONAL (RIGHT)    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Left 2 Cols: Operation Overview Dual-Wave Chart (Compact & Slim on Mobile) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-3 sm:p-5 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5">
            <div>
              <h2 className="text-xs sm:text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Ringkasan Operasional (Operation Overview)</span>
              </h2>
              <p className="text-[10.5px] sm:text-[11px] text-slate-500">
                Tren volume mutasi barang masuk (restock) vs barang keluar (permintaan)
              </p>
            </div>

            {/* Time Period Filter Pill (All lowercase as requested) */}
            <div className="flex items-center flex-wrap gap-1 bg-slate-50 p-0.5 sm:p-1 rounded-xl border border-slate-200/80 text-[11px] sm:text-xs font-semibold">
              <button
                type="button"
                id="btn-period-this-month"
                onClick={() => setChartPeriod('THIS_MONTH')}
                className={`px-2.5 py-0.5 sm:py-1 rounded-lg transition-all cursor-pointer text-[10.5px] sm:text-xs ${
                  chartPeriod === 'THIS_MONTH'
                    ? 'bg-white text-blue-600 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                bulan ini {selectedMonthOffset !== 0 ? `(${currentMonthYear.label})` : ''}
              </button>
              <button
                type="button"
                id="btn-period-custom"
                onClick={() => setChartPeriod('CUSTOM')}
                className={`px-2.5 py-0.5 sm:py-1 rounded-lg transition-all cursor-pointer text-[10.5px] sm:text-xs flex items-center gap-1 ${
                  chartPeriod === 'CUSTOM'
                    ? 'bg-white text-blue-600 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Calendar className="w-3 h-3" />
                <span>pilih tanggal</span>
              </button>
            </div>
          </div>

          {/* Month Navigator when "bulan ini" is selected */}
          {chartPeriod === 'THIS_MONTH' && (
            <div className="flex items-center justify-between mb-2.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-[10.5px] sm:text-[11px] text-slate-700 font-bold">
                <CalendarDays className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Periode: <span className="text-blue-700 font-extrabold capitalize">{currentMonthYear.label}</span></span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedMonthOffset((prev) => prev - 1)}
                  className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Bulan sebelumnya"
                >
                  ← Bulan Lalu
                </button>
                {selectedMonthOffset !== 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedMonthOffset(0)}
                    className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-[10px] font-bold text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    Bulan Berjalan
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedMonthOffset((prev) => prev + 1)}
                  disabled={selectedMonthOffset >= 0}
                  className={`px-2 py-0.5 rounded border text-[10px] font-semibold transition-colors ${
                    selectedMonthOffset >= 0
                      ? 'bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Bulan berikutnya"
                >
                  Bulan Depan →
                </button>
              </div>
            </div>
          )}

          {/* Custom Date Range Picker (Shown when "pilih tanggal" is active, with lowercase labels) */}
          {chartPeriod === 'CUSTOM' && (
            <div className="flex items-center gap-2 mb-2.5 px-2.5 py-1.5 bg-blue-50/60 border border-blue-100 rounded-xl text-xs flex-wrap animate-in fade-in duration-150">
              <span className="text-[10.5px] sm:text-[11px] text-blue-800 font-medium flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                rentang tanggal:
              </span>
              <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-lg shadow-2xs">
                <span className="text-[9.5px] text-slate-400 font-mono">dari:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="text-[10.5px] bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-lg shadow-2xs">
                <span className="text-[9.5px] text-slate-400 font-mono">sampai:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="text-[10.5px] bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
                />
              </div>
              {/* Quick shortcut pills */}
              <div className="flex items-center gap-1 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    const today = formatLocalDateKey(new Date());
                    setCustomStartDate(today);
                    setCustomEndDate(today);
                  }}
                  className="px-1.5 py-0.5 rounded text-[9.5px] bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium"
                >
                  hari ini
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    const end = formatLocalDateKey(d);
                    d.setDate(d.getDate() - 6);
                    const start = formatLocalDateKey(d);
                    setCustomStartDate(start);
                    setCustomEndDate(end);
                  }}
                  className="px-1.5 py-0.5 rounded text-[9.5px] bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium"
                >
                  7 hari
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    const end = formatLocalDateKey(d);
                    d.setDate(d.getDate() - 29);
                    const start = formatLocalDateKey(d);
                    setCustomStartDate(start);
                    setCustomEndDate(end);
                  }}
                  className="px-1.5 py-0.5 rounded text-[9.5px] bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium"
                >
                  30 hari
                </button>
              </div>
            </div>
          )}

          {/* Smooth Dual Spline Curve Area Chart (Slim on Mobile) */}
          <div className="h-44 sm:h-64 lg:h-72 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={operationTimeSeriesData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                <defs>
                  {/* Soft Blue Gradient for Inbound/Restock */}
                  <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  {/* Soft Emerald Gradient for Outbound/Request */}
                  <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="dateLabel" 
                  stroke="#94a3b8" 
                  fontSize={9} 
                  tickLine={false} 
                  interval="preserveStartEnd"
                  axisLine={{ stroke: '#f1f5f9' }} 
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={9} 
                  tickLine={false} 
                  axisLine={{ stroke: '#f1f5f9' }} 
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    border: '1px solid #e2e8f0',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                  formatter={(value: any, name: any) => [
                    `${value} unit`,
                    name === 'inQty' ? 'Barang Masuk (Restock)' : 'Barang Keluar (Permintaan)',
                  ]}
                  labelFormatter={(label) => `Tanggal: ${label}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="inQty" 
                  stroke="#3b82f6" 
                  strokeWidth={2} 
                  fillOpacity={1} 
                  fill="url(#colorInflow)" 
                  dot={{ r: 2, fill: '#3b82f6', stroke: '#fff', strokeWidth: 1 }}
                  activeDot={{ r: 4, fill: '#2563eb', stroke: '#fff', strokeWidth: 1.5 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="outQty" 
                  stroke="#10b981" 
                  strokeWidth={2} 
                  fillOpacity={1} 
                  fill="url(#colorOutflow)" 
                  dot={{ r: 2, fill: '#10b981', stroke: '#fff', strokeWidth: 1 }}
                  activeDot={{ r: 4, fill: '#059669', stroke: '#fff', strokeWidth: 1.5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bottom Chart Legend */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 pt-2 sm:pt-3 border-t border-slate-50 text-[10.5px] sm:text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="font-bold text-slate-700">Barang Masuk (Inbound)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="font-bold text-slate-700">Barang Keluar (Permintaan)</span>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Multi-dimensional Insights Panel */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-4 sm:p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-2.5">
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
              Multi-dimensional Insights
            </h3>
            {/* 3-dots Menu with Dropdown Options */}
            <div className="relative" ref={insightsMenuRef}>
              <button
                type="button"
                id="btn-insights-menu-toggle"
                onClick={() => setIsInsightsMenuOpen((prev) => !prev)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                title="Opsi & Menu Analitik"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isInsightsMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-1.5 text-xs text-slate-200 divide-y divide-slate-800 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400">
                    Opsi Analitik & Kategori
                  </div>
                  <div className="py-1 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsInsightsMenuOpen(false);
                        onNavigateToStock();
                      }}
                      className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Layers className="w-3.5 h-3.5 text-blue-400" />
                      <span>Kelola Master Data Stok</span>
                    </button>
                    {onOpenStatsReport && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsInsightsMenuOpen(false);
                          onOpenStatsReport();
                        }}
                        className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Laporan Analitik Lengkap</span>
                      </button>
                    )}
                    {onOpenBarcodePrint && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsInsightsMenuOpen(false);
                          onOpenBarcodePrint('STOCK');
                        }}
                        className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Cetak Barcode Kategori</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 1. Category Distribution Donut (Shows All Categories) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-bold text-slate-600">Distribusi Kategori Barang</p>
              <span className="text-[10px] font-mono text-slate-400">{items.length} SKU ({categoryDonutData.length} Kategori)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-24 h-24 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryDonutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={24}
                      outerRadius={42}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryDonutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Category Legend List - Displays All Categories in Scrollable List */}
              <div className="flex-1 max-h-36 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                {categoryDonutData.map((cat, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between text-[10px] hover:bg-slate-50 px-1 py-0.5 rounded transition-colors" 
                    title={`${cat.fullName}: ${cat.value} SKU (${cat.totalStock} unit)`}
                  >
                    <div className="flex items-center gap-1.5 truncate max-w-[110px]">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-slate-600 truncate font-medium">{cat.fullName}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[9px] text-slate-400 font-mono">({cat.value})</span>
                      <span className="font-mono font-bold text-slate-800">{cat.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Activity / Outflow by Department */}
          <div className="pt-2 border-t border-slate-50">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-bold text-slate-600">Permintaan per Departemen</p>
              <span className="text-[10px] font-mono text-blue-600 font-bold">Top 5</span>
            </div>
            <div className="h-20 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptBarData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '4px 8px' }}
                    formatter={(val: any) => [`${val} unit`, 'Permintaan']}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3. SKU Demand Velocity Sparkline */}
          <div className="pt-2 border-t border-slate-50">
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-[11px] font-bold text-slate-600">SKU Demand Velocity</p>
                {topDemandSKU && (
                  <p className="text-[9px] text-slate-400 truncate max-w-[130px]">
                    Top: <span className="font-semibold text-purple-600">{topDemandSKU.name}</span> ({topDemandSKU.qty})
                  </p>
                )}
              </div>
              <span className="text-[10px] font-bold text-purple-600 font-mono bg-purple-50 px-1.5 py-0.5 rounded">
                1 Bulan Berjalan
              </span>
            </div>
            <div className="h-12 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={skuSparklineData} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSku" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ fontSize: '10px', borderRadius: '6px', padding: '3px 6px', background: '#1e293b', border: 'none', color: '#fff' }}
                    formatter={(val: any) => [`${val} unit`, 'Keluar']}
                    labelFormatter={(label: any, payload: any) => {
                      const item = payload?.[0]?.payload;
                      return item?.dateRange || label;
                    }}
                  />
                  <Area type="monotone" dataKey="val" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorSku)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. LOW STOCK ALERT (5 ROWS VISIBLE WITH SCROLL)                           */}
      {/* ========================================================================= */}
      <div className="max-w-2xl bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Compact Header */}
        <div className="px-3 py-2 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-amber-400/20 text-amber-300 flex items-center justify-center">
              <AlertTriangle className="w-3 h-3" />
            </div>
            <h3 className="font-bold text-xs text-slate-100">Peringatan Stok Rendah</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-rose-500/30 text-rose-200 border border-rose-400/30 px-1.5 py-0.2 rounded font-mono font-bold">
              {lowStockItems.length} item
            </span>
            <button
              type="button"
              onClick={onNavigateToStock}
              className="text-[10px] font-semibold text-blue-300 hover:text-white flex items-center gap-0.5 cursor-pointer"
            >
              <span>Semua</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>

        {/* 5 Rows with vertical scroll */}
        <div className="max-h-[235px] overflow-y-auto p-2 divide-y divide-slate-100 custom-scrollbar">
          {lowStockItems.length === 0 ? (
            <div className="py-3 text-center text-slate-600 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-semibold text-slate-700">Semua stok aman (di atas batas minimum)</span>
            </div>
          ) : (
            (lowStockItems || []).map((item) => (
              <div key={item.id} className="py-1.5 px-1 flex items-center justify-between gap-2 hover:bg-slate-50 rounded">
                <div className="min-w-0 flex-1 truncate pr-2">
                  <div className="flex items-center gap-1.5 truncate">
                    <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                    <span className="text-[9px] text-slate-400 font-mono shrink-0">({item.code})</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Rak: <span className="font-medium text-slate-700">{item.rackLocation || '-'}</span>
                  </p>
                </div>
                <div className="text-right shrink-0 flex items-center gap-2">
                  <div className="text-[11px] font-extrabold text-rose-600 font-mono">
                    {item.currentStock} <span className="text-[10px] text-slate-400 font-normal">/ {item.minStock} {item.unit}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onScanItemForRequest(item)}
                    title="Minta barang ini"
                    className="px-2 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 rounded text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    Ambil
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

