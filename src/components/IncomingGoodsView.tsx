import React, { useState, useEffect, useRef } from 'react';
import { 
  PlusCircle, 
  Trash2, 
  Plus, 
  Clock, 
  Calendar, 
  Truck, 
  Building2, 
  FileText, 
  Package, 
  CheckCircle2, 
  AlertTriangle,
  Search,
  MapPin,
  ChevronDown,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Item, Transaction, RequestItemEntry, UserAccount, UserRole, UserPermissions } from '../types';
import { DEFAULT_ROLE_PERMISSIONS } from '../data/initialData';
import { 
  formatIndonesianDateTime, 
  generateTransactionNumber 
} from '../utils/helpers';

interface IncomingGoodsViewProps {
  items: Item[];
  currentUser?: UserAccount;
  rolePermissions?: Record<UserRole, UserPermissions>;
  onOpenScanner: () => void;
  onSubmitTransaction: (trx: Transaction) => void;
  onNavigateToStock: () => void;
}

export const IncomingGoodsView: React.FC<IncomingGoodsViewProps> = ({
  items,
  currentUser,
  rolePermissions,
  onOpenScanner,
  onSubmitTransaction,
}) => {
  // Determine dynamic permissions based on active role matrix
  const currentPerms = (rolePermissions && currentUser?.role && rolePermissions[currentUser.role]) || currentUser?.permissions || (currentUser?.role ? DEFAULT_ROLE_PERMISSIONS[currentUser.role] : DEFAULT_ROLE_PERMISSIONS.USER_OPERATIONAL);
  const canReceive = currentPerms ? (currentPerms.canReceiveIncomingGoods ?? true) : true;
  // Asal Barang selection: 'Samarinda' | 'Kota Bangun' | Custom
  const [originType, setOriginType] = useState<'Samarinda' | 'Kota Bangun'>('Samarinda');
  const [customOriginDetails, setCustomOriginDetails] = useState('');
  
  const [documentNumber, setDocumentNumber] = useState('');
  const [receivedByOfficer, setReceivedByOfficer] = useState(currentUser?.fullName || 'Agus Setiawan (Staf Operasional)');
  const [notes, setNotes] = useState('');

  // Update receivedByOfficer if currentUser changes
  useEffect(() => {
    if (currentUser?.fullName) {
      setReceivedByOfficer(currentUser.fullName);
    }
  }, [currentUser]);

  // Selected items table for incoming goods
  const [incomingItems, setIncomingItems] = useState<RequestItemEntry[]>([]);

  // Item selector helpers & Search (Integrated Combobox)
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [itemSearchKeyword, setItemSearchKeyword] = useState<string>('');
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState<boolean>(false);
  const itemDropdownRef = useRef<HTMLDivElement>(null);
  const [tempQty, setTempQty] = useState<string>('');

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (itemDropdownRef.current && !itemDropdownRef.current.contains(event.target as Node)) {
        setIsItemDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Real-time automated system timestamp
  const [currentTimestamp, setCurrentTimestamp] = useState(formatIndonesianDateTime(new Date()));

  // Feedback states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successTrx, setSuccessTrx] = useState<Transaction | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimestamp(formatIndonesianDateTime(new Date()));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter stock items by search keyword in selector
  const filteredStockItems = items.filter((itm) => {
    const term = itemSearchKeyword.toLowerCase();
    return (
      itm.name.toLowerCase().includes(term) ||
      itm.code.toLowerCase().includes(term) ||
      itm.rackLocation.toLowerCase().includes(term)
    );
  });

  const selectedItemObj = items.find((i) => i.id === selectedItemId);

  const handleSelectItem = (item: Item) => {
    setSelectedItemId(item.id);
    setItemSearchKeyword(`${item.code} - ${item.name}`);
    setIsItemDropdownOpen(false);
  };

  const handleAddItem = () => {
    setErrorMessage(null);
    if (!selectedItemId) {
      setErrorMessage('Pilih barang yang masuk terlebih dahulu');
      return;
    }
    const item = items.find((i) => i.id === selectedItemId);
    if (!item) return;

    const parsedQty = parseInt(tempQty.trim(), 10);
    if (!tempQty.trim() || isNaN(parsedQty) || parsedQty <= 0) {
      setErrorMessage('Silakan ketik jumlah barang masuk yang valid (minimal 1)');
      return;
    }

    setIncomingItems((prev) => {
      const existingIndex = prev.findIndex((entry) => entry.itemId === item.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + parsedQty,
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            itemId: item.id,
            itemCode: item.code,
            itemName: item.name,
            unit: item.unit,
            quantity: parsedQty,
            currentStock: item.currentStock,
          },
        ];
      }
    });

    setSelectedItemId('');
    setItemSearchKeyword('');
    setTempQty('');
  };

  const handleUpdateQuantity = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(itemId);
      return;
    }
    setIncomingItems((prev) =>
      prev.map((entry) => (entry.itemId === itemId ? { ...entry, quantity: newQty } : entry))
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setIncomingItems((prev) => prev.filter((entry) => entry.itemId !== itemId));
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (incomingItems.length === 0) {
      setErrorMessage('Daftar barang masuk masih kosong. Silakan tambahkan minimal 1 barang.');
      return;
    }
    if (!receivedByOfficer.trim()) {
      setErrorMessage('Nama Petugas GA Penerima wajib diisi.');
      return;
    }

    const supplierStr = customOriginDetails.trim() 
      ? `${originType} (${customOriginDetails.trim()})`
      : originType;

    const now = new Date();
    const newTransaction: Transaction = {
      id: `trx-in-${Date.now()}`,
      type: 'IN',
      transactionNumber: generateTransactionNumber('IN'),
      date: now.toISOString(),
      dateFormatted: currentTimestamp.dateFormatted,
      timeFormatted: currentTimestamp.timeFormatted,
      supplier: supplierStr,
      poNumber: documentNumber.trim() || undefined,
      documentNumber: documentNumber.trim() || `SJ-GA-${Date.now().toString().slice(-6)}`,
      receivedByOfficer: receivedByOfficer.trim(),
      notes: notes.trim() || undefined,
      items: incomingItems.map((entry) => {
        const itm = items.find((i) => i.id === entry.itemId);
        return {
          itemId: entry.itemId,
          itemCode: entry.itemCode,
          itemName: entry.itemName,
          category: itm?.category || 'ATK (Alat Tulis Kantor)',
          unit: entry.unit,
          quantity: entry.quantity,
        };
      }),
    };

    onSubmitTransaction(newTransaction);
    setSuccessTrx(newTransaction);

    confetti({
      particleCount: 50,
      spread: 50,
      origin: { y: 0.6 },
    });

    // Reset Form
    setIncomingItems([]);
    setDocumentNumber('');
    setCustomOriginDetails('');
    setNotes('');
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-12">
      {/* Success Alert */}
      {successTrx && (
        <div className="bg-[#E8F5E9] border-2 border-[#66BB6A] p-4 rounded-2xl animate-in zoom-in-95 duration-150 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#66BB6A] text-white rounded-xl shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-[#1B5E20] text-sm sm:text-base">
                  Penerimaan Barang Berhasil Dicatat & Stok Telah Bertambah!
                </h4>
                <p className="text-xs text-slate-700 mt-0.5">
                  No. Bukti: <span className="font-mono font-bold text-slate-900">{successTrx.transactionNumber}</span> • Asal Barang: <span className="font-bold text-[#1B5E20] bg-white px-1.5 py-0.5 rounded border border-[#A5D6A7]">{successTrx.supplier}</span> • Penerima GA: <span className="font-semibold">{successTrx.receivedByOfficer}</span>
                </p>
                <div className="mt-1.5 text-xs text-[#1B5E20] bg-white/90 p-2 rounded-lg border border-[#A5D6A7]">
                  <span className="font-bold">Barang bertambah:</span>{' '}
                  {successTrx.items.map((i) => `+${i.quantity} ${i.unit} ${i.itemName}`).join(', ')}
                </div>
              </div>
            </div>
            <button
              onClick={() => setSuccessTrx(null)}
              className="text-xs font-bold px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg shrink-0 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-300 p-3 rounded-xl flex items-center gap-2.5 text-rose-900 text-xs font-medium">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <p className="flex-1">{errorMessage}</p>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 hover:text-rose-950 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmitForm} className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Header with automated timestamp */}
        <div className="bg-slate-900 text-white p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#66BB6A]/20 text-[#A5D6A7] rounded-lg border border-[#66BB6A]/30">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Formulir Penerimaan Barang Masuk</h3>
              <p className="text-[11px] text-slate-400">Pencatatan resmi barang pengadaan masuk ke sistem stok</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 px-3 py-1 rounded-xl text-xs">
            <div className="flex items-center gap-1 text-slate-300">
              <Calendar className="w-3 h-3 text-[#A5D6A7]" />
              <span>{currentTimestamp.dateFormatted}</span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1 text-amber-400 font-mono font-bold">
              <Clock className="w-3 h-3" />
              <span>{currentTimestamp.timeFormatted}</span>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-5">
          {/* 1. ASAL BARANG & PETUGAS PENERIMA (Requirement 6: Samarinda / Kotabangun buttons) */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-[#1B5E20]" />
              <span>1. Asal Barang & Petugas Penerima</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              {/* Petugas Penerima */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Petugas GA Penerima <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={receivedByOfficer}
                  onChange={(e) => setReceivedByOfficer(e.target.value)}
                  placeholder="Nama petugas GA..."
                  className="w-full h-10 px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#66BB6A] font-medium"
                />
              </div>

              {/* Asal Barang Toggle Buttons (Samarinda / Kotabangun) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#1B5E20]" />
                  <span>Pilihan Asal Barang <span className="text-rose-500">*</span></span>
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 h-10 items-center">
                  <button
                    type="button"
                    onClick={() => setOriginType('Samarinda')}
                    className={`h-full px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                      originType === 'Samarinda'
                        ? 'bg-[#1B5E20] text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    📍 Samarinda
                  </button>
                  <button
                    type="button"
                    onClick={() => setOriginType('Kota Bangun')}
                    className={`h-full px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                      originType === 'Kota Bangun'
                        ? 'bg-[#1B5E20] text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    📍 Kotabangun
                  </button>
                </div>
              </div>

              {/* No PO / Surat Jalan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor PO / Surat Jalan (Opsional)
                </label>
                <input
                  type="text"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="Contoh: SJ-2026-0881"
                  className="w-full h-10 px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#66BB6A] font-mono"
                />
              </div>
            </div>
          </div>

          {/* 2. DAFTAR BARANG YANG DITERIMA */}
          <div className="border-t border-slate-200/80 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5 flex items-center gap-2">
              <Package className="w-3.5 h-3.5 text-[#1B5E20]" />
              <span>2. Tambah Barang yang Masuk ke Gudang</span>
            </h4>

            {/* Quick Add Bar - Unified Searchable Combobox */}
            <div className="bg-[#E8F5E9]/60 p-3.5 rounded-xl border border-[#A5D6A7] mb-3 space-y-2.5">
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-end">
                {/* Unified Searchable Combobox */}
                <div className="flex-1 relative" ref={itemDropdownRef}>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Pilih Barang dari Master Stock ({filteredStockItems.length} barang):</span>
                    <span className="text-[#1B5E20] text-[10px] font-bold">(Ketik langsung di kolom untuk filter)</span>
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={itemSearchKeyword}
                      onFocus={() => setIsItemDropdownOpen(true)}
                      onChange={(e) => {
                        setItemSearchKeyword(e.target.value);
                        setSelectedItemId('');
                        setIsItemDropdownOpen(true);
                      }}
                      placeholder={`-- Pilih dari Master Stock (${items.length} Barang) / Ketik untuk Mencari --`}
                      className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#66BB6A] font-bold text-slate-800"
                    />
                    {itemSearchKeyword ? (
                      <button
                        type="button"
                        onClick={() => {
                          setItemSearchKeyword('');
                          setSelectedItemId('');
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1"
                      >
                        ✕
                      </button>
                    ) : (
                      <ChevronDown 
                        onClick={() => setIsItemDropdownOpen(!isItemDropdownOpen)}
                        className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer" 
                      />
                    )}
                  </div>

                  {/* Dropdown Results Menu */}
                  {isItemDropdownOpen && (
                    <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in-50 duration-100">
                      {filteredStockItems.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-500">
                          Tidak ada barang yang cocok dengan &quot;{itemSearchKeyword}&quot;
                        </div>
                      ) : (
                        filteredStockItems.map((itm) => {
                          const isSelected = itm.id === selectedItemId;
                          return (
                            <button
                              key={itm.id}
                              type="button"
                              onClick={() => handleSelectItem(itm)}
                              className={`w-full text-left p-2.5 hover:bg-[#E8F5E9] flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                isSelected ? 'bg-[#E8F5E9] font-bold' : ''
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="font-bold text-slate-900 truncate">
                                  <span className="font-mono text-[#1B5E20] mr-1.5">[{itm.code}]</span>
                                  {itm.name}
                                </div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                                  <span>{itm.category}</span>
                                  <span>•</span>
                                  <span>Lokasi: {itm.rackLocation && itm.rackLocation.toLowerCase().includes('kayu') ? 'Gudang Kayu' : 'Gudang GA'}</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0 flex items-center gap-2">
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-800">
                                  Stok: {itm.currentStock} {itm.unit}
                                </span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-[#1B5E20]" />}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                <div className="w-full sm:w-28 shrink-0">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Jumlah Masuk:
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={tempQty}
                    onChange={(e) => {
                      const cleanVal = e.target.value.replace(/[^0-9]/g, '');
                      setTempQty(cleanVal);
                    }}
                    placeholder="Contoh: 10"
                    className="w-full px-2.5 py-2 text-xs text-center font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#66BB6A] text-slate-900 placeholder:text-slate-400"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddItem}
                  disabled={!selectedItemId}
                  className="w-full sm:w-auto px-4 py-2 bg-[#1B5E20] hover:bg-[#66BB6A] disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4 text-[#A5D6A7]" />
                  <span>+ Tambah ke List</span>
                </button>
              </div>
            </div>

            {/* Responsive Incoming Items (NO HORIZONTAL SCROLL ON MOBILE - Requirement 7) */}
            {incomingItems.length === 0 ? (
              <div className="border border-dashed border-slate-300 rounded-xl p-5 text-center bg-slate-50/50">
                <Package className="w-7 h-7 text-slate-400 mx-auto mb-1" />
                <p className="text-xs font-bold text-slate-700">Belum ada barang masuk dalam daftar</p>
                <p className="text-[11px] text-slate-500">
                  Pilih barang dari dropdown di atas dan masukkan jumlah yang diterima.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Mobile View: Stacked Full-Width Cards (Zero Horizontal Scroll) */}
                <div className="block sm:hidden space-y-2">
                  {incomingItems.map((entry) => (
                    <div key={entry.itemId} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="font-mono text-[10px] font-bold text-[#1B5E20] bg-[#E8F5E9] px-1.5 py-0.5 rounded">
                          {entry.itemCode}
                        </span>
                        <h5 className="font-bold text-xs text-slate-900 truncate mt-0.5">{entry.itemName}</h5>
                        <p className="text-[11px] text-slate-500">
                          Awal: {entry.currentStock} → <b className="text-[#1B5E20]">Akhir: {entry.currentStock + entry.quantity} {entry.unit}</b>
                        </p>
                      </div>

                      {/* Quantity Stepper & Remove */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(entry.itemId, entry.quantity - 1)}
                            className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded text-slate-800 font-bold text-xs flex items-center justify-center"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-bold text-xs text-[#1B5E20]">
                            +{entry.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(entry.itemId, entry.quantity + 1)}
                            className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded text-slate-800 font-bold text-xs flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(entry.itemId)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tablet / Desktop Table View */}
                <div className="hidden sm:block overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Kode SKU</th>
                        <th className="py-2.5 px-3">Nama Barang</th>
                        <th className="py-2.5 px-3 text-center">Stok Awal</th>
                        <th className="py-2.5 px-3 text-center w-36">Jumlah Masuk</th>
                        <th className="py-2.5 px-3 text-center">Stok Akhir</th>
                        <th className="py-2.5 px-3 text-center">Satuan</th>
                        <th className="py-2.5 px-3 text-center w-16">Hapus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {incomingItems.map((entry) => (
                        <tr key={entry.itemId} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2 px-3 font-mono font-bold text-[#1B5E20]">
                            {entry.itemCode}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-800">
                            {entry.itemName}
                          </td>
                          <td className="py-2 px-3 text-center text-slate-600">
                            {entry.currentStock} {entry.unit}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(entry.itemId, entry.quantity - 1)}
                                className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded font-bold text-slate-700 flex items-center justify-center"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={entry.quantity}
                                onChange={(e) =>
                                  handleUpdateQuantity(entry.itemId, parseInt(e.target.value) || 1)
                                }
                                className="w-12 py-0.5 text-center font-bold text-xs bg-[#E8F5E9] text-[#1B5E20] border border-[#A5D6A7] rounded"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(entry.itemId, entry.quantity + 1)}
                                className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded font-bold text-slate-700 flex items-center justify-center"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="px-2 py-0.5 bg-[#E8F5E9] text-[#1B5E20] rounded-md font-bold">
                              {entry.currentStock + entry.quantity} {entry.unit}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center text-slate-600">
                            {entry.unit}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(entry.itemId)}
                              className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* 3. CATATAN & KETERANGAN */}
          <div className="border-t border-slate-200/80 pt-4">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Catatan Pengadaan / Keterangan Kondisi Barang (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Kondisi barang baru, kemasan baik dan tersegel"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#66BB6A]"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="bg-slate-50 px-5 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            * Transaksi ini akan otomatis menambah stok fisik barang di gudang.
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                setIncomingItems([]);
                setDocumentNumber('');
                setNotes('');
              }}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={incomingItems.length === 0 || !receivedByOfficer.trim() || !canReceive}
              className="px-5 py-2 bg-[#1B5E20] hover:bg-[#66BB6A] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-[#A5D6A7]" />
              <span>Simpan Penerimaan Barang</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
