import React, { useState, useMemo } from 'react';
import { 
  Bell, 
  Check, 
  X, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Calendar,
  Volume2,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Sparkles,
  PackageCheck
} from 'lucide-react';
import { Transaction, UserAccount } from '../types';
import { playNotificationChime, triggerBrowserNotification } from '../utils/helpers';

interface NotificationApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  currentUser: UserAccount;
  onApprove: (trxId: string, notes?: string) => void;
  onReject: (trxId: string, notes?: string) => void;
  onDispatchApprovedRequest?: (trxId: string) => void;
  onNavigateToRequest?: () => void;
}

const getNormalizedDateStr = (dateVal?: string): string => {
  if (!dateVal) return '';
  const clean = dateVal.split('T')[0].split(' ')[0];
  if (clean.length === 10 && clean.includes('-')) return clean;
  try {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch {
    // fallback
  }
  return clean;
};

export const NotificationApprovalModal: React.FC<NotificationApprovalModalProps> = ({
  isOpen,
  onClose,
  transactions,
  currentUser,
  onApprove,
  onReject,
  onDispatchApprovedRequest,
  onNavigateToRequest,
}) => {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [viewMode, setViewMode] = useState<'PENDING_ALL' | 'PENDING_DISPATCH' | 'BY_DATE'>('PENDING_ALL');
  const [audioPlayed, setAudioPlayed] = useState(false);

  // All pending requests across all dates (never hidden)
  const allPendingRequests = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'OUT' && t.status === 'PENDING')
      .sort((a, b) => new Date(b.date || b.timestamp || 0).getTime() - new Date(a.date || a.timestamp || 0).getTime());
  }, [transactions]);

  // All approved requests waiting for physical dispatch (goods not yet handed over)
  const allPendingDispatchRequests = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'OUT' && t.status === 'APPROVED')
      .sort((a, b) => new Date(b.date || b.timestamp || 0).getTime() - new Date(a.date || a.timestamp || 0).getTime());
  }, [transactions]);

  // Unique request dates for calendar-based navigation
  const uniqueRequestDates = useMemo(() => {
    const datesSet = new Set<string>();
    transactions.forEach((t) => {
      if (t.type === 'OUT') {
        const d = getNormalizedDateStr(t.date || t.timestamp);
        if (d && d.length === 10) {
          datesSet.add(d);
        }
      }
    });
    const now = new Date();
    const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    datesSet.add(todayLocal);

    return Array.from(datesSet).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [transactions]);

  const [selectedDateIdx, setSelectedDateIdx] = useState<number>(0);
  const activeDate = uniqueRequestDates[selectedDateIdx] || uniqueRequestDates[0] || getNormalizedDateStr(new Date().toISOString());

  const formatDisplayDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const canApprove = currentUser.role === 'MASTER_ADMIN' || currentUser.role === 'ADMIN';

  // Pending on selected date
  const pendingRequestsOnDate = useMemo(() => {
    return transactions
      .filter((t) => {
        if (t.type !== 'OUT' || t.status !== 'PENDING') return false;
        const d = getNormalizedDateStr(t.date || t.timestamp);
        return d === activeDate;
      })
      .sort((a, b) => new Date(b.date || b.timestamp || 0).getTime() - new Date(a.date || a.timestamp || 0).getTime());
  }, [transactions, activeDate]);

  // Resolved on selected date
  const resolvedOnDate = useMemo(() => {
    return transactions
      .filter((t) => {
        if (t.type !== 'OUT') return false;
        if (t.status !== 'APPROVED' && t.status !== 'REJECTED' && t.status !== 'COMPLETED') return false;
        const d = getNormalizedDateStr(t.date || t.timestamp);
        return d === activeDate;
      })
      .sort((a, b) => new Date(b.date || b.timestamp || 0).getTime() - new Date(a.date || a.timestamp || 0).getTime());
  }, [transactions, activeDate]);

  if (!isOpen) return null;

  const handleConfirmReject = (trxId: string) => {
    onReject(trxId, rejectionNotes.trim() || 'Ditolak oleh Admin');
    setRejectingId(null);
    setRejectionNotes('');
  };

  const handleTestChime = () => {
    playNotificationChime();
    setAudioPlayed(true);
    setTimeout(() => setAudioPlayed(false), 2000);
  };

  const handleEnableDesktopNotif = () => {
    playNotificationChime();
    triggerBrowserNotification(
      '🔔 Notifikasi Gudang Aktif',
      'Pemberitahuan transaksi real-time berhasil diaktifkan pada peramban ini.'
    );
  };

  const displayedPending = viewMode === 'PENDING_ALL' ? allPendingRequests : pendingRequestsOnDate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[88vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden">
        {/* Header with Glossy Badge */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 px-5 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-b from-amber-400/30 to-amber-600/20 text-amber-400 rounded-xl border border-amber-400/40 shadow-inner ring-1 ring-white/20">
              <Bell className="w-5 h-5 drop-shadow-xs" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>Pemberitahuan & Approval Permintaan</span>
                {allPendingRequests.length > 0 && (
                  <span className="px-2 py-0.5 bg-rose-500 text-white text-[11px] font-mono font-bold rounded-full animate-pulse shadow-xs">
                    {allPendingRequests.length} Menunggu
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-300">
                {canApprove 
                  ? 'Verifikasi persetujuan pengeluaran barang mandiri & divisi'
                  : 'Status pembaruan pengajuan barang divisi'}
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

        {/* View Mode Tabs & Audio/Notification Controls */}
        <div className="bg-slate-100 p-2.5 px-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          {/* Tab Selector */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs flex-wrap">
            <button
              type="button"
              onClick={() => setViewMode('PENDING_ALL')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'PENDING_ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Menunggu ({allPendingRequests.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('PENDING_DISPATCH')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'PENDING_DISPATCH'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'text-slate-700 hover:text-amber-800 hover:bg-slate-100'
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Belum Diserahkan ({allPendingDispatchRequests.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('BY_DATE')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'BY_DATE'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>Per Tanggal</span>
            </button>
          </div>

          {/* Audio Chime & Browser Notification Test */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleTestChime}
              title="Uji bunyi bel notifikasi"
              className="px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 rounded-lg flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
            >
              <Volume2 className={`w-3.5 h-3.5 text-amber-600 ${audioPlayed ? 'animate-bounce' : ''}`} />
              <span>{audioPlayed ? 'Berbunyi!' : 'Tes Suara'}</span>
            </button>

            <button
              type="button"
              onClick={handleEnableDesktopNotif}
              title="Aktifkan notifikasi desktop browser"
              className="px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-blue-50 text-blue-800 border border-blue-300 rounded-lg flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-blue-600" />
              <span>Izin Notif</span>
            </button>
          </div>
        </div>

        {/* Date Navigator Bar (Shown when viewMode === 'BY_DATE') */}
        {viewMode === 'BY_DATE' && (
          <div className="bg-slate-50 p-2.5 px-4 border-b border-slate-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-slate-900 font-extrabold">{formatDisplayDate(activeDate)}</span>
            </div>

            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setSelectedDateIdx((prev) => Math.min(uniqueRequestDates.length - 1, prev + 1))}
                disabled={selectedDateIdx >= uniqueRequestDates.length - 1}
                title="Tanggal Sebelumnya"
                className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 text-slate-600 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-mono font-bold text-slate-500 px-1">
                {selectedDateIdx + 1} / {uniqueRequestDates.length}
              </span>
              <button
                type="button"
                onClick={() => setSelectedDateIdx((prev) => Math.max(0, prev - 1))}
                disabled={selectedDateIdx <= 0}
                title="Tanggal Berikutnya"
                className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 text-slate-600 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Prominent Handover Notice Banner when items are waiting */}
          {allPendingDispatchRequests.length > 0 && viewMode !== 'PENDING_DISPATCH' && (
            <div className="p-3 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-300 rounded-xl flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 bg-amber-500 text-white rounded-lg shrink-0">
                  <PackageCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <span>{allPendingDispatchRequests.length} Barang Belum Diserahkan</span>
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                  </div>
                  <p className="text-[11px] text-amber-900 truncate font-medium">
                    Permintaan telah disetujui (Approved) & siap diserahterimakan fisiknya.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewMode('PENDING_DISPATCH')}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shrink-0 shadow-2xs cursor-pointer transition-all flex items-center gap-1"
              >
                <span>Lihat & Serahkan</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Pending Dispatch Section */}
          {viewMode === 'PENDING_DISPATCH' && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-950 flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-amber-700" />
                  <span>Permintaan Disetujui — Fisik Belum Diserahkan ({allPendingDispatchRequests.length})</span>
                </h4>
              </div>

              {allPendingDispatchRequests.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-slate-500 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-slate-700 text-sm">Semua Barang Sudah Diserahterimakan!</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Tidak ada pengajuan approved yang tertunda serah terima fisiknya.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allPendingDispatchRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-xl bg-amber-50/90 border-2 border-amber-300 space-y-2.5 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs bg-white text-slate-900 px-2 py-0.5 rounded border border-amber-300 shadow-2xs">
                              {req.transactionNumber}
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {req.requesterName}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              ({req.department})
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            <span className="font-semibold text-slate-700">Keperluan:</span> {req.purposeDescription || '-'}
                          </p>
                          <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                            Disetujui • {req.dateFormatted || req.date?.substring(0, 10)} {req.timeFormatted ? `• ${req.timeFormatted}` : ''}
                          </div>
                        </div>

                        <span className="px-2.5 py-1 bg-amber-200 text-amber-950 rounded-full font-black text-[10px] uppercase shrink-0 border border-amber-300 animate-pulse">
                          Belum Diserahkan
                        </span>
                      </div>

                      {/* Items table */}
                      <div className="bg-white/90 rounded-lg p-2.5 border border-amber-200 text-xs space-y-1">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Daftar Barang Siap Diserahkan:
                        </div>
                        {req.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-slate-800 font-medium text-xs">
                            <span>• {item.itemName}</span>
                            <span className="font-black font-mono text-amber-900">
                              {item.quantity} {item.unit}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Dispatch Action */}
                      <div className="flex justify-end pt-1">
                        {onDispatchApprovedRequest && (
                          <button
                            type="button"
                            onClick={() => {
                              onDispatchApprovedRequest(req.id);
                            }}
                            className="px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                          >
                            <PackageCheck className="w-4 h-4 text-amber-200" />
                            <span>Serah Terima Fisik Sekarang</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pending Section */}
          {viewMode !== 'PENDING_DISPATCH' && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>
                    {viewMode === 'PENDING_ALL' 
                      ? `Semua Permintaan Menunggu Persetujuan (${displayedPending.length})` 
                      : `Permintaan Menunggu pada ${activeDate} (${displayedPending.length})`}
                  </span>
                </h4>
              </div>

              {displayedPending.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-slate-500 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-slate-700 text-sm">Semua Permintaan Sudah Diproses!</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Tidak ada permintaan barang yang sedang menunggu verifikasi Admin saat ini.
                  </p>
                </div>
              ) : (
              <div className="space-y-3">
                {displayedPending.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs bg-white text-slate-900 px-2 py-0.5 rounded border border-amber-300 shadow-2xs">
                            {req.transactionNumber}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {req.requesterName}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            ({req.department})
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          <span className="font-semibold">Keperluan:</span> {req.purposeDescription || '-'}
                        </p>
                        <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                          {req.dateFormatted || req.date?.substring(0, 10)} {req.timeFormatted ? `• ${req.timeFormatted}` : ''}
                        </div>
                      </div>

                      <span className="px-2.5 py-1 bg-amber-200 text-amber-900 rounded-full font-bold text-[10px] uppercase shrink-0 border border-amber-300">
                        Menunggu
                      </span>
                    </div>

                    {/* Items table */}
                    <div className="bg-white/80 rounded-lg p-2 border border-amber-100 text-xs space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Daftar Barang Diminta:
                      </div>
                      {req.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-slate-700 font-medium text-xs">
                          <span>• {item.itemName}</span>
                          <span className="font-bold font-mono text-slate-900">
                            {item.quantity} {item.unit}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Reject Input if active */}
                    {rejectingId === req.id && (
                      <div className="p-3 bg-white rounded-xl border border-rose-200 space-y-2 animate-in fade-in duration-150">
                        <label className="text-xs font-bold text-rose-700 block">
                          Alasan Penolakan:
                        </label>
                        <input
                          type="text"
                          value={rejectionNotes}
                          onChange={(e) => setRejectionNotes(e.target.value)}
                          placeholder="Misal: Stok dialokasikan untuk kebutuhan lain..."
                          className="w-full text-xs p-2 border border-rose-300 rounded-lg focus:outline-rose-500"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingId(null);
                              setRejectionNotes('');
                            }}
                            className="px-2.5 py-1 text-xs bg-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConfirmReject(req.id)}
                            className="px-3 py-1 text-xs bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-500 cursor-pointer"
                          >
                            Konfirmasi Tolak
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action buttons if Master Admin / Admin */}
                    {canApprove && rejectingId !== req.id && (
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setRejectingId(req.id)}
                          className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Tolak</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onApprove(req.id, 'Disetujui via Lonceng Notifikasi Header')}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Setujui (Approve)</span>
                        </button>
                      </div>
                    )}

                    {!canApprove && (
                      <div className="text-[11px] font-bold text-rose-700 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Menunggu verifikasi Admin GA.</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

          {/* Recent Resolved Activity for Selected Date (When in BY_DATE mode) */}
          {viewMode === 'BY_DATE' && resolvedOnDate.length > 0 && (
            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Riwayat Verifikasi Tanggal {activeDate} ({resolvedOnDate.length})
              </h4>
              <div className="space-y-2">
                {resolvedOnDate.map((trx) => (
                  <div
                    key={trx.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-slate-800">{trx.transactionNumber}</span>
                      <span className="text-slate-500 ml-1.5">• {trx.requesterName}</span>
                    </div>
                    <div>
                      {trx.status === 'APPROVED' ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                          DISETUJUI
                        </span>
                      ) : trx.status === 'REJECTED' ? (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[10px]">
                          DITOLAK
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[10px]">
                          SERAH TERIMA
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between px-5">
          {onNavigateToRequest && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateToRequest();
              }}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Buka Formulir Permintaan Lengkap</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl ml-auto cursor-pointer transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
