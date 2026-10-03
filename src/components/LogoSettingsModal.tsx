import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, Upload, Trash2, Check, RefreshCw, X, Sparkles, AlertCircle, FileCheck, CheckCircle2, ShieldCheck, Link2 } from 'lucide-react';
import { CompanyLogo } from './CompanyLogo';
import { compressAndOptimizeImage } from '../utils/imageCompressor';

interface LogoSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLogo: string | null;
  onSaveLogo: (logoUrl: string | null) => void;
}

// Built-in official Muliabara Logo SVG Data URL preset
const MULIABARA_SVG_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg width="240" height="200" viewBox="0 0 160 130" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="muliabaraNavy" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E3A66" />
      <stop offset="100%" stop-color="#13243F" />
    </linearGradient>
    <linearGradient id="muliabaraGreen" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8BD82B" />
      <stop offset="100%" stop-color="#68B11E" />
    </linearGradient>
  </defs>
  <path d="M16 114 L68 18 C71 13 77 13 80 18 L104 56 C107 61 104 67 98 67 L58 67 C53 67 48 70 46 75 L28 114 C25 120 17 121 13 116 C10 112 11 106 16 100 Z" fill="url(#muliabaraNavy)" />
  <path d="M84 16 L124 16 C130 16 134 21 131 27 L96 90 C93 95 86 96 82 91 L66 69 C63 65 65 59 70 59 L88 59 C93 59 97 55 95 50 L81 22 C79 18 81 16 84 16 Z" fill="url(#muliabaraNavy)" />
  <path d="M68 64 L108 64 C114 64 118 69 115 75 L92 116 C89 121 82 121 78 116 L56 75 C53 69 57 64 63 64 Z" fill="url(#muliabaraGreen)" />
</svg>
`)}`;

export const LogoSettingsModal: React.FC<LogoSettingsModalProps> = ({
  isOpen,
  onClose,
  currentLogo,
  onSaveLogo,
}) => {
  const [logoPreview, setLogoPreview] = useState<string | null>(currentLogo);
  const [urlInput, setUrlInput] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [optimizedInfo, setOptimizedInfo] = useState<{ sizeKb: number; width: number; height: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setLogoPreview(currentLogo);
      setUrlInput('');
      setErrorMessage(null);
      setOptimizedInfo(null);
    }
  }, [isOpen, currentLogo]);

  // Support paste from clipboard anywhere in modal
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            processImageFile(blob);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  if (!isOpen) return null;

  const processImageFile = async (file: File | Blob) => {
    setIsCompressing(true);
    setErrorMessage(null);

    try {
      const result = await compressAndOptimizeImage(file, {
        maxWidth: 420,
        maxHeight: 420,
        quality: 0.9,
        outputFormat: 'image/png',
      });

      setLogoPreview(result.dataUrl);
      setOptimizedInfo({
        sizeKb: result.sizeKb,
        width: result.width,
        height: result.height,
      });
    } catch (err: any) {
      console.error('Logo optimization error:', err);
      setErrorMessage(err.message || 'Gagal memproses file logo gambar. Pastikan format PNG, JPG, JPEG, WEBP, atau SVG.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    // reset input so same file can be re-selected if needed
    if (e.target) e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        processImageFile(file);
      } else {
        setErrorMessage('File yang di-drop harus berupa gambar (PNG, JPG, SVG, WEBP).');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleApplyUrl = () => {
    if (urlInput.trim()) {
      setLogoPreview(urlInput.trim());
      setOptimizedInfo(null);
      setErrorMessage(null);
      setUrlInput('');
    }
  };

  const handleSelectPresetMuliabara = () => {
    setLogoPreview(MULIABARA_SVG_DATA_URL);
    setOptimizedInfo({ sizeKb: 1.8, width: 240, height: 200 });
    setErrorMessage(null);
  };

  const handleResetToDefault = () => {
    setLogoPreview(null);
    setOptimizedInfo(null);
    setErrorMessage(null);
  };

  const handleSave = () => {
    onSaveLogo(logoPreview);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-400/30">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Ganti Logo Perusahaan / GA</h3>
              <p className="text-xs text-slate-400">Kompatibel 100% Netlify & Cloud Firestore (Auto-Kompresi)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Logo Live Preview & Dropzone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`flex flex-col items-center justify-center p-5 rounded-2xl transition-all border-2 border-dashed ${
              isDragOver
                ? 'bg-blue-50/80 border-blue-500 scale-[1.01]'
                : 'bg-slate-50 border-slate-300 hover:bg-slate-100/70'
            }`}
          >
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Preview Logo Aktif
            </span>
            
            <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center min-h-[90px] min-w-[90px]">
              {isCompressing ? (
                <div className="flex flex-col items-center justify-center gap-2 py-4">
                  <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                  <span className="text-xs text-slate-600 font-medium">Mengoptimasi...</span>
                </div>
              ) : (
                <CompanyLogo logoUrl={logoPreview} size="xl" />
              )}
            </div>

            <div className="mt-2.5 text-center">
              <p className="text-xs font-bold text-slate-700">
                {logoPreview ? (
                  logoPreview.startsWith('data:image/svg')
                    ? 'Logo Vektor Muliabara Aktif'
                    : 'Logo Kustom Aktif'
                ) : (
                  'Logo Default GA Aktif'
                )}
              </p>
              
              {optimizedInfo && (
                <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full text-[11px] font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Optimal: {optimizedInfo.sizeKb} KB ({optimizedInfo.width}×{optimizedInfo.height} px)</span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400 mt-2 text-center">
              Tarik & letakkan (Drag & Drop) gambar ke kotak ini atau tekan <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-mono">Ctrl+V</kbd> untuk Paste
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Pilihan Cepat Logo
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleSelectPresetMuliabara}
                className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-left flex items-center gap-2.5 transition-all cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center p-1 shrink-0">
                  <CompanyLogo logoUrl={MULIABARA_SVG_DATA_URL} size="sm" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700">Logo Muliabara</p>
                  <p className="text-[10px] text-slate-500">Logo Resmi Vektor</p>
                </div>
              </button>

              <button
                type="button"
                onClick={handleResetToDefault}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl text-left flex items-center gap-2.5 transition-all cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-[#b8d24d] flex items-center justify-center font-black text-[11px] text-slate-900 shrink-0">
                  GA
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Emblem GA</p>
                  <p className="text-[10px] text-slate-500">Logo Standar Bawaan</p>
                </div>
              </button>
            </div>
          </div>

          {/* Upload File Section */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Unggah File Gambar Baru dari Perangkat
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml, image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <button
              type="button"
              disabled={isCompressing}
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-4 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs rounded-xl border border-blue-200 hover:border-blue-300 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              <Upload className="w-4 h-4 text-blue-700" />
              <span>{isCompressing ? 'Sedang Memproses Gambar...' : 'Pilih File Logo (PNG, JPG, SVG, WebP)'}</span>
            </button>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Otomatis dikompres & dioptimasi sehingga loading cepat di Netlify, HP, & tersinkron ke Cloud.
            </p>
          </div>

          {/* URL Input Section */}
          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
              <Link2 className="w-3.5 h-3.5 text-slate-500" />
              Atau Masukkan URL Gambar Logo
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyUrl()}
                placeholder="https://example.com/logo.png"
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden bg-white"
              />
              <button
                type="button"
                onClick={handleApplyUrl}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div>
            {logoPreview && (
              <button
                type="button"
                onClick={handleResetToDefault}
                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold py-1.5 px-2.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Default</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isCompressing}
              onClick={handleSave}
              className="px-5 py-2 text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Logo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
