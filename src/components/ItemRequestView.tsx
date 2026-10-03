import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Trash2, 
  Plus, 
  Clock, 
  Calendar, 
  User, 
  Building2, 
  FileText, 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  ArrowUpRight, 
  Users, 
  ChevronDown, 
  UserCheck,
  ShieldCheck,
  Check,
  X,
  Printer,
  FileCheck2,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  Clock3,
  PackageCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Item, Transaction, RequestItemEntry, Employee, UserAccount, RequestStatus, UserRole, UserPermissions } from '../types';
import { DEPARTMENTS, DEFAULT_ROLE_PERMISSIONS } from '../data/initialData';
import { 
  formatIndonesianDateTime, 
  generateTransactionNumber, 
  playScanBeep 
} from '../utils/helpers';

interface ItemRequestViewProps {
  items: Item[];
  transactions: Transaction[];
  employees?: Employee[];
  currentUser: UserAccount;
  rolePermissions?: Record<UserRole, UserPermissions>;
  initialSelectedItem?: Item | null;
  onClearInitialItem?: () => void;
  onOpenScanner?: () => void;
  onOpenEmployeeModal?: () => void;
  onSubmitTransaction: (trx: Transaction) => void;
  onApproveRequest?: (trxId: string, notes?: string) => void;
  onRejectRequest?: (trxId: string, notes?: string) => void;
  onDispatchApprovedRequest?: (trxId: string) => void;
  onNavigateToStock: () => void;
}

