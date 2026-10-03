import React, { useState, useRef, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Crown, 
  ShieldCheck, 
  Wrench, 
  Search,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Sliders,
  Shield,
  FileText,
  Package,
  ArrowUpRight,
  ArrowDownLeft,
  HandHelping,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Sparkles,
  Info,
  Layers,
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import { UserAccount, UserRole, UserPermissions, Employee } from '../types';
import { DEPARTMENTS } from '../data/initialData';
import { ConfirmationModal } from './ConfirmationModal';
import { recordDeletedUserId, getDeletedUserIds, isUserDeleted } from '../utils/firebaseSync';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserAccount[];
  currentUser: UserAccount;
  employees?: Employee[];
  onAddUser: (user: UserAccount) => void | Promise<void>;
  onUpdateUser: (user: UserAccount) => void | Promise<void>;
  onDeleteUser: (userId: string) => void | Promise<void>;
  rolePermissions?: Record<UserRole, UserPermissions>;
  onUpdateRolePermissions?: (newPermissions: Record<UserRole, UserPermissions>) => void;
}

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  MASTER_ADMIN: {
    canManageMasterStock: true,
    canAddNewItem: true,
    canEditStockItem: true,
    canDeleteStockItem: true,
    canResetStock: true,
    canCreateRequests: true,
    canApproveRequests: true,
    canDispatchGoods: true,
    canReceiveIncomingGoods: true,
    canManageLoans: true,
    canDeleteLoanRecords: true,
    canDeleteTransactionHistory: true,
    canClearLogs: true,
    canExportImportExcel: true,
    canManageEmployees: true,
    canPrintBarcodes: true,
    canEditSettings: true,
    canConfigureDashboard: true,
    canManageUsers: true,
    canViewAuditTrail: true,
  },
  ADMIN: {
    canManageMasterStock: true,
    canAddNewItem: false,
    canEditStockItem: false,
    canDeleteStockItem: false,
    canResetStock: false,
    canCreateRequests: true,
    canApproveRequests: true,
    canDispatchGoods: true,
    canReceiveIncomingGoods: true,
    canManageLoans: true,
    canDeleteLoanRecords: false,
    canDeleteTransactionHistory: false,
    canClearLogs: false,
    canExportImportExcel: true,
    canManageEmployees: true,
    canPrintBarcodes: true,
    canEditSettings: true,
    canConfigureDashboard: false,
    canManageUsers: false,
    canViewAuditTrail: false,
  },
  USER_OPERATIONAL: {
    canManageMasterStock: false,
    canAddNewItem: false,
    canEditStockItem: false,
    canDeleteStockItem: false,
    canResetStock: false,
    canCreateRequests: true,
    canApproveRequests: false,
    canDispatchGoods: true,
    canReceiveIncomingGoods: true,
    canManageLoans: true,
    canDeleteLoanRecords: false,
    canDeleteTransactionHistory: false,
    canClearLogs: false,
    canExportImportExcel: false,
    canManageEmployees: false,
    canPrintBarcodes: true,
    canEditSettings: false,
    canConfigureDashboard: false,
    canManageUsers: false,
    canViewAuditTrail: false,
  },
};

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  employees = [],
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  rolePermissions = DEFAULT_ROLE_PERMISSIONS,
  onUpdateRolePermissions,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'accounts' | 'matrix'>('accounts');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form states
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('USER_OPERATIONAL');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isNameDropdownOpen, setIsNameDropdownOpen] = useState(false);
  const nameDropdownRef = useRef<HTMLDivElement>(null);

  // Show password state mapping (Master Admin only)
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Matrix state
  const [localMatrix, setLocalMatrix] = useState<Record<UserRole, UserPermissions>>(rolePermissions);
  const [matrixSaveSuccess, setMatrixSaveSuccess] = useState(false);

  useEffect(() => {
    if (rolePermissions) {
      setLocalMatrix(rolePermissions);
    }
  }, [rolePermissions]);

  // Delete modal state
  const [userToDelete, setUserToDelete] = useState<UserAccount | null>(null);

  // Close employee dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (nameDropdownRef.current && !nameDropdownRef.current.contains(event.target as Node)) {
        setIsNameDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const isMasterAdmin = currentUser.role === 'MASTER_ADMIN';

  // Toggle password visibility (Master Admin only)
  const togglePasswordVisibility = (userId: string) => {
    if (!isMasterAdmin) return;
    setVisiblePasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleCopyPassword = (userId: string, pass?: string) => {
    if (!isMasterAdmin || !pass) return;
    navigator.clipboard.writeText(pass);
    setCopiedId(userId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // When an employee is chosen from the database
  const handleSelectEmployee = (emp: Employee) => {
    setFullName(emp.name);
    
    // Auto connect department if matching or default
    if (emp.department) {
      const matchDept = DEPARTMENTS.find((d) => d.toLowerCase() === emp.department.toLowerCase()) || emp.department;
      setDepartment(matchDept);
    }

    // Auto suggest clean username
    const suggestedUser = emp.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '.')
      .replace(/\.+/g, '.')
      .replace(/^\.|\.$/g, '');
    
    if (!username || username.startsWith('user.')) {
      setUsername(suggestedUser || 'user.baru');
    }
    setIsNameDropdownOpen(false);
  };

  const filteredEmployees = employees.filter((e) => {
    const term = fullName.toLowerCase();
    return (
      e.name.toLowerCase().includes(term) ||
      e.position.toLowerCase().includes(term) ||
      (e.department && e.department.toLowerCase().includes(term))
    );
  });

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isMasterAdmin) {
      setFormError('Hanya Master Admin yang memiliki wewenang membuat akun.');
      return;
    }

    if (!username.trim()) {
      setFormError('Username login wajib diisi.');
      return;
    }
    if (!fullName.trim()) {
      setFormError('Nama lengkap pengguna wajib diisi.');
      return;
    }
    if (!password.trim()) {
      setFormError('Password login wajib ditentukan.');
      return;
    }

    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '.');
    const existing = users.find((u) => u.username.toLowerCase() === cleanUsername);
    if (existing) {
      setFormError(`Username "${cleanUsername}" sudah digunakan oleh pengguna lain.`);
      return;
    }

    const newUser: UserAccount = {
      id: `user-${Date.now()}`,
      username: cleanUsername,
      fullName: fullName.trim(),
      password: password.trim(),
      role,
      department,
      status: 'ACTIVE',
      permissions: localMatrix[role] || DEFAULT_ROLE_PERMISSIONS[role],
      createdAt: new Date().toISOString(),
    };

    try {
      await onAddUser(newUser);
      setUsername('');
      setFullName('');
      setPassword('');
      setIsAdding(false);
    } catch (err: any) {
      setFormError('Gagal mendaftarkan akun: ' + (err?.message || 'Terjadi kesalahan'));
    }
  };

  const handleStartEdit = (user: UserAccount) => {
    if (!isMasterAdmin) return;
    setEditingUserId(user.id);
    setUsername(user.username);
    setFullName(user.fullName);
    setPassword(user.password || 'MasterSecret2026!');
    setRole(user.role);
    setDepartment(user.department || DEPARTMENTS[0]);
    setIsAdding(false);
  };

  const handleSaveEdit = async (userId: string) => {
    if (!isMasterAdmin) return;
    setFormError(null);
    if (!fullName.trim()) {
      setFormError('Nama lengkap pengguna wajib diisi.');
      return;
    }

    const existing = users.find((u) => u.id === userId);
    if (!existing) return;

    try {
      await onUpdateUser({
        ...existing,
        fullName: fullName.trim(),
        password: password.trim() || existing.password || 'MasterSecret2026!',
        role,
        department,
        permissions: localMatrix[role] || DEFAULT_ROLE_PERMISSIONS[role],
      });

      setEditingUserId(null);
    } catch (err: any) {
      setFormError('Gagal memperbarui akun: ' + (err?.message || 'Terjadi kesalahan'));
    }
  };

  // Matrix checkbox toggle by Master Admin (Requirement 3 & 12)
  const handleTogglePermission = (targetRole: UserRole, permKey: keyof UserPermissions) => {
    if (!isMasterAdmin) return;

    const currentPerms = localMatrix[targetRole] || DEFAULT_ROLE_PERMISSIONS[targetRole];
    const updated: Record<UserRole, UserPermissions> = {
      ...localMatrix,
      [targetRole]: {
        ...currentPerms,
        [permKey]: !currentPerms[permKey],
      },
    };

    setLocalMatrix(updated);
    if (onUpdateRolePermissions) {
      onUpdateRolePermissions(updated);
    }

    setMatrixSaveSuccess(true);
    setTimeout(() => setMatrixSaveSuccess(false), 2500);
  };

  const permissionDefinitions: Array<{
    key: keyof UserPermissions;
    label: string;
    description: string;
    icon: React.ElementType;
    group: string;
  }> = [
    {
      key: 'canManageMasterStock',
      label: 'Kelola Master Stok (Umum)',
      description: 'Melihat dan mengelola modul katalog master stok barang gudang GA.',
      icon: Package,
      group: 'Master Barang & Barcode',
    },
    {
      key: 'canAddNewItem',
      label: 'Tambah Barang Baru',
      description: 'Menambah item atau SKU barang baru ke database master persediaan.',
      icon: Package,
      group: 'Master Barang & Barcode',
    },
    {
      key: 'canEditStockItem',
      label: 'Edit Data Barang (Tanda Pensil)',
      description: 'Menampilkan tombol tanda pensil untuk mengubah nama, kategori, satuan, lokasi, dan min stok barang.',
      icon: Sliders,
      group: 'Master Barang & Barcode',
    },
    {
      key: 'canDeleteStockItem',
      label: 'Hapus Barang Stock (Tanda Hapus)',
      description: 'Menampilkan tombol tanda hapus untuk menghapus item barang dari master stok gudang.',
      icon: Trash2,
      group: 'Master Barang & Barcode',
    },
    {
      key: 'canResetStock',
      label: 'Reset Stock Gudang',
      description: 'Mengosongkan atau mereset kuantitas stok barang ke kondisi awal / 0.',
      icon: RotateCcw,
      group: 'Master Barang & Barcode',
    },
    {
      key: 'canPrintBarcodes',
      label: 'Cetak Label Barcode & QR',
      description: 'Mencetak lembar barcode SKU barang untuk labelisasi rak dan kemasan.',
      icon: Printer,
      group: 'Master Barang & Barcode',
    },
    {
      key: 'canCreateRequests',
      label: 'Buat Pengajuan Permintaan Keluar',
      description: 'Mengisi formulir permohonan barang keluar dari gudang GA.',
      icon: ArrowUpRight,
      group: 'Permintaan & Serah Terima',
    },
    {
      key: 'canApproveRequests',
      label: 'Approval / Verifikasi Permintaan',
      description: 'Memberikan persetujuan (Approve) atau menolak formulir permintaan barang divisi.',
      icon: ShieldCheck,
      group: 'Permintaan & Serah Terima',
    },
    {
      key: 'canDispatchGoods',
      label: 'Serah Terima Fisik Barang Keluar',
      description: 'Menyerahkan fisik barang kepada peminta setelah status permintaan Disetujui.',
      icon: CheckCircle2,
      group: 'Permintaan & Serah Terima',
    },
    {
      key: 'canReceiveIncomingGoods',
      label: 'Pencatatan Penerimaan Barang Masuk',
      description: 'Input barang masuk dari supplier/distributor, restok kuantitas dan update stok.',
      icon: ArrowDownLeft,
      group: 'Barang Masuk & Alat',
    },
    {
      key: 'canManageLoans',
      label: 'Peminjaman & Pengembalian Alat GA',
      description: 'Mencatat peminjaman inventaris kantor (proyektor, tangga, bor, kabel, dsb).',
      icon: HandHelping,
      group: 'Barang Masuk & Alat',
    },
    {
      key: 'canDeleteLoanRecords',
      label: 'Hapus Catatan Peminjaman',
      description: 'Menghapus satu per satu atau mereset seluruh catatan riwayat peminjaman alat.',
      icon: Trash2,
      group: 'Barang Masuk & Alat',
    },
    {
      key: 'canDeleteTransactionHistory',
      label: 'Hapus Riwayat Transaksi (Tanda Hapus Baris)',
      description: 'Menampilkan ikon tanda hapus sampah pada setiap baris rekaman di Riwayat Transaksi.',
      icon: Trash2,
      group: 'Administrasi Data',
    },
    {
      key: 'canClearLogs',
      label: 'Bersihkan Log & Riwayat Mutasi (Tombol Bersihkan)',
      description: 'Menampilkan tombol tanda "Bersihkan Log" untuk mengosongkan arsip transaksi dan riwayat mutasi.',
      icon: RotateCcw,
      group: 'Administrasi Data',
    },
    {
      key: 'canExportImportExcel',
      label: 'Export & Import Excel / CSV',
      description: 'Download rekap data inventaris serta import data dari file spreadsheet.',
      icon: Download,
      group: 'Administrasi Data',
    },
    {
      key: 'canManageEmployees',
      label: 'Kelola Database Personil & Karyawan',
      description: 'Menambah, mengedit, dan sinkronisasi database personil staf perusahaan.',
      icon: Users,
      group: 'Administrasi Data',
    },
    {
      key: 'canEditSettings',
      label: 'Pengaturan Preferensi & Tampilan',
      description: 'Menyesuaikan konfigurasi kartu ringkasan, widget dan preferensi tampilan.',
      icon: Sliders,
      group: 'Administrasi Data',
    },
    {
      key: 'canConfigureDashboard',
      label: 'Konfigurasi Dashboard & Tema (Master Admin)',
      description: 'Mengubah konfigurasi tema visual, font, tata letak, dan kunci laporan pada dashboard.',
      icon: Sliders,
      group: 'Keamanan & Otoritas Sistem',
    },
    {
      key: 'canManageUsers',
      label: 'Kelola Akun, Password & Matriks RBAC',
      description: 'Membuat akun pengguna, ubah password, dan mengedit hak akses seluruh sistem.',
      icon: KeyRound,
      group: 'Keamanan & Otoritas Sistem',
    },
    {
      key: 'canViewAuditTrail',
      label: 'Audit Trail & Log Aktivitas Sistem',
      description: 'Melihat rekam jejak aktivitas operasional dan keamanan secara detail.',
      icon: FileText,
      group: 'Keamanan & Otoritas Sistem',
    },
  ];

  const activeNonDeletedUsers = users.filter((u) => {
    const delSet = new Set(getDeletedUserIds());
    return !isUserDeleted(u, delSet);
  });

  const filteredUsers = activeNonDeletedUsers.filter((u) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      u.fullName.toLowerCase().includes(term) ||
      u.username.toLowerCase().includes(term) ||
      u.role.toLowerCase().includes(term) ||
      (u.department && u.department.toLowerCase().includes(term))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header with Glossy Accent */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-b from-amber-400/30 to-amber-600/20 text-amber-400 rounded-xl border border-amber-400/40 shadow-inner ring-1 ring-white/20 shrink-0">
              <Users className="w-5 h-5 drop-shadow-xs" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-base text-white">
                  Manajemen Akun, Password & Hak Akses
                </h3>
                {isMasterAdmin ? (
                  <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[10px] font-extrabold rounded-full flex items-center gap-1 shadow-xs">
                    <Crown className="w-3 h-3" /> Master Admin (Akses Penuh)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/40 text-[10px] font-bold rounded-full flex items-center gap-1 shadow-xs">
                    <ShieldCheck className="w-3 h-3" /> Akses Terbatas (Read-Only)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Kelola akun pengguna, password login, dan konfigurasi hak akses modul sistem
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Subtab Navigation */}
        <div className="px-4 sm:px-5 py-2.5 bg-slate-100/90 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveSubTab('accounts')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeSubTab === 'accounts'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>Daftar Akun & Password ({activeNonDeletedUsers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('matrix')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeSubTab === 'matrix'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-amber-600" />
              <span>Matriks Hak Akses (RBAC)</span>
            </button>
          </div>

          {activeSubTab === 'accounts' && !isAdding && isMasterAdmin && (
            <button
              type="button"
              onClick={() => {
                setIsAdding(true);
                setEditingUserId(null);
                setUsername('');
                setFullName('');
                setPassword('GA' + Math.floor(1000 + Math.random() * 9000) + '!');
                setRole('USER_OPERATIONAL');
                setDepartment(DEPARTMENTS[0]);
              }}
              className="w-full sm:w-auto px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Tambah Akun Baru</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
          {activeSubTab === 'accounts' ? (
            <>
              {/* Form Tambah Akun (Requirement 2: Database Karyawan connect otomatis) */}
              {isAdding && (
                <form onSubmit={handleSaveNew} className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                    <span className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-amber-600" />
                      Form Tambah Akun Pengguna Baru
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAdding(false)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Batal ✕
                    </button>
                  </div>

                  {formError && (
                    <div className="text-xs text-rose-700 font-bold bg-rose-50 p-2.5 rounded-xl border border-rose-200 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Nama Lengkap with integrated database employee combobox */}
                    <div className="relative" ref={nameDropdownRef}>
                      <label className="h-5 flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                        <span>Nama Lengkap <span className="text-rose-500">*</span></span>
                        <span className="text-[#1B5E20] text-[10px] font-bold hidden xl:inline">(Pilih Database / Ketik)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          placeholder="Pilih atau ketik nama..."
                          value={fullName}
                          onFocus={() => setIsNameDropdownOpen(true)}
                          onChange={(e) => {
                            setFullName(e.target.value);
                            setIsNameDropdownOpen(true);
                          }}
                          className="w-full h-9 pl-3 pr-8 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500"
                        />
                        <ChevronDown 
                          onClick={() => setIsNameDropdownOpen(!isNameDropdownOpen)}
                          className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer" 
                        />
                      </div>

                      {/* Dropdown Database Karyawan */}
                      {isNameDropdownOpen && employees.length > 0 && (
                        <div className="absolute z-40 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100 animate-in fade-in-50 duration-100">
                          {filteredEmployees.length === 0 ? (
                            <div className="p-2.5 text-center text-xs text-slate-500">
                              Karyawan tidak ditemukan di database (bisa lanjut ketik manual)
                            </div>
                          ) : (
                            filteredEmployees.map((emp) => (
                              <button
                                key={emp.id}
                                type="button"
                                onClick={() => handleSelectEmployee(emp)}
                                className="w-full text-left p-2 hover:bg-amber-50 flex items-center justify-between text-xs transition-colors cursor-pointer"
                              >
                                <div>
                                  <div className="font-bold text-slate-800">{emp.name}</div>
                                  <div className="text-[10px] text-slate-500">
                                    {emp.position} • <span className="font-semibold text-amber-700">{emp.department || 'GA'}</span>
                                  </div>
                                </div>
                                <span className="text-[10px] font-bold bg-[#E8F5E9] text-[#1B5E20] px-2 py-0.5 rounded">
                                  Pilih
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="h-5 flex items-center text-[11px] font-bold text-slate-700 mb-1">
                        <span>Username Login <span className="text-rose-500">*</span></span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="contoh: rudi.hartono"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full h-9 px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-mono focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="h-5 flex items-center text-[11px] font-bold text-slate-700 mb-1">
                        <span>Password Akun <span className="text-rose-500">*</span></span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Password login..."
                          className="w-full h-9 px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => setPassword('GA' + Math.floor(1000 + Math.random() * 9000) + '!')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-amber-700 font-bold bg-amber-100 hover:bg-amber-200 px-1.5 py-0.5 rounded cursor-pointer"
                        >
                          Acak
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Role & Wewenang <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as UserRole)}
                        className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white"
                      >
                        <option value="USER_OPERATIONAL">USER OPERATIONAL (Staf Gudang & Serah Terima)</option>
                        <option value="ADMIN">ADMIN (Pengawas, Validator & Approval Permintaan)</option>
                        <option value="MASTER_ADMIN">MASTER ADMIN (Kekuasaan Penuh Seluruh Sistem)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Departemen / Divisi (Terhubung Otomatis)
                      </label>
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white"
                      >
                        {DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAdding(false)}
                      className="px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-xl cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-black text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-xs cursor-pointer"
                    >
                      Simpan Akun
                    </button>
                  </div>
                </form>
              )}

              {/* Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari user, nama, role, divisi..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="text-[11px] text-slate-600 flex items-center gap-1.5 font-medium">
                  <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    {isMasterAdmin 
                      ? 'Master Admin dapat melihat & mengedit password seluruh akun.' 
                      : 'Hanya Master Admin yang dapat melihat password & mengedit akun.'}
                  </span>
                </div>
              </div>

              {/* Elongated Horizontal User Account List */}
              <div className="space-y-2.5">
                {filteredUsers.map((user) => {
                  const isSelf = user.id === currentUser.id;
                  const isEditing = editingUserId === user.id;
                  const isPasswordVisible = Boolean(visiblePasswords[user.id]);
                  const userPassword = user.password || 'MasterSecret2026!';

                  if (isEditing && isMasterAdmin) {
                    return (
                      <div key={user.id} className="p-3.5 bg-blue-50/80 rounded-xl border-2 border-blue-400 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-blue-950">Edit Data Akun: {user.fullName}</span>
                          <button
                            type="button"
                            onClick={() => setEditingUserId(null)}
                            className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                          >
                            ✕ Batal
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                          <div className="relative">
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Nama Lengkap</label>
                            <input
                              type="text"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Password</label>
                            <input
                              type="text"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Role</label>
                            <select
                              value={role}
                              onChange={(e) => setRole(e.target.value as UserRole)}
                              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                            >
                              <option value="USER_OPERATIONAL">USER OPERATIONAL</option>
                              <option value="ADMIN">ADMIN</option>
                              <option value="MASTER_ADMIN">MASTER ADMIN</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Departemen</label>
                            <select
                              value={department}
                              onChange={(e) => setDepartment(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                            >
                              {DEPARTMENTS.map((d) => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingUserId(null)}
                            className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(user.id)}
                            className="px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
                          >
                            Simpan Perubahan
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={user.id}
                      className={`p-3 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                        isSelf 
                          ? 'bg-blue-50/50 border-blue-300 shadow-2xs' 
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      {/* Left: User Avatar & Details with Glossy Accent */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-inner ring-1 ring-white/30 drop-shadow-xs ${
                          user.role === 'MASTER_ADMIN'
                            ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 text-white'
                            : user.role === 'ADMIN'
                            ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-blue-800 text-white'
                            : 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-800 text-white'
                        }`}>
                          {user.role === 'MASTER_ADMIN' ? (
                            <Crown className="w-4 h-4" />
                          ) : user.role === 'ADMIN' ? (
                            <ShieldCheck className="w-4 h-4" />
                          ) : (
                            <Wrench className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">{user.fullName}</h4>
                            {isSelf && (
                              <span className="text-[9px] bg-blue-100 text-blue-800 font-extrabold px-1.5 py-0.2 rounded-full">
                                Akun Anda
                              </span>
                            )}
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md tracking-wider uppercase border ${
                              user.role === 'MASTER_ADMIN'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : user.role === 'ADMIN'
                                ? 'bg-blue-100 text-blue-900 border-blue-300'
                                : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            }`}>
                              {user.role.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            @{user.username} • {user.department || 'General Affairs'}
                          </p>
                        </div>
                      </div>

                      {/* Middle: Elongated Password Bar (Requirement 5: Admin & Ops cannot see passwords) */}
                      <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0">
                        <KeyRound className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-[10px] font-bold text-slate-500">Password:</span>
                        {isMasterAdmin ? (
                          <span className="font-mono text-xs font-bold text-slate-800 tracking-wider">
                            {isPasswordVisible ? userPassword : '••••••••••••'}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-slate-400 tracking-widest">
                            ••••••••••••
                          </span>
                        )}

                        {isMasterAdmin && (
                          <div className="flex items-center gap-1 ml-1 border-l border-slate-200 pl-1.5">
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(user.id)}
                              title={isPasswordVisible ? 'Sembunyikan' : 'Lihat password'}
                              className="p-1 hover:bg-slate-200 text-slate-600 rounded cursor-pointer"
                            >
                              {isPasswordVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyPassword(user.id, userPassword)}
                              title="Salin password"
                              className="p-1 hover:bg-slate-200 text-slate-600 rounded cursor-pointer"
                            >
                              {copiedId === user.id ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Right: Actions (Requirement 5: Only Master Admin can edit other accounts) */}
                      {isMasterAdmin && (
                        <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(user)}
                            className="px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50 rounded-lg flex items-center gap-1 transition-colors cursor-pointer border border-blue-200"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => setUserToDelete(user)}
                            className="px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-lg flex items-center gap-1 transition-colors cursor-pointer border border-rose-200 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Tab 2: Matriks Hak Akses & Wewenang (RBAC Checklist Table with Master Admin edit capability - Req 3, 6, 7, 12) */
            <div className="space-y-4">
              {/* Notification Banner */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 text-white text-xs">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-400/30">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm">Matriks Hak Akses Modul Sistem (RBAC)</span>
                    <p className="text-[11px] text-slate-300">
                      {isMasterAdmin 
                        ? 'Master Admin dapat mencentang / uncheck izin modul untuk masing-masing role langsung di bawah ini.' 
                        : 'Daftar rincian wewenang setiap role. Pengaturan hak akses hanya dapat diubah oleh Master Admin.'}
                    </p>
                  </div>
                </div>

                {matrixSaveSuccess && (
                  <span className="px-2.5 py-1 bg-emerald-500 text-white text-[11px] font-extrabold rounded-lg animate-in fade-in flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 stroke-[3]" /> Tersimpan
                  </span>
                )}
              </div>

              {/* Simple & Beautiful RBAC Matrix Table - Scrollable for mobile */}
              <div className="rounded-2xl border border-slate-200 overflow-x-auto bg-white shadow-xs">
                <table className="w-full min-w-[550px] text-left text-xs">
                  <thead className="bg-slate-100 text-slate-800 font-extrabold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 w-1/2">Modul & Deskripsi Hak Akses</th>
                      <th className="py-3 px-3 text-center w-1/6">
                        <div className="flex flex-col items-center">
                          <span className="text-amber-800 font-black flex items-center gap-1">
                            <Crown className="w-3.5 h-3.5 text-amber-600" /> Master Admin
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal">Kekuasaan Penuh</span>
                        </div>
                      </th>
                      <th className="py-3 px-3 text-center w-1/6">
                        <div className="flex flex-col items-center">
                          <span className="text-blue-800 font-black flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Admin GA
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal">Approval & Verifikasi</span>
                        </div>
                      </th>
                      <th className="py-3 px-3 text-center w-1/6">
                        <div className="flex flex-col items-center">
                          <span className="text-emerald-800 font-black flex items-center gap-1">
                            <Wrench className="w-3.5 h-3.5 text-emerald-600" /> User Ops
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal">Operasional Gudang</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {permissionDefinitions.map((perm) => {
                      const Icon = perm.icon;
                      const isMasterChecked = Boolean(localMatrix.MASTER_ADMIN?.[perm.key]);
                      const isAdminChecked = Boolean(localMatrix.ADMIN?.[perm.key]);
                      const isOpsChecked = Boolean(localMatrix.USER_OPERATIONAL?.[perm.key]);

                      return (
                        <tr key={perm.key} className="hover:bg-slate-50/80 transition-colors">
                          {/* Module info */}
                          <td className="py-3 px-4">
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-gradient-to-b from-slate-100 to-slate-200 text-slate-700 rounded-xl shrink-0 mt-0.5 shadow-2xs border border-slate-200">
                                <Icon className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                                  {perm.label}
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                  {perm.description}
                                </p>
                                <span className="inline-block mt-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-1.5 py-0.2 rounded">
                                  {perm.group}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Master Admin Checkbox */}
                          <td className="py-3 px-3 text-center align-middle">
                            <label className={`inline-flex items-center justify-center p-2 rounded-xl border transition-all ${
                              isMasterChecked 
                                ? 'bg-amber-50 border-amber-300 text-amber-900' 
                                : 'bg-slate-50 border-slate-200 text-slate-400'
                            } ${isMasterAdmin ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed opacity-90'}`}>
                              <input
                                type="checkbox"
                                checked={isMasterChecked}
                                disabled={!isMasterAdmin}
                                onChange={() => handleTogglePermission('MASTER_ADMIN', perm.key)}
                                className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                              />
                            </label>
                          </td>

                          {/* Admin GA Checkbox */}
                          <td className="py-3 px-3 text-center align-middle">
                            <label className={`inline-flex items-center justify-center p-2 rounded-xl border transition-all ${
                              isAdminChecked 
                                ? 'bg-blue-50 border-blue-300 text-blue-900' 
                                : 'bg-slate-50 border-slate-200 text-slate-400'
                            } ${isMasterAdmin ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed opacity-90'}`}>
                              <input
                                type="checkbox"
                                checked={isAdminChecked}
                                disabled={!isMasterAdmin}
                                onChange={() => handleTogglePermission('ADMIN', perm.key)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                            </label>
                          </td>

                          {/* User Ops Checkbox */}
                          <td className="py-3 px-3 text-center align-middle">
                            <label className={`inline-flex items-center justify-center p-2 rounded-xl border transition-all ${
                              isOpsChecked 
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                                : 'bg-slate-50 border-slate-200 text-slate-400'
                            } ${isMasterAdmin ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed opacity-90'}`}>
                              <input
                                type="checkbox"
                                checked={isOpsChecked}
                                disabled={!isMasterAdmin}
                                onChange={() => handleTogglePermission('USER_OPERATIONAL', perm.key)}
                                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                              />
                            </label>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* RBAC Info Card */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <b>Catatan Keamanan:</b> Perubahan matriks hak akses akan langsung diterapkan ke seluruh akun yang memiliki role terkait. Hanya akun dengan wewenang <b>Master Admin</b> yang memiliki hak untuk mengubah konfigurasi keamanan ini.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs px-5">
          <span className="text-slate-500 font-mono text-[11px]">
            User aktif: <strong className="text-slate-800 font-bold">{currentUser.fullName}</strong> ({currentUser.role})
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all cursor-pointer shadow-xs"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Delete User Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(userToDelete)}
        title="Hapus Akun Pengguna"
        message={`Apakah Anda yakin ingin menghapus akun pengguna "${userToDelete?.fullName}" (@${userToDelete?.username})?`}
        confirmText="Ya, Hapus Akun"
        isDestructive={true}
        onConfirm={() => {
          if (userToDelete) {
            recordDeletedUserId(userToDelete.id, userToDelete.username, userToDelete.fullName);
            onDeleteUser(userToDelete.id);
            setUserToDelete(null);
          }
        }}
        onCancel={() => setUserToDelete(null)}
      />
    </div>
  );
};
