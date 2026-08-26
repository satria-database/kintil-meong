import React, { useState, useEffect } from 'react';
import { 
  DecryptedMessage, 
  User, 
  AttachedFile, 
  ReplyPreview,
  ReadReceiptEntry,
  MessageReactionGroup
} from '../types';
import { 
  Lock, 
  AlertTriangle, 
  Reply, 
  Copy, 
  Check, 
  CheckCheck,
  Clock, 
  Download, 
  FileText, 
  Eye, 
  ShieldAlert,
  Code,
  Smile,
  Plus,
  Trash2,
  Edit3,
  Pin,
  Flame,
  Timer,
  Ban
} from 'lucide-react';
import { formatFileSize } from '../lib/crypto';
import { AudioPlayer } from './AudioPlayer';

interface MessageItemProps {
  message: DecryptedMessage;
  currentUser: User;
  searchQuery?: string;
  isPinned?: boolean;
  onReply: (preview: ReplyPreview) => void;
  onMentionUser: (userName: string) => void;
  onViewImage: (file: AttachedFile) => void;
  onInspectCrypto: (message: DecryptedMessage) => void;
  onScrollToMessage: (messageId: string) => void;
  onReact: (messageId: string, emoji: string) => void;
  onEdit?: (messageId: string, currentText: string) => void;
  onDelete?: (messageId: string) => void;
  onPin?: (messageId: string, unpin?: boolean) => void;
}

