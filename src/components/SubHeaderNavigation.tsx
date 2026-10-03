import React, { useState, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Package, 
  History, 
  HandHelping,
  ChevronDown,
  Users,
  Crown,
  ShieldCheck,
  Wrench,
  SlidersHorizontal,
  FileSpreadsheet
} from 'lucide-react';
import { UserAccount, DashboardConfig, UserRole, UserPermissions } from '../types';
import { getThemeConfig } from '../utils/themeStyles';

export type MainTabType = 'dashboard' | 'request' | 'incoming' | 'stock' | 'loans' | 'transactions';

interface SubHeaderNavigationProps {
  activeTab: MainTabType;
  onTabChange: (tab: MainTabType) => void;
  pendingApprovalsCount?: number;
  lowStockCount?: number;
  activeLoansCount?: number;
  currentUser: UserAccount;
  rolePermissions?: Record<UserRole, UserPermissions>;
  employeeCount?: number;
  config?: DashboardConfig;
  onOpenEmployeeModal?: () => void;
  onOpenRoleSwitcher?: () => void;
  onOpenGoogleSheets?: () => void;
  onOpenSettingsModal?: () => void;
}

export const SubHeaderNavigation: React.FC<SubHeaderNavigationProps> = ({
  activeTab,
  onTabChange,
  pendingApprovalsCount = 0,
  lowStockCount = 0,
  activeLoansCount = 0,
  currentUser,
  rolePermissions,
  employeeCount = 0,
  config,
  onOpenEmployeeModal,
  onOpenRoleSwitcher,
  onOpenGoogleSheets,
  onOpenSettingsModal,
}) => {
  const [isDashboardDropdownOpen, setIsDashboardDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const theme = getThemeConfig(config?.themeColor);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDashboardDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tabs = [
    {
      id: 'dashboard' as MainTabType,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
      badgeColor: '',
      colorClass: 'text-sky-400',
    },
    {
      id: 'request' as MainTabType,
      label: 'Permintaan',
      icon: ArrowUpRight,
      badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount}` : null,
      badgeColor: 'bg-amber-400/90 text-slate-950 font-black',
      colorClass: 'text-amber-300',
    },
    {
      id: 'incoming' as MainTabType,
      label: 'Masuk',
      fullLabel: 'Barang Masuk',
      icon: ArrowDownLeft,
      badge: null,
      badgeColor: '',
      colorClass: 'text-emerald-300',
    },
    {
      id: 'stock' as MainTabType,
      label: 'Stock',
      fullLabel: 'Stock Master',
      icon: Package,
      badge: lowStockCount > 0 ? `${lowStockCount}` : null,
      badgeColor: 'bg-rose-400/90 text-white font-bold',
      colorClass: 'text-sky-300',
    },
    {
      id: 'loans' as MainTabType,
      label: 'Pinjam',
      fullLabel: 'Peminjaman',
      icon: HandHelping,
      badge: activeLoansCount > 0 ? `${activeLoansCount}` : null,
      badgeColor: 'bg-indigo-400/90 text-white font-bold',
      colorClass: 'text-indigo-300',
    },
    {
      id: 'transactions' as MainTabType,
      label: 'Riwayat',
      fullLabel: 'Riwayat Log',
      icon: History,
      badge: null,
      badgeColor: '',
      colorClass: 'text-purple-300',
    },
  ];

  const handleSelectTab = (tabId: MainTabType) => {
    onTabChange(tabId);
    setIsDashboardDropdownOpen(false);
  };

  return (
    <div className={`${theme.subHeaderBg || 'bg-slate-900'} border-b border-slate-800 shadow-md transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        {/* Desktop Navigation (>= md screens): Full-width evenly spaced tabs with no horizontal scroll */}
        <div className="hidden md:grid md:grid-cols-6 gap-1.5 py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer relative group ${
                  isActive
                    ? 'bg-white text-slate-950 shadow-md ring-1 ring-white/50'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800 bg-slate-800/50 border border-slate-700/60'
                }`}
              >
                <div className={`p-1 rounded-lg transition-transform group-hover:scale-105 ${
                  isActive
                    ? 'bg-slate-950 text-white'
                    : 'bg-slate-700/60 text-slate-300 group-hover:text-white'
                }`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>

                <span className="truncate">{tab.fullLabel || tab.label}</span>

                {tab.badge && (
                  <span className={`px-1.5 py-0.2 text-[9px] rounded-full shadow-xs shrink-0 ${tab.badgeColor}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Mobile Navigation Bar (< md screens): Clean and single-row without duplicated horizontal tabs */}
        <div className="md:hidden py-1.5 flex items-center justify-between gap-2 relative">
          {/* Left: Blue Dashboard Icon with Dropdown Menu on Click */}
          <div className="relative shrink-0 flex items-center gap-2" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDashboardDropdownOpen(!isDashboardDropdownOpen)}
              title="Menu Navigasi Modul"
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                activeTab === 'dashboard'
                  ? 'bg-sky-600 text-white border border-sky-400 ring-1 ring-sky-300/40'
                  : 'bg-slate-800 text-sky-300 border border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold">Menu</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isDashboardDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Active Module Indicator Label */}
            {(() => {
              const currentTabObj = tabs.find((t) => t.id === activeTab) || tabs[0];
              const CurrentIcon = currentTabObj.icon;
              return (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700/60 text-white text-[11px] font-bold">
                  <CurrentIcon className={`w-3.5 h-3.5 ${currentTabObj.colorClass || 'text-sky-400'}`} />
                  <span className="truncate max-w-[130px]">{currentTabObj.fullLabel || currentTabObj.label}</span>
                  {currentTabObj.badge && (
                    <span className={`px-1.5 py-0.2 text-[8.5px] rounded-full font-black ${currentTabObj.badgeColor}`}>
                      {currentTabObj.badge}
                    </span>
                  )}
                </div>
              );
            })()}

            {/* Dropdown Menu Scrollable List */}
            {isDashboardDropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-60 max-h-80 overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  Pilih Modul Navigasi
                </div>
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleSelectTab(tab.id)}
                      className={`w-full px-2.5 py-2 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : tab.colorClass}`} />
                        <span>{tab.fullLabel || tab.label}</span>
                      </div>
                      {tab.badge && (
                        <span className={`px-1.5 py-0.2 text-[9px] rounded-full font-black ${tab.badgeColor}`}>
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Soft Icon Action Buttons (Personel & Role/Akun) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Personel Database Button (Logo Saja) */}
            {onOpenEmployeeModal && (
              <button
                type="button"
                onClick={onOpenEmployeeModal}
                title={`Database Personil (${employeeCount} Karyawan)`}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 shadow-xs flex items-center justify-center transition-all cursor-pointer"
              >
                <Users className="w-4 h-4" />
              </button>
            )}

            {/* Akun / Role Button (Logo Saja) */}
            {onOpenRoleSwitcher && (
              <button
                type="button"
                onClick={onOpenRoleSwitcher}
                title={`Kelola Akun: ${currentUser.fullName} (${currentUser.role})`}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 shadow-xs flex items-center justify-center transition-all cursor-pointer"
              >
                {currentUser.role === 'MASTER_ADMIN' ? (
                  <Crown className="w-4 h-4 text-amber-300" />
                ) : currentUser.role === 'ADMIN' ? (
                  <ShieldCheck className="w-4 h-4 text-sky-300" />
                ) : (
                  <Wrench className="w-4 h-4 text-teal-300" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