export const ItemRequestView: React.FC<ItemRequestViewProps> = ({
  items,
  transactions,
  employees = [],
  currentUser,
  rolePermissions,
  initialSelectedItem,
  onClearInitialItem,
  onOpenScanner,
  onOpenEmployeeModal,
  onSubmitTransaction,
  onApproveRequest,
  onRejectRequest,
  onDispatchApprovedRequest,
  onNavigateToStock,
}) => {
  // Determine dynamic permissions based on active role matrix
  const currentPerms = (rolePermissions && rolePermissions[currentUser.role]) || currentUser.permissions || DEFAULT_ROLE_PERMISSIONS[currentUser.role] || DEFAULT_ROLE_PERMISSIONS.USER_OPERATIONAL;
  const canCreate = currentPerms.canCreateRequests ?? true;
  const canApprove = currentPerms.canApproveRequests ?? (currentUser.role === 'MASTER_ADMIN' || currentUser.role === 'ADMIN');
  const canDispatch = currentPerms.canDispatchGoods ?? (currentUser.role === 'MASTER_ADMIN' || currentUser.role === 'ADMIN' || currentUser.role === 'USER_OPERATIONAL');
  // Form fields
  const [requesterName, setRequesterName] = useState('');
  const [requesterPosition, setRequesterPosition] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [purposeDescription, setPurposeDescription] = useState('');
  const [notes, setNotes] = useState('');

  // Employee dropdown state
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const employeeDropdownRef = useRef<HTMLDivElement>(null);

  // Requested items list
  const [requestedItems, setRequestedItems] = useState<RequestItemEntry[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [tempQty, setTempQty] = useState<string>('');
  const [itemSearchKeyword, setItemSearchKeyword] = useState('');
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState(false);
  const itemDropdownRef = useRef<HTMLDivElement>(null);

  // Timestamp
  const [currentTimestamp, setCurrentTimestamp] = useState(formatIndonesianDateTime(new Date()));

  // Feedback states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successTrx, setSuccessTrx] = useState<Transaction | null>(null);

  // Quick Approval modal state (for Admin/Master Admin)
  const [actionTrx, setActionTrx] = useState<{ trx: Transaction; action: 'APPROVE' | 'REJECT' } | null>(null);
  const [actionNotes, setActionNotes] = useState('');

  // Filter for Section 3 verification list
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED_PENDING_DISPATCH' | 'COMPLETED'>('ALL');
  const [verificationSearch, setVerificationSearch] = useState('');
  const [verificationDate, setVerificationDate] = useState<string>(() => new Date().toISOString().substring(0, 10));

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(event.target as Node)) {
        setIsEmployeeDropdownOpen(false);
      }
      if (itemDropdownRef.current && !itemDropdownRef.current.contains(event.target as Node)) {
        setIsItemDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update real-time clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimestamp(formatIndonesianDateTime(new Date()));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle scanned item passed via props
  useEffect(() => {
    if (initialSelectedItem) {
      addItemToRequest(initialSelectedItem, 1);
      if (onClearInitialItem) {
        onClearInitialItem();
      }
    }
  }, [initialSelectedItem]);

  const handleSelectEmployee = (emp: Employee) => {
    setRequesterName(emp.name);
    setRequesterPosition(emp.position);
    if (emp.department && DEPARTMENTS.includes(emp.department as any)) {
      setDepartment(emp.department as any);
    }
    setEmployeeSearch('');
    setIsEmployeeDropdownOpen(false);
  };

  const filteredEmployeesList = employees.filter((emp) => {
    const term = employeeSearch.toLowerCase();
    return (
      emp.name.toLowerCase().includes(term) ||
      emp.position.toLowerCase().includes(term) ||
      (emp.department && emp.department.toLowerCase().includes(term))
    );
  });

  // Filter stock items by search keyword in selector
  const filteredStockItems = items.filter((itm) => {
    const term = itemSearchKeyword.toLowerCase();
    return (
      itm.name.toLowerCase().includes(term) ||
      itm.code.toLowerCase().includes(term) ||
      itm.rackLocation.toLowerCase().includes(term)
    );
  });

  const addItemToRequest = (item: Item, quantity: number = 1) => {
    setErrorMessage(null);
    if (item.currentStock <= 0) {
      setErrorMessage(`Stok untuk "${item.name}" saat ini habis (0 ${item.unit}).`);
      playScanBeep(false);
      return;
    }

    setRequestedItems((prev) => {
      const existingIndex = prev.findIndex((entry) => entry.itemId === item.id);
      if (existingIndex > -1) {
        const newQty = prev[existingIndex].quantity + quantity;
        if (newQty > item.currentStock) {
          setErrorMessage(`Jumlah permintaan melebihi stok yang tersedia (${item.currentStock} ${item.unit})`);
          return prev;
        }
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], quantity: newQty };
        return updated;
      } else {
        const initialQty = Math.min(quantity, item.currentStock);
        return [
          ...prev,
          {
            itemId: item.id,
            itemCode: item.code,
            itemName: item.name,
            unit: item.unit,
            quantity: initialQty,
            currentStock: item.currentStock,
          },
        ];
      }
    });
  };

  const handleManualAddFromDropdown = () => {
    if (!selectedItemId) {
      setErrorMessage('Pilih barang terlebih dahulu');
      return;
    }
    const item = items.find((i) => i.id === selectedItemId);
    if (item) {
      const parsedQty = parseInt(tempQty.trim(), 10);
      if (!tempQty.trim() || isNaN(parsedQty) || parsedQty <= 0) {
        setErrorMessage('Silakan ketik jumlah permintaan yang valid (minimal 1)');
        return;
      }
      if (parsedQty > item.currentStock) {
        setErrorMessage(`Jumlah (${parsedQty}) melebihi stok tersedia (${item.currentStock} ${item.unit})`);
        return;
      }
      addItemToRequest(item, parsedQty);
      setSelectedItemId('');
      setTempQty('');
    }
  };

  const handleUpdateQuantity = (itemId: string, newQty: number) => {
    setErrorMessage(null);
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    if (newQty <= 0) {
      handleRemoveItem(itemId);
      return;
    }

    if (newQty > item.currentStock) {
      setErrorMessage(`Jumlah untuk "${item.name}" tidak boleh melebihi stok (${item.currentStock} ${item.unit})`);
      return;
    }

    setRequestedItems((prev) =>
      prev.map((entry) => (entry.itemId === itemId ? { ...entry, quantity: newQty } : entry))
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setRequestedItems((prev) => prev.filter((entry) => entry.itemId !== itemId));
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!requesterName.trim()) {
      setErrorMessage('Nama Petugas / Peminta Barang wajib diisi.');
      return;
    }
    if (requestedItems.length === 0) {
      setErrorMessage('Daftar barang permintaan masih kosong. Silakan pilih barang terlebih dahulu.');
      return;
    }
    if (!purposeDescription.trim()) {
      setErrorMessage('Keterangan Keperluan pengambilan barang wajib diisi.');
      return;
    }

    for (const req of requestedItems) {
      const liveItem = items.find((i) => i.id === req.itemId);
      if (!liveItem || liveItem.currentStock < req.quantity) {
        setErrorMessage(`Stok barang "${req.itemName}" tidak mencukupi saat proses pengajuan.`);
        return;
      }
    }

    const now = new Date();
    const newTransaction: Transaction = {
      id: `trx-out-${Date.now()}`,
      type: 'OUT',
      transactionNumber: generateTransactionNumber('OUT'),
      date: now.toISOString(),
      dateFormatted: currentTimestamp.dateFormatted,
      timeFormatted: currentTimestamp.timeFormatted,
      requesterName: requesterName.trim(),
      requesterPosition: requesterPosition.trim() || undefined,
      department: department,
      purposeDescription: purposeDescription.trim(),
      notes: notes.trim() || undefined,
      status: 'PENDING',
      items: requestedItems.map((req) => {
        const itm = items.find((i) => i.id === req.itemId);
        return {
          itemId: req.itemId,
          itemCode: req.itemCode,
          itemName: req.itemName,
          category: itm ? itm.category : 'ATK (Alat Tulis Kantor)',
          unit: req.unit,
          quantity: req.quantity,
        };
      }),
    };

    onSubmitTransaction(newTransaction);
    setSuccessTrx(newTransaction);
    playScanBeep(true);

    try {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.6 },
      });
    } catch {
      // safe
    }

    // Reset Form
    setRequestedItems([]);
    setRequesterName('');
    setRequesterPosition('');
    setPurposeDescription('');
    setNotes('');
  };

  const outTransactionsList = transactions
    .filter((t) => t.type === 'OUT')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredRecentRequests = outTransactionsList.filter((t) => {
    const trxDateStr = t.date ? t.date.substring(0, 10) : '';
    const matchesDate = !verificationDate || trxDateStr === verificationDate || t.date === verificationDate || t.dateFormatted === verificationDate;

    const term = verificationSearch.toLowerCase();
    const matchesSearch =
      t.transactionNumber.toLowerCase().includes(term) ||
      (t.requesterName && t.requesterName.toLowerCase().includes(term)) ||
      (t.department && t.department.toLowerCase().includes(term)) ||
      (t.purposeDescription && t.purposeDescription.toLowerCase().includes(term)) ||
      (t.items || []).some((i) => i.itemName.toLowerCase().includes(term));

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PENDING' && t.status === 'PENDING') ||
      (statusFilter === 'APPROVED_PENDING_DISPATCH' && t.status === 'APPROVED') ||
      (statusFilter === 'COMPLETED' && t.status === 'COMPLETED');

    return matchesDate && matchesSearch && matchesStatus;
  });

  const handleExecuteApproval = () => {
    if (!actionTrx) return;
    if (actionTrx.action === 'APPROVE' && onApproveRequest) {
      onApproveRequest(actionTrx.trx.id, actionNotes.trim() || undefined);
    } else if (actionTrx.action === 'REJECT' && onRejectRequest) {
      onRejectRequest(actionTrx.trx.id, actionNotes.trim() || undefined);
    }
    setActionTrx(null);
    setActionNotes('');
  };

  const latestSuccessTrx = successTrx
    ? transactions.find((t) => t.id === successTrx.id) || successTrx
    : null;
  const isSuccessTrxApproved =
    latestSuccessTrx?.status === 'APPROVED' || latestSuccessTrx?.status === 'COMPLETED';

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-12">
      {/* Success Notification Alert */}
      {latestSuccessTrx && (
        <div className={`p-3 rounded-xl border animate-in zoom-in-95 duration-150 shadow-xs ${
          isSuccessTrxApproved
            ? 'bg-emerald-50 border-emerald-300'
            : 'bg-amber-50/90 border-amber-300'
        }`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`p-1.5 rounded-lg shrink-0 ${
                isSuccessTrxApproved ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-slate-950'
              }`}>
                {isSuccessTrxApproved ? <CheckCircle2 className="w-4 h-4" /> : <Clock3 className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-slate-900 text-xs truncate">
                    Pengajuan: <span className="font-mono font-bold">{latestSuccessTrx.transactionNumber}</span>
                  </h4>
                  <span className="text-[11px] text-slate-600 truncate">
                    ({latestSuccessTrx.requesterName} - {latestSuccessTrx.department})
                  </span>
                  {isSuccessTrxApproved ? (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-extrabold flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-700 stroke-[3]" />
                      <span>Sudah Diapprove ({latestSuccessTrx.approvalInfo?.approvedBy || 'Admin'})</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 border border-rose-300 text-rose-800 text-[10px] font-extrabold flex items-center gap-1">
                      <Clock3 className="w-3 h-3 text-rose-700" />
                      <span>Belum Diapprove</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                  Barang: {latestSuccessTrx.items.map((i) => `${i.itemName} (${i.quantity} ${i.unit})`).join(', ')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSuccessTrx(null)}
              className="text-[11px] font-bold px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg shrink-0 cursor-pointer shadow-2xs"
            >
              ✕ Tutup
            </button>
          </div>
        </div>
      )}

      {/* Main Request Creation Form */}
      <form onSubmit={handleSubmitForm} className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Form Header with Clock */}
        <div className="bg-slate-900 text-white p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#66BB6A]/20 text-[#A5D6A7] rounded-lg border border-[#66BB6A]/30">
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Form Pengambilan Barang GA</h3>
              <p className="text-[11px] text-slate-400">Isi data pemohon dan daftar barang yang dibutuhkan</p>
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
          {/* 1. DATA PEMOHON & KEPERLUAN */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-[#1B5E20]" />
                <span>1. Data Pemohon & Keperluan</span>
              </h4>

              {employees.length > 0 && (
                <button
                  type="button"
                  onClick={onOpenEmployeeModal}
                  className="text-xs font-bold text-[#1B5E20] hover:text-[#66BB6A] flex items-center gap-1 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Personil GA ({employees.length})</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Peminta with Quick Search Autocomplete */}
              <div className="relative" ref={employeeDropdownRef}>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Peminta / Petugas <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={requesterName}
                    onChange={(e) => {
                      setRequesterName(e.target.value);
                      setEmployeeSearch(e.target.value);
                      setIsEmployeeDropdownOpen(true);
                    }}
                    onFocus={() => setIsEmployeeDropdownOpen(true)}
                    placeholder="Ketik nama staf..."
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#66BB6A] font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {isEmployeeDropdownOpen && filteredEmployeesList.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-60 overflow-y-auto divide-y divide-slate-100">
                    {filteredEmployeesList.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => handleSelectEmployee(emp)}
                        className="w-full p-2.5 text-left hover:bg-[#E8F5E9] flex items-center justify-between text-xs cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{emp.name}</div>
                          <div className="text-[10px] text-slate-500">{emp.position} • {emp.department}</div>
                        </div>
                        <UserCheck className="w-3.5 h-3.5 text-[#66BB6A]" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Jabatan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jabatan / Posisi
                </label>
                <input
                  type="text"
                  value={requesterPosition}
                  onChange={(e) => setRequesterPosition(e.target.value)}
                  placeholder="Contoh: Staff GA / SPV"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#66BB6A]"
                />
              </div>

              {/* Departemen */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Departemen / Divisi <span className="text-rose-500">*</span>
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs sm:text-sm font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#66BB6A]"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Keperluan */}
            <div className="mt-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Keterangan Keperluan Pengambilan Barang <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={purposeDescription}
                onChange={(e) => setPurposeDescription(e.target.value)}
                placeholder="Contoh: Perlengkapan ATK operasional dan kebersihan kantor"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#66BB6A]"
              />
            </div>
          </div>

          {/* 2. PILIH BARANG YANG DIMINTA */}
          <div className="border-t border-slate-200/80 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5 flex items-center gap-2">
              <Package className="w-3.5 h-3.5 text-[#1B5E20]" />
              <span>2. Pilih Barang yang Diminta</span>
            </h4>

            {/* Searchable Picker & Quick Add Bar - Unified Combobox */}
            <div className="bg-[#E8F5E9]/60 p-3 rounded-xl border border-[#A5D6A7] mb-3 space-y-2.5">
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                {/* Unified Searchable Combobox */}
                <div className="flex-1 relative" ref={itemDropdownRef}>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Pilih dari Master Stok ({filteredStockItems.length} barang):</span>
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
                      placeholder={`-- Pilih dari Master Stok (${items.length} Barang) / Ketik untuk Mencari --`}
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
                          const isOutOfStock = itm.currentStock <= 0;
                          return (
                            <button
                              key={itm.id}
                              type="button"
                              disabled={isOutOfStock}
                              onClick={() => {
                                setSelectedItemId(itm.id);
                                setItemSearchKeyword(`${itm.code} - ${itm.name}`);
                                setIsItemDropdownOpen(false);
                              }}
                              className={`w-full text-left p-2.5 hover:bg-[#E8F5E9] disabled:opacity-50 disabled:bg-slate-50 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                isSelected ? 'bg-[#E8F5E9] font-bold' : ''
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="font-bold text-slate-900 truncate flex items-center gap-1">
                                  <span className="font-mono text-[#1B5E20]">[{itm.code}]</span>
                                  <span>{itm.name}</span>
                                  {isOutOfStock && (
                                    <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded">
                                      Habis
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                                  <span>{itm.category}</span>
                                  <span>•</span>
                                  <span>Lokasi: {itm.rackLocation && itm.rackLocation.toLowerCase().includes('kayu') ? 'Gudang Kayu' : 'Gudang GA'}</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0 flex items-center gap-2">
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                                  isOutOfStock ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-800'
                                }`}>
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

                <div className="w-full sm:w-24 shrink-0">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Jumlah:
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
                    placeholder="Contoh: 1"
                    className="w-full px-2.5 py-2 text-xs text-center font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#66BB6A] text-slate-900 placeholder:text-slate-400"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleManualAddFromDropdown}
                  disabled={!selectedItemId}
                  className="w-full sm:w-auto px-4 py-2 bg-[#66BB6A] hover:bg-[#1B5E20] disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah ke List</span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-2.5 mb-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Responsive Items List (NO HORIZONTAL SCROLL ON MOBILE) */}
            {requestedItems.length === 0 ? (
              <div className="border border-dashed border-slate-300 rounded-xl p-5 text-center bg-slate-50/50">
                <Package className="w-7 h-7 text-slate-400 mx-auto mb-1" />
                <p className="text-xs font-bold text-slate-700">Daftar barang permintaan masih kosong</p>
                <p className="text-[11px] text-slate-500">
                  Pilih barang dari dropdown di atas untuk memasukkan barang ke daftar pengajuan.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Mobile View: Stacked Full-Width Cards (Zero Horizontal Scroll) */}
                <div className="block sm:hidden space-y-2">
                  {requestedItems.map((entry) => (
                    <div key={entry.itemId} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="font-mono text-[10px] font-bold text-[#1B5E20] bg-[#E8F5E9] px-1.5 py-0.5 rounded">
                          {entry.itemCode}
                        </span>
                        <h5 className="font-bold text-xs text-slate-900 truncate mt-0.5">{entry.itemName}</h5>
                        <p className="text-[11px] text-slate-500">Stok: {entry.currentStock} {entry.unit}</p>
                      </div>

                      {/* Stepper & Delete */}
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
                            {entry.quantity}
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
                        <th className="py-2.5 px-3 text-center">Stok Tersedia</th>
                        <th className="py-2.5 px-3 text-center w-36">Jumlah Permintaan</th>
                        <th className="py-2.5 px-3 text-center">Satuan</th>
                        <th className="py-2.5 px-3 text-center w-16">Hapus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {requestedItems.map((entry) => (
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
                                max={entry.currentStock}
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

          {/* 3. VERIFIKASI APPROVAL (PEMBERITAHUAN SUDAH DIAPPROVE, BELUM DISERAHKAN BARANG & BELUM DIAPPROVE) */}
          <div className="border-t border-slate-200/80 pt-4 space-y-3">
            {/* Counts for Section 3 */}
            {(() => {
              const requestsOnDate = outTransactionsList.filter((t) => {
                const trxDateStr = t.date ? t.date.substring(0, 10) : '';
                return !verificationDate || trxDateStr === verificationDate || t.date === verificationDate || t.dateFormatted === verificationDate;
              });
              const pendingCount = requestsOnDate.filter((t) => t.status === 'PENDING').length;
              const pendingDispatchCount = requestsOnDate.filter((t) => t.status === 'APPROVED').length;
              const completedCount = requestsOnDate.filter((t) => t.status === 'COMPLETED').length;

              return (
                <>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                        <FileCheck2 className="w-3.5 h-3.5 text-[#1B5E20]" />
                        <span>3. Status Verifikasi Approval & Serah Terima Barang</span>
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-slate-600 font-medium flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#1B5E20]" />
                          <span>Tanggal:</span>
                        </span>
                        <input
                          type="date"
                          value={verificationDate}
                          onChange={(e) => setVerificationDate(e.target.value)}
                          className="text-xs font-bold px-2 py-0.5 border border-slate-300 rounded-lg bg-white text-slate-800"
                        />
                      </div>
                    </div>

                    {/* 4 Status Tabs */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold flex-wrap">
                      <button
                        type="button"
                        onClick={() => setStatusFilter('ALL')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Semua ({requestsOnDate.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('PENDING')}
                        className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                          statusFilter === 'PENDING' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-rose-700'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                        <span>Belum Diapprove ({pendingCount})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('APPROVED_PENDING_DISPATCH')}
                        className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                          statusFilter === 'APPROVED_PENDING_DISPATCH' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-700 hover:text-amber-800'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <span>Belum Diserahkan ({pendingDispatchCount})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('COMPLETED')}
                        className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                          statusFilter === 'COMPLETED' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:text-emerald-700'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>Selesai Diserahkan ({completedCount})</span>
                      </button>
                    </div>
                  </div>

                  {/* Prominent Notification Banner for Approved Goods Not Yet Dispatched */}
                  {pendingDispatchCount > 0 && (
                    <div className="p-3.5 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-300 rounded-xl text-xs text-amber-950 flex items-start gap-3 shadow-xs animate-in fade-in duration-200">
                      <div className="p-2 bg-amber-200 text-amber-900 rounded-lg shrink-0 mt-0.5 border border-amber-300 shadow-2xs">
                        <PackageCheck className="w-5 h-5 text-amber-800" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-amber-950 text-xs tracking-wide">
                            PEMBERITAHUAN BARANG BELUM DISERAHKAN ({pendingDispatchCount} PENGAJUAN)
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-600 text-white animate-pulse shadow-2xs">
                            Menunggu Serah Terima Fisik
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                          Terdapat <b>{pendingDispatchCount} permintaan barang</b> yang telah berstatus <b>APPROVED</b> tetapi <b>fisik barang belum diserahterimakan</b> kepada pemohon. Klik tombol <b>"Serah Terima Fisik"</b> di bawah untuk menyerahkan barang dan mencatat transaksi resmi.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* General Verification Notice Card */}
                  <div className="p-3 bg-[#E8F5E9] border border-[#A5D6A7] rounded-xl text-xs text-[#1B5E20] flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-[#66BB6A] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Alur Status Verifikasi Approval:</span>
                      <p className="text-[11px] text-slate-700 mt-0.5">
                        1. <b>Belum Diapprove (PENDING)</b>: Menunggu persetujuan Admin/Supervisor. <br />
                        2. <b>Belum Diserahkan (APPROVED)</b>: Sudah disetujui, siap diserahterimakan fisiknya. <br />
                        3. <b>Selesai (COMPLETED)</b>: Barang fisik telah resmi diserahkan ke petugas pemohon.
                      </p>
                    </div>
                  </div>
                </>
              );
            })()}

            {/* List of Requests & Verification Status Cards (Full width on mobile, no horizontal scroll) */}
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-0.5">
              {filteredRecentRequests.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200">
                  Tidak ada data permintaan pada status ini.
                </div>
              ) : (
                filteredRecentRequests.map((trx) => {
                  const isPending = trx.status === 'PENDING';
                  const isApprovedPendingDispatch = trx.status === 'APPROVED';
                  const isCompleted = trx.status === 'COMPLETED';

                  return (
                    <div
                      key={trx.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs ${
                        isPending
                          ? 'bg-rose-50/70 border-rose-200'
                          : isApprovedPendingDispatch
                          ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-400/30'
                          : 'bg-white border-[#A5D6A7]'
                      }`}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-[11px] text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                            {trx.transactionNumber}
                          </span>
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {trx.requesterName} ({trx.department})
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            • {trx.dateFormatted} {trx.timeFormatted}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-600 line-clamp-1">
                          <span className="font-semibold text-slate-700">Keperluan:</span> {trx.purposeDescription || '-'}
                        </p>

                        <div className="text-[11px] text-slate-700 font-mono bg-white/70 px-2 py-1 rounded border border-slate-200/60 inline-block">
                          Barang: {(trx.items || []).map((i) => `${i.itemName} (${i.quantity} ${i.unit})`).join(', ')}
                        </div>
                      </div>

                      {/* Status Notification & Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                        {isPending && (
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-lg bg-rose-100 border border-rose-300 text-rose-800 text-xs font-extrabold flex items-center gap-1 shadow-2xs">
                              <Clock3 className="w-3.5 h-3.5 text-rose-600" />
                              <span>Belum Diapprove</span>
                            </span>

                            {canApprove && (
                              <button
                                type="button"
                                onClick={() => setActionTrx({ trx, action: 'APPROVE' })}
                                className="px-3 py-1 bg-[#66BB6A] hover:bg-[#1B5E20] text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                            )}
                          </div>
                        )}

                        {isApprovedPendingDispatch && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-1 rounded-lg bg-amber-100 border-2 border-amber-400 text-amber-950 text-xs font-black flex items-center gap-1.5 shadow-2xs animate-pulse">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                              <span>Belum Diserahkan Barang</span>
                            </span>

                            {onDispatchApprovedRequest && canDispatch && (
                              <button
                                type="button"
                                onClick={() => onDispatchApprovedRequest(trx.id)}
                                className="px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-white text-xs font-black rounded-lg shadow-sm cursor-pointer flex items-center gap-1.5 transition-all"
                              >
                                <PackageCheck className="w-3.5 h-3.5 text-amber-200" />
                                <span>Serah Terima Fisik</span>
                              </button>
                            )}
                          </div>
                        )}

                        {isCompleted && (
                          <span className="px-2.5 py-1 rounded-lg bg-[#E8F5E9] border border-[#66BB6A] text-[#1B5E20] text-xs font-extrabold flex items-center gap-1 shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#66BB6A]" />
                            <span>Sudah Diserahkan Fisik</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 px-5">
          <span className="text-xs text-slate-500">
            Total <b>{requestedItems.length}</b> jenis barang dalam form pengajuan ini.
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="submit"
              disabled={requestedItems.length === 0}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#1B5E20] hover:bg-[#66BB6A] disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4 text-[#A5D6A7]" />
              <span>Kirim Pengajuan Permintaan</span>
            </button>
          </div>
        </div>
      </form>

      {/* Approval Confirmation Modal */}
      {actionTrx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                {actionTrx.action === 'APPROVE' ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-[#66BB6A]" />
                    <span>Verifikasi Persetujuan (Approve)</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-rose-600" />
                    <span>Penolakan Permintaan</span>
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setActionTrx(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div>No. Bukti: <strong className="font-mono">{actionTrx.trx.transactionNumber}</strong></div>
              <div>Pemohon: <strong>{actionTrx.trx.requesterName}</strong> ({actionTrx.trx.department})</div>
              <div>Barang: <strong>{(actionTrx.trx.items || []).map((i) => `${i.itemName} (${i.quantity} ${i.unit})`).join(', ')}</strong></div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Catatan Verifikasi (Opsional):
              </label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Catatan approval..."
                rows={2}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#66BB6A]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActionTrx(null)}
                className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteApproval}
                className={`px-4 py-1.5 text-xs font-bold text-white rounded-xl shadow-sm ${
                  actionTrx.action === 'APPROVE'
                    ? 'bg-[#1B5E20] hover:bg-[#66BB6A]'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {actionTrx.action === 'APPROVE' ? 'Ya, Approve Permintaan' : 'Ya, Tolak Permintaan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
