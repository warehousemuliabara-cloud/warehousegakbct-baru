import React, { useState } from 'react';
import { 
  BarChart3, 
  Layers, 
  Package, 
  TrendingUp, 
  Warehouse, 
  Sparkles, 
  CheckCircle2, 
  Boxes, 
  Activity,
  PieChart as PieIcon,
  ChevronRight,
  ShieldCheck,
  Building2,
  Info
} from 'lucide-react';
import { Item, Transaction } from '../types';

interface Infographic3DChartProps {
  items: Item[];
  transactions: Transaction[];
}

export const Infographic3DChart: React.FC<Infographic3DChartProps> = ({
  items,
  transactions,
}) => {
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(0);
  const [chartMode, setChartMode] = useState<'CYLINDER_STEP' | 'ISOMETRIC_RING'>('CYLINDER_STEP');

  // Compute analytics data based on live items and transactions
  const totalStockCount = items.reduce((acc, i) => acc + i.currentStock, 0);
  const gaWarehouseStock = items.filter(i => i.rackLocation === 'Gudang GA' || !i.rackLocation.includes('Kayu')).reduce((acc, i) => acc + i.currentStock, 0);
  const kayuWarehouseStock = items.filter(i => i.rackLocation === 'Gudang Kayu' || i.rackLocation.includes('Kayu')).reduce((acc, i) => acc + i.currentStock, 0);

  // Group items by category to calculate proportions
  const categoryStats: Record<string, { count: number; stock: number }> = {};
  items.forEach((item) => {
    const cat = item.category || 'Lainnya';
    if (!categoryStats[cat]) {
      categoryStats[cat] = { count: 0, stock: 0 };
    }
    categoryStats[cat].count += 1;
    categoryStats[cat].stock += item.currentStock;
  });

  const sortedCategories = Object.entries(categoryStats)
    .sort((a, b) => b[1].stock - a[1].stock)
    .slice(0, 5);

  // Fallback 5 segments data if fewer categories exist
  const colorPalette = [
    {
      num: '01',
      title: sortedCategories[0]?.[0] || 'ATK & Kertas',
      badge: '25%',
      pct: 25,
      stock: sortedCategories[0]?.[1]?.stock || 340,
      itemCount: sortedCategories[0]?.[1]?.count || 24,
      desc: 'Pengadaan alat tulis kantor, kertas rim, tinta & map arsip operasional.',
      primaryColor: '#F59E0B', // Warm Orange/Gold
      secondaryColor: '#D97706',
      lightColor: '#FEF3C7',
      wallColor: '#B45309',
      topColor: '#FBBF24',
      stepHeight: 50,
      icon: Package,
    },
    {
      num: '02',
      title: sortedCategories[1]?.[0] || 'Kebersihan & Sanitasi',
      badge: '50%',
      pct: 50,
      stock: sortedCategories[1]?.[1]?.stock || 280,
      itemCount: sortedCategories[1]?.[1]?.count || 18,
      desc: 'Cairan disinfektan, sabun cuci, sapu, wiper & perlengkapan sanitasi.',
      primaryColor: '#FB7185', // Salmon Coral
      secondaryColor: '#E11D48',
      lightColor: '#FFE4E6',
      wallColor: '#BE123C',
      topColor: '#FDA4AF',
      stepHeight: 85,
      icon: Sparkles,
    },
    {
      num: '03',
      title: sortedCategories[2]?.[0] || 'K3 & Perlengkapan Medis',
      badge: '75%',
      pct: 75,
      stock: sortedCategories[2]?.[1]?.stock || 215,
      itemCount: sortedCategories[2]?.[1]?.count || 14,
      desc: 'Kotak P3K, masker, safety helmet, sarung tangan & obat-obatan kerja.',
      primaryColor: '#F43F5E', // Rose Crimson
      secondaryColor: '#BE123C',
      lightColor: '#FFF1F2',
      wallColor: '#9F1239',
      topColor: '#FB7185',
      stepHeight: 120,
      icon: ShieldCheck,
    },
    {
      num: '04',
      title: sortedCategories[3]?.[0] || 'Gudang Kayu & Logistik',
      badge: '80%',
      pct: 80,
      stock: kayuWarehouseStock || 190,
      itemCount: items.filter(i => i.rackLocation === 'Gudang Kayu').length || 12,
      desc: 'Material papan kayu, balok, triplek, lakban & karton pengemasan.',
      primaryColor: '#0EA5E9', // Azure Blue
      secondaryColor: '#0284C7',
      lightColor: '#E0F2FE',
      wallColor: '#0369A1',
      topColor: '#38BDF8',
      stepHeight: 155,
      icon: Warehouse,
    },
    {
      num: '05',
      title: sortedCategories[4]?.[0] || 'Pantry & Maintenance',
      badge: '95%',
      pct: 95,
      stock: sortedCategories[4]?.[1]?.stock || 160,
      itemCount: sortedCategories[4]?.[1]?.count || 10,
      desc: 'Konsumsi kantor, galon, kopi, toolkit pemeliharaan & peralatan listrik.',
      primaryColor: '#10B981', // Mint Teal / Emerald
      secondaryColor: '#059669',
      lightColor: '#D1FAE5',
      wallColor: '#047857',
      topColor: '#34D399',
      stepHeight: 190,
      icon: Activity,
    },
  ];

  const activeSegment = colorPalette[activeSegmentIndex] || colorPalette[0];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-6 space-y-6">
      {/* Header Infografis */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-md flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              Visualisasi Infografis 3D
            </span>
            <span className="text-xs text-slate-500 font-semibold">Komposisi & Utilisasi Inventaris</span>
          </div>
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
            Analitik Distribusi Inventaris Gudang GA & Gudang Kayu
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            Tampilan grafis 3D silinder bertingkat interaktif (3D Isometric Layered Cylinder Chart) untuk memantau sebaran kategori barang.
          </p>
        </div>

        {/* Toggle Mode Button */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setChartMode('CYLINDER_STEP')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              chartMode === 'CYLINDER_STEP'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Layer Silinder 3D</span>
          </button>

          <button
            type="button"
            onClick={() => setChartMode('ISOMETRIC_RING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              chartMode === 'ISOMETRIC_RING'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5 text-emerald-600" />
            <span>Piramida Segmen</span>
          </button>
        </div>
      </div>

      {/* Main Infographic Workspace (Grid Layout matching attached reference image) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Side: Callout Pins 01, 02 */}
        <div className="lg:col-span-3 space-y-3 order-2 lg:order-1">
          {colorPalette.slice(0, 2).map((item, idx) => {
            const isSelected = activeSegmentIndex === idx;
            const ItemIcon = item.icon;

            return (
              <div
                key={item.num}
                onClick={() => setActiveSegmentIndex(idx)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                  isSelected
                    ? 'bg-white border-2 shadow-md ring-2 ring-blue-500/20 scale-[1.02]'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-white hover:border-slate-300'
                }`}
                style={{ borderColor: isSelected ? item.primaryColor : undefined }}
              >
                {/* Accent Top Bar */}
                <div 
                  className="absolute top-0 left-0 right-0 h-1 transition-all"
                  style={{ backgroundColor: item.primaryColor }}
                />

                <div className="flex items-center justify-between mb-1.5">
                  <span 
                    className="text-lg font-black tracking-tight"
                    style={{ color: item.primaryColor }}
                  >
                    {item.num}
                  </span>
                  <span 
                    className="text-xs font-extrabold px-2 py-0.5 rounded-full text-white shadow-2xs"
                    style={{ backgroundColor: item.primaryColor }}
                  >
                    {item.badge}
                  </span>
                </div>

                <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5 group-hover:text-blue-700 transition-colors">
                  <ItemIcon className="w-3.5 h-3.5 shrink-0" style={{ color: item.primaryColor }} />
                  <span className="truncate">{item.title}</span>
                </h4>

                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                  {item.desc}
                </p>

                <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-500">Stok: <b>{item.stock} Unit</b></span>
                  <span className="text-slate-400 font-sans text-[10px]">{item.itemCount} Barang</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Center: 3D Isometric Cylindrical Layered Step Visualizer */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center p-2 order-1 lg:order-2">
          <div className="relative w-full max-w-[420px] aspect-square flex items-center justify-center">
            {/* SVG 3D Isometric Cylinder Rendering */}
            <svg 
              viewBox="0 0 460 460" 
              className="w-full h-full drop-shadow-xl select-none"
              style={{ filter: 'drop-shadow(0 15px 25px rgba(0,0,0,0.12))' }}
            >
              <defs>
                {/* 3D Gradients for cylinder walls & tops */}
                {colorPalette.map((seg) => (
                  <React.Fragment key={seg.num}>
                    {/* Wall Side Gradient */}
                    <linearGradient id={`grad-wall-${seg.num}`} x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={seg.secondaryColor} stopOpacity="0.95" />
                      <stop offset="40%" stopColor={seg.primaryColor} stopOpacity="1" />
                      <stop offset="70%" stopColor={seg.topColor} stopOpacity="0.9" />
                      <stop offset="100%" stopColor={seg.wallColor} stopOpacity="1" />
                    </linearGradient>

                    {/* Top Ellipse Gradient */}
                    <linearGradient id={`grad-top-${seg.num}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={seg.lightColor} stopOpacity="1" />
                      <stop offset="45%" stopColor={seg.topColor} stopOpacity="1" />
                      <stop offset="100%" stopColor={seg.primaryColor} stopOpacity="1" />
                    </linearGradient>

                    {/* Inner Drop Shadow */}
                    <radialGradient id={`shadow-${seg.num}`} cx="50%" cy="50%" r="50%">
                      <stop offset="60%" stopColor="#000000" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                    </radialGradient>
                  </React.Fragment>
                ))}

                {/* Base Ground Shadow */}
                <radialGradient id="ground-shadow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#0f172a" stopOpacity="0.28" />
                  <stop offset="50%" stopColor="#0f172a" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Floor Base Ambient Shadow */}
              <ellipse cx="230" cy="380" rx="190" ry="55" fill="url(#ground-shadow)" />

              {/* 3D Stepped Cylindrical Ring Layers */}
              {chartMode === 'CYLINDER_STEP' ? (
                // 5 Concentric / Stepped Isometric Cylinder Slices
                <g transform="translate(0, 0)">
                  {/* Layer 01: Warm Orange (Base Step) */}
                  <g 
                    onClick={() => setActiveSegmentIndex(0)}
                    className="cursor-pointer transition-all duration-300 hover:opacity-95"
                    style={{ transform: activeSegmentIndex === 0 ? 'translateY(-4px)' : 'none' }}
                  >
                    {/* Outer Wall Body */}
                    <path
                      d="M 60,330 A 170 55 0 0 0 400,330 L 400,355 A 170 55 0 0 1 60,355 Z"
                      fill="url(#grad-wall-01)"
                    />
                    {/* Top Ring Disc */}
                    <ellipse cx="230" cy="330" rx="170" ry="55" fill="url(#grad-top-01)" stroke="#ffffff" strokeWidth="1.5" />
                    {/* Percentage text indicator */}
                    <text x="365" y="338" fill="#ffffff" fontSize="13" fontWeight="900" textAnchor="middle" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.5))">25%</text>
                  </g>

                  {/* Layer 02: Salmon Coral (Step 2) */}
                  <g 
                    onClick={() => setActiveSegmentIndex(1)}
                    className="cursor-pointer transition-all duration-300 hover:opacity-95"
                    style={{ transform: activeSegmentIndex === 1 ? 'translateY(-4px)' : 'none' }}
                  >
                    <path
                      d="M 90,275 A 140 45 0 0 0 370,275 L 370,305 A 140 45 0 0 1 90,305 Z"
                      fill="url(#grad-wall-02)"
                    />
                    <ellipse cx="230" cy="275" rx="140" ry="45" fill="url(#grad-top-02)" stroke="#ffffff" strokeWidth="1.5" />
                    <text x="340" y="282" fill="#ffffff" fontSize="13" fontWeight="900" textAnchor="middle" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.5))">50%</text>
                  </g>

                  {/* Layer 03: Rose Crimson (Step 3) */}
                  <g 
                    onClick={() => setActiveSegmentIndex(2)}
                    className="cursor-pointer transition-all duration-300 hover:opacity-95"
                    style={{ transform: activeSegmentIndex === 2 ? 'translateY(-4px)' : 'none' }}
                  >
                    <path
                      d="M 120,220 A 110 36 0 0 0 340,220 L 340,250 A 110 36 0 0 1 120,250 Z"
                      fill="url(#grad-wall-03)"
                    />
                    <ellipse cx="230" cy="220" rx="110" ry="36" fill="url(#grad-top-03)" stroke="#ffffff" strokeWidth="1.5" />
                    <text x="310" y="226" fill="#ffffff" fontSize="12" fontWeight="900" textAnchor="middle" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.5))">75%</text>
                  </g>

                  {/* Layer 04: Azure Blue (Step 4) */}
                  <g 
                    onClick={() => setActiveSegmentIndex(3)}
                    className="cursor-pointer transition-all duration-300 hover:opacity-95"
                    style={{ transform: activeSegmentIndex === 3 ? 'translateY(-4px)' : 'none' }}
                  >
                    <path
                      d="M 150,165 A 80 27 0 0 0 310,165 L 310,195 A 80 27 0 0 1 150,195 Z"
                      fill="url(#grad-wall-04)"
                    />
                    <ellipse cx="230" cy="165" rx="80" ry="27" fill="url(#grad-top-04)" stroke="#ffffff" strokeWidth="1.5" />
                    <text x="285" y="170" fill="#ffffff" fontSize="12" fontWeight="900" textAnchor="middle" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.5))">80%</text>
                  </g>

                  {/* Layer 05: Mint Teal (Top Crown Step) */}
                  <g 
                    onClick={() => setActiveSegmentIndex(4)}
                    className="cursor-pointer transition-all duration-300 hover:opacity-95"
                    style={{ transform: activeSegmentIndex === 4 ? 'translateY(-4px)' : 'none' }}
                  >
                    <path
                      d="M 180,110 A 50 18 0 0 0 280,110 L 280,140 A 50 18 0 0 1 180,140 Z"
                      fill="url(#grad-wall-05)"
                    />
                    <ellipse cx="230" cy="110" rx="50" ry="18" fill="url(#grad-top-05)" stroke="#ffffff" strokeWidth="1.5" />
                    <text x="230" y="115" fill="#ffffff" fontSize="13" fontWeight="900" textAnchor="middle" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.5))">95%</text>
                  </g>

                  {/* Center Cap Flag Indicator */}
                  <circle cx="230" cy="100" r="14" fill="#ffffff" stroke="#10B981" strokeWidth="3" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))" />
                  <text x="230" y="104" fill="#047857" fontSize="10" fontWeight="900" textAnchor="middle">★</text>
                </g>
              ) : (
                // 3D Isometric Segmented Rings (Piramida Segmen)
                <g>
                  {colorPalette.map((seg, idx) => {
                    const radius = 175 - idx * 28;
                    const yPos = 340 - idx * 52;
                    const isCur = activeSegmentIndex === idx;

                    return (
                      <g 
                        key={seg.num}
                        onClick={() => setActiveSegmentIndex(idx)}
                        className="cursor-pointer transition-all duration-200"
                        style={{ transform: isCur ? 'scale(1.03)' : 'none', transformOrigin: '230px 230px' }}
                      >
                        <path
                          d={`M ${230 - radius},${yPos} A ${radius} ${radius * 0.32} 0 0 0 ${230 + radius},${yPos} L ${230 + radius},${yPos + 26} A ${radius} ${radius * 0.32} 0 0 1 ${230 - radius},${yPos + 26} Z`}
                          fill={`url(#grad-wall-${seg.num})`}
                        />
                        <ellipse 
                          cx="230" 
                          cy={yPos} 
                          rx={radius} 
                          ry={radius * 0.32} 
                          fill={`url(#grad-top-${seg.num})`} 
                          stroke="#ffffff" 
                          strokeWidth="2" 
                        />
                        <text 
                          x={230 + radius - 20} 
                          y={yPos + 5} 
                          fill="#ffffff" 
                          fontSize="11" 
                          fontWeight="900" 
                          textAnchor="middle"
                          filter="drop-shadow(0 1px 2px rgba(0,0,0,0.6))"
                        >
                          {seg.badge}
                        </text>
                      </g>
                    );
                  })}
                </g>
              )}
            </svg>
          </div>

          {/* Interactive instruction hint below chart */}
          <div className="mt-2 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[11px] font-semibold">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              Klik salah satu layer 3D / nomor segmen di samping untuk melihat rincian
            </span>
          </div>
        </div>

        {/* Right Side: Callout Pins 03, 04, 05 */}
        <div className="lg:col-span-3 space-y-3 order-3">
          {colorPalette.slice(2, 5).map((item, idx) => {
            const realIdx = idx + 2;
            const isSelected = activeSegmentIndex === realIdx;
            const ItemIcon = item.icon;

            return (
              <div
                key={item.num}
                onClick={() => setActiveSegmentIndex(realIdx)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                  isSelected
                    ? 'bg-white border-2 shadow-md ring-2 ring-blue-500/20 scale-[1.02]'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-white hover:border-slate-300'
                }`}
                style={{ borderColor: isSelected ? item.primaryColor : undefined }}
              >
                <div 
                  className="absolute top-0 left-0 right-0 h-1 transition-all"
                  style={{ backgroundColor: item.primaryColor }}
                />

                <div className="flex items-center justify-between mb-1.5">
                  <span 
                    className="text-lg font-black tracking-tight"
                    style={{ color: item.primaryColor }}
                  >
                    {item.num}
                  </span>
                  <span 
                    className="text-xs font-extrabold px-2 py-0.5 rounded-full text-white shadow-2xs"
                    style={{ backgroundColor: item.primaryColor }}
                  >
                    {item.badge}
                  </span>
                </div>

                <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5 group-hover:text-blue-700 transition-colors">
                  <ItemIcon className="w-3.5 h-3.5 shrink-0" style={{ color: item.primaryColor }} />
                  <span className="truncate">{item.title}</span>
                </h4>

                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                  {item.desc}
                </p>

                <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-500">Stok: <b>{item.stock} Unit</b></span>
                  <span className="text-slate-400 font-sans text-[10px]">{item.itemCount} Barang</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Segment Drill-Down Detail Bar */}
      <div 
        className="p-4 rounded-2xl border transition-all animate-in fade-in"
        style={{ 
          backgroundColor: activeSegment.lightColor,
          borderColor: activeSegment.primaryColor 
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-sm shrink-0"
              style={{ backgroundColor: activeSegment.primaryColor }}
            >
              {activeSegment.num}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-sm text-slate-900">{activeSegment.title}</h4>
                <span 
                  className="px-2 py-0.5 rounded-md text-white text-[10px] font-extrabold"
                  style={{ backgroundColor: activeSegment.primaryColor }}
                >
                  Level Cap: {activeSegment.badge}
                </span>
              </div>
              <p className="text-xs text-slate-700 mt-0.5">
                {activeSegment.desc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-300/80 pt-2 md:pt-0 md:pl-4">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Unit Fisik</span>
              <span className="font-mono font-black text-sm text-slate-900">{activeSegment.stock} Unit</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Jumlah Item</span>
              <span className="font-mono font-black text-sm text-slate-900">{activeSegment.itemCount} SKU</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Status Gudang</span>
              <span className="text-xs font-bold text-emerald-800 bg-white/80 px-2 py-0.5 rounded-lg border border-emerald-300">
                Optimal
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
