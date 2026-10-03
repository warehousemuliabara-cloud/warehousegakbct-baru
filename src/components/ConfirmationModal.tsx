import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, CheckCircle2, X, ShieldAlert } from 'lucide-react';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  requiresTypingConfirmation?: boolean;
  confirmationString?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  isDestructive = true,
  requiresTypingConfirmation = false,
  confirmationString = 'HAPUS',
  onConfirm,
  onCancel,
}) => {
  const [typedInput, setTypedInput] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTypedInput('');
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const isConfirmedAllowed = !requiresTypingConfirmation || typedInput.trim().toUpperCase() === confirmationString.toUpperCase();

  const handleConfirmClick = () => {
    if (!isConfirmedAllowed) return;
    onConfirm();
    setTypedInput('');
  };

  const handleCancelClick = () => {
    setTypedInput('');
    onCancel();
  };

  return (
    <div 
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleCancelClick();
        }
      }}
    >
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative z-[71]">
        {/* Modal Header */}
        <div className={`p-4 flex items-center justify-between text-white ${
          isDestructive ? 'bg-rose-700' : 'bg-slate-900'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/10 rounded-lg">
              {isDestructive ? <AlertTriangle className="w-5 h-5 text-amber-300" /> : <ShieldAlert className="w-5 h-5 text-blue-300" />}
            </div>
            <h3 className="font-bold text-sm text-white">{title}</h3>
          </div>
          <button
            type="button"
            onClick={handleCancelClick}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            {message}
          </p>

          {requiresTypingConfirmation && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-2">
              <p className="text-[11px] font-bold text-rose-800">
                Ketik <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-rose-300 text-rose-900">{confirmationString}</span> untuk konfirmasi tindakan ini:
              </p>
              <input
                type="text"
                autoFocus
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                placeholder={confirmationString}
                className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
              />
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleCancelClick}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={!isConfirmedAllowed}
            onClick={handleConfirmClick}
            className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
            }`}
          >
            {isDestructive ? <Trash2 className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