const QUICK_REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥'];
const ALL_REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉', '👏', '🚀', '💯', '✨', '👀', '💡', '🥳', '😍', '🤔', '🤝', '💪', '🛡️'];

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentUser,
  searchQuery = '',
  isPinned = false,
  onReply,
  onMentionUser,
  onViewImage,
  onInspectCrypto,
  onScrollToMessage,
  onReact,
  onEdit,
  onDelete,
  onPin,
}) => {
  const isMine = message.senderId === currentUser.id;
  const [copied, setCopied] = useState(false);
  const [showFullEmojiPicker, setShowFullEmojiPicker] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(() => {
    if (!message.expiresAt) return null;
    return Math.max(0, Math.ceil((message.expiresAt - Date.now()) / 1000));
  });

  // Countdown timer for self-destructing messages
  useEffect(() => {
    if (!message.expiresAt || message.isDeleted) return;

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((message.expiresAt! - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [message.expiresAt, message.isDeleted]);

  // System message
  if (message.isSystem) {
    return (
      <div id={`msg-item-${message.id}`} className="flex justify-center my-3">
        <div className="px-3 py-1 rounded-full bg-slate-200/60 border border-slate-200 text-slate-500 text-xs flex items-center gap-1.5 shadow-xs">
          <span>{message.senderAvatar}</span>
          <span className="font-medium">{message.decryptedPayload?.text}</span>
          <span className="text-[10px] text-slate-400">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    );
  }

  // Tombstone for deleted / retracted message
  if (message.isDeleted) {
    return (
      <div
        id={`msg-item-${message.id}`}
        className={`flex gap-3 my-2.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 opacity-60"
          style={{ backgroundColor: message.senderColor }}
        >
          {message.senderAvatar}
        </div>
        <div className="max-w-[80%]">
          <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-100/80 border border-slate-200 text-slate-400 text-xs italic select-none">
            <Ban className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Pesan ini telah ditarik oleh pengirim</span>
            <span className="text-[10px] not-italic text-slate-400 ml-1">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const isDecrypted = !message.decryptionFailed && Boolean(message.decryptedPayload);
  const payload = message.decryptedPayload;
  const isEdited = Boolean(message.editedAt || payload?.editedAt);
  const isMentionedMe = payload?.mentions?.some(
    m => m === currentUser.name || m === `@${currentUser.name}`
  );
  const isSticker = Boolean(
    payload?.file &&
    (payload.file.type === 'image/sticker' || payload.file.name.startsWith('Stiker_'))
  );
  const isOnlySticker = isSticker && !payload?.text;

  // Delivery & Read Receipt Metadata Calculation
  const readByMap: Record<string, ReadReceiptEntry> = message.readBy || payload?.readBy || {};
  const readEntries: [string, ReadReceiptEntry][] = Object.entries(readByMap).filter(([uid]) => uid !== message.senderId);
  const isRead = readEntries.length > 0 || message.status === 'read' || payload?.status === 'read';
  
  const deliveredList = message.deliveredTo || payload?.deliveredTo || [];
  const isDelivered = isRead || deliveredList.length > 0 || message.status === 'delivered' || payload?.status === 'delivered';
  const isSending = message.status === 'sending';

  let statusText = 'Terkirim ke server (menunggu anggota)';
  if (isRead) {
    const readerNames = readEntries.map(([_, v]) => v.userName || 'Anggota').join(', ');
    const latestReadTime = readEntries.length > 0 
      ? new Date(Math.max(...readEntries.map(([_, v]) => v.readAt))).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';
    statusText = readerNames 
      ? `Dibaca oleh: ${readerNames}${latestReadTime ? ` • ${latestReadTime}` : ''}`
      : 'Pesan telah dibaca';
  } else if (isDelivered) {
    statusText = `Tersampaikan ke ${deliveredList.length > 0 ? `${deliveredList.length} anggota aktif` : 'perangkat penerima'}`;
  } else if (isSending) {
    statusText = 'Mengirim enkripsi...';
  }

  // Reactions calculation
  const reactionMap: Record<string, MessageReactionGroup> = message.reactions || payload?.reactions || {};
  const reactionEntries = Object.entries(reactionMap).filter(([_, group]) => group.users && group.users.length > 0);

  const handleCopyText = () => {
    if (payload?.text) {
      navigator.clipboard.writeText(payload.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReplyClick = () => {
    const textSnippet = payload?.text
      ? payload.text.slice(0, 60) + (payload.text.length > 60 ? '...' : '')
      : payload?.file
      ? `[File: ${payload.file.name}]`
      : 'Pesan terenkripsi';

    onReply({
      id: message.id,
      senderName: message.senderName,
      textSnippet,
      hasFile: Boolean(payload?.file),
      fileName: payload?.file?.name,
    });
  };

  const formatCountdown = (secs: number) => {
    if (secs >= 3600) {
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      return `${h}j ${m}m`;
    }
    if (secs >= 60) {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${secs}s`;
  };

  // Render text with interactive highlighted mentions and search keyword highlighting
  const renderFormattedText = (text: string) => {
    const mentionParts = text.split(/(@[a-zA-Z0-9_-]+)/g);

    const highlightSearchMatches = (plainText: string, baseKey: string | number) => {
      const query = searchQuery.trim();
      if (!query) {
        return <span key={baseKey}>{plainText}</span>;
      }

      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedQuery})`, 'gi');
      const textSegments = plainText.split(regex);

      return (
        <span key={baseKey}>
          {textSegments.map((segment, segIdx) => {
            if (segment.toLowerCase() === query.toLowerCase()) {
              return (
                <mark
                  key={segIdx}
                  className={`font-semibold rounded-xs px-0.5 ${
                    isMine
                      ? 'bg-amber-300 text-slate-900 shadow-xs'
                      : 'bg-amber-200 text-amber-950 font-bold'
                  }`}
                >
                  {segment}
                </mark>
              );
            }
            return <React.Fragment key={segIdx}>{segment}</React.Fragment>;
          })}
        </span>
      );
    };

    return mentionParts.map((part, index) => {
      if (part.startsWith('@')) {
        const targetName = part.substring(1);
        const isMe = targetName.toLowerCase() === currentUser.name.toLowerCase();
        const matchesQuery = searchQuery && part.toLowerCase().includes(searchQuery.trim().toLowerCase());

        return (
          <button
            key={index}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMentionUser(targetName);
            }}
            className={`inline-flex items-center px-1.5 py-0.2 mx-0.5 rounded font-semibold text-xs transition-colors cursor-pointer ${
              matchesQuery
                ? 'ring-2 ring-amber-400 font-bold'
                : ''
            } ${
              isMine
                ? 'bg-indigo-700/80 text-indigo-100 hover:bg-indigo-700'
                : isMe
                ? 'bg-amber-100 text-amber-900 border border-amber-300 ring-1 ring-amber-300'
                : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
            }`}
          >
            {part}
          </button>
        );
      }
      return highlightSearchMatches(part, index);
    });
  };

  return (
    <div
      id={`msg-item-${message.id}`}
      className={`group relative flex gap-3 my-3 transition-all duration-200 ${
        isMine ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Sender Avatar */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm select-none cursor-pointer"
        style={{ backgroundColor: message.senderColor }}
        onClick={() => !isMine && onMentionUser(message.senderName)}
        title={!isMine ? `Klik untuk mention @${message.senderName}` : undefined}
      >
        {message.senderAvatar}
      </div>

      {/* Message Bubble Container */}
      <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] md:max-w-[70%] space-y-1 ${isMine ? 'items-end' : 'items-start'}`}>
        
        {/* Sender Line & Time & Badges */}
        <div className="flex items-center gap-2 px-1 select-none flex-wrap">
          {/* Pinned Badge */}
          {isPinned && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
              <Pin className="w-2.5 h-2.5 fill-current" />
              <span>Disematkan</span>
            </div>
          )}

          {/* Self-destruct Countdown Timer Pill */}
          {timeLeft !== null && timeLeft > 0 && (
            <div
              className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border shadow-2xs animate-pulse ${
                timeLeft <= 10
                  ? 'bg-rose-50 text-rose-600 border-rose-200 ring-1 ring-rose-300'
                  : 'bg-amber-50 text-amber-600 border-amber-200'
              }`}
              title={`Pesan akan hancur otomatis dalam ${timeLeft} detik`}
            >
              <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>{formatCountdown(timeLeft)}</span>
            </div>
          )}

          {isMine ? (
            <>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium" title={statusText}>
                <span>
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {isSending ? (
                  <Clock className="w-3 h-3 text-slate-400 animate-pulse" />
                ) : isRead ? (
                  <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
                ) : isDelivered ? (
                  <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
              <span className="text-sm font-bold text-slate-800">
                {message.senderName} (Anda)
              </span>
            </>
          ) : (
            <>
              <span
                className="text-sm font-bold text-slate-800 hover:underline cursor-pointer"
                onClick={() => onMentionUser(message.senderName)}
              >
                {message.senderName}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </>
          )}
        </div>

        {/* Bubble */}
        <div
          className={`relative p-3.5 rounded-2xl shadow-sm text-sm leading-relaxed transition-all ${
            isOnlySticker
              ? 'bg-transparent p-0 shadow-none border-none'
              : isMine
              ? 'bg-indigo-600 text-white rounded-tr-none shadow-md'
              : isMentionedMe
              ? 'bg-white text-slate-700 rounded-tl-none border-2 border-amber-400 shadow-sm ring-1 ring-amber-200'
              : 'bg-white text-slate-700 rounded-tl-none border border-slate-200/80 shadow-sm'
          }`}
        >
          {/* Quoted Reply Banner */}
          {payload?.replyTo && (
            <div
              onClick={() => onScrollToMessage(payload.replyTo!.id)}
              className={`mb-2 p-2 rounded-lg text-xs border-l-2 cursor-pointer select-none transition-opacity hover:opacity-90 ${
                isMine
                  ? 'bg-indigo-700/60 border-indigo-300 text-indigo-100'
                  : 'bg-slate-50 border-indigo-500 text-slate-600'
              }`}
              title="Klik untuk melompat ke pesan yang dibalas"
            >
              <div className={`font-bold text-[11px] flex items-center gap-1 ${isMine ? 'text-indigo-200' : 'text-indigo-600'}`}>
                <Reply className="w-3 h-3 rotate-180" />
                <span>{payload.replyTo.senderName}</span>
              </div>
              <div className={`truncate text-[11px] mt-0.5 ${isMine ? 'text-indigo-100' : 'text-slate-500'}`}>
                {payload.replyTo.textSnippet}
              </div>
            </div>
          )}

          {/* Decryption Failure Alert */}
          {!isDecrypted && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <div>
                <div className="font-semibold">Pesan Terenkripsi</div>
                <div className="text-[11px] text-rose-600 mt-0.5">
                  Kunci enkripsi tidak cocok. Periksa passkey ruang obrolan Anda.
                </div>
              </div>
            </div>
          )}

          {/* Decrypted Text Body */}
          {isDecrypted && payload?.text && (
            <div className="whitespace-pre-wrap break-words select-text">
              {renderFormattedText(payload.text)}
            </div>
          )}

          {/* Decrypted File Attachment */}
          {isDecrypted && payload?.file && (
            <div className={`${payload.text ? (isMine ? 'mt-2.5 pt-2.5 border-t border-indigo-500/40' : 'mt-2.5 pt-2.5 border-t border-slate-100') : ''}`}>
              {/* Sticker Rendering */}
              {isSticker ? (
                <div className="relative group/stk inline-block">
                  <div
                    onClick={() => onViewImage(payload.file!)}
                    className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl overflow-hidden bg-white border border-slate-200/80 shadow-md p-1.5 cursor-pointer transition-all group-hover/stk:scale-105 active:scale-95"
                    title="Klik untuk memperbesar stiker"
                  >
                    <img
                      src={payload.file.dataUrl}
                      alt={payload.file.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  {isOnlySticker && (
                    <div className="flex items-center justify-end gap-1.5 mt-1.5 text-[10px] text-slate-400 select-none">
                      <span className="text-[10px] text-slate-400">
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMine && (
                        <span title={statusText} className="flex items-center">
                          {isSending ? (
                            <Clock className="w-3 h-3 text-slate-400 animate-pulse" />
                          ) : isRead ? (
                            <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
                          ) : isDelivered ? (
                            <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </span>
                      )}
                      <Lock className="w-2.5 h-2.5 text-indigo-500 ml-0.5" />
                      <span className="font-medium text-slate-500">Stiker E2EE</span>
                    </div>
                  )}
                </div>
              ) : payload.file.type.startsWith('image/') ? (
                /* Image Preview */
                <div className="space-y-1">
                  <div
                    onClick={() => onViewImage(payload.file!)}
                    className="relative group/img overflow-hidden rounded-xl bg-slate-100 cursor-pointer border border-slate-200 max-h-64"
                  >
                    <img
                      src={payload.file.dataUrl}
                      alt={payload.file.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-auto max-h-64 object-cover transition-transform group-hover/img:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-medium">
                      <Eye className="w-4 h-4" /> Perbesar Gambar
                    </div>
                  </div>
                  <div className={`flex items-center justify-between text-[10px] px-1 ${isMine ? 'text-indigo-200' : 'text-slate-500'}`}>
                    <span className="truncate max-w-[160px] font-medium">{payload.file.name}</span>
                    <span>{formatFileSize(payload.file.size)}</span>
                  </div>
                </div>
              ) : payload.file.type.startsWith('audio/') ? (
                /* Voice / Audio Player with interactive waveform & speed controls */
                <AudioPlayer
                  src={payload.file.dataUrl}
                  fileName={payload.file.name}
                  fileSize={payload.file.size}
                  isMine={isMine}
                />
              ) : (
                /* General Document / File Card */
                <div className={`p-2 rounded-xl border flex items-center gap-3 ${isMine ? 'bg-indigo-700/50 border-indigo-500/40' : 'bg-slate-50 border-slate-200'}`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${
                    isMine ? 'bg-white text-indigo-600' : 'bg-white text-indigo-600 border border-slate-200'
                  }`}>
                    <FileText className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-bold truncate ${isMine ? 'text-white' : 'text-slate-800'}`}>
                      {payload.file.name}
                    </div>
                    <div className={`text-[10px] mt-0.5 font-medium ${isMine ? 'text-indigo-200' : 'text-slate-500'}`}>
                      {formatFileSize(payload.file.size)} • Terenkripsi
                    </div>
                  </div>
                  <a
                    href={payload.file.dataUrl}
                    download={payload.file.name}
                    className={`p-2 rounded-lg transition-all ${
                      isMine ? 'hover:bg-indigo-800 text-white' : 'hover:bg-white text-indigo-600'
                    }`}
                    title="Unduh Berkas"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Footer Metadata in Bubble */}
          <div className={`flex items-center justify-end gap-1.5 mt-1.5 text-[10px] select-none ${isMine ? 'text-indigo-200' : 'text-slate-400'}`}>
            {isEdited && (
              <span 
                className="text-[10px] italic opacity-85"
                title={`Pesan diedit pada ${new Date(message.editedAt || payload?.editedAt || 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
              >
                (diedit)
              </span>
            )}

            <span className="text-[10px] opacity-75">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>

            {isMine && (
              <span
                className="flex items-center gap-0.5 cursor-pointer transition-transform hover:scale-110"
                title={statusText}
                onClick={() => onInspectCrypto(message)}
              >
                {isSending ? (
                  <Clock className="w-3 h-3 text-indigo-300/70 animate-pulse" />
                ) : isRead ? (
                  <CheckCheck className="w-3.5 h-3.5 text-sky-300 drop-shadow-xs" />
                ) : isDelivered ? (
                  <CheckCheck className="w-3.5 h-3.5 text-indigo-200" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-indigo-200/80" />
                )}
              </span>
            )}

            <span
              className="flex items-center gap-0.5 cursor-pointer hover:underline ml-0.5"
              onClick={() => onInspectCrypto(message)}
              title="Enkripsi E2EE AES-256 GCM Terverifikasi. Klik untuk detail muatan & tanda terima."
            >
              <Lock className="w-2.5 h-2.5" />
              <span>E2EE</span>
            </span>
          </div>
        </div>

        {/* Message Reaction Badges / Pills */}
        {reactionEntries.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 px-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
            {reactionEntries.map(([emoji, group]) => {
              const isReactedByMe = group.users.some(u => u.id === currentUser.id);
              const userNames = group.users.map(u => (u.id === currentUser.id ? 'Anda' : u.name)).join(', ');

              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onReact(message.id, emoji)}
                  title={`Bereaksi: ${userNames} (Klik untuk ${isReactedByMe ? 'menghapus' : 'menambah'})`}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border transition-all cursor-pointer select-none active:scale-95 shadow-2xs ${
                    isReactedByMe
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 ring-1 ring-indigo-200'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-sm">{emoji}</span>
                  <span className="text-[11px] font-bold">{group.users.length}</span>
                </button>
              );
            })}

            {/* Quick Add Reaction Button beside pills */}
            <button
              type="button"
              onClick={() => setShowFullEmojiPicker(prev => !prev)}
              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-400 hover:text-slate-700 text-xs transition-colors cursor-pointer shadow-2xs"
              title="Tambah reaksi baru"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Floating Quick Reaction Toolbar & Actions */}
        <div
          className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-1 select-none relative flex-wrap ${
            isMine ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          {/* Quick Reaction Emojis Floating Bar */}
          <div className="flex items-center bg-white border border-slate-200 rounded-full px-1.5 py-0.5 shadow-md gap-0.5">
            {QUICK_REACTION_EMOJIS.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact(message.id, emoji)}
                className="w-6 h-6 flex items-center justify-center text-sm rounded-full hover:bg-slate-100 hover:scale-125 active:scale-95 transition-all cursor-pointer"
                title={`Bereaksi ${emoji}`}
              >
                {emoji}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowFullEmojiPicker(prev => !prev)}
              className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
              title="Lebih banyak emotikon reaksi"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Reply Button */}
          <button
            type="button"
            onClick={handleReplyClick}
            className="p-1 rounded-lg bg-white hover:bg-slate-100 text-slate-600 text-[11px] font-medium flex items-center gap-1 px-2 border border-slate-200 shadow-xs transition-colors cursor-pointer"
            title="Balas Pesan"
          >
            <Reply className="w-3 h-3" />
            <span className="hidden sm:inline">Balas</span>
          </button>

          {/* Edit Message Button (Sender Only, for text messages) */}
          {isMine && isDecrypted && payload?.text && onEdit && (
            <button
              type="button"
              onClick={() => onEdit(message.id, payload.text)}
              className="p-1 rounded-lg bg-white hover:bg-amber-50 text-amber-700 text-[11px] font-medium flex items-center gap-1 px-2 border border-slate-200 shadow-xs transition-colors cursor-pointer"
              title="Edit Pesan Ini"
            >
              <Edit3 className="w-3 h-3 text-amber-600" />
              <span className="hidden sm:inline">Edit</span>
            </button>
          )}

          {/* Pin / Unpin Button */}
          {onPin && (
            <button
              type="button"
              onClick={() => onPin(message.id, isPinned)}
              className={`p-1 rounded-lg text-[11px] font-medium flex items-center gap-1 px-2 border shadow-xs transition-colors cursor-pointer ${
                isPinned
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
              }`}
              title={isPinned ? 'Lepas Sematan Pesan' : 'Sematkan Pesan di Atas Ruang'}
            >
              <Pin className="w-3 h-3" />
              <span className="hidden sm:inline">{isPinned ? 'Lepas Pin' : 'Pin'}</span>
            </button>
          )}

          {/* Delete for Everyone Button (Sender Only) */}
          {isMine && onDelete && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Tarik / Hapus pesan ini untuk semua orang di ruang ini?')) {
                  onDelete(message.id);
                }
              }}
              className="p-1 rounded-lg bg-white hover:bg-rose-50 text-rose-600 text-[11px] font-medium flex items-center gap-1 px-2 border border-slate-200 shadow-xs transition-colors cursor-pointer"
              title="Tarik / Hapus Pesan untuk Semua Orang"
            >
              <Trash2 className="w-3 h-3 text-rose-500" />
              <span className="hidden sm:inline">Tarik</span>
            </button>
          )}

          {/* Copy Text Button */}
          {isDecrypted && payload?.text && (
            <button
              type="button"
              onClick={handleCopyText}
              className="p-1 rounded-lg bg-white hover:bg-slate-100 text-slate-600 text-[11px] font-medium flex items-center gap-1 px-2 border border-slate-200 shadow-xs transition-colors cursor-pointer"
              title="Salin Teks"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Tersalin' : 'Salin'}</span>
            </button>
          )}

          {/* Inspect Crypto Button */}
          <button
            type="button"
            onClick={() => onInspectCrypto(message)}
            className="p-1 rounded-lg bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-700 text-[11px] flex items-center gap-1 px-2 border border-slate-200 shadow-xs transition-colors cursor-pointer"
            title="Lihat Ciphertext & Kriptografi"
          >
            <Code className="w-3 h-3 text-slate-400" />
            <span className="hidden sm:inline font-medium">Kripto</span>
          </button>

          {/* Full Emoji Reaction Popover */}
          {showFullEmojiPicker && (
            <div
              className={`absolute top-full mt-1 z-30 p-2 bg-white border border-slate-200 rounded-2xl shadow-xl animate-in fade-in slide-in-from-top-1 ${
                isMine ? 'right-0' : 'left-0'
              }`}
            >
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
                Pilih Reaksi
              </div>
              <div className="grid grid-cols-5 gap-1 w-44">
                {ALL_REACTION_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onReact(message.id, emoji);
                      setShowFullEmojiPicker(false);
                    }}
                    className="w-8 h-8 text-base flex items-center justify-center rounded-xl hover:bg-indigo-50 hover:scale-120 active:scale-95 transition-all cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


