import React from 'react';
import { X, Users, AtSign, Shield } from 'lucide-react';
import { RoomParticipant, User } from '../types';

interface ParticipantsModalProps {
  participants: RoomParticipant[];
  currentUser: User;
  onMention: (userName: string) => void;
  onClose: () => void;
  isPrivacyBlur?: boolean;
}

export const ParticipantsModal: React.FC<ParticipantsModalProps> = ({
  participants,
  currentUser,
  onMention,
  onClose,
  isPrivacyBlur = false,
}) => {
  return (
    <div id="participants-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div id="participants-modal-box" className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-800">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Anggota Ruang ({participants.length})</h3>
              <p className="text-[11px] text-slate-500">Pengguna yang terhubung saat ini</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className={`p-3 max-h-72 overflow-y-auto space-y-1 divide-y divide-slate-100 ${isPrivacyBlur ? 'filter blur-md hover:filter-none select-none transition-all' : ''}`}>
          {participants.map((p) => {
            const isMe = p.id === currentUser.id;
            return (
              <div
                key={p.id}
                className="pt-1.5 first:pt-0 flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0 border border-white"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.avatar}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 truncate">
                      <span>{p.name}</span>
                      {isMe && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Anda
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Online</span>
                    </div>
                  </div>
                </div>

                {!isMe && (
                  <button
                    type="button"
                    onClick={() => {
                      onMention(p.name);
                      onClose();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title={`Mention @${p.name}`}
                  >
                    <AtSign className="w-3 h-3" />
                    <span>Mention</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
