import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Package, 
  Search, 
  Filter, 
  Plus, 
  PlusCircle, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Printer,
  FileSpreadsheet,
  ArrowUpDown,
  MapPin,
  Upload,
  Download,
  RotateCcw,
  ShieldAlert,
  Crown,
  Building2,
  Sparkles,
  Zap,
  ArrowUpRight,
  RefreshCw,
  FolderKanban,
  Tag
} from 'lucide-react';
import { Item, Category, UserAccount, UserRole, UserPermissions } from '../types';
import { CATEGORIES, UNITS } from '../data/initialData';
import { BarcodeRenderer } from './BarcodeRenderer';
import { detectCategoryFromName, generateCategorySKU } from '../utils/helpers';
import { ImportExportModal } from './ImportExportModal';
import { ConfirmationModal } from './ConfirmationModal';
import { CategoryManagementModal } from './CategoryManagementModal';
import { 
  getConnectedSpreadsheetConfig, 
  syncStockToGoogleSheets, 
  getGoogleAccessToken, 
  signInWithGoogleSheets,
  ConnectedSpreadsheetConfig 
} from '../utils/googleSheetsService';

const WAREHOUSE_LOCATIONS = ['Gudang GA', 'Gudang Kayu'] as const;

interface ItemMasterViewProps {
  items: Item[];
  categories?: string[];
  currentUser: UserAccount;
  rolePermissions?: Record<UserRole, UserPermissions>;
  onAddItem: (newItem: Item) => void;
  onBulkAddItems?: (newItems: Item[], mode: 'append' | 'replace') => void;
  onUpdateItem: (updatedItem: Item) => void;
  onDeleteItem: (itemId: string) => void;
  onClearAllStock?: () => void;
  onDeleteAllStockItems?: () => void;
  onScanItemForRequest: (item: Item) => void;
  onOpenPrintSheet: () => void;
  onOpenGoogleSheets?: () => void;
  onAddCategory?: (name: string) => void;
  onEditCategory?: (oldName: string, newName: string) => void;
  onDeleteCategory?: (categoryToDelete: string, reassignTo?: string) => void;
  onResetCategories?: () => void;
}

