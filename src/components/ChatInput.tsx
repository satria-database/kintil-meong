import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Paperclip, 
  Mic, 
  Square, 
  X, 
  Reply, 
  AtSign, 
  Smile, 
  FileText, 
  Image as ImageIcon,
  Loader2,
  Trash2,
  Sparkles,
  Sticker,
  Edit2,
  Check
} from 'lucide-react';
import { RoomParticipant, ReplyPreview, AttachedFile } from '../types';
import { readFileAsDataURL, formatFileSize } from '../lib/crypto';
import { KINTIL_MEONG_STICKERS, StickerItem } from '../data/stickers';

interface ChatInputProps {
  participants: RoomParticipant[];
  replyTo: ReplyPreview | null;
  editingMessage?: { id: string; text: string } | null;
  onClearReply: () => void;
  onCancelEdit?: () => void;
  onSaveEdit?: (messageId: string, newText: string) => void;
  onSendMessage: (data: {
    text: string;
    mentions: string[];
    replyTo: ReplyPreview | null;
    file: AttachedFile | null;
  }) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
  mentionToPrefill?: string | null;
  onClearPrefillMention?: () => void;
}

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '😂', '🎉', '🔒', '👏', '🚀'];

export const ChatInput: React.FC<ChatInputProps> = ({
  participants,
  replyTo,
  editingMessage = null,
  onClearReply,
  onCancelEdit,
  onSaveEdit,
  onSendMessage,
  onTyping,
  mentionToPrefill,
  onClearPrefillMention,
}) => {
  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState<AttachedFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activePickerTab, setActivePickerTab] = useState<'stickers' | 'emojis'>('stickers');

  // Mention Suggestions State
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<any>(null);

  // Handle edit message prefill
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text);
      textareaRef.current?.focus();
    }
  }, [editingMessage]);

  // Handle prefilled mention from user clicks
  useEffect(() => {
    if (mentionToPrefill) {
      setText(prev => {
        const prefix = prev && !prev.endsWith(' ') ? prev + ' ' : prev;
        return `${prefix}@${mentionToPrefill} `;
      });
      textareaRef.current?.focus();
      onClearPrefillMention?.();
    }
  }, [mentionToPrefill, onClearPrefillMention]);

  // Adjust textarea height automatically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  // Filter participants for mention suggestions
  const filteredParticipants = participants.filter(p =>
    p.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  // Check mention cursor trigger
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    // Notify typing
    onTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      onTyping(false);
    }, 2000);

    // Check if cursor is currently right after @
    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const query = textBeforeCursor.slice(lastAtIndex + 1);
      // Valid mention query (no spaces or short)
      if (!query.includes(' ') && query.length <= 20) {
        setMentionQuery(query);
        setShowMentions(true);
        setSelectedMentionIndex(0);
        return;
      }
    }
    setShowMentions(false);
  };

  const insertMention = (userName: string) => {
    if (!textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart;
    const textBeforeCursor = text.slice(0, cursor);
    const textAfterCursor = text.slice(cursor);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const newText = `${textBeforeCursor.slice(0, lastAtIndex)}@${userName} ${textAfterCursor}`;
      setText(newText);
      setShowMentions(false);
      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = lastAtIndex + userName.length + 2;
          textareaRef.current.setSelectionRange(newPos, newPos);
          textareaRef.current.focus();
        }
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && filteredParticipants.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev => (prev + 1) % filteredParticipants.length);
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev => (prev - 1 + filteredParticipants.length) % filteredParticipants.length);
        return;
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const target = filteredParticipants[selectedMentionIndex];
        if (target) {
          insertMention(target.name);
        }
        return;
      } else if (e.key === 'Escape') {
        setShowMentions(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // File Upload Handlers
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    setIsUploading(true);
    try {
      const dataUrl = await readFileAsDataURL(file);
      setSelectedFile({
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memuat file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Voice Recording Functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setSelectedFile({
            name: `Rekaman_Suara_${new Date().toLocaleTimeString().replace(/:/g, '-')}.webm`,
            type: 'audio/webm',
            size: audioBlob.size,
            dataUrl: reader.result as string,
          });
        };
        reader.readAsDataURL(audioBlob);

        // Stop all audio tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (err) {
      setErrorMsg('Tidak dapat mengakses mikrofon. Pastikan izin mikrofon telah diberikan.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      audioChunksRef.current = [];
    }
  };

  // Extract all @mentions from text
  const extractMentions = (msgText: string): string[] => {
    const matches = msgText.match(/@[a-zA-Z0-9_-]+/g);
    if (!matches) return [];
    return Array.from(new Set(matches.map(m => m.substring(1))));
  };

  const handleSendSticker = async (sticker: StickerItem) => {
    setShowEmojiPicker(false);
    setErrorMsg('');
    const replyToSend = replyTo;
    onClearReply();

    try {
      await onSendMessage({
        text: '',
        mentions: [],
        replyTo: replyToSend,
        file: {
          name: `Stiker_${sticker.id}.jpg`,
          type: 'image/sticker',
          size: 18000,
          dataUrl: sticker.src,
        },
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengirim stiker');
    }
  };

  const handleSend = async () => {
    const cleanText = text.trim();
    if (!cleanText && !selectedFile) return;

    if (editingMessage && onSaveEdit) {
      if (cleanText) {
        onSaveEdit(editingMessage.id, cleanText);
      }
      setText('');
      onCancelEdit?.();
      onTyping(false);
      return;
    }

    const mentions = extractMentions(cleanText);
    const fileToSend = selectedFile;
    const replyToSend = replyTo;

    // Reset local inputs immediately
    setText('');
    setSelectedFile(null);
    onClearReply();
    setShowEmojiPicker(false);
    onTyping(false);

    try {
      await onSendMessage({
        text: cleanText,
        mentions,
        replyTo: replyToSend,
        file: fileToSend,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengirim pesan');
    }
  };

  return (
    <div id="chat-input-wrapper" className="relative border-t border-slate-200 bg-white p-4 z-20">
      
      {/* Error Toast */}
      {errorMsg && (
        <div className="absolute -top-10 left-4 right-4 p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center justify-between shadow-md">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="p-1 hover:text-rose-900 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Mention Autocomplete Popover */}
      {showMentions && filteredParticipants.length > 0 && (
        <div id="mention-autocomplete-menu" className="absolute bottom-full left-4 mb-2 w-64 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-30 divide-y divide-slate-100 animate-in fade-in slide-in-from-bottom-2">
          <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400">
            Mention Pengguna
          </div>
          {filteredParticipants.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => insertMention(p.name)}
              className={`w-full px-2.5 py-1.5 rounded-xl text-left text-xs flex items-center gap-2 transition-colors cursor-pointer ${
                idx === selectedMentionIndex ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div 
                className="w-5 h-5 rounded-md flex items-center justify-center text-xs text-white"
                style={{ backgroundColor: p.color }}
              >
                {p.avatar}
              </div>
              <span className="truncate">@{p.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Attached File Preview Card */}
      {selectedFile && (
        <div id="attached-file-preview-card" className="mb-2 p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2 min-w-0">
            {selectedFile.type.startsWith('image/') ? (
              <img
                src={selectedFile.dataUrl}
                alt="Lampiran"
                className="w-10 h-10 rounded-lg object-cover border border-slate-200"
              />
            ) : selectedFile.type.startsWith('audio/') ? (
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Mic className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <div className="font-bold text-slate-800 truncate max-w-[240px]">{selectedFile.name}</div>
              <div className="text-[10px] text-slate-500">{formatFileSize(selectedFile.size)} • Terenkripsi E2EE</div>
            </div>
          </div>
          <button
            onClick={() => setSelectedFile(null)}
            className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
            title="Hapus Lampiran"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Voice Recording Active Bar */}
      {isRecording ? (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 text-rose-700 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping absolute" />
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 relative" />
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono tracking-wider">
                {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')}
              </span>
              <span className="text-[11px] text-rose-500 font-medium hidden sm:inline">• Merekam audio terenkripsi</span>
            </div>

            {/* Pulsing Audio Wave Equalizer Visualizer */}
            <div className="flex items-center gap-1 h-5 px-2">
              {[40, 75, 100, 50, 90, 60, 85, 30, 95, 45].map((h, idx) => (
                <div
                  key={idx}
                  style={{
                    height: `${Math.max(20, (h * ((recordingSeconds % 3) + 1)) % 100)}%`,
                  }}
                  className="w-1 bg-rose-400 rounded-full transition-all duration-150 animate-pulse"
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelRecording}
              className="px-3 py-1.5 rounded-xl bg-white border border-rose-200 hover:bg-rose-100 text-rose-600 text-xs font-semibold cursor-pointer transition-colors"
              title="Batalkan Rekaman"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
              title="Simpan Rekaman Suara"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Selesai</span>
            </button>
          </div>
        </div>
      ) : (
        /* Sleek Nested Input Box Layout */
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2 shadow-inner">
          
          {/* Edit Message Banner inside Input */}
          {editingMessage && (
            <div id="active-edit-banner" className="flex items-center justify-between mb-1.5 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 animate-in fade-in">
              <div className="flex items-center gap-1.5 min-w-0">
                <Edit2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="font-bold text-amber-700 uppercase tracking-wider text-[10px]">Mengedit Pesan</span>
                <span className="text-amber-800/80 truncate text-[11px]">“{editingMessage.text}”</span>
              </div>
              <button
                onClick={() => {
                  setText('');
                  onCancelEdit?.();
                }}
                className="p-1 text-amber-600 hover:text-amber-900 cursor-pointer text-xs font-semibold hover:underline"
                title="Batalkan Pengeditan"
              >
                Batal
              </button>
            </div>
          )}

          {/* Reply Banner inside Input */}
          {replyTo && !editingMessage && (
            <div id="active-reply-banner" className="flex items-center justify-between mb-1.5 px-2 py-1 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 animate-in fade-in">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Membalas</span>
                <span className="font-bold text-indigo-600 truncate">@{replyTo.senderName}:</span>
                <span className="text-slate-500 truncate text-[11px]">{replyTo.textSnippet}</span>
              </div>
              <button
                onClick={onClearReply}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Batalkan Balasan"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Normal Chat Input Row */}
          <div className="flex items-end gap-1.5">
            
            {/* File Upload Trigger */}
            {!editingMessage && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="chat-file-picker"
                />
                <button
                  id="btn-attach-file"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer shrink-0"
                  title="Kirim Berkas / Gambar / Dokumen (E2EE)"
                >
                  {isUploading ? <Loader2 className="w-5 h-5 animate-spin text-indigo-600" /> : <Paperclip className="w-5 h-5" />}
                </button>

                {/* Voice Note Trigger */}
                <button
                  id="btn-voice-record"
                  type="button"
                  onClick={startRecording}
                  className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer shrink-0"
                  title="Rekam Pesan Suara"
                >
                  <Mic className="w-5 h-5" />
                </button>

                {/* Sticker Trigger */}
                <button
                  id="btn-sticker-picker"
                  type="button"
                  onClick={() => {
                    setShowEmojiPicker(prev => !prev || activePickerTab !== 'stickers');
                    setActivePickerTab('stickers');
                  }}
                  className={`p-2.5 rounded-xl transition-all cursor-pointer shrink-0 ${
                    showEmojiPicker && activePickerTab === 'stickers'
                      ? 'text-indigo-600 bg-indigo-50 font-bold'
                      : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                  }`}
                  title="Stiker Kintil Meong"
                >
                  <Sticker className="w-5 h-5" />
                </button>

                {/* Emoji Trigger */}
                <button
                  id="btn-emoji-picker"
                  type="button"
                  onClick={() => {
                    setShowEmojiPicker(prev => !prev || activePickerTab !== 'emojis');
                    setActivePickerTab('emojis');
                  }}
                  className={`p-2.5 rounded-xl transition-all cursor-pointer shrink-0 ${
                    showEmojiPicker && activePickerTab === 'emojis'
                      ? 'text-amber-500 bg-amber-50'
                      : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'
                  }`}
                  title="Emotikon Cepat"
                >
                  <Smile className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              id="chat-textarea-input"
              rows={1}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder={editingMessage ? "Perbarui isi pesan..." : "Tulis pesan... (Gunakan @ untuk mention, Shift+Enter untuk baris baru)"}
              className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-sm text-slate-700 resize-none py-2.5 px-2 placeholder-slate-400 max-h-32"
            />

            {/* Send / Save Button */}
            <button
              id="btn-send-message"
              type="button"
              onClick={handleSend}
              disabled={!text.trim() && !selectedFile}
              className={`p-3 rounded-xl transition-all active:scale-95 flex items-center justify-center shrink-0 cursor-pointer ${
                text.trim() || selectedFile
                  ? editingMessage
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-200'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
              title={editingMessage ? "Simpan Perubahan" : "Kirim Pesan (Enter)"}
            >
              {editingMessage ? <Check className="w-5 h-5" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      )}

      {/* Sticker & Emoji Tray Popover */}
      {showEmojiPicker && (
        <div id="quick-sticker-emoji-picker" className="mt-3 p-3 bg-white border border-slate-200 rounded-2xl shadow-lg animate-in fade-in slide-in-from-bottom-2">
          {/* Tabs header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActivePickerTab('stickers')}
                className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activePickerTab === 'stickers'
                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Stiker Kintil Meong</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePickerTab('emojis')}
                className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activePickerTab === 'emojis'
                    ? 'bg-amber-50 text-amber-600 border border-amber-100 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Smile className="w-3.5 h-3.5 text-amber-500" />
                <span>Emotikon Cepat</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowEmojiPicker(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Stickers Content */}
          {activePickerTab === 'stickers' ? (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {KINTIL_MEONG_STICKERS.map((sticker) => (
                  <button
                    key={sticker.id}
                    type="button"
                    onClick={() => handleSendSticker(sticker)}
                    className="group/stk flex flex-col items-center p-2 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-indigo-50/60 hover:border-indigo-200 transition-all hover:scale-105 active:scale-95 cursor-pointer text-center"
                    title={`Kirim Stiker: ${sticker.name}`}
                  >
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-white border border-slate-200/80 shadow-2xs p-1 flex items-center justify-center">
                      <img
                        src={sticker.src}
                        alt={sticker.name}
                        className="w-full h-full object-contain transition-transform group-hover/stk:rotate-3"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 mt-1.5 group-hover/stk:text-indigo-600 truncate max-w-full">
                      {sticker.label}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-2 text-center">
                Klik stiker untuk langsung mengirimkannya dengan enkripsi E2EE aman.
              </p>
            </div>
          ) : (
            /* Quick Emojis Content */
            <div className="flex items-center gap-1.5 flex-wrap py-1">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setText(prev => prev + emoji);
                    textareaRef.current?.focus();
                  }}
                  className="w-9 h-9 text-xl rounded-xl hover:bg-slate-100 flex items-center justify-center transition-transform hover:scale-125 cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
