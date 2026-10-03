import React, { ReactNode } from 'react';
import { AlertTriangle, RotateCcw, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetAndReload = () => {
    try {
      localStorage.removeItem('ga_warehouse_active_tab');
      localStorage.removeItem('ga_warehouse_is_logged_in');
      localStorage.removeItem('ga_warehouse_users_v8');
      localStorage.removeItem('ga_warehouse_deleted_user_ids_v8');
    } catch {}
    window.location.href = window.location.origin + window.location.pathname;
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 sm:p-8 max-w-lg w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-500/30">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
              Sistem Gudang GA Memuat Ulang
            </h2>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              Terjadi penyesuaian data pada peramban perangkat Anda. Klik tombol di bawah untuk memuat ulang sistem secara aman.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/30 cursor-pointer text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Muat Ulang Halaman
              </button>
              <button
                onClick={this.handleResetAndReload}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-xl transition-all cursor-pointer text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Pulihkan Sesi & Masuk
              </button>
            </div>

            {this.state.error && (
              <div className="mt-6 p-3 bg-slate-950/60 rounded-lg text-left overflow-auto max-h-32 text-xs text-slate-400 font-mono border border-slate-800">
                {this.state.error.toString()}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
