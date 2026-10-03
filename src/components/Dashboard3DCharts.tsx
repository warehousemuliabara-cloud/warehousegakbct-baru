import React, { useState, useMemo } from 'react';
import { Transaction, Item } from '../types';
import { 
  PieChart as PieIcon, 
  BarChart3, 
  Calendar, 
  TrendingUp, 
  Users, 
  Package, 
  Building2, 
  Sparkles,
  ChevronRight,
  Info
} from 'lucide-react';

interface Dashboard3DChartsProps {
  transactions: Transaction[];
  items: Item[];
}

export const Dashboard3DCharts: React.FC<Dashboard3DChartsProps> = ({
  transactions,
  items,
}) => {
  // Available months from transactions
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    (transactions || []).forEach((trx) => {
      const rawDate = trx.timestamp || trx.date;
      if (rawDate) {
        const date = new Date(rawDate.replace(' ', 'T'));
        if (!isNaN(date.getTime())) {
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthsSet.add(key);
        }
      }
    });

    // Ensure current month is present
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthsSet.add(currentMonthKey);

    return Array.from(monthsSet).sort().reverse();
  }, [transactions]);

  // Selected period: month string (YYYY-MM) or 'ALL'
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return availableMonths[0] || 'ALL';
  });

  const [requesterViewType, setRequesterViewType] = useState<'EMPLOYEE' | 'DEPARTMENT'>('EMPLOYEE');
  const [hoveredPieIndex, setHoveredPieIndex] = useState<number | null>(null);

  // Month label helper
  const formatMonthLabel = (monthKey: string) => {
    if (monthKey === 'ALL') return 'Semua Periode (All-Time)';
    const [year, month] = monthKey.split('-');
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthIdx = parseInt(month, 10) - 1;
    return `${monthNames[monthIdx] || month} ${year}`;
  };

  // Filter transactions for OUT (Goods Outflow) by selected period
  const filteredOutTransactions = useMemo(() => {
    return (transactions || []).filter((t) => {
      if (t.type !== 'OUT') return false;
      if (selectedMonth === 'ALL') return true;
      const rawDate = t.timestamp || t.date || '';
      return rawDate.startsWith(selectedMonth);
    });
  }, [transactions, selectedMonth]);

  // 1. Goods Outflow Data (Aggregated by Category & Top Items)
  const outflowStats = useMemo(() => {
    const categoryTotals: Record<string, { totalQty: number; countTrx: number; color: string; sideColor: string; topColor: string }> = {};
    const itemTotals: Record<string, { name: string; category: string; unit: string; totalQty: number }> = {};
    let grandTotalQty = 0;

    // Palette for 3D Slices
    const categoryColors: Record<string, { top: string; side: string; base: string; border: string }> = {
      'Pantry & Konsumsi': { top: '#f59e0b', side: '#b45309', base: '#78350f', border: '#d97706' },
      'Kebersihan & Sanitasi': { top: '#10b981', side: '#047857', base: '#064e3b', border: '#059669' },
      'Logistik & Pengemasan': { top: '#0ea5e9', side: '#0369a1', base: '#0c4a6e', border: '#0284c7' },
      'ATK (Alat Tulis Kantor)': { top: '#6366f1', side: '#4338ca', base: '#312e81', border: '#4f46e5' },
      'K3 & Perlengkapan Medis': { top: '#ef4444', side: '#b91c1c', base: '#7f1d1d', border: '#dc2626' },
      'Elektronik & Komputer': { top: '#8b5cf6', side: '#6d28d9', base: '#4c1d95', border: '#7c3aed' },
      'Maintenance & Perkakas': { top: '#ec4899', side: '#be185d', base: '#831843', border: '#db2777' },
      'Mess Manager & Resident': { top: '#14b8a6', side: '#0f766e', base: '#134e4a', border: '#0d9488' },
    };

    const fallbackColors = [
      { top: '#3b82f6', side: '#1d4ed8', base: '#1e3a8a', border: '#2563eb' },
      { top: '#f97316', side: '#c2410c', base: '#7c2d12', border: '#ea580c' },
      { top: '#84cc16', side: '#4d7c0f', base: '#365314', border: '#65a30d' },
      { top: '#a855f7', side: '#7e22ce', base: '#581c87', border: '#9333ea' },
    ];

    filteredOutTransactions.forEach((trx) => {
      (trx.items || []).forEach((it) => {
        grandTotalQty += (Number(it.quantity) || 0);

        // Lookup category from master items
        const masterItem = items.find((m) => m.id === it.itemId || m.code === it.itemCode);
        const category = masterItem?.category || 'ATK (Alat Tulis Kantor)';

        if (!categoryTotals[category]) {
          const colorObj = categoryColors[category] || fallbackColors[Object.keys(categoryTotals).length % fallbackColors.length];
          categoryTotals[category] = {
            totalQty: 0,
            countTrx: 0,
            color: colorObj.base,
            sideColor: colorObj.side,
            topColor: colorObj.top,
          };
        }
        categoryTotals[category].totalQty += it.quantity;
        categoryTotals[category].countTrx += 1;

        const itemKey = it.itemId || it.itemCode || it.itemName;
        if (!itemTotals[itemKey]) {
          itemTotals[itemKey] = {
            name: it.itemName,
            category,
            unit: it.unit,
            totalQty: 0,
          };
        }
        itemTotals[itemKey].totalQty += it.quantity;
      });
    });

    const slices = Object.entries(categoryTotals)
      .map(([name, data]) => ({
        name,
        qty: data.totalQty,
        percentage: grandTotalQty > 0 ? (data.totalQty / grandTotalQty) * 100 : 0,
        topColor: data.topColor,
        sideColor: data.sideColor,
        baseColor: data.color,
      }))
      .sort((a, b) => b.qty - a.qty);

    const topItems = Object.values(itemTotals)
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 5);

    return {
      grandTotalQty,
      totalTransactions: filteredOutTransactions.length,
      slices,
      topItems,
    };
  }, [filteredOutTransactions, items]);

  // 2. Requesters Data (Aggregated by Employee or Department)
  const requesterStats = useMemo(() => {
    const employeeMap: Record<string, { name: string; department: string; totalQty: number; requestCount: number }> = {};
    const departmentMap: Record<string, { department: string; totalQty: number; requestCount: number }> = {};
    let totalOutflow = 0;

    filteredOutTransactions.forEach((trx) => {
      const empName = trx.requesterName || 'Karyawan';
      const dept = trx.department || 'General Affairs (GA)';
      const trxQty = (trx.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
      totalOutflow += trxQty;

      // Employee
      if (!employeeMap[empName]) {
        employeeMap[empName] = { name: empName, department: dept, totalQty: 0, requestCount: 0 };
      }
      employeeMap[empName].totalQty += trxQty;
      employeeMap[empName].requestCount += 1;

      // Department
      if (!departmentMap[dept]) {
        departmentMap[dept] = { department: dept, totalQty: 0, requestCount: 0 };
      }
      departmentMap[dept].totalQty += trxQty;
      departmentMap[dept].requestCount += 1;
    });

    const employees = Object.values(employeeMap)
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 7);

    const departments = Object.values(departmentMap)
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 7);

    const maxEmpQty = employees.length > 0 ? Math.max(...employees.map((e) => e.totalQty)) : 1;
    const maxDeptQty = departments.length > 0 ? Math.max(...departments.map((d) => d.totalQty)) : 1;

    return {
      employees,
      departments,
      maxEmpQty,
      maxDeptQty,
      totalOutflow,
    };
  }, [filteredOutTransactions]);

  // Math helper for 3D Pie Chart Slices
  const pieGeometry = useMemo(() => {
    const cx = 160;
    const cy = 130;
    const rx = 120; // horizontal radius
    const ry = 65;  // vertical radius for 3D isometric perspective
    const depth = 28; // 3D extrusion height

    if (outflowStats.slices.length === 0 || outflowStats.grandTotalQty === 0) {
      return { cx, cy, rx, ry, depth, paths: [] };
    }

    let currentAngle = -Math.PI / 2; // start from top

    const paths = outflowStats.slices.map((slice, index) => {
      const sliceAngle = (slice.qty / outflowStats.grandTotalQty) * (2 * Math.PI);
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      currentAngle = endAngle;

      const midAngle = (startAngle + endAngle) / 2;

      // Calculate coordinates on ellipse
      const x1 = cx + rx * Math.cos(startAngle);
      const y1 = cy + ry * Math.sin(startAngle);
      const x2 = cx + rx * Math.cos(endAngle);
      const y2 = cy + ry * Math.sin(endAngle);

      // Coordinates at bottom for 3D extrusion
      const y1_b = y1 + depth;
      const y2_b = y2 + depth;

      const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

      // Top Slice Path (Isometric Ellipse Sector)
      const topPath = `M ${cx} ${cy} L ${x1} ${y1} A ${rx} ${ry} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

      // 3D Side Skirt Path (visible if on bottom half of circle: sin > 0 or spanning front)
      // Front facing arc between max(startAngle, 0) and min(endAngle, PI)
      let sidePath = '';
      const isVisibleFront = Math.sin(startAngle) > -0.1 || Math.sin(endAngle) > -0.1 || (startAngle < Math.PI && endAngle > 0);

      if (isVisibleFront) {
        sidePath = `M ${x1} ${y1} A ${rx} ${ry} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x2} ${y2_b} A ${rx} ${ry} 0 ${largeArcFlag} 0 ${x1} ${y1_b} Z`;
      }

      // Hover offset vector
      const hoverDist = 8;
      const hoverDx = Math.cos(midAngle) * hoverDist;
      const hoverDy = Math.sin(midAngle) * hoverDist * (ry / rx);

      return {
        ...slice,
        index,
        topPath,
        sidePath,
        startAngle,
        endAngle,
        midAngle,
        hoverDx,
        hoverDy,
      };
    });

    return { cx, cy, rx, ry, depth, paths };
  }, [outflowStats]);

  return (
    <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden mb-6">
      {/* 3D Charts Header & Monthly Period Filter */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-[#162544] to-[#121e36] text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 p-0.5 shadow-lg shadow-blue-500/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-base sm:text-lg text-white tracking-tight">
                Statistik Grafik 3D Pengeluaran & Pemohon Barang
              </h2>
              <span className="bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-400/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" /> 3D Analytics
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Visualisasi 3D Pie Pengeluaran per Kategori & 3D Bar Horizontal Pemohon Terbanyak
            </p>
          </div>
        </div>

        {/* Monthly Period Selector Control */}
        <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700 shadow-inner shrink-0">
          <Calendar className="w-4 h-4 text-cyan-400 ml-2" />
          <span className="text-xs font-semibold text-slate-300 hidden sm:inline">Periode:</span>
          <select
            id="period-month-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-900 text-white font-bold text-xs rounded-lg px-3 py-1.5 border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">Semua Periode (All-Time)</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {formatMonthLabel(m)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Charts Grid: Left 3D Pie, Right 3D Horizontal Bar */}
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/50">
        
        {/* Left Column: 3D Pie Chart Pengeluaran Barang (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <PieIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Grafik 3D Pengeluaran Barang</h3>
                  <p className="text-[11px] text-slate-600">Komposisi barang keluar berdasarkan kategori</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg">
                Total: {outflowStats.grandTotalQty} Unit
              </span>
            </div>

            {/* 3D Isometric SVG Pie Container */}
            <div className="relative w-full h-[220px] flex items-center justify-center my-2 select-none">
              {outflowStats.slices.length === 0 ? (
                <div className="text-center text-slate-600 text-xs py-12">
                  <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  Belum ada catatan pengeluaran barang pada periode ini.
                </div>
              ) : (
                <svg
                  viewBox="0 0 320 220"
                  className="w-full h-full max-w-[320px] overflow-visible drop-shadow-md"
                >
                  <defs>
                    {/* Radial shadow at bottom */}
                    <radialGradient id="pieShadow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#0f172a" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* 3D Floor Shadow */}
                  <ellipse cx={pieGeometry.cx} cy={pieGeometry.cy + pieGeometry.depth + 18} rx={pieGeometry.rx * 0.95} ry={pieGeometry.ry * 0.55} fill="url(#pieShadow)" />

                  {/* 1. Render 3D Side Walls first (Order: bottom/front first) */}
                  {pieGeometry.paths.map((p) => {
                    const isHovered = hoveredPieIndex === p.index;
                    const transform = isHovered ? `translate(${p.hoverDx}, ${p.hoverDy})` : '';
                    if (!p.sidePath) return null;
                    return (
                      <path
                        key={`side-${p.index}`}
                        d={p.sidePath}
                        fill={p.sideColor}
                        stroke={p.baseColor}
                        strokeWidth="0.75"
                        className="transition-transform duration-200 cursor-pointer opacity-95"
                        style={{ transform }}
                        onMouseEnter={() => setHoveredPieIndex(p.index)}
                        onMouseLeave={() => setHoveredPieIndex(null)}
                      />
                    );
                  })}

                  {/* 2. Render Top Isometric Pie Slices */}
                  {pieGeometry.paths.map((p) => {
                    const isHovered = hoveredPieIndex === p.index;
                    const transform = isHovered ? `translate(${p.hoverDx}, ${p.hoverDy})` : '';
                    return (
                      <path
                        key={`top-${p.index}`}
                        d={p.topPath}
                        fill={p.topColor}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        className="transition-all duration-200 cursor-pointer hover:brightness-110"
                        style={{ transform }}
                        onMouseEnter={() => setHoveredPieIndex(p.index)}
                        onMouseLeave={() => setHoveredPieIndex(null)}
                      >
                        <title>{`${p.name}: ${p.qty} unit (${p.percentage.toFixed(1)}%)`}</title>
                      </path>
                    );
                  })}
                </svg>
              )}
            </div>
          </div>

          {/* Interactive Legend breakdown list */}
          <div className="mt-2 space-y-1.5 pt-3 border-t border-slate-100">
            {(outflowStats?.slices || []).slice(0, 4).map((slice, idx) => (
              <div
                key={idx}
                onMouseEnter={() => setHoveredPieIndex(idx)}
                onMouseLeave={() => setHoveredPieIndex(null)}
                className={`flex items-center justify-between text-xs p-1.5 rounded-lg transition-all cursor-pointer ${
                  hoveredPieIndex === idx ? 'bg-slate-100 shadow-xs scale-[1.02]' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: slice.topColor }}
                  />
                  <span className="font-semibold text-slate-800 truncate text-[11px]">{slice.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-slate-900">{slice.qty} unit</span>
                  <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                    {slice.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: 3D Horizontal Bar Chart Pemohon Barang Memanjang ke Kanan (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Grafik 3D Pemohon Barang (Memanjang ke Kanan)</h3>
                  <p className="text-[11px] text-slate-600">Frekuensi & volume barang keluar per personil / departemen</p>
                </div>
              </div>

              {/* Toggle: Karyawan vs Departemen */}
              <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 self-start sm:self-auto text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setRequesterViewType('EMPLOYEE')}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                    requesterViewType === 'EMPLOYEE'
                      ? 'bg-white text-blue-600 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" /> Karyawan
                </button>
                <button
                  type="button"
                  onClick={() => setRequesterViewType('DEPARTMENT')}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                    requesterViewType === 'DEPARTMENT'
                      ? 'bg-white text-blue-600 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" /> Departemen
                </button>
              </div>
            </div>

            {/* 3D Horizontal Bars Container */}
            <div className="space-y-3.5 my-2">
              {requesterViewType === 'EMPLOYEE' ? (
                requesterStats.employees.length === 0 ? (
                  <div className="text-center text-slate-600 text-xs py-10">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Belum ada data pemohon barang pada periode {formatMonthLabel(selectedMonth)}.
                  </div>
                ) : (
                  requesterStats.employees.map((emp, index) => {
                    const pct = Math.min(100, Math.max(8, (emp.totalQty / requesterStats.maxEmpQty) * 100));
                    return (
                      <div key={emp.name} className="group">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                              index === 0
                                ? 'bg-amber-400 text-amber-950 shadow-xs ring-2 ring-amber-200'
                                : index === 1
                                ? 'bg-slate-300 text-slate-800 shadow-xs'
                                : index === 2
                                ? 'bg-amber-700/70 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 font-medium'
                            }`}>
                              {index + 1}
                            </span>
                            <span className="font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                              {emp.name}
                            </span>
                            <span className="text-[10px] text-slate-600 hidden sm:inline">
                              ({emp.department})
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-extrabold text-blue-700 text-xs">{emp.totalQty} unit</span>
                            <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                              {emp.requestCount}x req
                            </span>
                          </div>
                        </div>

                        {/* 3D Horizontal Bar Rail with Depth and Bevel */}
                        <div className="w-full bg-slate-100 rounded-lg h-5 p-0.5 relative shadow-inner overflow-hidden flex items-center">
                          <div
                            className="h-full rounded-md bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 relative transition-all duration-500 shadow-md flex items-center justify-end px-2"
                            style={{ width: `${pct}%` }}
                          >
                            {/* 3D Gloss highlight at top of bar */}
                            <div className="absolute inset-x-0 top-0 h-1/2 bg-white/30 rounded-t-md pointer-events-none" />
                            {/* 3D End Cap */}
                            <div className="w-1.5 h-full absolute right-0 inset-y-0 bg-white/40 rounded-r-md" />
                            <span className="text-[9px] font-mono font-bold text-white drop-shadow-xs z-10">
                              {pct > 25 ? `${emp.totalQty} pcs` : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )
              ) : (
                requesterStats.departments.length === 0 ? (
                  <div className="text-center text-slate-600 text-xs py-10">
                    <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Belum ada data pengeluaran departemen pada periode ini.
                  </div>
                ) : (
                  requesterStats.departments.map((dept, index) => {
                    const pct = Math.min(100, Math.max(8, (dept.totalQty / requesterStats.maxDeptQty) * 100));
                    return (
                      <div key={dept.department} className="group">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                              {index + 1}
                            </span>
                            <span className="font-bold text-slate-900 truncate group-hover:text-emerald-600 transition-colors">
                              {dept.department}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-extrabold text-emerald-700 text-xs">{dept.totalQty} unit</span>
                            <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                              {dept.requestCount}x transaksi
                            </span>
                          </div>
                        </div>

                        {/* 3D Horizontal Bar for Department */}
                        <div className="w-full bg-slate-100 rounded-lg h-5 p-0.5 relative shadow-inner overflow-hidden flex items-center">
                          <div
                            className="h-full rounded-md bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-400 relative transition-all duration-500 shadow-md flex items-center justify-end px-2"
                            style={{ width: `${pct}%` }}
                          >
                            <div className="absolute inset-x-0 top-0 h-1/2 bg-white/30 rounded-t-md pointer-events-none" />
                            <div className="w-1.5 h-full absolute right-0 inset-y-0 bg-white/40 rounded-r-md" />
                            <span className="text-[9px] font-mono font-bold text-white drop-shadow-xs z-10">
                              {pct > 25 ? `${dept.totalQty} unit` : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>
          </div>

          {/* Quick Summary Footer */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-500" />
              <span>Menampilkan data periode: <b>{formatMonthLabel(selectedMonth)}</b></span>
            </div>
            <span className="font-semibold text-slate-700">
              {filteredOutTransactions.length} Dokumen Mutasi
            </span>
          </div>
        </div>

      </div>
    </section>
  );
};
