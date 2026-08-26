import React, { useRef, useEffect } from 'react';
import { DecryptedMessage, User, AttachedFile, ReplyPreview } from '../types';
import { MessageItem } from './MessageItem';
import { ShieldCheck, MessageSquareDashed, Lock, SearchX } from 'lucide-react';
import logoImage from '../assets/logo.jpg';

interface MessageListProps {
  messages: DecryptedMessage[];
  currentUser: User;
  typingUsers: { id: string; name: string }[];
  searchQuery?: string;
  pinnedMessageId?: string | null;
  isWatermarkActive?: boolean;
  roomId?: string;
  onReply: (preview: ReplyPreview) => void;
  onMentionUser: (userName: string) => void;
  onViewImage: (file: AttachedFile) => void;
  onInspectCrypto: (message: DecryptedMessage) => void;
  onReact: (messageId: string, emoji: string) => void;
  onEdit?: (messageId: string, currentText: string) => void;
  onDelete?: (messageId: string) => void;
  onPin?: (messageId: string, unpin?: boolean) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUser,
  typingUsers,
  searchQuery = '',
  pinnedMessageId = null,
  isWatermarkActive = false,
  roomId = '',
  onReply,
  onMentionUser,
  onViewImage,
  onInspectCrypto,
  onReact,
  onEdit,
  onDelete,
  onPin,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new message if not actively searching
  useEffect(() => {
    if (!searchQuery.trim()) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, typingUsers.length, searchQuery]);

  const handleScrollToMessage = (messageId: string) => {
    const targetElement = document.getElementById(`msg-item-${messageId}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetElement.classList.add('ring-2', 'ring-indigo-500', 'bg-indigo-50', 'rounded-2xl');
      setTimeout(() => {
        targetElement.classList.remove('ring-2', 'ring-indigo-500', 'bg-indigo-50', 'rounded-2xl');
      }, 1800);
    }
  };

  // Group messages by date
  const renderMessagesWithDateDividers = () => {
    let lastDateStr = '';

    return messages.map((msg, index) => {
      const msgDate = new Date(msg.timestamp);
      const dateStr = msgDate.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      const showDivider = dateStr !== lastDateStr;
      lastDateStr = dateStr;

      return (
        <React.Fragment key={msg.id || index}>
          {showDivider && (
            <div className="flex items-center justify-center my-4 select-none">
              <span className="bg-slate-200/70 text-slate-500 text-[10px] uppercase tracking-widest px-3 py-1 rounded-full font-bold">
                {dateStr}
              </span>
            </div>
          )}
          <MessageItem
            message={msg}
            currentUser={currentUser}
            searchQuery={searchQuery}
            isPinned={msg.id === pinnedMessageId}
            onReply={onReply}
            onMentionUser={onMentionUser}
            onViewImage={onViewImage}
            onInspectCrypto={onInspectCrypto}
            onScrollToMessage={handleScrollToMessage}
            onReact={onReact}
            onEdit={onEdit}
            onDelete={onDelete}
            onPin={onPin}
          />
        </React.Fragment>
      );
    });
  };

  return (
    <div
      ref={containerRef}
      id="chat-message-list-container"
      className="relative flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scroll-smooth bg-slate-50 min-h-0 select-text"
    >
      {/* Anti-Screenshot / Security Watermark Grid */}
      {isWatermarkActive && (
        <div
          id="anti-screenshot-watermark-layer"
          className="pointer-events-none absolute inset-0 z-20 overflow-hidden select-none opacity-[0.04] grid grid-cols-2 sm:grid-cols-3 gap-12 p-6"
          aria-hidden="true"
        >
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="transform -rotate-25 text-center text-xs font-mono font-bold text-slate-900 tracking-wider">
              <div>🔒 KINTIL MEONG E2EE</div>
              <div>@{currentUser.name} • {roomId ? `#${roomId.slice(0, 6)}` : ''}</div>
              <div className="text-[10px]">{new Date().toLocaleDateString('id-ID')}</div>
            </div>
          ))}
        </div>
      )}

      {/* Kintil Meong Subtle Chat Background Logo Watermark */}
      <div 
        id="chat-background-watermark" 
        className="pointer-events-none sticky top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-96 aspect-square opacity-[0.045] flex items-center justify-center select-none z-0 float-right -mt-48 mb-[-24rem] mx-auto"
        aria-hidden="true"
      >
        <img
          src={logoImage}
          alt=""
          className="w-full h-full object-contain filter grayscale contrast-125"
        />
      </div>

      {/* Encryption Intro Card (only show when not searching) */}
      {!searchQuery && (
        <div id="e2ee-guarantee-banner" className="max-w-md mx-auto my-2 p-3.5 rounded-2xl bg-white border border-slate-200 text-center shadow-sm">
          <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-2 text-emerald-600">
            <Lock className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Enkripsi Ujung-ke-Ujung (E2EE) Aktif
          </h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            Semua pesan, berkas, dan rekaman suara dienkripsi dengan algoritma AES-256 GCM di perangkat Anda. Hanya anggota dengan kunci yang dapat membaca obrolan ini.
          </p>
        </div>
      )}

      {/* Messages List or Empty state */}
      {messages.length === 0 ? (
        searchQuery.trim() ? (
          <div id="search-empty-state" className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-2 select-none animate-in fade-in">
            <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 mb-1">
              <SearchX className="w-8 h-8" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Tidak ada pesan yang cocok</p>
            <p className="text-xs text-slate-400 text-center max-w-xs">
              Tidak ditemukan pesan yang mengandung kata &ldquo;<span className="text-slate-600 font-medium">{searchQuery}</span>&rdquo; di ruang ini.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-2 select-none">
            <MessageSquareDashed className="w-10 h-10 stroke-1 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">Belum ada pesan di ruang ini.</p>
            <p className="text-xs text-slate-400">Jadilah yang pertama mengirim pesan atau bagikan link undangan!</p>
          </div>
        )
      ) : (
        renderMessagesWithDateDividers()
      )}

      {/* Real-time Typing Indicator */}
      {typingUsers.length > 0 && !searchQuery && (
        <div id="typing-indicator" className="flex items-center gap-2 text-xs text-indigo-600 py-1 px-2 select-none animate-pulse">
          <div className="flex gap-1 items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="font-medium">
            {typingUsers.map(u => u.name).join(', ')} sedang mengetik...
          </span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};

