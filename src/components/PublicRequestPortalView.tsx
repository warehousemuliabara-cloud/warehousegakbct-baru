import React, { useState, useMemo } from 'react';
import { 
  Send, 
  Package, 
  Search, 
  QrCode, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Smartphone, 
  ArrowRight, 
  Lock, 
  LogIn, 
  Building2, 
  User, 
  FileText, 
  Plus, 
  Trash2, 
  Sparkles,
  Tag,
  ShieldCheck,
  RefreshCw,
  Printer
} from 'lucide-react';
import { Item, Transaction, Employee } from '../types';
import { CompanyLogo } from './CompanyLogo';
import { BarcodeRenderer } from './BarcodeRenderer';

interface PublicRequestPortalViewProps {
  items: Item[];
  employees: Employee[];
  companyName?: string;
  companySubtitle?: string;
  logoUrl?: string | null;
  onSubmitTransaction: (trx: Transaction) => void;
  onGoToStaffLogin: () => void;
  recentTransactions?: Transaction[];
}

export const PublicRequestPortalView: React.FC<PublicRequestPortalViewProps> = ({
  items,
  employees,
  companyName = 'WAREHOUSE KBCT',
  companySubtitle = 'General Affairs Inventory Control',
  logoUrl,
  onSubmitTransaction,
  onGoToStaffLogin,
  recentTransactions = [],
}) => {
  const [requesterName, setRequesterName] = useState('');
  const [department, setDepartment] = useState('');
  const [notes, setNotes] = useState('');
  
  // Custom Searchable & Scrollable Employee Dropdown (Requirement 12)
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [employeeSearchInput, setEmployeeSearchInput] = useState('');
  const employeeDropdownRef = React.useRef<HTMLDivElement>(null);

  // Close employee dropdown on click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(event.target as Node)) {
        setIsEmployeeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered employees list for dropdown
  const filteredEmployees = useMemo(() => {
    const term = (employeeSearchInput || requesterName).toLowerCase();
    if (!term) return employees;
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(term) ||
        (e.department && e.department.toLowerCase().includes(term)) ||
        (e.position && e.position.toLowerCase().includes(term))
    );
  }, [employees, employeeSearchInput, requesterName]);

  // Multiple requested items support (Requirement 11)
  const [selectedItems, setSelectedItems] = useState<{ itemId: string; quantity: number }[]>([]);
  const [activeItemSearch, setActiveItemSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  
  // Submission status
  const [submittedReceipt, setSubmittedReceipt] = useState<Transaction | null>(null);
  const [activeTab, setActiveTab] = useState<'FORM' | 'STATUS'>('FORM');
  const [mySearchName, setMySearchName] = useState('');

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set).sort();
  }, [items]);

  // Filtered available items (only items with stock > 0)
  const availableItems = useMemo(() => {
    let list = items.filter((i) => i.currentStock > 0);
    if (selectedCategory !== 'ALL') {
      list = list.filter((i) => i.category === selectedCategory);
    }
    if (activeItemSearch.trim()) {
      const q = activeItemSearch.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.code.toLowerCase().includes(q) ||
          (i.rackLocation && i.rackLocation.toLowerCase().includes(q))
      );
    }
    return list;
  }, [items, selectedCategory, activeItemSearch]);

  // Handle employee name selection (autofill department)
  const handleSelectEmployee = (empName: string) => {
    setRequesterName(empName);
    const emp = employees.find((e) => e.name.toLowerCase() === empName.toLowerCase());
    if (emp && emp.department) {
      setDepartment(emp.department);
    }
  };

  // Add item to cart
  const handleAddItemToCart = (item: Item) => {
    setSelectedItems((prev) => {
      const existing = prev.find((p) => p.itemId === item.id);
      if (existing) {
        if (existing.quantity >= item.currentStock) return prev;
        return prev.map((p) =>
          p.itemId === item.id ? { ...p, quantity: p.quantity + 1 } : p
        );
      }
      return [...prev, { itemId: item.id, quantity: 1 }];
    });
  };

  const handleUpdateCartQty = (itemId: string, newQty: number) => {
    const item = items.find((i) => i.id === itemId);
    const max = item ? item.currentStock : 999;
    if (newQty <= 0) {
      setSelectedItems((prev) => prev.filter((p) => p.itemId !== itemId));
    } else {
      setSelectedItems((prev) =>
        prev.map((p) =>
          p.itemId === itemId ? { ...p, quantity: Math.min(newQty, max) } : p
        )
      );
    }
  };

  const handleRemoveCartItem = (itemId: string) => {
    setSelectedItems((prev) => prev.filter((p) => p.itemId !== itemId));
  };

  // Submit request
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requesterName.trim()) {
      alert('Mohon masukkan nama pemohon.');
      return;
    }
    if (!department.trim()) {
      alert('Mohon pilih atau masukkan divisi/departemen Anda.');
      return;
    }
    if (selectedItems.length === 0) {
      alert('Pilih minimal 1 jenis barang yang ingin diminta.');
      return;
    }

    const now = new Date();
    const dateStr = now.toISOString().replace(/[-:T.]/g, '').substring(0, 14);
    const trxNumber = `OUT-REQ-${dateStr}-${Math.floor(100 + Math.random() * 900)}`;

    const totalQty = selectedItems.reduce((acc, curr) => acc + curr.quantity, 0);

    const transactionPayload: Transaction = {
      id: `trx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      transactionNumber: trxNumber,
      date: now.toISOString().split('T')[0],
      timestamp: now.toISOString(),
      type: 'OUT',
      status: 'PENDING',
      requesterName: requesterName.trim(),
      department: department.trim(),
      purposeDescription: notes.trim() || 'Permintaan mandiri via QR Code Portal Karyawan',
      notes: notes.trim() || 'Permintaan mandiri via QR Code Portal Karyawan',
      items: selectedItems.map((si) => {
        const itemInfo = items.find((i) => i.id === si.itemId);
        return {
          itemId: si.itemId,
          itemCode: itemInfo?.code || 'SKU',
          itemName: itemInfo?.name || 'Barang',
          category: itemInfo?.category,
          quantity: si.quantity,
          unit: itemInfo?.unit || 'Pcs',
        };
      }),
    };

    onSubmitTransaction(transactionPayload);
    setSubmittedReceipt(transactionPayload);
    setSelectedItems([]);
    setNotes('');
  };

  // User's tracked requests
  const myRequests = useMemo(() => {
    if (!mySearchName.trim()) {
      return recentTransactions.filter((t) => t.type === 'OUT').slice(0, 10);
    }
    const q = mySearchName.toLowerCase();
    return recentTransactions.filter(
      (t) =>
        t.type === 'OUT' &&
        (t.requesterName.toLowerCase().includes(q) ||
          t.department.toLowerCase().includes(q) ||
          t.transactionNumber.toLowerCase().includes(q))
    );
  }, [recentTransactions, mySearchName]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-indigo-600 selection:text-white font-sans">
      {/* 1. Header Portal */}
      <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 sm:py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-xl bg-white/10 border border-white/20 shadow-xs shrink-0">
              <CompanyLogo logoUrl={logoUrl} size="sm" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                  {companyName}
                </h1>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Portal Mandiri
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Formulir Permintaan Barang Gudang GA • Bebas Login
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onGoToStaffLogin}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <LogIn className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Masuk Petugas Gudang</span>
            <span className="sm:hidden">Petugas</span>
          </button>
        </div>
      </header>

      {/* 2. Main Body Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-5 space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab('FORM');
              setSubmittedReceipt(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'FORM'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Formulir Permintaan Baru</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('STATUS')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'STATUS'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Cek Status Permintaan</span>
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SUBMISSION RECEIPT POPUP / BANNER                            */}
        {/* ------------------------------------------------------------- */}
        {submittedReceipt && (
          <div className="bg-gradient-to-br from-emerald-950/90 via-slate-900 to-emerald-950/70 border-2 border-emerald-500/80 rounded-2xl p-5 sm:p-6 shadow-2xl text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <h3 className="text-lg sm:text-xl font-black text-white">
              Permintaan Berhasil Diajukan!
            </h3>
            <p className="text-xs text-slate-300 max-w-md mx-auto mt-1 mb-4">
              Data permintaan barang Anda telah diterima sistem dan langsung terkirim ke Tim Gudang GA.
            </p>

            {/* Receipt Card */}
            <div className="bg-slate-950/80 rounded-xl p-4 border border-emerald-500/30 max-w-md mx-auto text-left space-y-2 text-xs mb-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400 font-mono">No. Tiket Permintaan:</span>
                <span className="font-mono font-black text-emerald-400 text-sm">
                  {submittedReceipt.transactionNumber}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Pemohon:</span>
                <span className="font-bold text-white">{submittedReceipt.requesterName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Divisi / Bagian:</span>
                <span className="font-bold text-slate-200">{submittedReceipt.department}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Status:</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold text-[10px] border border-amber-500/40">
                  MENUNGGU VERIFIKASI ADMIN
                </span>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <p className="text-[11px] font-bold text-slate-400 mb-1">Daftar Barang Diminta:</p>
                <ul className="space-y-1 pl-2">
                  {submittedReceipt.items.map((it, idx) => (
                    <li key={idx} className="flex justify-between text-[11px] text-slate-300">
                      <span>• {it.itemName}</span>
                      <span className="font-bold font-mono text-white">
                        {it.quantity} {it.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setSubmittedReceipt(null)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                Buat Permintaan Baru
              </button>
              <button
                type="button"
                onClick={() => {
                  setMySearchName(submittedReceipt.requesterName);
                  setActiveTab('STATUS');
                  setSubmittedReceipt(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Pantau Status Tiket
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: FORMULIR PERMINTAAN MANDIRI                            */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'FORM' && !submittedReceipt && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Step 1: Info Pemohon */}
            <div className="bg-slate-950/70 rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
                  1
                </div>
                <h3 className="font-bold text-sm text-white">Informasi Pemohon</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Nama Pemohon dengan Searchable & Scrollable Dropdown (Requirement 12) */}
                <div className="space-y-1 relative" ref={employeeDropdownRef}>
                  <label className="font-semibold text-slate-300 flex items-center justify-between">
                    <span>Nama Lengkap Pemohon <span className="text-rose-400">*</span></span>
                    <span className="text-[10px] text-indigo-400 font-normal">Cari & Scroll Nama</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={requesterName}
                      onFocus={() => setIsEmployeeDropdownOpen(true)}
                      onChange={(e) => {
                        setRequesterName(e.target.value);
                        setEmployeeSearchInput(e.target.value);
                        setIsEmployeeDropdownOpen(true);
                      }}
                      placeholder="Ketik atau pilih nama personil / pemohon..."
                      required
                      className="w-full pl-9 pr-8 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                    {requesterName && (
                      <button
                        type="button"
                        onClick={() => {
                          setRequesterName('');
                          setEmployeeSearchInput('');
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {isEmployeeDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-800 animate-in fade-in zoom-in-95 duration-150">
                      {filteredEmployees.length === 0 ? (
                        <div className="p-3 text-center text-slate-500 text-xs">
                          Nama "{employeeSearchInput || requesterName}" tidak ditemukan di database. Anda tetap dapat melanjutkan mengetik nama manual.
                        </div>
                      ) : (
                        filteredEmployees.map((emp) => (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => {
                              handleSelectEmployee(emp.name);
                              setIsEmployeeDropdownOpen(false);
                            }}
                            className="w-full p-2.5 text-left hover:bg-indigo-600/30 flex items-center justify-between text-xs cursor-pointer transition-colors"
                          >
                            <div>
                              <div className="font-bold text-white">{emp.name}</div>
                              <div className="text-[10px] text-slate-400">
                                {emp.position} • {emp.department}
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-500/30">
                              Pilih
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Divisi / Departemen */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">
                    Divisi / Bagian <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="Contoh: Produksi, IT, HRD, PGA, Finance..."
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Keperluan */}
              <div className="space-y-1 text-xs">
                <label className="font-semibold text-slate-300">
                  Keperluan / Keterangan Penggunaan
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Untuk operasional tim shift pagi / perlengkapan maintenance..."
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Step 2: Pilih Barang dari Gudang */}
            <div className="bg-slate-950/70 rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
                    2
                  </div>
                  <h3 className="font-bold text-sm text-white">Pilih Barang dari Stok Gudang</h3>
                </div>
                <span className="text-[11px] font-mono text-indigo-400 font-semibold">
                  {selectedItems.length} barang dipilih
                </span>
              </div>

              {/* Search & Filter Barang (Requirement 11) */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={activeItemSearch}
                    onChange={(e) => setActiveItemSearch(e.target.value)}
                    placeholder="Cari nama barang, kode SKU, atau lokasi rak..."
                    className="w-full pl-8 pr-7 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  {activeItemSearch && (
                    <button
                      type="button"
                      onClick={() => setActiveItemSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="ALL">Semua Kategori ({items.length})</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Items Count & Scroll Info */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>Ditemukan: <strong className="text-white">{availableItems.length}</strong> barang tersedia</span>
                <span className="text-slate-500">Scroll ke bawah untuk melihat semua</span>
              </div>

              {/* Items Grid - Scrollable & Responsive */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
                {availableItems.length === 0 ? (
                  <div className="col-span-full py-8 text-center text-slate-500 text-xs">
                    Tidak ada barang yang cocok atau stok gudang sedang kosong.
                  </div>
                ) : (
                  availableItems.map((item) => {
                    const inCart = selectedItems.find((p) => p.itemId === item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleAddItemToCart(item)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          inCart
                            ? 'bg-indigo-950/60 border-indigo-500 ring-1 ring-indigo-500/40 shadow-xs'
                            : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-1.5">
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-white line-clamp-1">{item.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{item.code}</p>
                          </div>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold shrink-0">
                            Stok: {item.currentStock} {item.unit}
                          </span>
                        </div>

                        <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                          <span className="text-slate-500 truncate">{item.category}</span>
                          <span className="text-indigo-400 font-bold flex items-center gap-0.5">
                            <Plus className="w-3 h-3" /> Tambah
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Step 3: Keranjang Permintaan Barang */}
            {selectedItems.length > 0 && (
              <div className="bg-slate-950/70 rounded-2xl p-4 sm:p-5 border border-indigo-500/30 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
                      3
                    </div>
                    <h3 className="font-bold text-sm text-white">Daftar Barang Diminta</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedItems([])}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-bold transition-colors cursor-pointer"
                  >
                    Kosongkan Semua
                  </button>
                </div>

                <div className="space-y-2">
                  {selectedItems.map((si) => {
                    const item = items.find((i) => i.id === si.itemId);
                    if (!item) return null;
                    return (
                      <div
                        key={si.itemId}
                        className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-white truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {item.code} • Lokasi: {item.rackLocation}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg overflow-hidden">
                            <button
                              type="button"
                              onClick={() => handleUpdateCartQty(si.itemId, si.quantity - 1)}
                              className="px-2.5 py-1 text-slate-300 hover:bg-slate-800 transition-colors font-bold cursor-pointer"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={item.currentStock}
                              value={si.quantity}
                              onChange={(e) =>
                                handleUpdateCartQty(si.itemId, parseInt(e.target.value) || 1)
                              }
                              className="w-12 text-center bg-transparent text-white font-mono font-bold text-xs py-1 focus:outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateCartQty(si.itemId, si.quantity + 1)}
                              disabled={si.quantity >= item.currentStock}
                              className="px-2.5 py-1 text-slate-300 hover:bg-slate-800 disabled:opacity-30 transition-colors font-bold cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400">{item.unit}</span>

                          <button
                            type="button"
                            onClick={() => handleRemoveCartItem(si.itemId)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Submit Action Bar */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={selectedItems.length === 0 || !requesterName.trim() || !department.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-40 text-white font-black text-sm rounded-2xl shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
              >
                <Send className="w-4 h-4" />
                <span>Kirim Pengajuan Permintaan Barang ({selectedItems.length} Item)</span>
              </button>
            </div>
          </form>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: CEK STATUS PERMINTAAN TIKET                           */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'STATUS' && (
          <div className="bg-slate-950/70 rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-white">Pantau Status Permintaan Barang</h3>
                <p className="text-xs text-slate-400">
                  Ketik nama Anda atau nomor tiket untuk melacak status verifikasi.
                </p>
              </div>

              {/* Search input */}
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={mySearchName}
                  onChange={(e) => setMySearchName(e.target.value)}
                  placeholder="Cari nama pemohon atau no. tiket..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Requests List */}
            <div className="space-y-2.5">
              {myRequests.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Belum ada riwayat permintaan yang sesuai dengan pencarian Anda.
                </div>
              ) : (
                myRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 hover:border-slate-700 transition-all space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="font-mono font-black text-indigo-400 text-xs">
                          {req.transactionNumber}
                        </span>
                        <p className="font-bold text-white mt-0.5">
                          {req.requesterName} • <span className="text-slate-400">{req.department}</span>
                        </p>
                      </div>

                      <div className="text-right">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase border ${
                            req.status === 'APPROVED' || req.status === 'COMPLETED'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : req.status === 'REJECTED'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          {req.status === 'APPROVED'
                            ? 'DISETUJUI / SIAP DIAMBIL'
                            : req.status === 'REJECTED'
                            ? 'DITOLAK'
                            : req.status === 'COMPLETED'
                            ? 'SELESAI (SUDAH DISERAHKAN)'
                            : 'MENUNGGU VERIFIKASI'}
                        </span>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {new Date(req.date).toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>

                    {/* Item list */}
                    <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-300 flex flex-wrap gap-2">
                      {req.items.map((it, idx) => (
                        <span
                          key={idx}
                          className="bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800 text-[10px] font-mono text-slate-300"
                        >
                          {it.itemName} ({it.quantity} {it.unit})
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* 3. Footer */}
      <footer className="bg-slate-950/80 border-t border-slate-800 text-center py-3 text-[11px] text-slate-500">
        <span>Sistem Otomasi Gudang GA KBCT • Portal Permintaan Mandiri Karyawan</span>
      </footer>
    </div>
  );
};
