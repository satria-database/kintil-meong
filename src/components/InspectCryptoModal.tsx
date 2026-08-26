import React, { useState } from 'react';
import { X, Code, Copy, Check, CheckCheck, Lock, ShieldCheck, UserCheck, Clock, Send } from 'lucide-react';
import { DecryptedMessage, ReadReceiptEntry } from '../types';

interface InspectCryptoModalProps {
  message: DecryptedMessage | null;
  onClose: () => void;
}

export const InspectCryptoModal: React.FC<InspectCryptoModalProps> = ({
  message,
  onClose,
}) => {
  const [copiedCipher, setCopiedCipher] = useState(false);
  const [copiedMetadata, setCopiedMetadata] = useState(false);

  if (!message) return null;

  const handleCopyCipher = () => {
    navigator.clipboard.writeText(message.ciphertext);
    setCopiedCipher(true);
    setTimeout(() => setCopiedCipher(false), 2000);
  };

  const payload = message.decryptedPayload;
  const readByMap: Record<string, ReadReceiptEntry> = message.readBy || payload?.readBy || {};
  const readEntries: [string, ReadReceiptEntry][] = Object.entries(readByMap).filter(([uid]) => uid !== message.senderId);
  const isRead = readEntries.length > 0 || message.status === 'read' || payload?.status === 'read';
  const deliveredList = message.deliveredTo || payload?.deliveredTo || [];
  const isDelivered = isRead || deliveredList.length > 0 || message.status === 'delivered' || payload?.status === 'delivered';

  const metadataJson = JSON.stringify(
    {
      messageId: message.id,
      timestamp: message.timestamp,
      sender: { id: message.senderId, name: message.senderName },
      deliveryStatus: isRead ? 'read' : isDelivered ? 'delivered' : 'sent',
      deliveredToCount: deliveredList.length,
      deliveredTo: deliveredList,
      readBy: readByMap,
      hasEncryptedPayload: Boolean(payload),
    },
    null,
    2
  );

  const handleCopyMetadata = () => {
    navigator.clipboard.writeText(metadataJson);
    setCopiedMetadata(true);
    setTimeout(() => setCopiedMetadata(false), 2000);
  };

  return (
    <div id="inspect-crypto-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div id="inspect-crypto-modal-box" className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-800 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Inspeksi Kriptografi & Status Pesan</h3>
              <p className="text-[11px] text-slate-500">Metadata terenkripsi, tanda terima pengiriman, dan ciphertext</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          
          {/* Status summary */}
          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <div>
                <div className="font-bold text-slate-800">Status Enkripsi: AES-GCM 256-bit</div>
                <div className="text-[10px] text-slate-500">Pengirim: {message.senderName} • ID: {message.id}</div>
              </div>
            </div>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white text-emerald-700 border border-emerald-200 font-bold shadow-2xs">
              FP: {message.keyFingerprint || 'VALID'}
            </span>
          </div>

          {/* Delivery & Read Receipts Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-indigo-600" />
                Status Pengiriman & Tanda Terima Baca (Receipts)
              </span>
              <div className="flex items-center gap-1">
                {isRead ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700 border border-sky-200">
                    <CheckCheck className="w-3 h-3 text-sky-600" />
                    Dibaca (Read)
                  </span>
                ) : isDelivered ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                    <CheckCheck className="w-3 h-3 text-slate-600" />
                    Tersampaikan (Delivered)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                    <Check className="w-3 h-3 text-slate-600" />
                    Terkirim (Sent)
                  </span>
                )}
              </div>
            </div>

            {/* Read Receipts Breakdown */}
            <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
              <div className="text-[10px] font-semibold text-slate-500 flex items-center justify-between">
                <span>Daftar Pembaca Pesan:</span>
                <span>{readEntries.length} Anggota</span>
              </div>
              {readEntries.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">Belum ada anggota lain yang membuka dan membaca pesan ini.</p>
              ) : (
                <div className="space-y-1">
                  {readEntries.map(([userId, entry]) => (
                    <div key={userId} className="flex items-center justify-between p-1.5 rounded-lg bg-white border border-slate-200 text-[11px]">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <UserCheck className="w-3 h-3 text-sky-600" />
                        <span>{entry.userName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(entry.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* IV Initialization Vector */}
          <div>
            <div className="text-[11px] font-bold text-slate-600 mb-1 flex items-center justify-between">
              <span>Initialization Vector (IV - Base64):</span>
              <span className="font-mono text-[10px] text-slate-400">12 Bytes (96-bit)</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-indigo-600 text-[11px] break-all select-all">
              {message.iv || '(none)'}
            </div>
          </div>

          {/* Ciphertext */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-slate-600">Ciphertext Payload (Base64 Encrypted):</span>
              <button
                onClick={handleCopyCipher}
                className="text-[10px] text-indigo-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copiedCipher ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCipher ? 'Tersalin' : 'Salin Ciphertext'}</span>
              </button>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-700 text-[11px] max-h-32 overflow-y-auto break-all select-all">
              {message.ciphertext || '(none)'}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Server hanya melihat string acak di atas. Tanpa passkey lokal Anda, string ini mustahil dibaca.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <button
            onClick={handleCopyMetadata}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedMetadata ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>Salin Metadata JSON</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
