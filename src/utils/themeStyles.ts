import { ThemeColor, FontFamily, DashboardDensity, ThemeMode } from '../types';

export interface ThemeStyleConfig {
  id: ThemeColor;
  name: string;
  category: 'Soft & Pastel' | 'Klasik & Kontras';
  headerGradient: string;
  subHeaderBg: string;
  bannerGradient: string;
  accentClass: string;
  accentText: string;
  accentBorder: string;
  accentBadge: string;
  activeTabClass: string;
  primaryButtonClass: string;
  pageBgClass: string;
  colorHex: string;
}

export const THEME_STYLES: Record<ThemeColor, ThemeStyleConfig> = {
  // Soft & Pastel Themes
  'soft-sky': {
    id: 'soft-sky',
    name: 'Soft Sky Blue (KBCT Clean)',
    category: 'Soft & Pastel',
    headerGradient: 'bg-gradient-to-r from-[#0c1e33] via-[#133052] to-[#0c1e33]',
    subHeaderBg: 'bg-[#0a1829]',
    bannerGradient: 'bg-gradient-to-r from-[#0d223a] via-[#16365c] to-[#0d223a]',
    accentClass: 'bg-sky-600',
    accentText: 'text-sky-400',
    accentBorder: 'border-sky-400/40',
    accentBadge: 'bg-sky-500/20 text-sky-300 border-sky-400/30',
    activeTabClass: 'bg-sky-600 text-white',
    primaryButtonClass: 'bg-sky-600 hover:bg-sky-500 text-white',
    pageBgClass: 'bg-slate-100/90',
    colorHex: '#0284c7',
  },
  'soft-sage': {
    id: 'soft-sage',
    name: 'Soft Sage Green',
    category: 'Soft & Pastel',
    headerGradient: 'bg-gradient-to-r from-[#0a231b] via-[#133d2f] to-[#0a231b]',
    subHeaderBg: 'bg-[#081c16]',
    bannerGradient: 'bg-gradient-to-r from-[#0b2920] via-[#154434] to-[#0b2920]',
    accentClass: 'bg-emerald-600',
    accentText: 'text-emerald-400',
    accentBorder: 'border-emerald-400/40',
    accentBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
    activeTabClass: 'bg-emerald-600 text-white',
    primaryButtonClass: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    pageBgClass: 'bg-[#f2fbf6]',
    colorHex: '#059669',
  },
  'soft-lavender': {
    id: 'soft-lavender',
    name: 'Soft Lavender Lilac',
    category: 'Soft & Pastel',
    headerGradient: 'bg-gradient-to-r from-[#1c122e] via-[#2f1f4e] to-[#1c122e]',
    subHeaderBg: 'bg-[#160d26]',
    bannerGradient: 'bg-gradient-to-r from-[#211536] via-[#38245c] to-[#211536]',
    accentClass: 'bg-purple-600',
    accentText: 'text-purple-400',
    accentBorder: 'border-purple-400/40',
    accentBadge: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
    activeTabClass: 'bg-purple-600 text-white',
    primaryButtonClass: 'bg-purple-600 hover:bg-purple-500 text-white',
    pageBgClass: 'bg-[#faf5ff]',
    colorHex: '#9333ea',
  },
  'soft-peach': {
    id: 'soft-peach',
    name: 'Soft Peach Sand',
    category: 'Soft & Pastel',
    headerGradient: 'bg-gradient-to-r from-[#2a170d] via-[#482816] to-[#2a170d]',
    subHeaderBg: 'bg-[#211109]',
    bannerGradient: 'bg-gradient-to-r from-[#301a0e] via-[#522c19] to-[#301a0e]',
    accentClass: 'bg-orange-600',
    accentText: 'text-orange-400',
    accentBorder: 'border-orange-400/40',
    accentBadge: 'bg-orange-500/20 text-orange-300 border-orange-400/30',
    activeTabClass: 'bg-orange-600 text-white',
    primaryButtonClass: 'bg-orange-600 hover:bg-orange-500 text-white',
    pageBgClass: 'bg-[#fff8f0]',
    colorHex: '#ea580c',
  },
  'soft-rose': {
    id: 'soft-rose',
    name: 'Soft Rose Mauve',
    category: 'Soft & Pastel',
    headerGradient: 'bg-gradient-to-r from-[#2b0f19] via-[#4a1b2c] to-[#2b0f19]',
    subHeaderBg: 'bg-[#210912]',
    bannerGradient: 'bg-gradient-to-r from-[#33111e] via-[#571e33] to-[#33111e]',
    accentClass: 'bg-rose-600',
    accentText: 'text-rose-400',
    accentBorder: 'border-rose-400/40',
    accentBadge: 'bg-rose-500/20 text-rose-300 border-rose-400/30',
    activeTabClass: 'bg-rose-600 text-white',
    primaryButtonClass: 'bg-rose-600 hover:bg-rose-500 text-white',
    pageBgClass: 'bg-[#fff1f2]',
    colorHex: '#e11d48',
  },
  'soft-mint': {
    id: 'soft-mint',
    name: 'Soft Mint Breeze',
    category: 'Soft & Pastel',
    headerGradient: 'bg-gradient-to-r from-[#0c2423] via-[#153e3c] to-[#0c2423]',
    subHeaderBg: 'bg-[#091b1a]',
    bannerGradient: 'bg-gradient-to-r from-[#0f2d2b] via-[#184946] to-[#0f2d2b]',
    accentClass: 'bg-teal-600',
    accentText: 'text-teal-400',
    accentBorder: 'border-teal-400/40',
    accentBadge: 'bg-teal-500/20 text-teal-300 border-teal-400/30',
    activeTabClass: 'bg-teal-600 text-white',
    primaryButtonClass: 'bg-teal-600 hover:bg-teal-500 text-white',
    pageBgClass: 'bg-[#f0fdfa]',
    colorHex: '#0d9488',
  },
  'soft-amber': {
    id: 'soft-amber',
    name: 'Soft Warm Amber',
    category: 'Soft & Pastel',
    headerGradient: 'bg-gradient-to-r from-[#2b1c0b] via-[#4d3214] to-[#2b1c0b]',
    subHeaderBg: 'bg-[#211507]',
    bannerGradient: 'bg-gradient-to-r from-[#33210d] via-[#593917] to-[#33210d]',
    accentClass: 'bg-amber-600',
    accentText: 'text-amber-400',
    accentBorder: 'border-amber-400/40',
    accentBadge: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
    activeTabClass: 'bg-amber-600 text-white',
    primaryButtonClass: 'bg-amber-600 hover:bg-amber-500 text-white',
    pageBgClass: 'bg-[#fffdf2]',
    colorHex: '#d97706',
  },

  // Classic Bold Themes
  'navy': {
    id: 'navy',
    name: 'Navy Deep Classic',
    category: 'Klasik & Kontras',
    headerGradient: 'bg-gradient-to-r from-[#122240] via-[#1a2f57] to-[#122240]',
    subHeaderBg: 'bg-[#0e1b33]',
    bannerGradient: 'bg-gradient-to-r from-[#132545] via-[#1d3561] to-[#132545]',
    accentClass: 'bg-blue-600',
    accentText: 'text-blue-400',
    accentBorder: 'border-blue-400/40',
    accentBadge: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
    activeTabClass: 'bg-blue-600 text-white',
    primaryButtonClass: 'bg-blue-600 hover:bg-blue-500 text-white',
    pageBgClass: 'bg-slate-100/90',
    colorHex: '#2563eb',
  },
  'emerald': {
    id: 'emerald',
    name: 'Emerald Forest GA',
    category: 'Klasik & Kontras',
    headerGradient: 'bg-gradient-to-r from-[#09291f] via-[#0f4736] to-[#09291f]',
    subHeaderBg: 'bg-[#071f17]',
    bannerGradient: 'bg-gradient-to-r from-[#0c3327] via-[#145743] to-[#0c3327]',
    accentClass: 'bg-emerald-600',
    accentText: 'text-emerald-400',
    accentBorder: 'border-emerald-400/40',
    accentBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
    activeTabClass: 'bg-emerald-600 text-white',
    primaryButtonClass: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    pageBgClass: 'bg-slate-100/90',
    colorHex: '#059669',
  },
  'amber': {
    id: 'amber',
    name: 'Gold Amber Standard',
    category: 'Klasik & Kontras',
    headerGradient: 'bg-gradient-to-r from-[#2e1d05] via-[#543509] to-[#2e1d05]',
    subHeaderBg: 'bg-[#241703]',
    bannerGradient: 'bg-gradient-to-r from-[#382306] via-[#613d0a] to-[#382306]',
    accentClass: 'bg-amber-600',
    accentText: 'text-amber-400',
    accentBorder: 'border-amber-400/40',
    accentBadge: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
    activeTabClass: 'bg-amber-600 text-white',
    primaryButtonClass: 'bg-amber-600 hover:bg-amber-500 text-white',
    pageBgClass: 'bg-slate-100/90',
    colorHex: '#d97706',
  },
  'slate': {
    id: 'slate',
    name: 'Slate Industrial Pro',
    category: 'Klasik & Kontras',
    headerGradient: 'bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a]',
    subHeaderBg: 'bg-[#0a0f1d]',
    bannerGradient: 'bg-gradient-to-r from-[#141d33] via-[#243147] to-[#141d33]',
    accentClass: 'bg-slate-700',
    accentText: 'text-slate-300',
    accentBorder: 'border-slate-400/40',
    accentBadge: 'bg-slate-700/40 text-slate-200 border-slate-500/40',
    activeTabClass: 'bg-slate-700 text-white',
    primaryButtonClass: 'bg-slate-800 hover:bg-slate-700 text-white',
    pageBgClass: 'bg-slate-100/90',
    colorHex: '#475569',
  },
  'crimson': {
    id: 'crimson',
    name: 'Crimson Velvet',
    category: 'Klasik & Kontras',
    headerGradient: 'bg-gradient-to-r from-[#300a14] via-[#541223] to-[#300a14]',
    subHeaderBg: 'bg-[#24060e]',
    bannerGradient: 'bg-gradient-to-r from-[#3b0d19] via-[#611529] to-[#3b0d19]',
    accentClass: 'bg-rose-700',
    accentText: 'text-rose-400',
    accentBorder: 'border-rose-400/40',
    accentBadge: 'bg-rose-500/20 text-rose-300 border-rose-400/30',
    activeTabClass: 'bg-rose-700 text-white',
    primaryButtonClass: 'bg-rose-700 hover:bg-rose-600 text-white',
    pageBgClass: 'bg-slate-100/90',
    colorHex: '#be123c',
  },
  'violet': {
    id: 'violet',
    name: 'Royal Violet Corporate',
    category: 'Klasik & Kontras',
    headerGradient: 'bg-gradient-to-r from-[#210c30] via-[#3c1757] to-[#210c30]',
    subHeaderBg: 'bg-[#180724]',
    bannerGradient: 'bg-gradient-to-r from-[#290e3c] via-[#481c69] to-[#290e3c]',
    accentClass: 'bg-purple-700',
    accentText: 'text-purple-400',
    accentBorder: 'border-purple-400/40',
    accentBadge: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
    activeTabClass: 'bg-purple-700 text-white',
    primaryButtonClass: 'bg-purple-700 hover:bg-purple-600 text-white',
    pageBgClass: 'bg-slate-100/90',
    colorHex: '#7c3aed',
  },
};

