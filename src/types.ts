export type UserRole = 'MASTER_ADMIN' | 'ADMIN' | 'USER_OPERATIONAL';

export interface UserPermissions {
  canManageMasterStock: boolean;     // Tambah/Edit/Hapus Master Barang
  canAddNewItem: boolean;            // Tambah Barang Baru
  canEditStockItem: boolean;         // Edit Data Barang
  canDeleteStockItem: boolean;       // Hapus Barang Stock
  canResetStock: boolean;            // Reset Stock Gudang
  canCreateRequests: boolean;        // Buat Pengajuan Permintaan Barang
  canApproveRequests: boolean;       // Setujui / Tolak Permintaan Barang
  canDispatchGoods: boolean;         // Serah Terima / Keluarkan Barang
  canReceiveIncomingGoods: boolean;  // Catat Penerimaan Barang Masuk
  canManageLoans: boolean;           // Peminjaman & Pengembalian Alat
  canDeleteLoanRecords: boolean;     // Hapus Catatan Peminjaman
  canDeleteTransactionHistory: boolean; // Hapus Transaksi Riwayat
  canClearLogs: boolean;             // Bersihkan Log
  canExportImportExcel: boolean;     // Export/Import Excel & CSV
  canManageEmployees: boolean;       // Kelola Database Karyawan
  canPrintBarcodes: boolean;         // Cetak Label Barcode
  canEditSettings: boolean;          // Pengaturan Dashboard
  canConfigureDashboard: boolean;     // Konfigurasi Dashboard & Tema (Master Admin)
  canManageUsers: boolean;           // Kelola Akun & Hak Akses
  canViewAuditTrail: boolean;        // Lihat Audit Trail
}

export interface UserAccount {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  password?: string;                 // Password akun (hanya terlihat oleh Master Admin)
  pin?: string;
  avatarUrl?: string;
  department?: string;
  status: 'ACTIVE' | 'INACTIVE';
  permissions?: Partial<UserPermissions>;
  createdAt: string;
  lastLogin?: string;
}

export interface Item {
  id: string;
  code: string; // Barcode / SKU, e.g., GA-ATK-001
  name: string;
  category: Category;
  unit: string; // Rim, Pcs, Box, Pack, Botol, Roll, Set, Unit
  currentStock: number;
  minStock: number;
  rackLocation: string; // e.g. Rak A-02, Lemari B
  description?: string;
  priceEstimate?: number;
  assetType?: 'CONSUMABLE' | 'FIXED_ASSET' | 'TOOL_EQUIPMENT';
  createdAt: string;
  updatedAt: string;
}

export type Category = string;

export type Department =
  | 'BARGE & LOGISTIC'
  | 'HRGA'
  | 'HSE'
  | 'LOGISTIC'
  | 'MAINTENANCE'
  | 'OPERATION'
  | 'QUALITY CONTROL'
  | 'General Affairs (GA)'
  | 'Human Resources (HRD)'
  | 'Information Technology (IT)'
  | 'Finance & Accounting'
  | 'Operasional & Produksi'
  | 'Logistik & Ekspedisi'
  | 'Mess Manager & Resident'
  | 'Management / Direksi';

export interface Employee {
  id: string;
  name: string; // Nama Karyawan
  position: string; // Jabatan / Posisi
  department?: string; // Departemen / Divisi
  notes?: string; // Keterangan tambahan
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RequestItemEntry {
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  quantity: number;
  currentStock: number;
}

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export interface ApprovalInfo {
  status: 'APPROVED' | 'REJECTED';
  approvedBy: string;
  approverRole: UserRole;
  approvedAt: string;
  notes?: string;
}

export interface Transaction {
  id: string;
  type: 'IN' | 'OUT'; // IN: Masuk, OUT: Keluar / Permintaan
  transactionNumber: string; // e.g. REQ-GA-20260829-001 or TRX-IN-20260829-001
  date?: string; // ISO date string
  dateFormatted?: string; // System auto-formatted Indonesian date
  timeFormatted?: string; // Realtime time
  timestamp?: string; // Full ISO / SQL timestamp
  updatedAt?: string;
  
