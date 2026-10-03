import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  RotateCcw, 
  Briefcase, 
  Building2, 
  UserCheck, 
  AlertTriangle,
  UserPlus,
  FileSpreadsheet,
  ArrowUpRight,
  Zap,
  RefreshCw,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { Employee } from '../types';
import { DEPARTMENTS, INITIAL_EMPLOYEES } from '../data/initialData';
import { ConfirmationModal } from './ConfirmationModal';
import { 
  getConnectedSpreadsheetConfig, 
  syncEmployeesToGoogleSheets, 
  getGoogleAccessToken, 
  signInWithGoogleSheets,
  ConnectedSpreadsheetConfig 
} from '../utils/googleSheetsService';

interface EmployeeDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  onAddEmployee: (employee: Employee) => void;
  onUpdateEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onResetEmployees: () => void;
  onOpenGoogleSheets?: () => void;
  companyName?: string;
}

export const EmployeeDatabaseModal: React.FC<EmployeeDatabaseModalProps> = ({
  isOpen,
  onClose,
  employees,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onResetEmployees,
  onOpenGoogleSheets,
  companyName = 'Gudang General Affairs',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  
  // Google sheets sync state
  const [connectedConfig, setConnectedConfig] = useState<ConnectedSpreadsheetConfig | null>(null);
  const [isSyncingGSheet, setIsSyncingGSheet] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // Add new employee form state
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newDept, setNewDept] = useState(DEPARTMENTS[0]);
  const [newNotes, setNewNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Edit employee state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editDept, setEditDept] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConnectedConfig(getConnectedSpreadsheetConfig());
      setSyncStatusMsg(null);
    }
  }, [isOpen]);

  const handleSyncToSheets = async () => {
    setIsSyncingGSheet(true);
    setSyncStatusMsg(null);
    try {
      let token = await getGoogleAccessToken();
      if (!token) {
        // Prompt login if not available
        const loginRes = await signInWithGoogleSheets();
        token = loginRes.accessToken;
      }
      
      const res = await syncEmployeesToGoogleSheets(employees, token, companyName);
      const updatedConfig = getConnectedSpreadsheetConfig();
      setConnectedConfig(updatedConfig);
      setSyncStatusMsg(`Berhasil menyinkronkan ${res.count} personil ke Google Sheets!`);
    } catch (err: any) {
      console.error(err);
      setSyncStatusMsg(`Gagal sinkron: ${err?.message || 'Pastikan izin Google Sheets telah diberikan'}`);
    } finally {
      setIsSyncingGSheet(false);
    }
  };

  if (!isOpen) return null;

  const filteredEmployees = employees.filter((emp) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      emp.name.toLowerCase().includes(term) ||
      emp.position.toLowerCase().includes(term) ||
      (emp.department && emp.department.toLowerCase().includes(term));
    const matchesDept = selectedDeptFilter === 'ALL' || emp.department === selectedDeptFilter;
    return matchesSearch && matchesDept;
  });

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newName.trim()) {
      setFormError('Nama Karyawan wajib diisi');
      return;
    }
    if (!newPosition.trim()) {
      setFormError('Jabatan / Posisi wajib diisi');
      return;
    }

    const newEmployee: Employee = {
      id: `emp-${Date.now()}`,
      name: newName.trim().toUpperCase(),
      position: newPosition.trim().toUpperCase(),
      department: newDept,
      notes: newNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onAddEmployee(newEmployee);
    setNewName('');
    setNewPosition('');
    setNewNotes('');
    setIsAdding(false);
  };

  const startEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setEditName(emp.name);
    setEditPosition(emp.position);
    setEditDept(emp.department || DEPARTMENTS[0]);
  };

  const saveEdit = (id: string) => {
    if (!editName.trim() || !editPosition.trim()) return;

    const existing = employees.find((e) => e.id === id);
    if (!existing) return;

    onUpdateEmployee({
      ...existing,
      name: editName.trim().toUpperCase(),
      position: editPosition.trim().toUpperCase(),
      department: editDept,
      updatedAt: new Date().toISOString(),
    });

    setEditingId(null);
  };

  const uniquePositionsCount = new Set(employees.map((e) => e.position)).size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#1c2f57] text-white p-5 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-300 rounded-xl border border-blue-400/30">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-white">
                  Database Nama & Jabatan Karyawan
                </h3>
                <span className="text-xs px-2 py-0.5 bg-blue-500/30 text-blue-200 border border-blue-400/30 rounded-full font-semibold">
                  {employees.length} Personil
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Kelola daftar personil & jabatan untuk serah terima barang gudang General Affairs (GA)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Google Sheets Sync Banner */}
        <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-600 text-white rounded-lg">
              <FileSpreadsheet className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-emerald-950">Google Sheets Sync: </span>
              {connectedConfig ? (
                <span className="text-emerald-800 font-medium">
                  Terhubung ({connectedConfig.title})
                  {connectedConfig.lastSyncTime && (
                    <span className="text-slate-500 text-[11px] ml-1.5">
                      • Terakhir sync: {new Date(connectedConfig.lastSyncTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-slate-600">
                  Data personil dapat dicatat langsung ke Google Spreadsheet Anda
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {connectedConfig && (
              <a
                href={connectedConfig.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] rounded-lg border border-emerald-300 flex items-center gap-1 shadow-2xs transition-all"
                title="Buka langsung tab Daftar Karyawan di Google Sheets"
              >
                <span>Buka di Google Sheets</span>
                <ArrowUpRight className="w-3 h-3" />
              </a>
            )}

            <button
              type="button"
              onClick={handleSyncToSheets}
              disabled={isSyncingGSheet}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Kirim dan perbarui data seluruh karyawan ke Google Sheets sekarang"
            >
              {isSyncingGSheet ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <Zap className="w-3 h-3" />
              )}
              <span>{isSyncingGSheet ? 'Menyinkronkan...' : '⚡ Sinkronkan Karyawan'}</span>
            </button>

            {onOpenGoogleSheets && (
              <button
                type="button"
                onClick={onOpenGoogleSheets}
                className="text-slate-500 hover:text-emerald-700 p-1 rounded hover:bg-emerald-100 text-xs"
                title="Pengaturan Google Sheets"
              >
                ⚙️
              </button>
            )}
          </div>
        </div>

        {syncStatusMsg && (
          <div className="px-4 py-2 bg-emerald-100/80 border-b border-emerald-300 text-xs font-semibold text-emerald-900 flex items-center justify-between animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>{syncStatusMsg}</span>
            </div>
            <button
              onClick={() => setSyncStatusMsg(null)}
              className="text-slate-500 hover:text-slate-800 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Toolbar & Action Stats */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search & Filter */}
          <div className="flex flex-1 items-center gap-2 w-full">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama karyawan, jabatan (e.g. LOADING MASTER, HELPER, OPERATOR)..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 max-w-[180px]"
            >
              <option value="ALL">Semua Departemen</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={() => setIsAdding(!isAdding)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              {isAdding ? <X className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
              <span>{isAdding ? 'Tutup Form Tambah' : '+ Tambah Karyawan Baru'}</span>
            </button>
          </div>
        </div>

        {/* Add Employee Form Drawer */}
        {isAdding && (
          <form onSubmit={handleSaveNew} className="bg-blue-50/70 p-4 border-b border-blue-200 animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-2 mb-3">
              <UserPlus className="w-4 h-4 text-blue-700" />
              <span className="text-xs font-extrabold text-blue-950 uppercase tracking-wide">
                Formulir Tambah Karyawan & Jabatan Baru
              </span>
            </div>

            {formError && (
              <div className="mb-3 p-2 bg-rose-100 text-rose-800 text-xs rounded-lg border border-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nama Lengkap Karyawan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: BUDI SANTOSO"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Jabatan / Posisi Kerja <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newPosition}
                  onChange={(e) => setNewPosition(e.target.value)}
                  placeholder="Contoh: OFFICER - GA / LOADING MASTER"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Departemen / Divisi
                </label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Catatan tambahan (opsional, misal NIK / Lokasi Pos)"
                className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg w-1/2 focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan Personil</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Employee List Table */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white font-bold sticky top-0 z-10 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">No</th>
                  <th className="py-2.5 px-3">Nama Karyawan</th>
                  <th className="py-2.5 px-3">Jabatan / Posisi</th>
                  <th className="py-2.5 px-3">Departemen</th>
                  <th className="py-2.5 px-3 text-center w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-500">
                      <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-xs">Tidak ditemukan data karyawan sesuai pencarian "{searchTerm}"</p>
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp, index) => {
                    const isEditing = editingId === emp.id;

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-center font-mono text-slate-500 font-medium">
                          {index + 1}
                        </td>

                        {/* Nama */}
                        <td className="py-2.5 px-3">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-blue-400 rounded font-bold uppercase"
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900">{emp.name}</span>
                            </div>
                          )}
                        </td>

                        {/* Jabatan */}
                        <td className="py-2.5 px-3">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editPosition}
                              onChange={(e) => setEditPosition(e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-blue-400 rounded font-bold uppercase"
                            />
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-800 font-bold rounded-md font-mono text-[11px] border border-slate-200">
                              {emp.position}
                            </span>
                          )}
                        </td>

                        {/* Departemen */}
                        <td className="py-2.5 px-3">
                          {isEditing ? (
                            <select
                              value={editDept}
                              onChange={(e) => setEditDept(e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-blue-400 rounded"
                            >
                              {DEPARTMENTS.map((dept) => (
                                <option key={dept} value={dept}>
                                  {dept}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-slate-600 font-medium text-xs">
                              {emp.department || '-'}
                            </span>
                          )}
                        </td>

                        {/* Aksi Edit / Hapus */}
                        <td className="py-2.5 px-3 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => saveEdit(emp.id)}
                                title="Simpan Perubahan"
                                className="p-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                title="Batal"
                                className="p-1 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => startEdit(emp)}
                                title="Edit Data Karyawan"
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEmployeeToDelete(emp)}
                                title="Hapus Karyawan"
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Summary & Reset Action */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-slate-600">
            <span>
              Total Personil: <strong className="text-slate-900">{employees.length}</strong>
            </span>
            <span>•</span>
            <span>
              Variasi Jabatan: <strong className="text-slate-900">{uniquePositionsCount}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onResetEmployees}
              className="text-slate-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer font-medium"
            >
              <RotateCcw className="w-3 h-3" /> Reset ke 114 Karyawan Awal
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer"
            >
              Selesai & Tutup
            </button>
          </div>
        </div>
      </div>

      {/* Delete Employee Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(employeeToDelete)}
        title="Hapus Data Karyawan"
        message={`Apakah Anda yakin ingin menghapus data personil "${employeeToDelete?.name}" (${employeeToDelete?.position} - ${employeeToDelete?.department})?`}
        confirmText="Ya, Hapus Personil"
        isDestructive={true}
        onConfirm={() => {
          if (employeeToDelete) {
            onDeleteEmployee(employeeToDelete.id);
            setEmployeeToDelete(null);
          }
        }}
        onCancel={() => setEmployeeToDelete(null)}
      />
    </div>
  );
};
