import React, { useState, useMemo } from 'react';
import { 
  FolderKanban, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Search, 
  AlertTriangle, 
  Layers, 
  Package, 
  RotateCcw,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Item } from '../types';

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  items: Item[];
  onAddCategory: (name: string) => void;
  onEditCategory: (oldName: string, newName: string) => void;
  onDeleteCategory: (categoryToDelete: string, reassignTo?: string) => void;
  onResetCategories?: () => void;
}

export const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({
  isOpen,
  onClose,
  categories,
  items,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onResetCategories,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<{ oldName: string; currentName: string } | null>(null);

  // Deletion modal state
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);
  const [reassignTarget, setReassignTarget] = useState<string>('');

  // Compute item counts per category (All hooks must run unconditionally before any early return)
  const categoryItemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    categories.forEach((cat) => {
      counts[cat] = 0;
    });
    items.forEach((it) => {
      const cat = (it.category || '').trim();
      if (cat) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });
    return counts;
  }, [categories, items]);

  const filteredCategories = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return categories;
    return categories.filter((cat) => cat.toLowerCase().includes(term));
  }, [categories, searchTerm]);

  if (!isOpen) return null;

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    onAddCategory(trimmed);
    setNewCategoryName('');
  };

  const handleSaveEdit = () => {
    if (!editingCategory) return;
    const trimmed = editingCategory.currentName.trim();
    if (!trimmed || trimmed === editingCategory.oldName) {
      setEditingCategory(null);
      return;
    }
    onEditCategory(editingCategory.oldName, trimmed);
    setEditingCategory(null);
  };

  const initiateDelete = (cat: string) => {
    setDeletingCategory(cat);
    const otherCats = categories.filter((c) => c !== cat);
    setReassignTarget(otherCats[0] || 'Umum');
  };

  const confirmDelete = () => {
    if (!deletingCategory) return;
    const count = categoryItemCounts[deletingCategory] || 0;
    onDeleteCategory(deletingCategory, count > 0 ? reassignTarget : undefined);
    setDeletingCategory(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[88vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 px-5 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 shadow-inner">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>Kelola Kategori Barang GA</span>
                <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full">
                  {categories.length} Kategori
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Tambah baru, ubah nama (edit), dan hapus kategori stok barang
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Section 1: Form Buat Kategori Baru */}
          <form onSubmit={handleCreateNew} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              <span>Buat Kategori Baru:</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Contoh: Perkakas Lapangan, Seragam Kerja..."
                className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#66BB6A] focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={!newCategoryName.trim()}
                className="px-4 py-2 bg-[#1B5E20] hover:bg-[#2E7D32] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
              >
                <Plus className="w-4 h-4 text-[#A5D6A7]" />
                <span>Tambah</span>
              </button>
            </div>
          </form>

          {/* Section 2: Search & Stats */}
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari kategori..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#66BB6A]"
              />
            </div>
            {onResetCategories && (
              <button
                type="button"
                onClick={onResetCategories}
                title="Pulihkan susunan kategori standar bawaan"
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 flex items-center gap-1 cursor-pointer transition-colors shrink-0"
              >
                <RotateCcw className="w-3 h-3 text-slate-600" />
                <span>Reset Standar</span>
              </button>
            )}
          </div>

          {/* Section 3: Daftar Kategori */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex justify-between px-1">
              <span>Daftar Kategori Aktif ({filteredCategories.length})</span>
              <span>Jumlah Item</span>
            </div>

            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-72 overflow-y-auto bg-white shadow-2xs">
              {filteredCategories.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Tidak ada kategori yang sesuai pencarian.
                </div>
              ) : (
                filteredCategories.map((cat) => {
                  const count = categoryItemCounts[cat] || 0;
                  const isEditing = editingCategory?.oldName === cat;

                  return (
                    <div
                      key={cat}
                      className="p-2.5 px-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                    >
                      {/* Name or Edit Input */}
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editingCategory.currentName}
                              onChange={(e) =>
                                setEditingCategory({
                                  ...editingCategory,
                                  currentName: e.target.value,
                                })
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit();
                                if (e.key === 'Escape') setEditingCategory(null);
                              }}
                              autoFocus
                              className="w-full px-2 py-1 text-xs font-bold text-slate-900 border-2 border-emerald-500 rounded-lg focus:outline-hidden bg-white"
                            />
                            <button
                              type="button"
                              onClick={handleSaveEdit}
                              title="Simpan perubahan nama kategori"
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCategory(null)}
                              title="Batal edit"
                              className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="text-xs font-bold text-slate-800 truncate">{cat}</span>
                          </div>
                        )}
                      </div>

                      {/* Right side: item count & action buttons */}
                      {!isEditing && (
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              count > 0
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {count} {count === 1 ? 'item' : 'items'}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingCategory({ oldName: cat, currentName: cat })}
                              title="Edit nama kategori ini"
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => initiateDelete(cat)}
                              title="Hapus kategori ini"
                              className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between px-5">
          <span className="text-[11px] text-slate-500">
            Perubahan nama atau penghapusan otomatis menyinkronkan data barang.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Deleting Category */}
      {deletingCategory && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  Hapus Kategori "{deletingCategory}"?
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  {(categoryItemCounts[deletingCategory] || 0) > 0 ? (
                    <>
                      Kategori ini sedang digunakan oleh{' '}
                      <b className="text-rose-700 font-bold">
                        {categoryItemCounts[deletingCategory]} barang
                      </b>
                      . Silakan pilih kategori tujuan untuk mengalihkan barang-barang tersebut:
                    </>
                  ) : (
                    'Kategori ini belum memiliki barang dan dapat dihapus dengan aman.'
                  )}
                </p>
              </div>
            </div>

            {/* Reassign dropdown if items exist */}
            {(categoryItemCounts[deletingCategory] || 0) > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                <label className="text-[11px] font-bold text-amber-900 block">
                  Alihkan {categoryItemCounts[deletingCategory]} barang ke kategori:
                </label>
                <select
                  value={reassignTarget}
                  onChange={(e) => setReassignTarget(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-bold text-slate-800"
                >
                  {categories
                    .filter((c) => c !== deletingCategory)
                    .map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  <option value="Umum">Umum / Lainnya (Kategori Baru)</option>
                </select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Kategori</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
