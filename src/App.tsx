import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  LayoutDashboard, 
  Printer, 
  Menu, 
  X, 
  Bell,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Image as ImageIcon,
  Users,
  ShieldCheck,
  Crown,
  Wrench,
  Sparkles,
  SlidersHorizontal,
  FileSpreadsheet,
  ScanLine,
  FileCheck2,
  Lock,
  Layers,
  Search,
  LogOut,
  HandHelping,
  RefreshCw,
  Cloud
} from 'lucide-react';
import { 
  Item, 
  Transaction, 
  Employee, 
  UserAccount, 
  ItemLoan, 
  AuditLogEntry, 
  DashboardConfig, 
  UserRole,
  UserPermissions 
} from './types';
import { 
  CATEGORIES,
  INITIAL_ITEMS,
  INITIAL_TRANSACTIONS, 
  INITIAL_EMPLOYEES, 
  INITIAL_USERS, 
  INITIAL_LOANS, 
  INITIAL_AUDIT_LOGS, 
  DEFAULT_DASHBOARD_CONFIG 
} from './data/initialData';

import { DashboardOverview } from './components/DashboardOverview';
import { SubHeaderNavigation, MainTabType } from './components/SubHeaderNavigation';
import { ItemRequestView } from './components/ItemRequestView';
import { IncomingGoodsView } from './components/IncomingGoodsView';
import { ItemMasterView } from './components/ItemMasterView';
import { TransactionsHistoryView } from './components/TransactionsHistoryView';
import { ItemLoanView } from './components/ItemLoanView';
import { LoginView } from './components/LoginView';

import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { BarcodeSheetModal, BarcodePrintMode } from './components/BarcodeSheetModal';
import { CompanyLogo } from './components/CompanyLogo';
import { LogoSettingsModal } from './components/LogoSettingsModal';
import { EmployeeDatabaseModal } from './components/EmployeeDatabaseModal';
import { UserManagementModal, DEFAULT_ROLE_PERMISSIONS } from './components/UserManagementModal';
import { AuditTrailModal } from './components/AuditTrailModal';
import { DashboardSettingsModal } from './components/DashboardSettingsModal';
import { RoleSwitcherModal } from './components/RoleSwitcherModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { NotificationApprovalModal } from './components/NotificationApprovalModal';
import { ProfessionalStatsReportModal } from './components/ProfessionalStatsReportModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { PublicRequestPortalView } from './components/PublicRequestPortalView';
import { 
  subscribeToWarehouseData, 
  pushWarehouseSync, 
  fetchFreshWarehouseData,
  subscribeToCrossTabSync,
  smartMergeWarehouseData,
  onSyncStatusChange, 
  saveToLocalLedger,
  getLocalLedger,
  getOfflineQueueCount,
  flushOfflineSyncQueue,
  getDeletedTransactionIds,
  recordDeletedTransactionId,
  removeFromLocalLedger,
  clearLocalLedger,
  clearDeletedTransactionIds,
  clearDeletedTransactionTombstones,
  getDeletedLoanIds,
  recordDeletedLoanId,
  recordDeletedLoanIds,
  clearDeletedLoanIds,
  getDeletedUserIds,
  clearDeletedUserTombstone,
  deduplicateItemsList,
  SyncState,
  WarehouseSyncPayload 
} from './utils/firebaseSync';
import { playNotificationChime, triggerBrowserNotification } from './utils/helpers';
import { 
  getThemeConfig, 
  getFontFamilyStyle, 
  getDensityContainerClass, 
  getPageBackground 
} from './utils/themeStyles';

const STORAGE_KEY_ITEMS = 'ga_warehouse_items_v11';
const STORAGE_KEY_TRANSACTIONS = 'ga_warehouse_transactions_v8';
const STORAGE_KEY_EMPLOYEES = 'ga_warehouse_employees_v8';
const STORAGE_KEY_USERS = 'ga_warehouse_users_v8';
const STORAGE_KEY_CURRENT_USER = 'ga_warehouse_current_user_v8';
const STORAGE_KEY_LOANS = 'ga_warehouse_loans_v8';
const STORAGE_KEY_AUDIT = 'ga_warehouse_audit_v8';
const STORAGE_KEY_CONFIG = 'ga_warehouse_config_v8';
const STORAGE_KEY_CATEGORIES = 'ga_warehouse_categories_v1';

