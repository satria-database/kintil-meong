import React from 'react';
import { LogOut, ShieldAlert, X } from 'lucide-react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  roomName: string;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  roomName,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="logout-confirm-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        id="logout-confirm-modal-card"
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <LogOut className="w-5 h-5" />
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-base font-bold text-slate-800">
            Keluar dari Ruang Obrolan?
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Anda akan keluar dari <strong className="text-slate-700">{roomName}</strong>. Ruang obrolan ini tetap tersimpan di riwayat Anda sehingga Anda dapat bergabung kembali kapan saja.
          </p>

          <div className="mt-5 flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              id="btn-confirm-logout"
              onClick={onConfirm}
              className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-semibold rounded-xl text-xs transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Ya, Keluar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
