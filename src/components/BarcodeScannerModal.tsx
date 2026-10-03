import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeCameraScanConfig } from 'html5-qrcode';
import { Camera, CameraOff, Sparkles, RefreshCw, AlertCircle, CheckCircle2, QrCode } from 'lucide-react';
import { Item } from '../types';
import { playScanBeep } from '../utils/helpers';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Item[];
  onScanSuccess: (item: Item, rawCode: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  items,
  onScanSuccess,
}) => {
  const [scannerStarted, setScannerStarted] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [matchedItem, setMatchedItem] = useState<Item | null>(null);
  const [scannedFeedback, setScannedFeedback] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'ga-barcode-reader-container';

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      setMatchedItem(null);
      setScannedFeedback(null);
      setCameraError(null);
      setManualCode('');
    }
  }, [isOpen]);

  const startScanner = async () => {
    setCameraError(null);
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(readerElementId);
      }

      const config: Html5QrcodeCameraScanConfig = {
        fps: 10,
        qrbox: { width: 280, height: 180 },
        aspectRatio: 1.333333,
      };

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleDecoded(decodedText.trim());
        },
        () => {
          // ignore frame errors during scanning
        }
      );
      setScannerStarted(true);
    } catch (err: unknown) {
      console.warn('Camera start error:', err);
      const errMsg = err instanceof Error ? err.message : 'Kamera tidak dapat diakses atau diblokir izin browser.';
      setCameraError(errMsg);
      setScannerStarted(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
      } catch (e) {
        console.error('Error stopping scanner:', e);
      }
    }
    setScannerStarted(false);
  };

  const handleDecoded = (code: string) => {
    const found = items.find(
      (i) => i.code.toLowerCase() === code.toLowerCase() || i.id === code
    );

    if (found) {
      playScanBeep(true);
      setScannedFeedback(`Berhasil mendeteksi: ${found.name} (${found.code})`);
      setMatchedItem(found);
      setTimeout(() => {
        stopScanner();
        onScanSuccess(found, code);
      }, 600);
    } else {
      playScanBeep(false);
      setScannedFeedback(`Kode Barcode [${code}] terdeteksi tapi belum terdaftar di master item.`);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleDecoded(manualCode.trim());
  };

  const handleQuickPick = (item: Item) => {
    playScanBeep(true);
    stopScanner();
    onScanSuccess(item, item.code);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-400/30">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-100">Scan Barcode Barang Gudang GA</h3>
              <p className="text-xs text-slate-400">Pindai barcode/QR pada barang fisik untuk langsung ke formulir permintaan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Scanner Viewport Section */}
          <div className="bg-slate-950 rounded-xl p-4 text-center relative border border-slate-800 min-h-[260px] flex flex-col items-center justify-center overflow-hidden">
            <div id={readerElementId} className="w-full max-w-md rounded-lg overflow-hidden" />

            {!scannerStarted && !cameraError && (
              <div className="py-8 px-4 flex flex-col items-center text-slate-300 space-y-3">
                <div className="p-3 bg-slate-800 rounded-full text-blue-400">
                  <Camera className="w-8 h-8" />
                </div>
                <p className="text-sm font-medium">Kamera siap digunakan untuk memindai barcode fisik</p>
                <button
                  type="button"
                  onClick={startScanner}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Aktifkan Kamera Scanner
                </button>
              </div>
            )}

            {cameraError && (
              <div className="py-6 px-4 flex flex-col items-center text-rose-300 space-y-3 max-w-md">
                <AlertCircle className="w-8 h-8 text-rose-400" />
                <p className="text-xs text-rose-300 text-center leading-relaxed">
                  {cameraError}. Pastikan izin kamera telah diberikan atau gunakan opsi Input Manual / Demo Picker di bawah.
                </p>
                <button
                  type="button"
                  onClick={startScanner}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Coba Akses Kamera Lagi
                </button>
              </div>
            )}

            {scannerStarted && (
              <div className="mt-3 flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs text-emerald-400 font-medium">Scanner Aktif - Arahkan ke Barcode / QR Code</span>
                <button
                  type="button"
                  onClick={stopScanner}
                  className="ml-3 px-3 py-1 bg-slate-800 text-slate-300 text-xs rounded-md border border-slate-700 hover:bg-slate-700 flex items-center gap-1.5"
                >
                  <CameraOff className="w-3.5 h-3.5" /> Matikan Kamera
                </button>
              </div>
            )}
          </div>

          {/* Realtime Feedback banner */}
          {scannedFeedback && (
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-3 text-sm animate-in fade-in slide-in-from-top-2 ${
                matchedItem
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}
            >
              {matchedItem ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              )}
              <div className="font-medium text-xs leading-relaxed">{scannedFeedback}</div>
            </div>
          )}

          {/* Manual Input / Barcode Scanner Gun input */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span>Input Barcode Manual / USB Gun Scanner</span>
            </h4>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Ketik atau scan barcode (cth: GA-ATK-001)"
                className="flex-1 px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Cari & Pilih
              </button>
            </form>
          </div>

          {/* Quick Simulation / Demo Pickers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Simulasi Cepat (Klik Item untuk Meniru Hasil Scan):
              </span>
              <span className="text-[11px] text-slate-600">{items.length} item siap diuji</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {items.slice(0, 8).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleQuickPick(item)}
                  className="text-left p-2.5 bg-white hover:bg-blue-50 hover:border-blue-300 border border-slate-200 rounded-xl transition-all flex items-center justify-between group"
                >
                  <div className="truncate pr-2">
                    <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700 truncate">{item.name}</p>
                    <p className="text-[11px] font-mono text-slate-600">{item.code} • Stok: {item.currentStock} {item.unit}</p>
                  </div>
                  <span className="text-[10px] bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-600 px-2 py-1 rounded-md font-semibold shrink-0 transition-colors">
                    Pilih &rarr;
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