export default function App() {
  // Helper to validate and ensure users list is safe, clean, and retains user deletions
  const sanitizeUsersList = (savedList: any): UserAccount[] => {
    if (Array.isArray(savedList) && savedList.length > 0) {
      const valid = savedList.filter(
        (u) => u && typeof u === 'object' && u.id && u.username
      );
      if (valid.length > 0) {
        return valid;
      }
    }
    return INITIAL_USERS;
  };

  // Helper to normalize and ensure items list is clean, deduplicated, and rack location is valid
  const sanitizeItemsList = (list: any[]): Item[] => {
    if (!Array.isArray(list)) return [];
    return deduplicateItemsList(list);
  };

  // Helper to ensure transactions list always has safe items array
  const sanitizeTransactionsList = (list: any[]): Transaction[] => {
    if (!Array.isArray(list)) return [];
    return list.map((t) => ({
      ...t,
      items: Array.isArray(t?.items) ? t.items : [],
    }));
  };

  // 1. Core items database
  const [items, setItems] = useState<Item[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ga_warehouse_deleted_item_ids_v1');
      }
      const saved = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sanitizeItemsList(parsed);
        }
      }
      return sanitizeItemsList(INITIAL_ITEMS);
    } catch {
      return sanitizeItemsList(INITIAL_ITEMS);
    }
  });

  // Deleted transaction & loan tombstones
  const [deletedTransactionIds, setDeletedTransactionIds] = useState<string[]>(() => {
    return getDeletedTransactionIds();
  });
  const [deletedLoanIds, setDeletedLoanIds] = useState<string[]>(() => {
    return getDeletedLoanIds();
  });

  // 2. Transactions log (Safely initialized, combined with permanent local ledger, strictly filtered by tombstones)
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const deletedSet = new Set(getDeletedTransactionIds());
      const saved = localStorage.getItem(STORAGE_KEY_TRANSACTIONS) || localStorage.getItem('ga_warehouse_transactions_v6');
      const rawParsed = saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
      const parsed: Transaction[] = Array.isArray(rawParsed) ? rawParsed : INITIAL_TRANSACTIONS;
      const rawLedger = getLocalLedger();
      const ledger: any[] = Array.isArray(rawLedger) ? rawLedger : [];
      
      const trxMap = new Map<string, Transaction>();
      parsed.forEach((t) => {
        const key = t?.id || t?.transactionNumber;
        if (key && !deletedSet.has(t.id) && !(t.transactionNumber && deletedSet.has(t.transactionNumber))) {
          trxMap.set(key, {
            ...t,
            items: Array.isArray(t?.items) ? t.items : [],
          });
        }
      });
      
      if (ledger.length > 0) {
        ledger.forEach((t: any) => {
          const key = t?.id || t?.transactionNumber;
          if (key && !deletedSet.has(t.id) && !(t.transactionNumber && deletedSet.has(t.transactionNumber)) && !trxMap.has(key)) {
            trxMap.set(key, {
              ...t,
              items: Array.isArray(t?.items) ? t.items : [],
            });
          }
        });
      }
      return Array.from(trxMap.values());
    } catch {
      return INITIAL_TRANSACTIONS;
    }
  });

  // 3. Employees list
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EMPLOYEES);
      return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
    } catch {
      return INITIAL_EMPLOYEES;
    }
  });

  // 4. User accounts & RBAC
  const [users, setUsers] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USERS) || localStorage.getItem('ga_warehouse_users_v6') || localStorage.getItem('ga_warehouse_users_v7');
      if (saved) {
        const parsed = JSON.parse(saved);
        return sanitizeUsersList(parsed);
      }
      return INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  const [currentUser, setCurrentUser] = useState<UserAccount>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
      if (saved) return JSON.parse(saved);
      return INITIAL_USERS[0]; // Default to Master Admin
    } catch {
      return INITIAL_USERS[0];
    }
  });

  // 5. Item loans (strictly filtered by deleted loan tombstones)
  const [loans, setLoans] = useState<ItemLoan[]>(() => {
    try {
      const deletedLoanSet = new Set(getDeletedLoanIds());
      const saved = localStorage.getItem(STORAGE_KEY_LOANS);
      const raw = saved ? JSON.parse(saved) : INITIAL_LOANS;
      const list: ItemLoan[] = Array.isArray(raw) ? raw : INITIAL_LOANS;
      return list.filter((l) => !deletedLoanSet.has(l.id) && !(l.loanNumber && deletedLoanSet.has(l.loanNumber)));
    } catch {
      return INITIAL_LOANS;
    }
  });

  // 6. Audit logs
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AUDIT);
      return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  });

  // 7. Dashboard & system customization settings
  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      return saved ? JSON.parse(saved) : DEFAULT_DASHBOARD_CONFIG;
    } catch {
      return DEFAULT_DASHBOARD_CONFIG;
    }
  });

  // 8. Custom Categories state
  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CATEGORIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return CATEGORIES;
  });

  // Login & Session state (Ensures Login screen opens first when deployed to Netlify / on first open)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ga_warehouse_is_logged_in');
      return saved === 'true'; // strictly false on first load or after logout
    } catch {
      return false;
    }
  });

  // Role Permissions Matrix state (Requirement 3, 6, 7, 12)
  const STORAGE_KEY_ROLE_PERMS = 'ga_warehouse_role_perms_v7';
  const [rolePermissions, setRolePermissions] = useState<Record<UserRole, UserPermissions>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ROLE_PERMS);
      return saved ? JSON.parse(saved) : DEFAULT_ROLE_PERMISSIONS;
    } catch {
      return DEFAULT_ROLE_PERMISSIONS;
    }
  });

  const handleUpdateRolePermissions = (newPerms: Record<UserRole, UserPermissions>) => {
    setRolePermissions(newPerms);
    try {
      localStorage.setItem(STORAGE_KEY_ROLE_PERMS, JSON.stringify(newPerms));
    } catch {}

    // Update all users in state and sync their permissions based on role
    const updatedUsers = users.map((u) => ({
      ...u,
      permissions: newPerms[u.role] || DEFAULT_ROLE_PERMISSIONS[u.role],
    }));
    setUsers(updatedUsers);

    // If current logged-in user is affected, update active session permissions immediately
    if (currentUser) {
      const updatedCurrentUser: UserAccount = {
        ...currentUser,
        permissions: newPerms[currentUser.role] || DEFAULT_ROLE_PERMISSIONS[currentUser.role],
      };
      setCurrentUser(updatedCurrentUser);
      try {
        localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(updatedCurrentUser));
      } catch {}
    }

    // Immediately push to Cloud Firestore so all mobile/desktop devices receive it in real-time
    syncToCloud({ rolePermissions: newPerms, users: updatedUsers });
    logAudit('Update Matriks Hak Akses', 'USERS', `Master Admin memperbarui matriks hak akses akun & modul`);
    showToast('Hak akses modul & akun berhasil disimpan & tersinkronisasi ke seluruh perangkat.', 'success');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    try {
      localStorage.setItem('ga_warehouse_is_logged_in', 'false');
      localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
    } catch {}
    showToast('Anda telah berhasil keluar dari sistem.', 'info');
  };

  // Active navigation tab with persistence so inspections never get lost/reset
  const [activeTab, setActiveTab] = useState<MainTabType>(() => {
    try {
      const saved = localStorage.getItem('ga_warehouse_active_tab');
      if (saved && ['dashboard', 'request', 'incoming', 'stock', 'loans', 'transactions'].includes(saved)) {
        return saved as MainTabType;
      }
    } catch {}
    return 'dashboard';
  });

  const handleTabChange = (tab: MainTabType) => {
    setActiveTab(tab);
    try {
      localStorage.setItem('ga_warehouse_active_tab', tab);
    } catch {}
  };

  // Modals state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isBarcodeSheetOpen, setIsBarcodeSheetOpen] = useState(false);
  const [barcodePrintMode, setBarcodePrintMode] = useState<BarcodePrintMode>('ALL');
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isRoleSwitcherOpen, setIsRoleSwitcherOpen] = useState(false);
  const [isResetSampleConfirmOpen, setIsResetSampleConfirmOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState(false);

  // Self-Service Public Request Portal state (Accessed via QR Code or URL without login)
  const [isPublicPortalOpen, setIsPublicPortalOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('portal') === 'request' || window.location.hash.includes('portal=request');
    }
    return false;
  });

  // Cross-modal selected item for request
  const [selectedScannedItem, setSelectedScannedItem] = useState<Item | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);
  const [syncState, setSyncState] = useState<SyncState>('connected');

  // Multi-Device Cloud Synchronization Engine references
  const isInitialCloudLoaded = useRef<boolean>(false);
  const isRemoteUpdate = useRef<boolean>(false);

  // Keep fresh state references for real-time listeners and multi-tab broadcasts
  const latestStateRef = useRef({
    items,
    transactions,
    deletedTransactionIds,
    deletedLoanIds,
    employees,
    users,
    loans,
    auditLogs,
    rolePermissions,
    dashboardConfig,
    currentUser,
  });

  useEffect(() => {
    latestStateRef.current = {
      items,
      transactions,
      deletedTransactionIds,
      deletedLoanIds,
      employees,
      users,
      loans,
      auditLogs,
      rolePermissions,
      dashboardConfig,
      currentUser,
    };
  }, [items, transactions, deletedTransactionIds, deletedLoanIds, employees, users, loans, auditLogs, rolePermissions, dashboardConfig, currentUser]);

  // Helper to immediately push authoritative state to Cloud Firestore
  const syncToCloud = (overrides?: Partial<WarehouseSyncPayload>) => {
    const current = latestStateRef.current;
    const payload: Partial<WarehouseSyncPayload> & { updatedBy: string } = {
      items: overrides?.items !== undefined ? overrides.items : current.items,
      transactions: overrides?.transactions !== undefined ? overrides.transactions : current.transactions,
      deletedTransactionIds: overrides?.deletedTransactionIds !== undefined ? overrides.deletedTransactionIds : current.deletedTransactionIds,
      deletedLoanIds: overrides?.deletedLoanIds !== undefined ? overrides.deletedLoanIds : current.deletedLoanIds,
      employees: overrides?.employees !== undefined ? overrides.employees : current.employees,
      users: overrides?.users !== undefined ? overrides.users : current.users,
      loans: overrides?.loans !== undefined ? overrides.loans : current.loans,
      auditLogs: overrides?.auditLogs !== undefined ? overrides.auditLogs : current.auditLogs,
      rolePermissions: overrides?.rolePermissions !== undefined ? overrides.rolePermissions : current.rolePermissions,
      dashboardConfig: overrides?.dashboardConfig !== undefined ? overrides.dashboardConfig : current.dashboardConfig,
      updatedBy: current.currentUser?.fullName || 'Sistem',
    };
    pushWarehouseSync(payload).catch((err) => {
      console.warn('Immediate Firestore sync error:', err?.message);
    });
  };

  // Offline queue indicator state
  const [offlineQueueLength, setOfflineQueueLength] = useState<number>(() => getOfflineQueueCount());
  useEffect(() => {
    const interval = setInterval(() => {
      setOfflineQueueLength(getOfflineQueueCount());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Robust Zero-Loss Cloud Data Applicator
  const applySafeCloudData = (cloudData: Partial<WarehouseSyncPayload>) => {
    const current = latestStateRef.current;
    const merged = smartMergeWarehouseData(
      {
        items: current.items,
        transactions: current.transactions,
        deletedTransactionIds: current.deletedTransactionIds,
        deletedLoanIds: current.deletedLoanIds,
        employees: current.employees,
        users: current.users,
        loans: current.loans,
        auditLogs: current.auditLogs,
        rolePermissions: current.rolePermissions,
        dashboardConfig: current.dashboardConfig,
      },
      cloudData
    );

    if (Array.isArray(merged.items)) setItems(sanitizeItemsList(merged.items));
    if (Array.isArray(merged.transactions)) setTransactions(sanitizeTransactionsList(merged.transactions));
    if (Array.isArray(merged.deletedTransactionIds)) setDeletedTransactionIds(merged.deletedTransactionIds);
    if (Array.isArray(merged.deletedLoanIds)) setDeletedLoanIds(merged.deletedLoanIds);
    if (Array.isArray(merged.employees)) setEmployees(merged.employees);
    if (Array.isArray(merged.users)) setUsers(sanitizeUsersList(merged.users));
    if (Array.isArray(merged.loans)) setLoans(merged.loans);
    if (Array.isArray(merged.auditLogs)) setAuditLogs(merged.auditLogs);
    if (merged.rolePermissions) setRolePermissions(merged.rolePermissions);
    if (merged.dashboardConfig) setDashboardConfig(merged.dashboardConfig);
    isInitialCloudLoaded.current = true;
    return merged;
  };

  // Manual refresh from Cloud button handler (Bidirectional smart merge so nothing is ever lost)
  const handleManualRefreshCloud = async () => {
    showToast('Menghubungkan & menyinkronkan data Cloud Firestore...', 'info');
    try {
      await flushOfflineSyncQueue();
      const current = latestStateRef.current;
      const cloudData = await fetchFreshWarehouseData({
        items: current.items,
        transactions: current.transactions,
        deletedTransactionIds: current.deletedTransactionIds,
        deletedLoanIds: current.deletedLoanIds,
        employees: current.employees,
        users: current.users,
        loans: current.loans,
        auditLogs: current.auditLogs,
        rolePermissions: current.rolePermissions,
        dashboardConfig: current.dashboardConfig,
      });
      if (cloudData) {
        const merged = applySafeCloudData(cloudData);
        setOfflineQueueLength(getOfflineQueueCount());
        showToast(
          `Sinkronisasi Cloud berhasil! ${merged.transactions?.length || 0} transaksi & ${merged.items?.length || 0} barang tersinkronisasi aman.`,
          'success'
        );
      } else {
        showToast('Data lokal sudah tersimpan & terbarui di Cloud.', 'info');
      }
    } catch (err: any) {
      showToast('Gagal memuat dari Cloud: ' + (err?.message || 'Koneksi offline'), 'warning');
    }
  };

  // Track Firestore connection and real-time synchronization state
  useEffect(() => {
    const unsubscribeSync = onSyncStatusChange((state) => {
      setSyncState(state);
    });
    return () => unsubscribeSync();
  }, []);

  // 1. Subscribe to instant cross-tab broadcast (0ms multi-account sync e.g. Wardhana -> Master Admin)
  useEffect(() => {
    const unsubscribeCrossTab = subscribeToCrossTabSync((incomingData) => {
      if (incomingData) {
        applySafeCloudData(incomingData);
      }
    });

    // Initial cloud fetch on startup to establish connection & pull/merge latest cloud transactions
    const initStartupSync = async () => {
      try {
        await flushOfflineSyncQueue();
        const current = latestStateRef.current;
        const cloudData = await fetchFreshWarehouseData({
          items: current.items,
          transactions: current.transactions,
          deletedTransactionIds: current.deletedTransactionIds,
          deletedLoanIds: current.deletedLoanIds,
          employees: current.employees,
          users: current.users,
          loans: current.loans,
          auditLogs: current.auditLogs,
          rolePermissions: current.rolePermissions,
          dashboardConfig: current.dashboardConfig,
        });
        if (cloudData) {
          applySafeCloudData(cloudData);
          setOfflineQueueLength(getOfflineQueueCount());
        }
      } catch (e) {
        console.warn('Initial cloud sync notice:', e);
      }
    };
    initStartupSync();

    return () => {
      unsubscribeCrossTab();
    };
  }, []);

  // 2. Subscribe to real-time Firestore database updates across all devices & laptops
  useEffect(() => {
    const unsubscribe = subscribeToWarehouseData((cloudData) => {
      if (cloudData) {
        const prevTrx = latestStateRef.current.transactions || [];
        const prevTrxIds = new Set(prevTrx.map((t) => t.id || t.transactionNumber));
        const newTrxList = cloudData.transactions || [];

        // Detect newly created transactions from other devices
        const newlyAddedTrx = newTrxList.filter(
          (t: any) => !prevTrxIds.has(t.id || t.transactionNumber)
        );

        // Detect status changes:
        // 1. Newly approved requests (awaiting physical handover)
        const newlyApprovedTrx = newTrxList.filter((t: any) => {
          const old = prevTrx.find((p) => (p.id || p.transactionNumber) === (t.id || t.transactionNumber));
          return old && old.status === 'PENDING' && t.status === 'APPROVED';
        });

        // 2. Newly completed physical handover (dispatched) -> NOW officially enters Riwayat Transaksi Keluar
        const newlyCompletedTrx = newTrxList.filter((t: any) => {
          const old = prevTrx.find((p) => (p.id || p.transactionNumber) === (t.id || t.transactionNumber));
          return old && old.status !== 'COMPLETED' && t.status === 'COMPLETED';
        });

        if (newlyCompletedTrx.length > 0) {
          playNotificationChime();
          const firstCompleted = newlyCompletedTrx[0];
          const notifTitle = '📦 Serah Terima Fisik Barang Selesai';
          const notifBody = `${firstCompleted.transactionNumber} - ${firstCompleted.requesterName || 'Pemohon'} (${firstCompleted.department || 'Gudang'}) telah serah terima fisik & resmi tercatat pada Riwayat Transaksi Keluar.`;
          triggerBrowserNotification(notifTitle, notifBody);
          showToast(`📦 [${firstCompleted.transactionNumber}] serah terima fisik selesai! Resmi masuk ke Riwayat Transaksi Keluar.`, 'success');
        } else if (newlyApprovedTrx.length > 0) {
          playNotificationChime();
          const firstApproved = newlyApprovedTrx[0];
          const notifTitle = '✅ Permintaan Disetujui Admin';
          const notifBody = `${firstApproved.transactionNumber} telah disetujui. Menunggu serah terima fisik sebelum masuk log riwayat transaksi.`;
          triggerBrowserNotification(notifTitle, notifBody);
          showToast(`✅ Permintaan [${firstApproved.transactionNumber}] disetujui Admin. Menunggu serah terima fisik barang.`, 'info');
        } else if (newlyAddedTrx.length > 0) {
          playNotificationChime();
          const firstNew = newlyAddedTrx[0];
          const isPending = firstNew.type === 'OUT' && firstNew.status === 'PENDING';
          if (isPending) {
            const notifTitle = '🔔 Pengajuan Permintaan Barang Baru';
            const notifBody = `${firstNew.transactionNumber} diajukan oleh ${firstNew.requesterName} (${firstNew.department}) - Menunggu Approval Admin di menu Permintaan.`;
            triggerBrowserNotification(notifTitle, notifBody);
            showToast(`🔔 Permintaan baru [${firstNew.transactionNumber}] oleh ${firstNew.requesterName} (Menunggu Approval di menu Permintaan)`, 'info');
          } else if (firstNew.type === 'IN') {
            const notifTitle = '📥 Barang Masuk Baru Tercatat';
            const notifBody = `${firstNew.transactionNumber} dari ${firstNew.supplier || 'Vendor'} (${firstNew.items?.length || 0} item)`;
            triggerBrowserNotification(notifTitle, notifBody);
            showToast(`📥 [${firstNew.transactionNumber}] penerimaan barang masuk resmi dicatat di Riwayat Transaksi.`, 'success');
          } else if (firstNew.type === 'OUT' && firstNew.status === 'COMPLETED') {
            const notifTitle = '📤 Transaksi Barang Keluar Selesai';
            const notifBody = `${firstNew.transactionNumber} untuk ${firstNew.requesterName} (${firstNew.department})`;
            triggerBrowserNotification(notifTitle, notifBody);
            showToast(`📤 [${firstNew.transactionNumber}] transaksi barang keluar selesai & tercatat di Riwayat Transaksi.`, 'success');
          }
        }

        // Apply with safe union merge
        applySafeCloudData(cloudData);
        setOfflineQueueLength(getOfflineQueueCount());
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Persist states to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
    } catch (e) {
      console.error('Save items error', e);
    }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
    } catch (e) {
      console.error('Save transactions error', e);
    }
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_EMPLOYEES, JSON.stringify(employees));
    } catch (e) {
      console.error('Save employees error', e);
    }
  }, [employees]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    } catch (e) {
      console.error('Save users error', e);
    }
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(currentUser));
    } catch (e) {
      console.error('Save current user error', e);
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LOANS, JSON.stringify(loans));
    } catch (e) {
      console.error('Save loans error', e);
    }
  }, [loans]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(auditLogs));
    } catch (e) {
      console.error('Save audit error', e);
    }
  }, [auditLogs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(dashboardConfig));
    } catch (e) {
      console.error('Save config error', e);
    }
  }, [dashboardConfig]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ROLE_PERMS, JSON.stringify(rolePermissions));
    } catch (e) {
      console.error('Save role perms error', e);
    }
  }, [rolePermissions]);

  // Handle Mobile / Cross-Device Reconnect on tab focus and network restoration
  useEffect(() => {
    let lastRefreshTime = 0;
    const triggerSyncRefresh = () => {
      // Debounce to at most once per 20 seconds on focus/online
      const now = Date.now();
      if (now - lastRefreshTime < 20000) return;
      lastRefreshTime = now;

      if (document.visibilityState === 'visible' && navigator.onLine) {
        flushOfflineSyncQueue().catch(() => {});
        const current = latestStateRef.current;
        fetchFreshWarehouseData({
          items: current.items,
          transactions: current.transactions,
          deletedTransactionIds: current.deletedTransactionIds,
          employees: current.employees,
          users: current.users,
          loans: current.loans,
          auditLogs: current.auditLogs,
          rolePermissions: current.rolePermissions,
          dashboardConfig: current.dashboardConfig,
        }).then((cloudData) => {
          if (cloudData) {
            applySafeCloudData(cloudData);
            setOfflineQueueLength(getOfflineQueueCount());
          }
        }).catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', triggerSyncRefresh);
    window.addEventListener('online', triggerSyncRefresh);
    window.addEventListener('focus', triggerSyncRefresh);

    return () => {
      document.removeEventListener('visibilitychange', triggerSyncRefresh);
      window.removeEventListener('online', triggerSyncRefresh);
      window.removeEventListener('focus', triggerSyncRefresh);
    };
  }, []);

  // Toast notification helper
  const showToast = (text: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Central audit log dispatcher
  const logAudit = (
    action: string, 
    targetModule: 'STOCK' | 'TRANSACTIONS' | 'LOANS' | 'USERS' | 'SETTINGS' | 'EMPLOYEES', 
    details: string
  ) => {
    const newLog: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action,
      targetModule,
      details,
    };
    setAuditLogs((prev) => [newLog, ...(prev || []).slice(0, 499)]); // Keep last 500 logs
  };

  // Role & User operations
  const handleSwitchUser = (user: UserAccount) => {
    setCurrentUser(user);
    setIsRoleSwitcherOpen(false);
    logAudit('Ganti Profil Pengguna', 'USERS', `Pengguna aktif berganti ke ${user.fullName} (${user.role})`);
    showToast(`Aktif sebagai ${user.fullName} [${user.role.replace('_', ' ')}]`, 'info');
  };

  const handleAddUser = (newUser: UserAccount) => {
    // Clear any previous tombstone for this user
    clearDeletedUserTombstone(newUser.id, newUser.username);
    const nextUsers = [newUser, ...users.filter(u => u.id !== newUser.id)];
    setUsers(nextUsers);
    try {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(nextUsers));
    } catch (e) {
      console.error('Save users error', e);
    }
    syncToCloud({ users: nextUsers, deletedUserIds: getDeletedUserIds() });
    logAudit('Tambah Akun Pengguna', 'USERS', `Membuat akun ${newUser.fullName} (${newUser.role})`);
    showToast(`Pengguna baru "${newUser.fullName}" berhasil didaftarkan & disinkronkan ke Cloud!`, 'success');
  };

  const handleUpdateUser = (updatedUser: UserAccount) => {
    const nextUsers = users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
    setUsers(nextUsers);
    try {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(nextUsers));
    } catch (e) {
      console.error('Save users error', e);
    }
    if (currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
      try {
        localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(updatedUser));
      } catch (e) {
        console.error('Save current user error', e);
      }
    }
    syncToCloud({ users: nextUsers });
    logAudit('Update Akun Pengguna', 'USERS', `Memperbarui profil ${updatedUser.fullName}`);
    showToast(`Data akun "${updatedUser.fullName}" berhasil diperbarui & disinkronkan!`, 'info');
  };

  const handleDeleteUser = (userId: string) => {
    const userToDel = users.find((u) => u.id === userId);
    if (!userToDel) {
      showToast('Akun pengguna tidak ditemukan atau sudah dihapus.', 'warning');
      return;
    }

    if (userToDel.id === currentUser.id) {
      showToast('Anda tidak dapat menghapus akun yang sedang Anda gunakan saat ini.', 'warning');
      return;
    }

    const nextUsers = users.filter((u) => u.id !== userId);
    // Ensure safety: do not leave zero users
    const safeUsers = nextUsers.length > 0 ? nextUsers : [INITIAL_USERS[0]];
    
    setUsers(safeUsers);
    try {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(safeUsers));
    } catch (e) {
      console.error('Save users error', e);
    }
    syncToCloud({ users: safeUsers });
    logAudit('Hapus Akun Pengguna', 'USERS', `Menghapus akun ${userToDel.fullName} (@${userToDel.username})`);
    showToast(`Akun "${userToDel.fullName}" (@${userToDel.username}) berhasil dihapus secara permanen.`, 'success');
  };

  // Dashboard Settings operations
  const handleSaveConfig = (newConfig: DashboardConfig) => {
    setDashboardConfig(newConfig);
    syncToCloud({ dashboardConfig: newConfig });
    logAudit('Update Konfigurasi Dashboard', 'SETTINGS', `Memperbarui setelan gudang & branding`);
    showToast('Konfigurasi dashboard & sistem berhasil disimpan ke Cloud!', 'success');
  };

  const handleResetConfig = () => {
    setDashboardConfig(DEFAULT_DASHBOARD_CONFIG);
    syncToCloud({ dashboardConfig: DEFAULT_DASHBOARD_CONFIG });
    logAudit('Reset Konfigurasi Dashboard', 'SETTINGS', 'Mengembalikan setelan dashboard ke default');
    showToast('Setelan dashboard dikembalikan ke default.', 'info');
  };

  const handleSaveLogo = (newLogoUrl: string | null) => {
    const nextConfig = {
      ...dashboardConfig,
      logoUrl: newLogoUrl,
    };
    setDashboardConfig(nextConfig);
    syncToCloud({ dashboardConfig: nextConfig });
    logAudit('Ganti Logo Perusahaan', 'SETTINGS', newLogoUrl ? 'Mengupload logo baru' : 'Mereset logo ke default');
    showToast(newLogoUrl ? 'Logo perusahaan berhasil diperbarui!' : 'Logo telah dikembalikan ke default.', 'success');
  };

  // Employee operations
  const handleAddEmployee = (newEmp: Employee) => {
    const nextEmployees = [newEmp, ...employees.filter(e => e.id !== newEmp.id)];
    setEmployees(nextEmployees);
    syncToCloud({ employees: nextEmployees });
    logAudit('Tambah Data Personil', 'EMPLOYEES', `Menambahkan ${newEmp.name} (${newEmp.position} - ${newEmp.department})`);
    showToast(`Data personil "${newEmp.name}" berhasil ditambahkan & disinkronkan!`, 'success');
  };

  const handleUpdateEmployee = (updatedEmp: Employee) => {
    const nextEmployees = employees.map((e) => (e.id === updatedEmp.id ? updatedEmp : e));
    setEmployees(nextEmployees);
    syncToCloud({ employees: nextEmployees });
    logAudit('Update Data Personil', 'EMPLOYEES', `Memperbarui data ${updatedEmp.name}`);
    showToast(`Data personil "${updatedEmp.name}" berhasil diperbarui.`, 'info');
  };

  const handleDeleteEmployee = (empId: string) => {
    const deleted = employees.find((e) => e.id === empId);
    const nextEmployees = employees.filter((e) => e.id !== empId);
    setEmployees(nextEmployees);
    syncToCloud({ employees: nextEmployees });
    logAudit('Hapus Data Personil', 'EMPLOYEES', `Menghapus ${deleted?.name || empId}`);
    showToast(`Personil "${deleted?.name || empId}" telah dihapus dari database.`, 'warning');
  };

  const handleResetEmployees = () => {
    setEmployees(INITIAL_EMPLOYEES);
    syncToCloud({ employees: INITIAL_EMPLOYEES });
    logAudit('Reset Database Personil', 'EMPLOYEES', 'Memulihkan data 114 karyawan awal');
    showToast('Database personil telah di-reset ke data master awal (114 nama).', 'info');
  };

  // Barcode scan quick handler
  const handleBarcodeScanned = (scannedItem: Item) => {
    setIsScannerOpen(false);
    setSelectedScannedItem(scannedItem);
    setActiveTab('request');
    logAudit('Scan Barcode', 'STOCK', `Scan barcode item ${scannedItem.code} (${scannedItem.name})`);
    showToast(`Barcode ${scannedItem.code} (${scannedItem.name}) berhasil di-scan! Menuju formulir permintaan.`, 'success');
  };

  const handleDirectItemRequest = (item: Item) => {
    setSelectedScannedItem(item);
    setActiveTab('request');
  };

  // Stock operations
  const handleAddItem = (newItem: Item) => {
    const nextItems = [newItem, ...items.filter(i => i.id !== newItem.id)];
    setItems(nextItems);
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(nextItems));
    } catch {}
    syncToCloud({ items: nextItems });
    logAudit('Tambah Master Barang', 'STOCK', `Menambahkan barang "${newItem.name}" (${newItem.code}) stok awal: ${newItem.currentStock} ${newItem.unit}`);
    showToast(`Barang baru "${newItem.name}" (${newItem.code}) berhasil ditambahkan & disinkronkan!`, 'success');
  };

  const handleBulkAddItems = (newItems: Item[], mode: 'append' | 'replace' = 'append') => {
    let nextItems: Item[];
    if (mode === 'replace') {
      nextItems = newItems;
      setItems(nextItems);
      try {
        localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(nextItems));
      } catch {}
      syncToCloud({ items: nextItems });
      logAudit('Import Excel (Replace)', 'STOCK', `Mengganti seluruh katalog dengan ${newItems.length} barang baru`);
      showToast(`Berhasil mengimpor ${newItems.length} data barang (semua diganti)!`, 'success');
    } else {
      const existingIds = new Set(items.map(p => p.id));
      const filteredNew = newItems.filter(p => !existingIds.has(p.id));
      nextItems = [...filteredNew, ...items];
      setItems(nextItems);
      try {
        localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(nextItems));
      } catch {}
      syncToCloud({ items: nextItems });
      logAudit('Import Excel (Append)', 'STOCK', `Menambahkan ${newItems.length} data barang dari Excel/CSV`);
      showToast(`Berhasil mengimpor ${newItems.length} data barang baru!`, 'success');
    }
  };

  const handleUpdateItem = (updated: Item) => {
    const nextItems = items.map((item) => (item.id === updated.id ? updated : item));
    setItems(nextItems);
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(nextItems));
    } catch {}
    syncToCloud({ items: nextItems });
    logAudit('Update Master Barang', 'STOCK', `Memperbarui item ${updated.name} (${updated.code})`);
    showToast(`Data barang "${updated.name}" berhasil diperbarui.`, 'info');
  };

  const handleDeleteItem = (itemId: string) => {
    const deleted = items.find((i) => i.id === itemId);
    const nextItems = items.filter((item) => item.id !== itemId);
    setItems(nextItems);
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(nextItems));
    } catch {}
    syncToCloud({ items: nextItems });
    logAudit('Hapus Master Barang', 'STOCK', `Menghapus item ${deleted?.name || itemId} (${deleted?.code})`);
    showToast(`Barang "${deleted?.name || itemId}" telah dihapus.`, 'warning');
  };

  const handleClearAllStock = () => {
    const nextItems = items.map((item) => ({
      ...item,
      currentStock: 0,
      updatedAt: new Date().toISOString(),
    }));
    setItems(nextItems);
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(nextItems));
    } catch {}
    syncToCloud({ items: nextItems });
    logAudit('Kosongkan Stok (0)', 'STOCK', 'Master Admin mereset seluruh kuantitas stok fisik menjadi 0');
    showToast('Seluruh jumlah stok barang telah dikosongkan (0).', 'info');
  };

  const handleDeleteAllStockItems = () => {
    setItems([]);
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify([]));
    } catch {}
    syncToCloud({ items: [] });
    logAudit('Hapus Semua Data Barang', 'STOCK', 'Master Admin menghapus bersih seluruh katalog master barang');
    showToast('Seluruh data master barang telah dihapus bersih dari database.', 'warning');
  };

  // Category Management Handlers (Create New, Edit, Delete, Reset)
  const handleAddCategory = (newCatName: string) => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`Kategori "${trimmed}" sudah ada di database!`, 'warning');
      return;
    }
    const nextCategories = [...categories, trimmed];
    setCategories(nextCategories);
    try {
      localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(nextCategories));
    } catch {}
    syncToCloud({ categories: nextCategories });
    logAudit('Tambah Kategori', 'STOCK', `Menambahkan kategori baru "${trimmed}"`);
    showToast(`Kategori baru "${trimmed}" berhasil ditambahkan!`, 'success');
  };

  const handleEditCategory = (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;

    const nextCategories = categories.map((c) => (c === oldName ? trimmed : c));
    setCategories(nextCategories);
    try {
      localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(nextCategories));
    } catch {}

    // Update all existing items that were using oldName
    const affectedItemsCount = items.filter((i) => i.category === oldName).length;
    let nextItems = items;
    if (affectedItemsCount > 0) {
      nextItems = items.map((item) => {
        if (item.category === oldName) {
          return { ...item, category: trimmed, updatedAt: new Date().toISOString() };
        }
        return item;
      });
      setItems(nextItems);
      try {
        localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(nextItems));
      } catch {}
    }

    syncToCloud({ items: nextItems, categories: nextCategories });
    logAudit(
      'Edit Kategori',
      'STOCK',
      `Mengubah nama kategori "${oldName}" menjadi "${trimmed}" (${affectedItemsCount} item diperbarui)`
    );
    showToast(`Kategori "${oldName}" berhasil diubah menjadi "${trimmed}".`, 'success');
  };

  const handleDeleteCategory = (categoryToDelete: string, reassignTo?: string) => {
    const nextCategories = categories.filter((c) => c !== categoryToDelete);
    const fallbackCat = reassignTo || nextCategories[0] || 'Umum';

    setCategories(nextCategories);
    try {
      localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(nextCategories));
    } catch {}

    const affectedItems = items.filter((i) => i.category === categoryToDelete);
    let nextItems = items;
    if (affectedItems.length > 0) {
      nextItems = items.map((item) => {
        if (item.category === categoryToDelete) {
          return { ...item, category: fallbackCat, updatedAt: new Date().toISOString() };
        }
        return item;
      });
      setItems(nextItems);
      try {
        localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(nextItems));
      } catch {}
    }

    syncToCloud({ items: nextItems, categories: nextCategories });
    logAudit(
      'Hapus Kategori',
      'STOCK',
      `Menghapus kategori "${categoryToDelete}" (${affectedItems.length} item dialihkan ke "${fallbackCat}")`
    );
    showToast(
      `Kategori "${categoryToDelete}" berhasil dihapus${affectedItems.length > 0 ? ` (${affectedItems.length} item dialihkan ke ${fallbackCat})` : ''}.`,
      'warning'
    );
  };

  const handleResetCategories = () => {
    setCategories(CATEGORIES);
    try {
      localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(CATEGORIES));
    } catch {}
    syncToCloud({ categories: CATEGORIES });
    logAudit('Reset Kategori', 'STOCK', 'Memulihkan daftar susunan kategori standar GA');
    showToast('Susunan kategori telah dikembalikan ke standar awal.', 'info');
  };

  // Transaction submission (IN & OUT) with instant Cloud broadcast
  const handleSubmitTransaction = (newTrx: Transaction) => {
    const nowIso = new Date().toISOString();
    // If autoApproveRequests is active in dashboardConfig, automatically approve OUT requests
    let finalTrx = { 
      ...newTrx,
      updatedAt: nowIso,
    };
    if (newTrx.type === 'OUT' && dashboardConfig.autoApproveRequests && newTrx.status === 'PENDING') {
      finalTrx = {
        ...newTrx,
        status: 'APPROVED',
        updatedAt: nowIso,
        approvalInfo: {
          status: 'APPROVED',
          approvedBy: 'Sistem (Auto-Approve Aktif)',
          approverRole: 'MASTER_ADMIN',
          approvedAt: nowIso,
          notes: 'Disetujui otomatis oleh kebijakan sistem',
        },
      };
    }

    const isPendingApproval = finalTrx.type === 'OUT' && finalTrx.status === 'PENDING';
    let nextItems = items;

    if (!isPendingApproval) {
      nextItems = items.map((item) => {
        const trxItem = finalTrx.items.find((i) => i.itemId === item.id);
        if (trxItem) {
          if (finalTrx.type === 'OUT') {
            const newStock = Math.max(0, item.currentStock - trxItem.quantity);
            return { ...item, currentStock: newStock, updatedAt: nowIso };
          } else {
            const newStock = item.currentStock + trxItem.quantity;
            return { ...item, currentStock: newStock, updatedAt: nowIso };
          }
        }
        return item;
      });
      setItems(nextItems);
    }

    const nextTrx = [finalTrx, ...transactions];
    setTransactions(nextTrx);

    // Save permanently to local ledger immediately only if officially completed (not pending approval)
    if (!isPendingApproval) {
      saveToLocalLedger(finalTrx);
    }

    // Broadcast immediately to Firestore so other phones/devices see it instantly!
    syncToCloud({ items: nextItems, transactions: nextTrx });
    setOfflineQueueLength(getOfflineQueueCount());

    if (finalTrx.type === 'OUT') {
      if (isPendingApproval) {
        logAudit(
          'Pengajuan Permintaan Barang',
          'USERS',
          `Permintaan [${finalTrx.transactionNumber}] diajukan oleh ${finalTrx.requesterName} (${finalTrx.department}) - Menunggu Approval Admin`
        );
        showToast(
          `Pengajuan permohonan [${finalTrx.transactionNumber}] berhasil dikirim. Menunggu verifikasi & approval Admin di menu Permintaan.`,
          'info'
        );
      } else {
        logAudit(
          'Barang Keluar',
          'TRANSACTIONS',
          `Pengeluaran barang [${finalTrx.transactionNumber}] untuk ${finalTrx.requesterName} (${finalTrx.department})`
        );
        showToast(
          `Pengeluaran barang [${finalTrx.transactionNumber}] berhasil diproses & dicatat ke Riwayat Transaksi. Stok terpotong.`,
          'success'
        );
      }
    } else {
      logAudit('Barang Masuk', 'TRANSACTIONS', `Penerimaan restock [${finalTrx.transactionNumber}] dari ${finalTrx.supplier || 'Vendor'}`);
      showToast(`Penerimaan barang [${finalTrx.transactionNumber}] berhasil dicatat! Stok bertambah.`, 'success');
    }
  };

  // Approval Handlers with immediate Cloud sync
  const handleApproveRequest = (trxId: string, notes?: string) => {
    const trx = transactions.find(t => t.id === trxId);
    if (!trx) return;

    const nowIso = new Date().toISOString();
    const nextTrx = transactions.map(t => {
      if (t.id === trxId) {
        return {
          ...t,
          status: 'APPROVED' as const,
          updatedAt: nowIso,
          approvalInfo: {
            status: 'APPROVED' as const,
            approvedBy: currentUser.fullName,
            approverRole: currentUser.role,
            approvedAt: nowIso,
            notes
          }
        };
      }
      return t;
    });

    setTransactions(nextTrx);
    syncToCloud({ transactions: nextTrx });

    logAudit('Approval Permintaan', 'USERS', `Admin menyetujui permohonan [${trx.transactionNumber}] (${trx.requesterName}). Menunggu serah terima fisik.`);
    showToast(`Permintaan [${trx.transactionNumber}] telah disetujui. Siap untuk proses serah terima fisik barang.`, 'success');
  };

  const handleRejectRequest = (trxId: string, notes?: string) => {
    const trx = transactions.find(t => t.id === trxId);
    if (!trx) return;

    const nowIso = new Date().toISOString();
    const nextTrx = transactions.map(t => {
      if (t.id === trxId) {
        return {
          ...t,
          status: 'REJECTED' as const,
          updatedAt: nowIso,
          approvalInfo: {
            status: 'REJECTED' as const,
            approvedBy: currentUser.fullName,
            approverRole: currentUser.role,
            approvedAt: nowIso,
            notes: notes || 'Permintaan ditolak oleh Admin'
          }
        };
      }
      return t;
    });

    setTransactions(nextTrx);
    syncToCloud({ transactions: nextTrx });

    logAudit('Penolakan Permintaan', 'TRANSACTIONS', `Admin menolak permintaan [${trx.transactionNumber}]: ${notes || '-'}`);
    showToast(`Permintaan [${trx.transactionNumber}] ditolak.`, 'warning');
  };

  const handleDispatchApprovedRequest = (trxId: string) => {
    const trx = transactions.find(t => t.id === trxId);
    if (!trx) return;

    const nowIso = new Date().toISOString();
    // Deduct stock upon actual dispatch
    const nextItems = items.map((item) => {
      const trxItem = (trx.items || []).find((i) => i.itemId === item.id);
      if (trxItem) {
        const newStock = Math.max(0, item.currentStock - trxItem.quantity);
        return { ...item, currentStock: newStock, updatedAt: nowIso };
      }
      return item;
    });
    setItems(nextItems);

    const nextTrx = transactions.map(t => {
      if (t.id === trxId) {
        return {
          ...t,
          status: 'COMPLETED' as const,
          updatedAt: nowIso,
          dispatchedBy: currentUser.fullName,
          dispatchedAt: nowIso,
        };
      }
      return t;
    });
    setTransactions(nextTrx);

    // Save completed transaction to permanent local ledger
    const completedTrx = nextTrx.find(t => t.id === trxId);
    if (completedTrx) {
      saveToLocalLedger(completedTrx);
    }

    syncToCloud({ items: nextItems, transactions: nextTrx });

    playNotificationChime();
    triggerBrowserNotification(
      '📦 Serah Terima Fisik Barang Selesai',
      `Barang [${trx.transactionNumber}] telah diserahkan fisik ke ${trx.requesterName} & resmi tercatat pada Riwayat Transaksi Keluar.`
    );
    logAudit('Serah Terima Barang', 'TRANSACTIONS', `Barang [${trx.transactionNumber}] telah diserahkan fisik ke ${trx.requesterName} dan resmi dicatat pada Riwayat Transaksi Keluar`);
    showToast(`✅ Serah terima fisik selesai! Barang [${trx.transactionNumber}] resmi dicatat pada Riwayat Transaksi Keluar & Masuk.`, 'success');
  };

  const handleDeleteTransaction = (transactionId: string, revertStock: boolean = false) => {
    const trxToDelete = transactions.find((t) => t.id === transactionId);
    if (!trxToDelete) return;

    const nowIso = new Date().toISOString();
    let nextItems = items;
    if (revertStock && trxToDelete.status !== 'REJECTED' && trxToDelete.status !== 'PENDING') {
      nextItems = items.map((item) => {
        const trxItem = trxToDelete.items.find((i) => i.itemId === item.id);
        if (trxItem) {
          if (trxToDelete.type === 'OUT') {
            return {
              ...item,
              currentStock: item.currentStock + trxItem.quantity,
              updatedAt: nowIso,
            };
          } else {
            return {
              ...item,
              currentStock: Math.max(0, item.currentStock - trxItem.quantity),
              updatedAt: nowIso,
            };
          }
        }
        return item;
      });
      setItems(nextItems);
    }

    // Record tombstone and remove from permanent local ledger so it can NEVER reappear
    recordDeletedTransactionId(transactionId, trxToDelete.transactionNumber);
    removeFromLocalLedger(transactionId, trxToDelete.transactionNumber);
    const nextDeletedIds = getDeletedTransactionIds();
    setDeletedTransactionIds(nextDeletedIds);

    const nextTrx = transactions.filter((t) => t.id !== transactionId);
    setTransactions(nextTrx);
    try {
      localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(nextTrx));
    } catch (e) {
      console.error(e);
    }

    syncToCloud({ items: nextItems, transactions: nextTrx, deletedTransactionIds: nextDeletedIds });

    logAudit('Hapus Transaksi', 'TRANSACTIONS', `Menghapus log transaksi ${trxToDelete.transactionNumber}${revertStock ? ' dengan rollback stok' : ''}`);
    showToast(
      `Transaksi [${trxToDelete.transactionNumber}] berhasil dihapus permanen${revertStock ? ' dan stok dipulihkan' : ''}.`,
      'warning'
    );
  };

  const handleClearTransactions = (
    options: {
      scope: 'ALL' | 'IN' | 'OUT';
      period: 'ALL' | '3_MONTHS' | '1_MONTH' | '7_DAYS' | 'CUSTOM';
      customStart?: string;
      customEnd?: string;
    } | ('ALL' | 'IN' | 'OUT') = 'ALL'
  ) => {
    const opts = typeof options === 'string' 
      ? { scope: options, period: 'ALL' as const } 
      : options;

    const now = new Date();
    let nextTrx = [...transactions];

    if (opts.period === '3_MONTHS') {
      const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).getTime();
      nextTrx = nextTrx.filter((t) => {
        if (opts.scope !== 'ALL' && t.type !== opts.scope) return true;
        const tTime = new Date(t.date || t.timestamp || 0).getTime();
        return tTime >= cutoff; // Keep records younger than cutoff
      });
    } else if (opts.period === '1_MONTH') {
      const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).getTime();
      nextTrx = nextTrx.filter((t) => {
        if (opts.scope !== 'ALL' && t.type !== opts.scope) return true;
        const tTime = new Date(t.date || t.timestamp || 0).getTime();
        return tTime >= cutoff;
      });
    } else if (opts.period === '7_DAYS') {
      const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
      nextTrx = nextTrx.filter((t) => {
        if (opts.scope !== 'ALL' && t.type !== opts.scope) return true;
        const tTime = new Date(t.date || t.timestamp || 0).getTime();
        return tTime >= cutoff;
      });
    } else if (opts.period === 'CUSTOM' && (opts.customStart || opts.customEnd)) {
      nextTrx = nextTrx.filter((t) => {
        if (opts.scope !== 'ALL' && t.type !== opts.scope) return true;
        const d = (t.date || '').slice(0, 10);
        if (opts.customStart && d >= opts.customStart && (!opts.customEnd || d <= opts.customEnd)) {
          return false;
        }
        return true;
      });
    } else {
      // ALL period
      if (opts.scope === 'ALL') {
        nextTrx = [];
      } else {
        nextTrx = nextTrx.filter((t) => t.type !== opts.scope);
      }
    }

    // Record tombstones for all cleared transactions
    const removedTrx = transactions.filter((t) => !nextTrx.some((nt) => nt.id === t.id));
    removedTrx.forEach((t) => {
      recordDeletedTransactionId(t.id, t.transactionNumber);
      removeFromLocalLedger(t.id, t.transactionNumber);
    });
    const nextDeletedIds = getDeletedTransactionIds();
    setDeletedTransactionIds(nextDeletedIds);

    setTransactions(nextTrx);
    try {
      localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(nextTrx));
    } catch (e) {
      console.error(e);
    }
    syncToCloud({ transactions: nextTrx, deletedTransactionIds: nextDeletedIds });
    logAudit(
      'Bersihkan Riwayat Transaksi',
      'TRANSACTIONS',
      `Membersihkan log transaksi: ${opts.scope} (Periode: ${opts.period})`
    );
    showToast('Riwayat transaksi telah dibersihkan secara permanen.', 'warning');
  };

  const handleImportTransactions = (
    importedTrx: Transaction[],
    mode: 'append' | 'replace' = 'append',
    syncStock: boolean = false
  ) => {
    const nowIso = new Date().toISOString();
    let nextTrx: Transaction[] = [];

    // Clear deleted transaction tombstones for any imported IDs/numbers so they aren't rejected
    const importedIds = importedTrx.map((t) => t.id);
    const importedNumbers = importedTrx.map((t) => t.transactionNumber).filter(Boolean);
    clearDeletedTransactionTombstones([...importedIds, ...importedNumbers]);
    const nextDeletedIds = getDeletedTransactionIds();
    setDeletedTransactionIds(nextDeletedIds);

    if (mode === 'replace') {
      nextTrx = importedTrx.map((t) => ({
        ...t,
        updatedAt: t.updatedAt || nowIso,
      }));
    } else {
      // Append mode: merge without duplicating IDs or transaction numbers
      const existingMap = new Map<string, Transaction>();
      transactions.forEach((t) => {
        existingMap.set(t.id, t);
        if (t.transactionNumber) existingMap.set(t.transactionNumber, t);
      });

      const newItemsToAdd: Transaction[] = [];
      importedTrx.forEach((imp) => {
        if (!existingMap.has(imp.id) && (!imp.transactionNumber || !existingMap.has(imp.transactionNumber))) {
          newItemsToAdd.push(imp);
          existingMap.set(imp.id, imp);
          if (imp.transactionNumber) existingMap.set(imp.transactionNumber, imp);
        }
      });
      nextTrx = [...newItemsToAdd, ...transactions];
    }

    setTransactions(nextTrx);
    try {
      localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(nextTrx));
    } catch (e) {
      console.error(e);
    }

    // Save completed transactions to local permanent ledger
    nextTrx.filter((t) => t.status === 'COMPLETED' || t.type === 'IN').forEach((t) => saveToLocalLedger(t));

    // If syncStock is true, update item stocks based on imported transactions
    let nextItems = items;
    if (syncStock) {
      const stockDelta = new Map<string, number>();
      importedTrx.forEach((t) => {
        if (t.status === 'COMPLETED' || t.type === 'IN') {
          (t.items || []).forEach((it) => {
            if (it.itemId || it.itemCode) {
              const matchedItem = items.find((i) => i.id === it.itemId || i.code === it.itemCode || i.name.toLowerCase().trim() === it.itemName?.toLowerCase().trim());
              const targetId = matchedItem ? matchedItem.id : it.itemId;
              const currentDelta = stockDelta.get(targetId) || 0;
              if (t.type === 'IN') {
                stockDelta.set(targetId, currentDelta + (it.quantity || 0));
              } else if (t.type === 'OUT') {
                stockDelta.set(targetId, currentDelta - (it.quantity || 0));
              }
            }
          });
        }
      });

      if (stockDelta.size > 0) {
        nextItems = items.map((item) => {
          if (stockDelta.has(item.id)) {
            const delta = stockDelta.get(item.id)!;
            const newStock = Math.max(0, item.currentStock + delta);
            return { ...item, currentStock: newStock, updatedAt: nowIso };
          }
          return item;
        });
        setItems(nextItems);
        try {
          localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(nextItems));
        } catch {}
      }
    }

    syncToCloud({ items: nextItems, transactions: nextTrx, deletedTransactionIds: nextDeletedIds });

    logAudit(
      'Import Riwayat Transaksi',
      'TRANSACTIONS',
      `Mengimpor ${importedTrx.length} data riwayat transaksi (Mode: ${mode === 'replace' ? 'Timpa Semua' : 'Tambah Baru'}${syncStock ? ', Stok disesuaikan' : ''})`
    );
    showToast(
      `Berhasil mengimpor ${importedTrx.length} data riwayat transaksi log!`,
      'success'
    );
  };

  const handleImportAuditLogs = (newLogs: AuditLogEntry[], mode: 'append' | 'replace' = 'append') => {
    let nextLogs: AuditLogEntry[] = [];
    if (mode === 'replace') {
      nextLogs = newLogs;
    } else {
      nextLogs = [...newLogs, ...auditLogs];
    }
    setAuditLogs(nextLogs);
    try {
      localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(nextLogs));
    } catch {}
    showToast(`Berhasil mengimpor ${newLogs.length} data riwayat log audit.`, 'success');
  };

  const handleClearLoans = (options: { scope: 'ALL' | 'RETURNED' | 'OLDER_3_MONTHS' | 'OLDER_1_MONTH' | 'OLDER_7_DAYS' }) => {
    const now = new Date();
    let nextLoans = [...loans];

    if (options.scope === 'ALL') {
      nextLoans = [];
    } else if (options.scope === 'RETURNED') {
      nextLoans = loans.filter((l) => l.status === 'BORROWED');
    } else {
      let days = 90;
      if (options.scope === 'OLDER_1_MONTH') days = 30;
      if (options.scope === 'OLDER_7_DAYS') days = 7;
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).getTime();
      nextLoans = loans.filter((l) => {
        const tTime = new Date(l.loanDate || l.createdAt || 0).getTime();
        return tTime >= cutoff;
      });
    }

    // Record tombstones for all cleared loans so they never resurrect upon sync or new transactions
    const removedLoans = loans.filter((l) => !nextLoans.some((nl) => nl.id === l.id));
    const removedKeys: string[] = [];
    removedLoans.forEach((l) => {
      if (l.id) removedKeys.push(l.id);
      if (l.loanNumber) removedKeys.push(l.loanNumber);
    });

    // If clearing ALL, also ensure seed and historical loans are permanently tombstoned
    if (options.scope === 'ALL') {
      INITIAL_LOANS.forEach((l) => {
        if (l.id) removedKeys.push(l.id);
        if (l.loanNumber) removedKeys.push(l.loanNumber);
      });
      try {
        const saved = localStorage.getItem(STORAGE_KEY_LOANS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            parsed.forEach((l: any) => {
              if (l.id) removedKeys.push(l.id);
              if (l.loanNumber) removedKeys.push(l.loanNumber);
            });
          }
        }
      } catch {}
    } else if (options.scope === 'RETURNED') {
      INITIAL_LOANS.filter((l) => l.status === 'RETURNED').forEach((l) => {
        if (l.id) removedKeys.push(l.id);
        if (l.loanNumber) removedKeys.push(l.loanNumber);
      });
    }

    recordDeletedLoanIds(removedKeys);
    const nextDeletedLoans = getDeletedLoanIds();
    setDeletedLoanIds(nextDeletedLoans);

    setLoans(nextLoans);
    try {
      localStorage.setItem(STORAGE_KEY_LOANS, JSON.stringify(nextLoans));
    } catch (e) {
      console.error(e);
    }
    syncToCloud({ loans: nextLoans, deletedLoanIds: nextDeletedLoans });
    logAudit('Bersihkan Riwayat Pinjaman', 'LOANS', `Membersihkan log riwayat pinjaman: scope ${options.scope} (${removedLoans.length} data dihapus)`);
    showToast(`Riwayat peminjaman barang (${removedLoans.length} record) telah dibersihkan secara permanen.`, 'warning');
  };

  // Item Loans operations with immediate Cloud sync
  const handleAddLoan = (newLoan: ItemLoan) => {
    const nowIso = new Date().toISOString();
    const finalLoan: ItemLoan = {
      ...newLoan,
      updatedAt: nowIso,
    };
    const nextLoans = [finalLoan, ...loans];
    setLoans(nextLoans);
    
    // Deduct stock if active
    const nextItems = items.map((it) =>
      it.id === newLoan.itemId
        ? { ...it, currentStock: Math.max(0, it.currentStock - newLoan.quantity), updatedAt: nowIso }
        : it
    );
    setItems(nextItems);

    syncToCloud({ loans: nextLoans, items: nextItems });
    logAudit('Pinjam Barang', 'LOANS', `Peminjaman "${newLoan.itemName}" (${newLoan.quantity} ${newLoan.unit}) oleh ${newLoan.borrowerName}`);
    showToast(`Peminjaman barang [${newLoan.loanNumber}] berhasil dicatat!`, 'success');
  };

  const handleReturnLoan = (
    loanId: string, 
    condition: 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT' | 'HILANG',
    notes: string
  ) => {
    const loan = loans.find((l) => l.id === loanId);
    if (!loan) return;

    const returnDateStr = new Date().toISOString().substring(0, 10);
    const nowIso = new Date().toISOString();

    const nextLoans = loans.map((l) =>
      l.id === loanId
        ? {
            ...l,
            status: 'RETURNED' as const,
            actualReturnDate: returnDateStr,
            updatedAt: nowIso,
            receivedReturnBy: currentUser.fullName,
            returnCondition: condition,
            returnNotes: notes,
          }
        : l
    );
    setLoans(nextLoans);

    // Restore stock if not lost
    let nextItems = items;
    if (condition !== 'HILANG') {
      nextItems = items.map((it) =>
        it.id === loan.itemId
          ? { ...it, currentStock: it.currentStock + loan.quantity, updatedAt: nowIso }
          : it
      );
      setItems(nextItems);
    }

    syncToCloud({ loans: nextLoans, items: nextItems });
    logAudit('Pengembalian Pinjaman', 'LOANS', `Pengembalian barang [${loan.loanNumber}] (${loan.itemName}) kondisi: ${condition}`);
    showToast(`Pengembalian barang [${loan.loanNumber}] berhasil dicatat. Stok barang dipulihkan.`, 'success');
  };

  const handleDeleteLoan = (loanId: string) => {
    const loan = loans.find((l) => l.id === loanId);
    const nextLoans = loans.filter((l) => l.id !== loanId);
    setLoans(nextLoans);

    recordDeletedLoanId(loanId, loan?.loanNumber);
    const nextDeletedLoans = getDeletedLoanIds();
    setDeletedLoanIds(nextDeletedLoans);

    try {
      localStorage.setItem(STORAGE_KEY_LOANS, JSON.stringify(nextLoans));
    } catch (e) {
      console.error(e);
    }

    syncToCloud({ loans: nextLoans, deletedLoanIds: nextDeletedLoans });
    logAudit('Hapus Data Pinjaman', 'LOANS', `Menghapus arsip pinjaman ${loan?.loanNumber || loanId}`);
    showToast(`Data pinjaman [${loan?.loanNumber || loanId}] telah dihapus permanen.`, 'warning');
  };

  // Reset all sample data to default
  const handleResetSampleData = () => {
    clearDeletedTransactionIds();
    setDeletedTransactionIds([]);
    clearDeletedLoanIds();
    setDeletedLoanIds([]);
    setItems(INITIAL_ITEMS);
    setCategories(CATEGORIES);
    setTransactions(INITIAL_TRANSACTIONS);
    setEmployees(INITIAL_EMPLOYEES);
    setUsers(INITIAL_USERS);
    setCurrentUser(INITIAL_USERS[0]);
    setLoans(INITIAL_LOANS);
    setDashboardConfig(DEFAULT_DASHBOARD_CONFIG);
    
    localStorage.removeItem(STORAGE_KEY_ITEMS);
    localStorage.removeItem(STORAGE_KEY_CATEGORIES);
    localStorage.removeItem(STORAGE_KEY_TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEY_EMPLOYEES);
    localStorage.removeItem(STORAGE_KEY_USERS);
    localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
    localStorage.removeItem(STORAGE_KEY_LOANS);
    localStorage.removeItem(STORAGE_KEY_CONFIG);

    syncToCloud({
      items: INITIAL_ITEMS,
      categories: CATEGORIES,
      transactions: INITIAL_TRANSACTIONS,
      deletedTransactionIds: [],
      deletedLoanIds: [],
      employees: INITIAL_EMPLOYEES,
      users: INITIAL_USERS,
      loans: INITIAL_LOANS,
      dashboardConfig: DEFAULT_DASHBOARD_CONFIG,
    });

    logAudit('Reset Sample Data', 'SETTINGS', 'Sistem di-reset ke database default');
    showToast('Data sistem gudang GA telah di-reset.', 'info');
    setIsResetSampleConfirmOpen(false);
  };

  // Counts for badges
  const lowStockCount = items.filter((i) => i.currentStock <= i.minStock).length;
  const activeLoansCount = loans.filter((l) => l.status === 'BORROWED' || l.status === 'OVERDUE').length;
  const pendingApprovalsCount = transactions.filter((t) => t.type === 'OUT' && t.status === 'PENDING').length;

  // Render Public Self-Service Request Portal if opened via QR or direct link (No login required)
  if (isPublicPortalOpen) {
    return (
      <PublicRequestPortalView
        items={items}
        employees={employees}
        companyName={dashboardConfig.appName || 'GUDANG GA'}
        companySubtitle={dashboardConfig.companySubtitle || 'General Affairs Inventory & Barcode Control System'}
        logoUrl={dashboardConfig.logoUrl}
        onSubmitTransaction={handleSubmitTransaction}
        onGoToStaffLogin={() => setIsPublicPortalOpen(false)}
        recentTransactions={transactions}
      />
    );
  }

  // Render Login View if not logged in (Requirement 4)
  if (!isLoggedIn) {
    return (
      <LoginView
        users={users}
        appName={dashboardConfig.appName || 'GUDANG GA'}
        companySubtitle={dashboardConfig.companySubtitle || 'General Affairs Inventory & Barcode Control System'}
        logoUrl={dashboardConfig.logoUrl}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsLoggedIn(true);
          localStorage.setItem('ga_warehouse_is_logged_in', 'true');
          localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
        }}
        onGoToRequestPortal={() => setIsPublicPortalOpen(true)}
      />
    );
  }

  const theme = getThemeConfig(dashboardConfig.themeColor);
  const pageBgClass = getPageBackground(dashboardConfig.themeColor, dashboardConfig.mode);
  const densityMainClass = getDensityContainerClass(dashboardConfig.density);
  const fontFamilyString = getFontFamilyStyle(dashboardConfig.fontFamily);

  return (
    <div 
      className={`min-h-screen ${pageBgClass} flex flex-col selection:bg-blue-600 selection:text-white antialiased transition-colors duration-200`}
      style={{ fontFamily: fontFamilyString }}
    >
      {/* 1. Glossy Proportional Header (Non-sticky, responsive and mobile-optimized) */}
      <header className={`${theme.headerGradient || 'bg-gradient-to-r from-[#122240] via-[#1a2f57] to-[#122240]'} text-white shadow-lg shadow-slate-900/10 border-b border-slate-700/60 transition-colors duration-200`}>
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-15 gap-1.5 sm:gap-3">
            {/* Left: Brand Logo & Title */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
              <div 
                onClick={() => setActiveTab('dashboard')} 
                className="flex items-center gap-2 sm:gap-3 cursor-pointer group select-none min-w-0"
                title="Menuju Dashboard Utama"
              >
                {/* Proportional Glossy Logo Frame */}
                <div className="relative p-0.5 sm:p-1 rounded-lg sm:rounded-xl bg-gradient-to-b from-white/20 via-white/10 to-transparent shadow-md shadow-black/20 ring-1 ring-white/20 group-hover:scale-105 transition-all duration-200 shrink-0">
                  <CompanyLogo logoUrl={dashboardConfig.logoUrl} size="sm" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="font-black text-xs sm:text-base tracking-tight text-white group-hover:text-blue-200 transition-colors drop-shadow-xs truncate">
                      {dashboardConfig.appName || 'GUDANG GA'}
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-black bg-blue-500/25 text-blue-300 border border-blue-400/30 px-1 sm:px-1.5 py-0.2 rounded font-mono shadow-xs shrink-0">
                      PRO
                    </span>
                    <button
                      id="header-cloud-sync-status-btn"
                      type="button"
                      onClick={handleManualRefreshCloud}
                      title={
                        syncState === 'connected'
                          ? 'Tersinkronisasi Real-Time (PC ↔ Handphone). Klik untuk sinkronisasi paksa.'
                          : syncState === 'syncing'
                          ? 'Sedang menyinkronkan data antar perangkat...'
                          : 'Mode Offline - Klik untuk mencoba menyambungkan ulang'
                      }
                      className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                        syncState === 'connected'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30 hover:bg-emerald-500/30'
                          : syncState === 'syncing'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-400/30 animate-pulse'
                          : 'bg-amber-500/20 text-amber-300 border-amber-400/30 hover:bg-amber-500/30'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        syncState === 'connected' ? 'bg-emerald-400 animate-pulse' : syncState === 'syncing' ? 'bg-blue-400' : 'bg-amber-400'
                      }`} />
                      <span className="hidden sm:inline">
                        {syncState === 'connected' ? 'PC ↔ HP Live' : syncState === 'syncing' ? 'Syncing...' : 'Lokal'}
                      </span>
                      <RefreshCw className={`w-2.5 h-2.5 opacity-75 ml-0.5 ${syncState === 'syncing' ? 'animate-spin' : ''}`} />
                    </button>
                    {offlineQueueLength > 0 && (
                      <button
                        type="button"
                        onClick={handleManualRefreshCloud}
                        title={`${offlineQueueLength} transaksi/data tersimpan di memori lokal saat offline. Klik untuk mengunggah ke Cloud sekarang!`}
                        className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 bg-amber-500/30 text-amber-200 border-amber-400/50 animate-pulse cursor-pointer hover:bg-amber-500/40"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span>{offlineQueueLength} Tertunda</span>
                        <RefreshCw className="w-2.5 h-2.5 ml-0.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-300/90 font-medium hidden md:block truncate">
                    {dashboardConfig.companySubtitle || 'General Affairs Inventory & Barcode Control System'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Glossy Quick Actions, Notification Bell, Role & Action Icons (Mobile Responsive & No Overlap) */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* Glossy Notification Bell with Instant Approval Trigger */}
              <button
                type="button"
                onClick={() => setIsNotificationModalOpen(true)}
                title="Notifikasi Permintaan & Approval"
                className="relative p-1.5 sm:p-2 text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg sm:rounded-xl border border-white/15 shadow-sm transition-all cursor-pointer group shrink-0"
              >
                <Bell className="w-4 h-4 text-amber-300 group-hover:scale-110 transition-transform" />
                {pendingApprovalsCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1 sm:px-1.5 py-0.2 bg-rose-500 text-white font-mono font-black text-[9px] sm:text-[10px] rounded-full border-2 border-[#122240] animate-pulse shadow-sm">
                    {pendingApprovalsCount}
                  </span>
                )}
              </button>

              {/* Active User Role Glossy Pill (Hidden on Mobile because it's placed in SubHeaderNavigation beside Dashboard) */}
              <button
                type="button"
                onClick={() => setIsRoleSwitcherOpen(true)}
                title="Kelola Akun & Ganti Role"
                className="hidden md:flex relative p-1.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 shadow-sm backdrop-blur-xs items-center gap-1.5 transition-all cursor-pointer text-left group shrink-0"
              >
                <div className={`w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-md flex items-center justify-center font-black text-[10px] shadow-inner shrink-0 ${
                  currentUser.role === 'MASTER_ADMIN' 
                    ? 'bg-amber-400 text-slate-950 ring-1 ring-amber-300' 
                    : currentUser.role === 'ADMIN' 
                    ? 'bg-blue-500 text-white ring-1 ring-blue-300' 
                    : 'bg-emerald-500 text-white ring-1 ring-emerald-300'
                }`}>
                  {currentUser.role === 'MASTER_ADMIN' ? (
                    <Crown className="w-3 h-3" />
                  ) : currentUser.role === 'ADMIN' ? (
                    <ShieldCheck className="w-3 h-3" />
                  ) : (
                    <Wrench className="w-3 h-3" />
                  )}
                </div>
                <div className="hidden lg:block leading-tight">
                  <div className="text-[11px] font-bold text-white group-hover:text-blue-200 transition-colors flex items-center gap-1">
                    <span>{currentUser.fullName}</span>
                  </div>
                  <div className="text-[9px] font-mono text-slate-300">
                    {currentUser.role.replace('_', ' ')}
                  </div>
                </div>
              </button>

              {/* Header Icon: Google Sheets Sync & Export (Hidden on Mobile, available in Drawer/SubHeader) */}
              <button
                type="button"
                onClick={() => setIsGoogleSheetsModalOpen(true)}
                title="Integrasi Google Sheets (Ekspor Laporan & Impor Stok)"
                className="hidden lg:flex p-1.5 sm:p-2 text-slate-200 hover:text-white bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg sm:rounded-xl border border-emerald-400/30 shadow-sm transition-all cursor-pointer items-center gap-1 sm:gap-1.5 text-xs font-semibold shrink-0"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
                <span className="hidden xl:inline">Google Sheets</span>
              </button>

              {/* Header Icon: Personil Database (Hidden on Mobile, placed beside Dashboard in SubHeader) */}
              <button
                type="button"
                onClick={() => setIsEmployeeModalOpen(true)}
                title={`Database Personil (${employees.length} Karyawan)`}
                className="hidden md:flex p-1.5 sm:p-2 text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg sm:rounded-xl border border-white/15 shadow-sm transition-all cursor-pointer items-center gap-1 sm:gap-1.5 text-xs font-semibold shrink-0"
              >
                <Users className="w-4 h-4 text-emerald-300" />
                <span className="hidden xl:inline">Personil ({employees.length})</span>
              </button>

              {/* Header Icon: Dashboard & Branding Settings (Master Admin Only) */}
              {currentUser.role === 'MASTER_ADMIN' && (
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(true)}
                  title="Konfigurasi Dashboard, Tema & Logo (Khusus Master Admin)"
                  className="p-1.5 sm:p-2 text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg sm:rounded-xl border border-white/15 shadow-xs transition-all cursor-pointer shrink-0 flex items-center justify-center"
                >
                  <SlidersHorizontal className="w-4 h-4 text-sky-300" />
                </button>
              )}

              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                title="Keluar dari Akun (Logout)"
                className="p-1.5 sm:p-2 text-rose-300 hover:text-white bg-rose-500/20 hover:bg-rose-600 rounded-lg sm:rounded-xl border border-rose-400/30 shadow-sm transition-all cursor-pointer flex items-center gap-1 text-xs font-bold shrink-0"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden lg:inline">Keluar</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Sub-Header Navigation Bar (Placed directly under the header as requested) */}
      <SubHeaderNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        lowStockCount={lowStockCount}
        activeLoansCount={activeLoansCount}
        pendingApprovalsCount={pendingApprovalsCount}
        currentUser={currentUser}
        rolePermissions={rolePermissions}
        employeeCount={employees.length}
        config={dashboardConfig}
        onOpenEmployeeModal={() => setIsEmployeeModalOpen(true)}
        onOpenRoleSwitcher={() => setIsRoleSwitcherOpen(true)}
        onOpenGoogleSheets={() => setIsGoogleSheetsModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
      />

      {/* Floating Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 text-xs font-bold ${
              toastMessage.type === 'success'
                ? 'bg-slate-900 text-white border-emerald-500/50 shadow-emerald-950/20'
                : toastMessage.type === 'warning'
                ? 'bg-rose-950 text-white border-rose-500/50 shadow-rose-950/20'
                : 'bg-slate-900 text-white border-blue-500/50 shadow-blue-950/20'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white text-xs ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 ${densityMainClass}`}>
        {/* Tab: Dashboard Overview (Ramping, Compact metrics & fast workflow) */}
        {activeTab === 'dashboard' && (
          <DashboardOverview
            items={items}
            transactions={transactions}
            loans={loans}
            currentUser={currentUser}
            config={dashboardConfig}
            rolePermissions={rolePermissions}
            employees={employees}
            onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
            onOpenScanner={() => setIsScannerOpen(true)}
            onOpenBarcodePrint={(mode = 'STOCK') => {
              setBarcodePrintMode(mode);
              setIsBarcodeSheetOpen(true);
            }}
            onOpenStatsReport={() => setIsStatsModalOpen(true)}
            onNavigateToRequest={() => setActiveTab('request')}
            onNavigateToIncoming={() => setActiveTab('incoming')}
            onNavigateToStock={() => setActiveTab('stock')}
            onNavigateToLoans={() => setActiveTab('loans')}
            onNavigateToTransactions={() => setActiveTab('transactions')}
            onScanItemForRequest={handleDirectItemRequest}
          />
        )}

        {/* Tab: Permintaan Barang */}
        {activeTab === 'request' && (
          <ItemRequestView
            items={items}
            transactions={transactions}
            employees={employees}
            currentUser={currentUser}
            rolePermissions={rolePermissions}
            initialSelectedItem={selectedScannedItem}
            onClearInitialItem={() => setSelectedScannedItem(null)}
            onOpenScanner={() => setIsScannerOpen(true)}
            onOpenEmployeeModal={() => setIsEmployeeModalOpen(true)}
            onSubmitTransaction={handleSubmitTransaction}
            onApproveRequest={handleApproveRequest}
            onRejectRequest={handleRejectRequest}
            onDispatchApprovedRequest={handleDispatchApprovedRequest}
            onNavigateToStock={() => setActiveTab('stock')}
          />
        )}

        {/* Tab: Barang Masuk */}
        {activeTab === 'incoming' && (
          <IncomingGoodsView
            items={items}
            currentUser={currentUser}
            rolePermissions={rolePermissions}
            onOpenScanner={() => setIsScannerOpen(true)}
            onSubmitTransaction={handleSubmitTransaction}
            onNavigateToStock={() => setActiveTab('stock')}
          />
        )}

        {/* Tab: Stock Barang */}
        {activeTab === 'stock' && (
          <ItemMasterView
            items={items}
            categories={categories}
            currentUser={currentUser}
            rolePermissions={rolePermissions}
            onAddItem={handleAddItem}
            onBulkAddItems={handleBulkAddItems}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onClearAllStock={handleClearAllStock}
            onDeleteAllStockItems={handleDeleteAllStockItems}
            onScanItemForRequest={handleDirectItemRequest}
            onOpenPrintSheet={() => {
              setBarcodePrintMode('STOCK');
              setIsBarcodeSheetOpen(true);
            }}
            onOpenGoogleSheets={() => setIsGoogleSheetsModalOpen(true)}
            onAddCategory={handleAddCategory}
            onEditCategory={handleEditCategory}
            onDeleteCategory={handleDeleteCategory}
            onResetCategories={handleResetCategories}
          />
        )}

        {/* Tab: Riwayat Transaksi */}
        {activeTab === 'transactions' && (
          <TransactionsHistoryView
            transactions={transactions}
            companyLogo={dashboardConfig.logoUrl}
            currentUser={currentUser}
            rolePermissions={rolePermissions}
            onOpenScanner={() => setIsScannerOpen(true)}
            onDeleteTransaction={handleDeleteTransaction}
            onClearTransactions={handleClearTransactions}
            onImportTransactions={handleImportTransactions}
          />
        )}

        {/* Tab: Peminjaman Barang */}
        {activeTab === 'loans' && (
          <ItemLoanView
            loans={loans}
            items={items}
            employees={employees}
            currentUser={currentUser}
            rolePermissions={rolePermissions}
            onAddLoan={handleAddLoan}
            onReturnLoan={handleReturnLoan}
            onDeleteLoan={handleDeleteLoan}
            onClearLoans={handleClearLoans}
          />
        )}
      </main>

      {/* Global Modals */}

      {/* 1. Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        items={items}
        onScanSuccess={handleBarcodeScanned}
      />

      {/* 2. Barcode Sheet Printable Modal */}
      <BarcodeSheetModal
        isOpen={isBarcodeSheetOpen}
        onClose={() => setIsBarcodeSheetOpen(false)}
        items={items}
        transactions={transactions}
        companyLogo={dashboardConfig.logoUrl}
        companyName={dashboardConfig.appName || 'GUDANG GA'}
        initialMode={barcodePrintMode}
      />

      {/* 3. Logo Settings Modal */}
      <LogoSettingsModal
        isOpen={isLogoModalOpen}
        onClose={() => setIsLogoModalOpen(false)}
        currentLogo={dashboardConfig.logoUrl}
        onSaveLogo={handleSaveLogo}
      />

      {/* 4. Employee Database Modal */}
      <EmployeeDatabaseModal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        employees={employees}
        onAddEmployee={handleAddEmployee}
        onUpdateEmployee={handleUpdateEmployee}
        onDeleteEmployee={handleDeleteEmployee}
        onResetEmployees={handleResetEmployees}
        onOpenGoogleSheets={() => setIsGoogleSheetsModalOpen(true)}
        companyName={dashboardConfig.appName || 'GUDANG GA'}
      />

      {/* 5. User Account & RBAC Management Modal */}
      <UserManagementModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        users={users}
        currentUser={currentUser}
        employees={employees}
        onAddUser={handleAddUser}
        onUpdateUser={handleUpdateUser}
        onDeleteUser={handleDeleteUser}
        rolePermissions={rolePermissions}
        onUpdateRolePermissions={handleUpdateRolePermissions}
      />

      {/* 6. Audit Trail Modal */}
      <AuditTrailModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        logs={auditLogs}
        onImportLogs={handleImportAuditLogs}
      />

      {/* 7. Dashboard Settings & System Lock Modal */}
      <DashboardSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        config={dashboardConfig}
        currentUser={currentUser}
        onSaveConfig={handleSaveConfig}
        onResetConfig={handleResetConfig}
      />

      {/* 8. Role & User Switcher Modal */}
      <RoleSwitcherModal
        isOpen={isRoleSwitcherOpen}
        onClose={() => setIsRoleSwitcherOpen(false)}
        currentUser={currentUser}
        userAccounts={users}
        onSwitchUser={handleSwitchUser}
        onOpenUserManagement={() => setIsUserModalOpen(true)}
      />

      {/* 9. Reset Sample Data Confirmation Modal */}
      <ConfirmationModal
        isOpen={isResetSampleConfirmOpen}
        title="Reset Sistem ke Sample Data Awal"
        message="PERINGATAN: Seluruh transaksi, data barang, riwayat peminjaman, dan konfigurasi akan dikembalikan ke data awal sistem. Anda yakin?"
        confirmText="Ya, Reset Semua Data"
        isDestructive={true}
        onConfirm={handleResetSampleData}
        onCancel={() => setIsResetSampleConfirmOpen(false)}
      />

      {/* 10. Header Notification & Instant Approval Modal */}
      <NotificationApprovalModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        transactions={transactions}
        currentUser={currentUser}
        onApprove={handleApproveRequest}
        onReject={handleRejectRequest}
        onDispatchApprovedRequest={handleDispatchApprovedRequest}
        onNavigateToRequest={() => setActiveTab('request')}
      />

      {/* 11. Professional Statistics & Analytics Report Modal */}
      <ProfessionalStatsReportModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        items={items}
        transactions={transactions}
      />

      {/* 12. Google Sheets Cloud Integration Modal */}
      <GoogleSheetsModal
        isOpen={isGoogleSheetsModalOpen}
        onClose={() => setIsGoogleSheetsModalOpen(false)}
        items={items}
        transactions={transactions}
        loans={loans}
        employees={employees}
        companyName={dashboardConfig.appName || 'GUDANG GA'}
        onImportItems={(newItems, mode) => {
          handleBulkAddItems(newItems, mode);
          setToastMessage({
            text: `Berhasil mengimpor ${newItems.length} data barang dari Google Sheets!`,
            type: 'success',
          });
        }}
        showToast={(text, type) => setToastMessage({ text, type })}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-4 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Sistem Gudang General Affairs (GA)</span>
            <span>•</span>
            <span className="text-slate-500">Multi-Role RBAC & Barcode Inventory Control</span>
          </div>

          <div className="flex items-center gap-4">
            {currentUser.role === 'MASTER_ADMIN' && (
              <button
                type="button"
                onClick={() => setIsResetSampleConfirmOpen(true)}
                className="text-slate-500 hover:text-rose-600 hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <RotateCcw className="w-3 h-3" /> Reset Sample Data
              </button>
            )}
            <span className="text-slate-300">|</span>
            <span className="font-mono text-slate-500">
              Role: <strong className="text-slate-800">{currentUser.role.replace('_', ' ')}</strong>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
