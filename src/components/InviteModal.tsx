import React, { useState } from 'react';
import { X, Copy, Check, QrCode, Shield, Share2, Sparkles, Link2 } from 'lucide-react';
import { generateQRCodeSVG } from '../lib/qr';

interface InviteModalProps {
  roomId: string;
  passkey: string;
  roomName: string;
  onClose: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  roomId,
  passkey,
  roomName,
  onClose,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Construct secure invite link with room & passkey in hash fragment
  // Note: Browser never sends hash fragment '#' to the server, preserving zero-knowledge E2EE!
  const origin = window.location.origin;
  const path = window.location.pathname;
  const inviteUrl = `${origin}${path}#room=${encodeURIComponent(roomId)}&key=${encodeURIComponent(passkey)}`;
  const qrSvgUrl = generateQRCodeSVG(inviteUrl);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(passkey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div id="invite-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div id="invite-modal-box" className="w-full max-w-md bg-white border border-slate-200 text-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Undang Teman ke Ruang</h3>
              <p className="text-[11px] text-slate-500">Bagikan tautan langsung dengan kunci enkripsi aman</p>
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
        <div className="p-5 space-y-4">
          
          {/* Main Direct Link Box */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-indigo-600" />
              Tautan Undangan Lengkap (1-Klik Gabung)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 select-all focus:outline-none focus:border-indigo-500"
              />
              <button
                id="btn-copy-invite-link-main"
                onClick={handleCopyLink}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer shrink-0"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-indigo-200" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Tersalin!' : 'Salin'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-600 shrink-0" />
              Kunci dibagikan melalui fragmen hash URL (tidak pernah dikirim ke server).
            </p>
          </div>

          {/* QR Code Section */}
          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
              <img
                src={qrSvgUrl}
                alt="QR Code Invite"
                className="w-36 h-36"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="text-[11px] text-slate-500 font-medium mt-2 flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5 text-indigo-600" />
              Pindai QR dengan kamera ponsel untuk bergabung
            </span>
          </div>

          {/* Manual Credentials Box */}
          <div className="border-t border-slate-100 pt-3 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Atau Bagikan Manual:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">ID Ruang:</div>
                  <div className="font-mono text-slate-800 font-bold">{roomId}</div>
                </div>
                <button onClick={handleCopyId} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Passkey:</div>
                  <div className="font-mono text-indigo-600 font-bold truncate max-w-[90px]">{passkey}</div>
                </div>
                <button onClick={handleCopyKey} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
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
