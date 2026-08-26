import React from 'react';
import { Timer, Clock, Check, X, ShieldAlert, Sparkles, Flame } from 'lucide-react';

interface DisappearingTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTimer: number; // in seconds
  onSelectTimer: (seconds: number) => void;
}

const TIMER_OPTIONS = [
  { label: 'Mati (Pesan Permanen)', seconds: 0, desc: 'Pesan tersimpan normal dalam riwayat ruang' },
  { label: '10 Detik', seconds: 10, desc: 'Sangat rahasia, pesan lenyap 10 detik setelah terkirim' },
  { label: '30 Detik', seconds: 30, desc: 'Pesan otomatis terhapus dalam 30 detik' },
  { label: '5 Menit', seconds: 300, desc: 'Pesan terhapus 5 menit setelah dikirim' },
  { label: '1 Jam', seconds: 3600, desc: 'Cocok untuk obrolan singkat yang tidak ingin disimpan lama' },
  { label: '24 Jam', seconds: 86400, desc: 'Pesan akan hilang dalam 1 hari' },
];

export const DisappearingTimerModal: React.FC<DisappearingTimerModalProps> = ({
  isOpen,
  onClose,
  currentTimer,
  onSelectTimer,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-200">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Pesan Hancur Otomatis</h3>
              <p className="text-xs text-slate-500">Atur durasi pesan sebelum terhapus permanen</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options List */}
        <div className="p-5 space-y-2.5 max-h-[60vh] overflow-y-auto">
          {TIMER_OPTIONS.map((opt) => {
            const isSelected = currentTimer === opt.seconds;
            return (
              <button
                key={opt.seconds}
                type="button"
                onClick={() => {
                  onSelectTimer(opt.seconds);
                  onClose();
                }}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-50/80 border-amber-300 text-amber-950 ring-2 ring-amber-200 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {opt.seconds > 0 ? <Flame className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold">{opt.label}</div>
                    <div className="text-[11px] text-slate-500 truncate">{opt.desc}</div>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 ml-2">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Security Notice */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-start gap-2.5 text-xs text-slate-500">
          <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <span>
            Pesan yang kadaluarsa akan dihapus otomatis secara kriptografis dari perangkat semua anggota dan server.
          </span>
        </div>
      </div>
    </div>
  );
};
