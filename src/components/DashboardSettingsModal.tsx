import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Palette, 
  Type, 
  Sliders, 
  Image as ImageIcon, 
  Lock, 
  Unlock, 
  RotateCcw, 
  Check, 
  X, 
  Upload, 
  Sparkles, 
  Building2, 
  ShieldCheck, 
  Layers,
  LayoutGrid,
  CheckCircle2,
  Sun,
  Moon,
  Monitor,
  Volume2,
  Bell,
  Play
} from 'lucide-react';
import { DashboardConfig, ThemeColor, FontFamily, DashboardDensity, ThemeMode, UserAccount, NotificationSound } from '../types';
import { DEFAULT_DASHBOARD_CONFIG } from '../data/initialData';
import { CompanyLogo } from './CompanyLogo';
import { compressAndOptimizeImage } from '../utils/imageCompressor';
import { NOTIFICATION_SOUND_OPTIONS, playNotificationChime, STORAGE_KEY_NOTIF_SOUND } from '../utils/helpers';

interface DashboardSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: DashboardConfig;
  currentUser: UserAccount;
  onSaveConfig: (newConfig: DashboardConfig) => void;
  onResetConfig: () => void;
}

export const DashboardSettingsModal: React.FC<DashboardSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  currentUser,
  onSaveConfig,
  onResetConfig,
}) => {
  const [themeColor, setThemeColor] = useState<ThemeColor>(config.themeColor || 'soft-sky');
  const [fontFamily, setFontFamily] = useState<FontFamily>(config.fontFamily || 'plus-jakarta');
  const [density, setDensity] = useState<DashboardDensity>(config.density || 'normal');
  const [mode, setMode] = useState<ThemeMode>(config.mode || 'light');
  const [appName, setAppName] = useState(config.appName || 'WAREHOUSE KBCT');
  const [companySubtitle, setCompanySubtitle] = useState(config.companySubtitle || 'Monitoring & Control System — General Affairs Inventory & Barcode');
  const [logoUrl, setLogoUrl] = useState<string | null>(config.logoUrl);
  const [reportLocked, setReportLocked] = useState(config.reportLocked || false);
  const [reportLockedPeriod, setReportLockedPeriod] = useState(config.reportLockedPeriod || 'Agustus 2026');
  const [autoApproveRequests, setAutoApproveRequests] = useState(config.autoApproveRequests || false);
  const [notificationSound, setNotificationSound] = useState<NotificationSound>(config.notificationSound || 'chime_modern');
  const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);
  const [showMetricCards, setShowMetricCards] = useState(config.showMetricCards || {
    totalItems: true,
    outTransactions: true,
    inTransactions: true,
    lowStockAlert: true,
  });
  const [logoInputUrl, setLogoInputUrl] = useState('');

  // Sync state whenever modal opens or external config changes
  useEffect(() => {
    if (isOpen) {
      setThemeColor(config.themeColor || 'soft-sky');
      setFontFamily(config.fontFamily || 'plus-jakarta');
      setDensity(config.density || 'normal');
      setMode(config.mode || 'light');
      setAppName(config.appName || 'WAREHOUSE KBCT');
      setCompanySubtitle(config.companySubtitle || 'Monitoring & Control System — General Affairs Inventory & Barcode');
      setLogoUrl(config.logoUrl || null);
      setReportLocked(config.reportLocked || false);
      setReportLockedPeriod(config.reportLockedPeriod || 'Agustus 2026');
      setAutoApproveRequests(config.autoApproveRequests || false);
      setNotificationSound(config.notificationSound || 'chime_modern');
      setShowMetricCards(config.showMetricCards || {
        totalItems: true,
        outTransactions: true,
        inTransactions: true,
        lowStockAlert: true,
      });
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const isMasterAdmin = currentUser.role === 'MASTER_ADMIN';

  // Rich palette including modern SOFT colors and classic bold tones
  const colorThemes: { id: ThemeColor; name: string; category: 'Soft & Pastel' | 'Klasik & Kontras'; primaryClass: string; bgBadge: string; borderClass: string }[] = [
    // Soft colors
    { id: 'soft-sky', name: 'Soft Sky Blue (KBCT Clean)', category: 'Soft & Pastel', primaryClass: 'bg-sky-700', bgBadge: 'bg-sky-500', borderClass: 'border-sky-300' },
    { id: 'soft-sage', name: 'Soft Sage Green', category: 'Soft & Pastel', primaryClass: 'bg-emerald-800', bgBadge: 'bg-emerald-500', borderClass: 'border-emerald-300' },
    { id: 'soft-lavender', name: 'Soft Lavender Lilac', category: 'Soft & Pastel', primaryClass: 'bg-purple-800', bgBadge: 'bg-purple-500', borderClass: 'border-purple-300' },
    { id: 'soft-peach', name: 'Soft Peach Sand', category: 'Soft & Pastel', primaryClass: 'bg-orange-800', bgBadge: 'bg-orange-400', borderClass: 'border-orange-300' },
    { id: 'soft-rose', name: 'Soft Rose Mauve', category: 'Soft & Pastel', primaryClass: 'bg-rose-800', bgBadge: 'bg-rose-400', borderClass: 'border-rose-300' },
    { id: 'soft-mint', name: 'Soft Mint Breeze', category: 'Soft & Pastel', primaryClass: 'bg-teal-800', bgBadge: 'bg-teal-400', borderClass: 'border-teal-300' },
    { id: 'soft-amber', name: 'Soft Warm Amber', category: 'Soft & Pastel', primaryClass: 'bg-amber-800', bgBadge: 'bg-amber-500', borderClass: 'border-amber-300' },
    
    // Classic bold themes
    { id: 'navy', name: 'Navy Deep Classic', category: 'Klasik & Kontras', primaryClass: 'bg-[#1c2f57]', bgBadge: 'bg-blue-600', borderClass: 'border-blue-300' },
    { id: 'emerald', name: 'Emerald Forest GA', category: 'Klasik & Kontras', primaryClass: 'bg-[#0f4c3a]', bgBadge: 'bg-emerald-600', borderClass: 'border-emerald-300' },
    { id: 'amber', name: 'Gold Amber Standard', category: 'Klasik & Kontras', primaryClass: 'bg-[#5c3e0a]', bgBadge: 'bg-amber-600', borderClass: 'border-amber-300' },
    { id: 'slate', name: 'Slate Industrial Pro', category: 'Klasik & Kontras', primaryClass: 'bg-[#1e293b]', bgBadge: 'bg-slate-700', borderClass: 'border-slate-300' },
    { id: 'crimson', name: 'Crimson Velvet', category: 'Klasik & Kontras', primaryClass: 'bg-[#5a1324]', bgBadge: 'bg-rose-700', borderClass: 'border-rose-300' },
    { id: 'violet', name: 'Royal Violet Corporate', category: 'Klasik & Kontras', primaryClass: 'bg-[#3b1754]', bgBadge: 'bg-purple-700', borderClass: 'border-purple-300' },
  ];

  const fonts: { id: FontFamily; name: string; preview: string; cssFont: string }[] = [
    { id: 'plus-jakarta', name: 'Plus Jakarta Sans', preview: 'Modern & Bersih (Rekomendasi)', cssFont: "'Plus Jakarta Sans', sans-serif" },
    { id: 'inter', name: 'Inter UI', preview: 'Standar Internasional', cssFont: "'Inter', sans-serif" },
    { id: 'roboto', name: 'Roboto', preview: 'Geometris & Rapi', cssFont: "'Roboto', sans-serif" },
    { id: 'poppins', name: 'Poppins', preview: 'Ramah & Berkarakter', cssFont: "'Poppins', sans-serif" },
    { id: 'jetbrains', name: 'JetBrains Mono', preview: 'Teknis & Font Data Barcode', cssFont: "'JetBrains Mono', monospace" },
  ];

  const densityOptions: { id: DashboardDensity; title: string; desc: string }[] = [
    { id: 'compact', title: 'Ramping & Rapi (Compact)', desc: 'Ukuran frame ringkas, efisien di layar laptop & mobile.' },
    { id: 'normal', title: 'Standar Seimbang (Normal)', desc: 'Proporsi standar dengan spasi lega dan keterbacaan tinggi.' },
    { id: 'spacious', title: 'Lapang & Luas (Comfortable)', desc: 'Spasi ekstra luas untuk presentasi atau layar monitor besar.' },
  ];

  const modeOptions: { id: ThemeMode; title: string; desc: string; icon: any }[] = [
    { id: 'light', title: 'Mode Terang (Light)', desc: 'Tampilan bersih, kontras tinggi & nyaman untuk operasional siang.', icon: Sun },
    { id: 'slate', title: 'Mode Slate Matte', desc: 'Nuansa abu-abu industrial yang teduh dan elegan.', icon: Monitor },
    { id: 'dark', title: 'Mode Gelap (Dark)', desc: 'Latar gelap modern, hemat daya baterai & ramah mata malam hari.', icon: Moon },
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const result = await compressAndOptimizeImage(file, {
          maxWidth: 400,
          maxHeight: 400,
          quality: 0.9,
          outputFormat: 'image/png',
        });
        setLogoUrl(result.dataUrl);
      } catch (err) {
        console.error('Failed to compress logo:', err);
      }
    }
  };

  const handleTestSound = (soundId: NotificationSound, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playNotificationChime(soundId);
    setPlayingSoundId(soundId);
    setTimeout(() => setPlayingSoundId(null), 1000);
  };

  const handleSave = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_NOTIF_SOUND, notificationSound);
    }
    onSaveConfig({
      themeColor,
      fontFamily,
      density,
      mode,
      appName: appName.trim() || 'WAREHOUSE KBCT',
      companySubtitle: companySubtitle.trim() || 'Monitoring & Control System — General Affairs Inventory & Barcode',
      logoUrl,
      reportLocked,
      reportLockedPeriod,
      autoApproveRequests,
      notificationSound,
      showMetricCards,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-400/30 shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-white">Pengaturan Dashboard & Kustomisasi Tampilan</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Atur judul header, tema warna soft/pastel, logo perusahaan, kepadatan frame, font & kontrol sistem
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Section 1: Identitas & Judul Header Dashboard */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/90 space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>1. Identitas Sistem & Banner Dashboard</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Aplikasi / Dashboard Utama <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="e.g. WAREHOUSE KBCT"
                  className="w-full px-3.5 py-2 text-sm font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sub-Judul / Keterangan Banner
                </label>
                <input
                  type="text"
                  value={companySubtitle}
                  onChange={(e) => setCompanySubtitle(e.target.value)}
                  placeholder="e.g. Monitoring & Control System — General Affairs Inventory"
                  className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Logo Upload */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 items-center">
              <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-slate-200 text-center">
                <div className="mb-2">
                  <CompanyLogo logoUrl={logoUrl} size="md" />
                </div>
                <span className="text-[11px] font-bold text-slate-700">Preview Logo Aktif</span>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl(null)}
                    className="mt-1 text-[10px] text-rose-600 hover:underline font-semibold"
                  >
                    Hapus Logo
                  </button>
                )}
              </div>

              <div className="sm:col-span-2 space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Ganti Logo Perusahaan
                </label>
                <div className="flex gap-2">
                  <label className="flex-1 px-3 py-2 bg-white border border-slate-300 hover:border-blue-500 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors">
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span>Upload File Logo (PNG/JPG/SVG)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Tema Warna Dashboard (Termasuk Pilihan Warna Soft) */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/90 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                <Palette className="w-4 h-4 text-emerald-600" />
                <span>2. Tema Warna Dashboard (Palet Soft & Klasik)</span>
              </div>
              <span className="text-[11px] text-emerald-700 font-bold bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                {colorThemes.find((t) => t.id === themeColor)?.name}
              </span>
            </div>

            {/* Soft Palette Group */}
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Palet Warna Soft & Pastel</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {colorThemes.filter(t => t.category === 'Soft & Pastel').map((theme) => {
                  const isSelected = themeColor === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setThemeColor(theme.id)}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-400/40 font-black'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full ${theme.bgBadge} shrink-0 shadow-xs`} />
                      <span className="text-xs text-slate-800 truncate">{theme.name.replace('Soft ', '')}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 ml-auto shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Classic Palette Group */}
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Palet Klasik & Kontras</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {colorThemes.filter(t => t.category === 'Klasik & Kontras').map((theme) => {
                  const isSelected = themeColor === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setThemeColor(theme.id)}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-400/40 font-black'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full ${theme.bgBadge} shrink-0 shadow-xs`} />
                      <span className="text-xs text-slate-800 truncate">{theme.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 ml-auto shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 3: Mode Tema Canvas (Light, Slate, Dark) */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/90 space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
              <Sun className="w-4 h-4 text-amber-500" />
              <span>3. Mode Tampilan Canvas</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {modeOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = mode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setMode(opt.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-400/40'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`} />
                          <span className="text-xs font-bold text-slate-900">{opt.title}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Kepadatan & Skala Dashboard Frame */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/90 space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
              <Sliders className="w-4 h-4 text-amber-600" />
              <span>4. Kepadatan Layout & Ukuran Frame Dashboard</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {densityOptions.map((opt) => {
                const isSelected = density === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDensity(opt.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-white border-amber-500 shadow-md ring-2 ring-amber-400/40'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-extrabold text-slate-900">{opt.title}</span>
                        {isSelected && <Check className="w-4 h-4 text-amber-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 5: Font & Tipografi */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/90 space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
              <Type className="w-4 h-4 text-purple-600" />
              <span>5. Pilihan Jenis Font & Tipografi</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {fonts.map((f) => {
                const isSelected = fontFamily === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFontFamily(f.id)}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white border-purple-500 shadow-sm ring-2 ring-purple-400/30'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900 block" style={{ fontFamily: f.cssFont }}>
                        {f.name}
                      </span>
                      <span className="text-[11px] text-slate-500">{f.preview}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-purple-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 6: Pilihan Nada Suara Notifikasi */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/90 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                <Volume2 className="w-4 h-4 text-amber-600" />
                <span>6. Pilihan Nada Suara Notifikasi (Realtime Audio)</span>
              </div>
              <span className="text-[11px] text-amber-800 font-bold bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                <Bell className="w-3 h-3 text-amber-700" />
                <span>{NOTIFICATION_SOUND_OPTIONS.find((s) => s.id === notificationSound)?.name || 'Default'}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {NOTIFICATION_SOUND_OPTIONS.map((sound) => {
                const isSelected = notificationSound === sound.id;
                const isPlaying = playingSoundId === sound.id;

                return (
                  <div
                    key={sound.id}
                    onClick={() => {
                      setNotificationSound(sound.id);
                      handleTestSound(sound.id);
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white border-amber-500 shadow-sm ring-2 ring-amber-400/30'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 truncate">{sound.name}</span>
                        {isSelected && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500 text-white uppercase">
                            Aktif
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 block truncate">{sound.description}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleTestSound(sound.id, e)}
                        title="Dengarkan pratinjau nada suara"
                        className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          isPlaying 
                            ? 'bg-amber-600 text-white border-amber-700 scale-105' 
                            : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                      >
                        <Play className={`w-3 h-3 ${isPlaying ? 'animate-spin' : ''}`} />
                        <span className="text-[10px]">Putar</span>
                      </button>
                      {isSelected && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 6: Visibilitas Kartu Metrik KPI */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/90 space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
              <LayoutGrid className="w-4 h-4 text-sky-600" />
              <span>6. Visibilitas Kartu Metrik Ringkasan (KPI)</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <label className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer hover:border-slate-300">
                <span className="text-xs font-bold text-slate-800">Master Stok</span>
                <input
                  type="checkbox"
                  checked={showMetricCards.totalItems}
                  onChange={(e) => setShowMetricCards({ ...showMetricCards, totalItems: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
              </label>

              <label className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer hover:border-slate-300">
                <span className="text-xs font-bold text-slate-800">Barang Keluar</span>
                <input
                  type="checkbox"
                  checked={showMetricCards.outTransactions}
                  onChange={(e) => setShowMetricCards({ ...showMetricCards, outTransactions: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
              </label>

              <label className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer hover:border-slate-300">
                <span className="text-xs font-bold text-slate-800">Peminjaman Alat</span>
                <input
                  type="checkbox"
                  checked={showMetricCards.lowStockAlert}
                  onChange={(e) => setShowMetricCards({ ...showMetricCards, lowStockAlert: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
              </label>

              <label className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer hover:border-slate-300">
                <span className="text-xs font-bold text-slate-800">Penerimaan Masuk</span>
                <input
                  type="checkbox"
                  checked={showMetricCards.inTransactions}
                  onChange={(e) => setShowMetricCards({ ...showMetricCards, inTransactions: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Section 7: Kontrol & Keamanan Laporan (Master Admin Only) */}
          {isMasterAdmin && (
            <div className="bg-amber-50/60 p-4 sm:p-5 rounded-2xl border border-amber-200/90 space-y-4">
              <div className="flex items-center gap-2 text-amber-950 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span>7. Kontrol Periode Laporan & Kebijakan Approval</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Lock Period */}
                <div className="bg-white p-3.5 rounded-xl border border-amber-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Kunci Periode Transaksi</span>
                    <span className="text-[11px] text-slate-500">Cegah perubahan stok pada periode lalu</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReportLocked(!reportLocked)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      reportLocked ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {reportLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    <span>{reportLocked ? 'Terkunci' : 'Terbuka'}</span>
                  </button>
                </div>

                {/* Auto Approve Toggle */}
                <div className="bg-white p-3.5 rounded-xl border border-amber-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Auto-Approve Permintaan</span>
                    <span className="text-[11px] text-slate-500">Langsung setujui tanpa antrian manual</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoApproveRequests(!autoApproveRequests)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      autoApproveRequests ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {autoApproveRequests ? 'Aktif' : 'Non-Aktif'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs px-5">
          <button
            type="button"
            onClick={onResetConfig}
            className="text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset ke Default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-sm cursor-pointer transition-all"
            >
              Terapkan Perubahan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