export const ItemMasterView: React.FC<ItemMasterViewProps> = ({
  items,
  categories,
  currentUser,
  rolePermissions,
  onAddItem,
  onBulkAddItems,
  onUpdateItem,
  onDeleteItem,
  onClearAllStock,
  onDeleteAllStockItems,
  onScanItemForRequest,
  onOpenPrintSheet,
  onOpenGoogleSheets,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onResetCategories,
}) => {
  const activeCategories = useMemo(() => {
    return categories && categories.length > 0 ? categories : CATEGORIES;
  }, [categories]);

  // Check role permissions dynamically
  const currentPerms = rolePermissions?.[currentUser.role] || (currentUser.permissions as UserPermissions) || {
    canManageMasterStock: currentUser.role !== 'USER_OPERATIONAL',
    canAddNewItem: currentUser.role === 'MASTER_ADMIN',
    canEditStockItem: currentUser.role === 'MASTER_ADMIN',
    canDeleteStockItem: currentUser.role === 'MASTER_ADMIN',
    canResetStock: currentUser.role === 'MASTER_ADMIN',
    canPrintBarcodes: true,
    canExportImportExcel: currentUser.role !== 'USER_OPERATIONAL',
  };

  const canAdd = currentPerms.canAddNewItem ?? (currentUser.role === 'MASTER_ADMIN');
  const canEdit = currentPerms.canEditStockItem ?? (currentUser.role === 'MASTER_ADMIN');
  const canDelete = currentPerms.canDeleteStockItem ?? (currentUser.role === 'MASTER_ADMIN');
  const canReset = currentPerms.canResetStock ?? (currentUser.role === 'MASTER_ADMIN');
  const canExportImport = currentPerms.canExportImportExcel ?? (currentUser.role !== 'USER_OPERATIONAL');
  const canPrint = currentPerms.canPrintBarcodes ?? true;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW' | 'IN_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'code'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Confirmation Modal states
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [isConfirmClearStockOpen, setIsConfirmClearStockOpen] = useState(false);
  const [isConfirmDeleteAllItemsOpen, setIsConfirmDeleteAllItemsOpen] = useState(false);

  // Modal Add / Edit Item
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  // Modal Import / Export Excel & CSV
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Modal Category Management
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Print Label Single Item Modal
  const [itemToPrint, setItemToPrint] = useState<Item | null>(null);

  // Form states for Add/Edit
  const [selectedCatalogItem, setSelectedCatalogItem] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<Category>(activeCategories[0] || 'ATK (Alat Tulis Kantor)');
  const [formUnit, setFormUnit] = useState(UNITS[0]);
  const [formStock, setFormStock] = useState<number | string>('');
  const [formMinStock, setFormMinStock] = useState<number | string>('5');
  const [formRackLocation, setFormRackLocation] = useState<string>('Gudang GA');
  const [formDescription, setFormDescription] = useState('');
  const [isNameDropdownOpen, setIsNameDropdownOpen] = useState(false);
  const nameDropdownRef = useRef<HTMLDivElement>(null);

  // Master list of known items
  const availableDatabaseItems = useMemo(() => {
    const map = new Map<string, Item>();
    items.forEach((it) => map.set(it.name.toLowerCase().trim(), it));
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  // Filtered list based on typed name
  const filteredDatabaseItems = useMemo(() => {
    if (!formName.trim()) {
      return availableDatabaseItems;
    }
    const q = formName.toLowerCase().trim();
    return availableDatabaseItems.filter(
      (it) =>
        it.name.toLowerCase().includes(q) ||
        it.code.toLowerCase().includes(q) ||
        it.category.toLowerCase().includes(q)
    );
  }, [availableDatabaseItems, formName]);

  // Google Sheets integration state
  const [connectedConfig, setConnectedConfig] = useState<ConnectedSpreadsheetConfig | null>(null);
  const [isSyncingStockGSheet, setIsSyncingStockGSheet] = useState(false);
  const [syncStockFeedback, setSyncStockFeedback] = useState<string | null>(null);

  useEffect(() => {
    setConnectedConfig(getConnectedSpreadsheetConfig());
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (nameDropdownRef.current && !nameDropdownRef.current.contains(event.target as Node)) {
        setIsNameDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleQuickSyncStock = async () => {
    setIsSyncingStockGSheet(true);
    setSyncStockFeedback(null);
    try {
      let token = await getGoogleAccessToken();
      if (!token) {
        const loginRes = await signInWithGoogleSheets();
        token = loginRes.accessToken;
      }
      const res = await syncStockToGoogleSheets(items, token);
      const updatedConfig = getConnectedSpreadsheetConfig();
      setConnectedConfig(updatedConfig);
      setSyncStockFeedback(`Berhasil mencatat ${res.count} data stok ke Google Sheets!`);
    } catch (err: any) {
      console.error(err);
      setSyncStockFeedback(`Gagal sinkron: ${err?.message || 'Periksa koneksi Google Sheets'}`);
    } finally {
      setIsSyncingStockGSheet(false);
    }
  };

  const handleSelectDatabaseItem = (selectedKey: string) => {
    setSelectedCatalogItem(selectedKey);
    if (!selectedKey) {
      setFormName('');
      setFormCode('');
      return;
    }

    if (selectedKey === '__CUSTOM__') {
      setFormName('');
      const defaultCat = (activeCategories[0] as Category) || 'ATK (Alat Tulis Kantor)';
      const autoSKU = generateCategorySKU(defaultCat, items);
      setFormCode(autoSKU);
      setFormCategory(defaultCat);
      setFormUnit(UNITS[0]);
      setFormRackLocation('Gudang GA');
      setFormMinStock('5');
      setFormDescription('');
      setFormStock('');
      return;
    }

    const found = availableDatabaseItems.find(
      (it) => it.id === selectedKey || it.code === selectedKey || it.name === selectedKey
    );

    if (found) {
      setFormName(found.name);
      setFormCode(found.code);
      setFormCategory(found.category);
      setFormUnit(found.unit);
      
      // Determine location: Gudang GA or Gudang Kayu
      const loc = found.rackLocation && found.rackLocation.toLowerCase().includes('kayu')
        ? 'Gudang Kayu'
        : 'Gudang GA';
      setFormRackLocation(loc);
      setFormMinStock(found.minStock !== undefined ? String(found.minStock) : '5');
      setFormDescription(found.description || '');

      if (!editingItem) {
        setFormStock('');
      } else {
        const existingInItems = items.find(
          (i) => i.id === found.id || i.code === found.code || i.name.toLowerCase() === found.name.toLowerCase()
        );
        if (existingInItems) {
          setFormStock(String(existingInItems.currentStock));
        } else {
          setFormStock(found.currentStock !== undefined ? String(found.currentStock) : '');
        }
      }
    }
  };

  const handleCustomNameInput = (nameVal: string) => {
    setFormName(nameVal);
    if (!nameVal.trim()) return;

    // Auto-detect category based on item name
    const detectedCat = detectCategoryFromName(nameVal) as Category;
    setFormCategory(detectedCat);

    // Auto-detect warehouse location: default Gudang Kayu if wood terms, else Gudang GA
    const lower = nameVal.toLowerCase();
    if (
      lower.includes('kayu') ||
      lower.includes('triplek') ||
      lower.includes('papan') ||
      lower.includes('balok') ||
      lower.includes('usuk') ||
      lower.includes('reng') ||
      lower.includes('kaso') ||
      lower.includes('plywood') ||
      lower.includes('mdf') ||
      lower.includes('pallet')
    ) {
      setFormRackLocation('Gudang Kayu');
    }

    // Auto-generate SKU based on category and matching name
    const sequentialSKU = generateCategorySKU(detectedCat, items, nameVal);
    setFormCode(sequentialSKU);
  };

  const handleCategoryChange = (newCat: Category) => {
    setFormCategory(newCat);
    // If not editing an existing item, re-generate SKU for this category
    if (!editingItem) {
      const newSKU = generateCategorySKU(newCat, items, formName);
      setFormCode(newSKU);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setSelectedCatalogItem('');
    const defaultCat = (activeCategories[0] as Category) || 'ATK (Alat Tulis Kantor)';
    setFormCode(generateCategorySKU(defaultCat, items));
    setFormName('');
    setFormCategory(defaultCat);
    setFormUnit(UNITS[0]);
    setFormStock('');
    setFormMinStock('5');
    setFormRackLocation('Gudang GA');
    setFormDescription('');
    setIsNameDropdownOpen(false);
    setIsModalOpen(true);
  };

  const openEditModal = (item: Item) => {
    setEditingItem(item);
    setSelectedCatalogItem(item.id);
    setFormCode(item.code);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormUnit(item.unit);
    setFormStock(String(item.currentStock));
    setFormMinStock(String(item.minStock));
    const loc = item.rackLocation && item.rackLocation.toLowerCase().includes('kayu')
      ? 'Gudang Kayu'
      : 'Gudang GA';
    setFormRackLocation(loc);
    setFormDescription(item.description || '');
    setIsNameDropdownOpen(false);
    setIsModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) return;

    const finalLocation = formRackLocation.trim() || 'Gudang GA';
    const parsedStock = formStock === '' ? 0 : Math.max(0, parseInt(String(formStock), 10) || 0);
    const parsedMinStock = formMinStock === '' ? 5 : Math.max(0, parseInt(String(formMinStock), 10) || 0);

    if (editingItem) {
      onUpdateItem({
        ...editingItem,
        code: formCode.trim().toUpperCase(),
        name: formName.trim(),
        category: formCategory,
        unit: formUnit,
        currentStock: parsedStock,
        minStock: parsedMinStock,
        rackLocation: finalLocation,
        description: formDescription.trim() || undefined,
        updatedAt: new Date().toISOString(),
      });
    } else {
      const now = new Date().toISOString();
      onAddItem({
        id: `item-${Date.now()}`,
        code: formCode.trim().toUpperCase(),
        name: formName.trim(),
        category: formCategory,
        unit: formUnit,
        currentStock: parsedStock,
        minStock: parsedMinStock,
        rackLocation: finalLocation,
        description: formDescription.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      });
    }

    setIsModalOpen(false);
  };

  // Filter & Search Logic
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.rackLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;

    let matchesStock = true;
    if (stockFilter === 'LOW') {
      matchesStock = item.currentStock <= item.minStock && item.currentStock > 0;
    } else if (stockFilter === 'OUT_OF_STOCK') {
      matchesStock = item.currentStock <= 0;
    } else if (stockFilter === 'IN_STOCK') {
      matchesStock = item.currentStock > item.minStock;
    }

    return matchesSearch && matchesCategory && matchesStock;
  });

  // Sorting
  filteredItems.sort((a, b) => {
    if (sortBy === 'name') {
      return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    } else if (sortBy === 'stock') {
      return sortOrder === 'asc' ? a.currentStock - b.currentStock : b.currentStock - a.currentStock;
    } else if (sortBy === 'code') {
      return sortOrder === 'asc' ? a.code.localeCompare(b.code) : b.code.localeCompare(a.code);
    }
    return 0;
  });

  const lowStockCount = items.filter((i) => i.currentStock <= i.minStock).length;

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider bg-[#E8F5E9] text-[#1B5E20] border border-[#A5D6A7] rounded-md">
              Katalog & Inventory Master
            </span>
            <span className="text-xs text-slate-500 font-semibold">Gudang GA</span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1 flex items-center gap-2">
            <span>Master Data Stok & Barcode Barang</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#E8F5E9] text-[#1B5E20] border border-[#A5D6A7]">
              {items.length} SKU
            </span>
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Database seluruh barang operasional dengan nomor barcode SKU, lokasi rak, dan jumlah stok fisik.
          </p>
        </div>

        {/* Action Buttons Toolbar - Tidy, Standardized & Neatly Arranged */}
        <div className="flex flex-wrap items-center gap-2">
          {canReset && onClearAllStock && (
            <button
              type="button"
              onClick={() => setIsConfirmClearStockOpen(true)}
              className="h-9 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-xl border border-amber-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="Kosongkan seluruh stok fisik barang menjadi 0"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>Reset Stok 0</span>
            </button>
          )}

          {canDelete && currentUser.role === 'MASTER_ADMIN' && onDeleteAllStockItems && (
            <button
              type="button"
              onClick={() => setIsConfirmDeleteAllItemsOpen(true)}
              className="h-9 px-3 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold rounded-xl border border-rose-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="Hapus seluruh database master barang"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-700 shrink-0" />
              <span>Hapus Semua</span>
            </button>
          )}

          {canExportImport && (
            <>
              {connectedConfig && (
                <a
                  href={connectedConfig.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-300 flex items-center gap-1.5 transition-all shadow-2xs"
                  title={`Buka Google Sheet: ${connectedConfig.title}`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Buka Sheet</span>
                  <ArrowUpRight className="w-3 h-3 text-emerald-600 shrink-0 ml-0.5" />
                </a>
              )}

              <button
                type="button"
                onClick={handleQuickSyncStock}
                disabled={isSyncingStockGSheet}
                className="h-9 px-3 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl border border-emerald-600/60 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                title="Sinkronkan seluruh data stok ke Google Sheets sekarang"
              >
                {isSyncingStockGSheet ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                ) : (
                  <Zap className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                )}
                <span>{isSyncingStockGSheet ? 'Menyinkronkan...' : 'Sinkronkan Stok'}</span>
              </button>

              {onOpenGoogleSheets && (
                <button
                  type="button"
                  onClick={onOpenGoogleSheets}
                  className="h-9 px-3 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl border border-emerald-700/60 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  title="Buka panel Integrasi Google Sheets lengkap"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
                  <span>Google Sheets</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="h-9 px-3.5 bg-[#E8F5E9] hover:bg-[#C8E6C9] text-[#1B5E20] text-xs font-bold rounded-xl border border-[#A5D6A7] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#1B5E20] shrink-0" />
                <span>Excel / CSV</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className="h-9 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            title="Kelola Kategori: Tambah baru, edit nama, atau hapus kategori GA"
          >
            <FolderKanban className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Kelola Kategori ({activeCategories.length})</span>
          </button>

          {canAdd && (
            <button
              type="button"
              onClick={openAddModal}
              className="h-9 px-4 bg-[#1B5E20] hover:bg-[#2E7D32] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-[#A5D6A7] shrink-0" />
              <span>Tambah Barang Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banner for Stock Sync */}
      {syncStockFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{syncStockFeedback}</span>
            {connectedConfig && (
              <a
                href={connectedConfig.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 underline hover:text-emerald-900 ml-2 font-bold inline-flex items-center gap-0.5"
              >
                <span>Lihat di Sheet</span>
                <ArrowUpRight className="w-3 h-3" />
              </a>
            )}
          </div>
          <button
            onClick={() => setSyncStockFeedback(null)}
            className="text-slate-500 hover:text-slate-700 text-xs px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl shadow-xs border border-slate-200/80 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search Box */}
          <div className="relative lg:col-span-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama barang, barcode (GA-ATK-001)..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#66BB6A]"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#66BB6A] text-slate-800 font-medium"
            >
              <option value="ALL">Semua Kategori ({items.length})</option>
              {activeCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Condition Filter */}
          <div>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#66BB6A] text-slate-800 font-medium"
            >
              <option value="ALL">Status Stok: Semua</option>
              <option value="LOW">Stok Menipis ({lowStockCount})</option>
              <option value="IN_STOCK">Stok Aman</option>
              <option value="OUT_OF_STOCK">Stok Habis (0)</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <span>Menampilkan <b>{filteredItems.length}</b> dari {items.length} barang</span>
            {lowStockCount > 0 && (
              <span className="px-2 py-0.5 bg-rose-50 text-rose-800 font-bold rounded-md flex items-center gap-1 border border-rose-200">
                <AlertTriangle className="w-3 h-3 text-rose-600" />
                {lowStockCount} item perlu restock
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Urutkan:</span>
            <button
              onClick={() => {
                if (sortBy === 'name') setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
                else {
                  setSortBy('name');
                  setSortOrder('asc');
                }
              }}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                sortBy === 'name' ? 'bg-[#E8F5E9] text-[#1B5E20] border border-[#A5D6A7]' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Nama {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => {
                if (sortBy === 'stock') setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
                else {
                  setSortBy('stock');
                  setSortOrder('asc');
                }
              }}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                sortBy === 'stock' ? 'bg-[#E8F5E9] text-[#1B5E20] border border-[#A5D6A7]' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Stok {sortBy === 'stock' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </div>
      </div>

      {/* RESPONSIVE ITEMS CONTAINER (Requirement 8: No Horizontal Scroll on Mobile) */}
      
      {/* 1. Mobile Cards Layout (< md screens) */}
      <div className="block md:hidden space-y-2.5">
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-slate-500 border border-slate-200">
            <Package className="w-8 h-8 mx-auto text-slate-300 mb-1" />
            <p className="font-bold text-xs">Tidak ada barang yang cocok dengan filter</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isLow = item.currentStock <= item.minStock && item.currentStock > 0;
            const isOut = item.currentStock <= 0;

            return (
              <div
                key={item.id}
                className={`bg-white p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                  isOut
                    ? 'border-rose-300 bg-rose-50/20'
                    : isLow
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-slate-200/90'
                }`}
              >
                {/* Header row: SKU + Stock Badge (Single row with compact non-breaking text) */}
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <span className="font-mono font-bold text-[11px] bg-slate-100 text-[#1B5E20] px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                      {item.code}
                    </span>
                    <span className="text-[9px] text-slate-600 bg-amber-50/90 text-amber-900 px-1.5 py-0.5 rounded border border-amber-200/80 flex items-center gap-0.5 truncate font-medium">
                      <MapPin className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                      <span className="truncate">{item.rackLocation && item.rackLocation.toLowerCase().includes('kayu') ? 'Gudang Kayu' : 'Gudang GA'}</span>
                    </span>
                  </div>

                  {/* Stock Badge - Compact font to prevent wrapping/cutting off on mobile */}
                  <div className="shrink-0">
                    <span
                      className={`inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-black rounded-lg whitespace-nowrap leading-none ${
                        isOut
                          ? 'bg-rose-600 text-white'
                          : isLow
                          ? 'bg-amber-500 text-white'
                          : 'bg-[#E8F5E9] text-[#1B5E20] border border-[#A5D6A7]'
                      }`}
                    >
                      <span>{item.currentStock}</span>
                      <span className="font-semibold text-[9px] opacity-90">{item.unit}</span>
                    </span>
                  </div>
                </div>

                {/* Name & Category */}
                <div>
                  <h4 className="font-bold text-xs text-slate-900 leading-snug">{item.name}</h4>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 flex-wrap">
                    <span className="bg-slate-100 px-1.5 py-0.2 rounded font-medium text-slate-700">
                      {item.category}
                    </span>
                    <span>Min: {item.minStock} {item.unit}</span>
                  </div>
                </div>

                {/* Action Buttons Row with RBAC */}
                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                      title="Edit Data Barang"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setItemToDelete(item)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title="Hapus Barang"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 2. Desktop Table Layout (>= md screens) */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 text-slate-200 uppercase font-bold tracking-wider text-[10px]">
            <tr>
              <th className="py-2 px-3">Barcode / SKU</th>
              <th className="py-2 px-3">Nama Barang & Deskripsi</th>
              <th className="py-2 px-3">Kategori GA</th>
              <th className="py-2 px-3 text-center">Lokasi Gudang</th>
              <th className="py-2 px-3 text-center">Stok Fisik</th>
              <th className="py-2 px-3 text-center">Min. Stok</th>
              <th className="py-2 px-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-600">
                  <Package className="w-8 h-8 mx-auto text-slate-300 mb-1.5" />
                  <p className="font-semibold text-xs">Tidak ada barang yang cocok dengan filter</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Coba ubah kata kunci pencarian atau kategori</p>
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const isLow = item.currentStock <= item.minStock && item.currentStock > 0;
                const isOut = item.currentStock <= 0;

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isOut ? 'bg-rose-50/30' : isLow ? 'bg-amber-50/30' : ''
                    }`}
                  >
                    {/* Barcode & Code */}
                    <td className="py-1.5 px-3">
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-[11px] bg-slate-100 text-[#1B5E20] px-1.5 py-0.5 rounded border border-slate-200">
                          {item.code}
                        </span>
                      </div>
                    </td>

                    {/* Name & Description */}
                    <td className="py-1.5 px-3 max-w-xs">
                      <p className="font-bold text-slate-900 text-xs leading-tight line-clamp-1">{item.name}</p>
                      {item.description && (
                        <p className="text-[10px] text-slate-500 line-clamp-1">{item.description}</p>
                      )}
                    </td>

                    {/* Category */}
                    <td className="py-1.5 px-3">
                      <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 text-slate-700 whitespace-nowrap">
                        {item.category}
                      </span>
                    </td>

                    {/* Warehouse Location */}
                    <td className="py-1.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-medium rounded-md bg-amber-50 text-amber-900 border border-amber-200 whitespace-nowrap">
                        <Building2 className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                        {item.rackLocation && item.rackLocation.toLowerCase().includes('kayu') ? 'Gudang Kayu' : 'Gudang GA'}
                      </span>
                    </td>

                    {/* Current Stock */}
                    <td className="py-1.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-black rounded-md whitespace-nowrap ${
                          isOut
                            ? 'bg-rose-600 text-white'
                            : isLow
                            ? 'bg-amber-500 text-white'
                            : 'bg-[#E8F5E9] text-[#1B5E20] border border-[#A5D6A7]'
                        }`}
                      >
                        <span>{item.currentStock}</span>
                        <span className="text-[9px] font-semibold opacity-90">{item.unit}</span>
                      </span>
                    </td>

                    {/* Min Stock */}
                    <td className="py-1.5 px-3 text-center font-medium text-slate-600 whitespace-nowrap text-[11px]">
                      <span>{item.minStock}</span> <span className="text-[9px] text-slate-500">{item.unit}</span>
                    </td>

                    {/* Actions */}
                    <td className="py-1.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            title="Edit Data Barang"
                            className="p-1 text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setItemToDelete(item)}
                            title="Hapus Barang"
                            className="p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {!canEdit && !canDelete && (
                          <span className="text-[10px] text-slate-400 font-mono">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Add / Edit Item */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#66BB6A]/20 text-[#A5D6A7] rounded-lg border border-[#66BB6A]/30">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-100">
                    {editingItem ? 'Edit Data Barang Gudang GA' : 'Tambah / Update Stok Barang'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Pilih nama barang dari database atau ketik barang baru (Kategori & Lokasi otomatis terdeteksi dan dapat disesuaikan).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap Barang <span className="text-rose-500">*</span>
                </label>

                <div className="relative" ref={nameDropdownRef}>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      required
                      id="input-form-item-name"
                      value={formName}
                      onFocus={() => setIsNameDropdownOpen(true)}
                      onChange={(e) => {
                        handleCustomNameInput(e.target.value);
                        setIsNameDropdownOpen(true);
                      }}
                      placeholder="Ketik nama barang (contoh: Kertas A4, Spidol) atau pilih dari database..."
                      className="w-full pl-3 pr-16 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#66BB6A] focus:border-[#66BB6A] font-semibold text-slate-900 shadow-2xs"
                      autoComplete="off"
                    />
                    <div className="absolute right-1.5 flex items-center gap-1">
                      {formName && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormName('');
                            setIsNameDropdownOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                          title="Hapus ketikan"
                        >
                          ✕
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsNameDropdownOpen((prev) => !prev)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                        title="Buka daftar pilihan barang database"
                      >
                        <Search className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Searchable Combobox Dropdown */}
                  {isNameDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-64 overflow-y-auto custom-scrollbar">
                      {/* 1. Opsi Manual: + Ketik Nama Barang Baru (Ketik Manual) */}
                      <div className="p-1.5 bg-emerald-50/90 sticky top-0 z-10 border-b border-emerald-100">
                        <button
                          type="button"
                          id="btn-select-custom-item-name"
                          onClick={() => {
                            if (formName.trim()) {
                              handleCustomNameInput(formName);
                            }
                            setIsNameDropdownOpen(false);
                          }}
                          className="w-full px-2.5 py-2 text-left bg-white hover:bg-emerald-600 hover:text-white text-emerald-800 rounded-lg flex items-center justify-between font-bold text-xs border border-emerald-300 shadow-2xs cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <PlusCircle className="w-4 h-4 text-emerald-600 group-hover:text-white shrink-0" />
                            <span className="truncate font-bold">
                              {formName.trim()
                                ? `+ Ketik Nama Barang Baru "${formName}" (ketik Manual)`
                                : `+ Ketik Nama Barang Baru (ketik Manual)`}
                            </span>
                          </div>
                          <span className="text-[10px] bg-emerald-100 group-hover:bg-emerald-700 group-hover:text-white text-emerald-800 px-1.5 py-0.5 rounded font-mono font-bold shrink-0 ml-2">
                            Ketik Manual
                          </span>
                        </button>
                      </div>

                      {/* 2. Daftar Barang Database Terfilter */}
                      <div className="p-1 space-y-0.5">
                        <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Pilih dari Database ({filteredDatabaseItems.length} Barang)
                        </div>
                        {filteredDatabaseItems.length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-500">
                            <p>Tidak ada barang database yang cocok.</p>
                            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                              Klik opsi "+ Ketik Nama Barang Baru" di atas untuk simpan manual.
                            </p>
                          </div>
                        ) : (
                          filteredDatabaseItems.map((it) => (
                            <button
                              key={it.id || it.code}
                              type="button"
                              onClick={() => {
                                handleSelectDatabaseItem(it.id || it.code);
                                setIsNameDropdownOpen(false);
                              }}
                              className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-slate-100 flex items-center justify-between text-xs cursor-pointer transition-colors group"
                            >
                              <div className="min-w-0 flex-1 truncate pr-2">
                                <div className="flex items-center gap-1.5 truncate">
                                  <p className="font-bold text-slate-800 group-hover:text-emerald-700 truncate">{it.name}</p>
                                  <span className="text-[10px] font-mono text-slate-400 shrink-0">[{it.code}]</span>
                                </div>
                                <p className="text-[10px] text-slate-500 truncate">
                                  {it.category} • Rak: {it.rackLocation || '-'}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                                  {it.unit}
                                </span>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Ketik manual nama barang baru atau pilih dari daftar database katalog.
                </p>
              </div>

              {/* Editable Kategori GA & Lokasi Gudang */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Kategori GA <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                    >
                      <FolderKanban className="w-3 h-3 text-emerald-600" />
                      <span>Kelola / + Baru</span>
                    </button>
                  </div>
                  <select
                    value={formCategory}
                    onChange={(e) => handleCategoryChange(e.target.value as Category)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#66BB6A] font-semibold text-slate-800 cursor-pointer"
                  >
                    {activeCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    Kategori otomatis menyesuaikan jenis barang dan dapat diedit manual.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lokasi Gudang <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formRackLocation}
                    onChange={(e) => setFormRackLocation(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#66BB6A] font-bold text-slate-800 cursor-pointer"
                  >
                    {WAREHOUSE_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        🏢 {loc}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    Hanya tersedia 2 lokasi resmi: Gudang GA & Gudang Kayu.
                  </p>
                </div>
              </div>

              {/* Barcode & SKU Box */}
              <div className="p-3 bg-[#E8F5E9] rounded-xl border border-[#A5D6A7] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1B5E20] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#66BB6A]" />
                    Nomor Barcode / Kode SKU Terurut Sesuai Kategori
                  </span>
                  <span className="text-[10px] bg-[#1B5E20] text-white font-bold px-2 py-0.5 rounded-full">
                    Auto-Generate
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                  <div className="bg-white p-2 rounded-lg border border-[#A5D6A7] shadow-2xs">
                    <span className="text-[10px] font-medium text-slate-500 block">Kode SKU</span>
                    <input
                      type="text"
                      required
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                      className="font-mono font-bold text-[#1B5E20] w-full bg-transparent border-b border-transparent focus:border-[#66BB6A] focus:outline-none"
                    />
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-[#A5D6A7] shadow-2xs">
                    <span className="text-[10px] font-medium text-slate-500 block">Kategori Terpilih</span>
                    <span className="font-bold text-slate-800 truncate block">{formCategory || '-'}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-[#A5D6A7] shadow-2xs">
                    <span className="text-[10px] font-medium text-slate-500 block">Lokasi Gudang</span>
                    <span className="font-bold text-slate-800 truncate block">{formRackLocation || 'Gudang GA'}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jumlah Stok Fisik <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    placeholder="Contoh: 10"
                    value={formStock}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9]/g, '');
                      setFormStock(clean);
                    }}
                    className="w-full px-3 py-2 text-sm font-bold text-center bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#66BB6A] text-slate-900 placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Satuan Unit
                  </label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#66BB6A] font-medium"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Batas Min. Stok (Alert)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    placeholder="5"
                    value={formMinStock}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9]/g, '');
                      setFormMinStock(clean);
                    }}
                    className="w-full px-3 py-2 text-xs font-bold text-center bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#66BB6A] text-amber-700 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deskripsi / Catatan Barang
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Keterangan spesifikasi..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#66BB6A]"
                />
              </div>

              {formCode && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Pratinjau Barcode:</span>
                  <BarcodeRenderer value={formCode} height={30} width={1.4} fontSize={10} />
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!formName.trim()}
                  className="px-5 py-2 bg-[#1B5E20] hover:bg-[#66BB6A] disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer transition-colors"
                >
                  {editingItem ? 'Simpan Perubahan' : 'Simpan ke Master Stok'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Single Item Barcode Detail & Print */}
      {itemToPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Label Barcode Barang Gudang GA</h3>
              <button
                onClick={() => setItemToPrint(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-5 text-center space-y-3">
              <div className="p-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 flex flex-col items-center">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  PROPERTY OF GENERAL AFFAIRS
                </p>
                <h4 className="font-bold text-slate-900 text-sm max-w-xs">{itemToPrint.name}</h4>
                <p className="text-xs text-slate-700 mt-0.5 font-medium">
                  Lokasi: <span className="font-bold text-slate-900 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">{itemToPrint.rackLocation && itemToPrint.rackLocation.toLowerCase().includes('kayu') ? 'Gudang Kayu' : 'Gudang GA'}</span>
                </p>
                <div className="my-2.5 py-2 px-3 bg-white rounded-lg border border-slate-200 shadow-xs">
                  <BarcodeRenderer value={itemToPrint.code} width={1.8} height={45} fontSize={12} />
                </div>
                <p className="text-[10px] font-mono text-slate-600">
                  Kategori: {itemToPrint.category} • Satuan: {itemToPrint.unit}
                </p>
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Cetak Label Barcode
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import / Export Excel & CSV Modal */}
      <ImportExportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        items={items}
        categories={activeCategories}
        onOpenGoogleSheets={onOpenGoogleSheets}
        onImportItems={(newItems, mode) => {
          if (onBulkAddItems) {
            onBulkAddItems(newItems, mode);
          } else {
            newItems.forEach(onAddItem);
          }
        }}
      />

      {/* Category Management Modal */}
      <CategoryManagementModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={activeCategories}
        items={items}
        onAddCategory={(name) => {
          if (onAddCategory) onAddCategory(name);
        }}
        onEditCategory={(oldName, newName) => {
          if (onEditCategory) onEditCategory(oldName, newName);
        }}
        onDeleteCategory={(cat, reassign) => {
          if (onDeleteCategory) onDeleteCategory(cat, reassign);
        }}
        onResetCategories={onResetCategories}
      />

      {/* Delete Single Item Modal */}
      <ConfirmationModal
        isOpen={Boolean(itemToDelete)}
        title="Hapus Barang dari Master Stok"
        message={`Apakah Anda yakin ingin menghapus data "${itemToDelete?.name}" (${itemToDelete?.code})?`}
        confirmText="Ya, Hapus Barang"
        isDestructive={true}
        onConfirm={() => {
          if (itemToDelete) {
            onDeleteItem(itemToDelete.id);
            setItemToDelete(null);
          }
        }}
        onCancel={() => setItemToDelete(null)}
      />

      {/* Clear All Stock Modal */}
      <ConfirmationModal
        isOpen={isConfirmClearStockOpen}
        title="Kosongkan Seluruh Stok Barang (Reset Qty 0)"
        message="Tindakan ini akan mereset seluruh jumlah fisik barang di gudang menjadi 0. Anda yakin?"
        confirmText="Ya, Kosongkan Stok Menjadi 0"
        isDestructive={true}
        onConfirm={() => {
          if (onClearAllStock) {
            onClearAllStock();
          }
          setIsConfirmClearStockOpen(false);
        }}
        onCancel={() => setIsConfirmClearStockOpen(false)}
      />

      {/* Delete All Stock Items Modal */}
      <ConfirmationModal
        isOpen={isConfirmDeleteAllItemsOpen}
        title="Hapus Seluruh Data Master Barang (Reset Total)"
        message="PERINGATAN MASTER ADMIN: Seluruh data master barang akan dihapus bersih dari database. Anda yakin?"
        confirmText="Ya, Hapus Bersih Semua Barang"
        isDestructive={true}
        onConfirm={() => {
          if (onDeleteAllStockItems) {
            onDeleteAllStockItems();
          }
          setIsConfirmDeleteAllItemsOpen(false);
        }}
        onCancel={() => setIsConfirmDeleteAllItemsOpen(false)}
      />
    </div>
  );
};