export const getThemeConfig = (color: ThemeColor = 'soft-sky'): ThemeStyleConfig => {
  return THEME_STYLES[color] || THEME_STYLES['soft-sky'];
};

export const getFontFamilyStyle = (font: FontFamily = 'plus-jakarta'): string => {
  switch (font) {
    case 'inter':
      return "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    case 'roboto':
      return "'Roboto', -apple-system, BlinkMacSystemFont, sans-serif";
    case 'poppins':
      return "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif";
    case 'jetbrains':
      return "'JetBrains Mono', monospace";
    case 'plus-jakarta':
    default:
      return "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  }
};

export const getDensityContainerClass = (density: DashboardDensity = 'normal'): string => {
  switch (density) {
    case 'compact':
      return 'py-3.5 px-2.5 sm:px-4 space-y-3';
    case 'spacious':
      return 'py-7 px-5 sm:px-8 lg:px-10 space-y-6 sm:space-y-7';
    case 'normal':
    default:
      return 'py-5 px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-5';
  }
};

export const getPageBackground = (themeColor: ThemeColor, mode: ThemeMode = 'light'): string => {
  if (mode === 'dark') {
    return 'bg-[#090d16] text-slate-100';
  }
  if (mode === 'slate') {
    return 'bg-slate-200/90 text-slate-900';
  }
  const theme = getThemeConfig(themeColor);
  return `${theme.pageBgClass} text-slate-900`;
};