  // Barang details
  items: {
    itemId: string;
    itemCode: string;
    itemName: string;
    category?: Category | string;
    unit: string;
    quantity: number;
  }[];

  // For Barang Keluar / Permintaan
  requesterName?: string; // Nama Petugas / Peminta Barang
  requesterPosition?: string; // Jabatan Peminta Barang
  department?: Department | string; // Departemen Peminta
  purposeDescription?: string; // Keterangan Keperluan
  purpose?: string;
  
  // Status & Approval workflow
  status?: RequestStatus;
  approvalInfo?: ApprovalInfo;
  dispatchedBy?: string;
  dispatchedAt?: string;
  processedBy?: string;

  // For Barang Masuk & Keluar
  poNumber?: string; // Nomor PO (Purchase Order) / Surat Jalan
  supplier?: string;
  documentNumber?: string; // No. PO / Surat Jalan
  receivedByOfficer?: string; // Nama Petugas GA Penerima
  receivedBy?: string;
  
  notes?: string;
}

export type LoanStatus = 'BORROWED' | 'RETURNED' | 'OVERDUE' | 'DAMAGED_LOST';

export interface ItemLoan {
  id: string;
  loanNumber: string; // e.g. PINJAM-GA-20260830-001
  itemId: string;
  itemCode: string;
  itemName: string;
  category: Category;
  unit: string;
  quantity: number;
  borrowerName: string;
  borrowerPosition: string;
  borrowerDepartment: string;
  borrowerPhone?: string;
  loanDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  purpose: string;
  status: LoanStatus;
  approvedBy?: string;
  issuedBy: string;
  receivedReturnBy?: string;
  returnCondition?: 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT' | 'HILANG';
  returnNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details: string;
  targetModule: 'STOCK' | 'TRANSACTIONS' | 'LOANS' | 'USERS' | 'SETTINGS' | 'EMPLOYEES';
}

export type ThemeColor = 
  | 'navy' 
  | 'emerald' 
  | 'amber' 
  | 'slate' 
  | 'crimson' 
  | 'violet'
  | 'soft-sage'
  | 'soft-sky'
  | 'soft-lavender'
  | 'soft-peach'
  | 'soft-rose'
  | 'soft-mint'
  | 'soft-amber';

export type FontFamily = 'plus-jakarta' | 'inter' | 'roboto' | 'poppins' | 'jetbrains';
export type DashboardDensity = 'compact' | 'normal' | 'spacious';
export type ThemeMode = 'light' | 'slate' | 'dark';

export type NotificationSound = 
  | 'chime_modern' 
  | 'marimba_bell' 
  | 'futuristic_ding' 
  | 'subtle_pop' 
  | 'urgent_alert' 
  | 'elevator_ding' 
  | 'crystal_shine' 
  | 'radar_ping'
  | 'retro_arcade'
  | 'zen_bowl'
  | 'harpa_celeste'
  | 'cash_register'
  | 'whistle_bright'
  | 'cyber_synth'
  | 'kalimba_dream'
  | 'magic_sparkle';

export interface DashboardConfig {
  themeColor: ThemeColor;
  fontFamily: FontFamily;
  density: DashboardDensity;
  mode: ThemeMode;
  appName: string;
  companySubtitle: string;
  logoUrl: string | null;
  reportLocked: boolean;
  reportLockedPeriod?: string;
  autoApproveRequests: boolean;
  notificationSound?: NotificationSound;
  showMetricCards?: {
    totalItems: boolean;
    outTransactions: boolean;
    inTransactions: boolean;
    lowStockAlert: boolean;
  };
}

export interface QuickScanResult {
  code: string;
  item?: Item;
}

