import React from 'react';
import { Pin, X, ArrowUpRight, FileText, Image as ImageIcon, Mic } from 'lucide-react';
import { DecryptedMessage } from '../types';

interface PinnedMessageBannerProps {
  pinnedMessage: DecryptedMessage | null;
  onScrollToMessage: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
}

export const PinnedMessageBanner: React.FC<PinnedMessageBannerProps> = ({
  pinnedMessage,
  onScrollToMessage,
  onUnpin,
}) => {
  if (!pinnedMessage || pinnedMessage.isDeleted) return null;

  const payload = pinnedMessage.decryptedPayload;
  const textSnippet = payload?.text
    ? payload.text.slice(0, 75) + (payload.text.length > 75 ? '...' : '')
    : payload?.file
    ? `[Lampiran: ${payload.file.name}]`
    : 'Pesan Terenkripsi';

  return (
    <div
      id="pinned-message-banner"
      className="bg-indigo-50/90 border-b border-indigo-100 px-4 py-2 flex items-center justify-between gap-3 text-xs select-none backdrop-blur-xs z-10 animate-in fade-in slide-in-from-top-1"
    >
      <div
        onClick={() => onScrollToMessage(pinnedMessage.id)}
        className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
        title="Klik untuk melompat ke pesan yang disematkan"
      >
        <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
          <Pin className="w-3.5 h-3.5 fill-current" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 font-bold text-indigo-900 text-[11px]">
            <span>Pesan Disematkan</span>
            <span className="text-indigo-400 font-normal">•</span>
            <span className="text-indigo-700 font-medium truncate">@{pinnedMessage.senderName}</span>
          </div>
          <p className="text-slate-600 truncate text-xs font-normal group-hover:text-indigo-600 transition-colors">
            {textSnippet}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onScrollToMessage(pinnedMessage.id)}
          className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100/70 rounded-lg transition-colors cursor-pointer"
          title="Lompat ke pesan"
        >
          <ArrowUpRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onUnpin(pinnedMessage.id)}
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          title="Lepas sematan pesan"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
