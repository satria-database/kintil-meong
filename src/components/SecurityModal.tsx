import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  KeyRound, 
  Copy, 
  Check, 
  Lock, 
  Layers, 
  CheckCircle2,
  RefreshCw 
} from 'lucide-react';

interface SecurityModalProps {
  passkey: string;
  keyFingerprint: { hexCode: string; emojiCode: string } | null;
  onUpdatePasskey: (newKey: string) => void;
  onClose: () => void;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({
  passkey,
  keyFingerprint,
  onUpdatePasskey,
  onClose,
}) => {
  const [editingKey, setEditingKey] = useState(passkey);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveNewKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKey.trim()) return;
    onUpdatePasskey(editingKey.trim());
    setIsEditing(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleCopyFingerprint = () => {
    if (keyFingerprint) {
      navigator.clipboard.writeText(`${keyFingerprint.emojiCode} [${keyFingerprint.hexCode}]`);
      setCopiedFingerprint(true);
      setTimeout(() => setCopiedFingerprint(false), 2000);
    }
  };

  return (
    <div id="security-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div id="security-modal-box" className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-800">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                Verifikasi Keamanan Kriptografi
              </h3>
              <p className="text-[11px] text-slate-500">Enkripsi Ujung-ke-Ujung (E2EE) AES-GCM 256-bit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          
          {/* Visual Safety Fingerprint Card */}
          <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-center space-y-2 relative overflow-hidden">
            <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 flex items-center justify-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              Sidik Jari Kriptografis (Safety Number)
            </div>

            {/* Emoji Visual Code */}
            <div className="text-2xl tracking-widest py-1 select-all font-mono">
              {keyFingerprint?.emojiCode || '🛡️ 🔑 🔒 ⚡'}
            </div>

            {/* Hex Hash Group */}
            <div className="text-xs font-mono font-bold text-slate-700 tracking-wider">
              {keyFingerprint?.hexCode || 'A1B2-C3D4-E5F6'}
            </div>

            <p className="text-[11px] text-slate-500 max-w-xs mx-auto pt-1 leading-relaxed">
              Bandingkan 4 emoji dan kode di atas dengan teman Anda di ruang obrolan. Jika cocok, obrolan Anda 100% aman dari penyadapan.
            </p>

            <div className="pt-2">
              <button
                id="btn-copy-fingerprint"
                onClick={handleCopyFingerprint}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 border border-slate-200 flex items-center gap-1.5 mx-auto shadow-xs transition-colors cursor-pointer"
              >
                {copiedFingerprint ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copiedFingerprint ? 'Sidik Jari Disalin' : 'Salin Sidik Jari'}</span>
              </button>
            </div>
          </div>

          {/* Protocol Specifications */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="font-bold text-slate-700 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              Spesifikasi Protokol:
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
              <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs">
                <span className="text-slate-400 block text-[10px] font-medium">Cipher:</span>
                <span className="font-mono text-slate-800 font-bold">AES-GCM 256-bit</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs">
                <span className="text-slate-400 block text-[10px] font-medium">Key Derivation:</span>
                <span className="font-mono text-slate-800 font-bold">PBKDF2 (100k iters)</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
              Zero-Knowledge: Server bertindak murni sebagai perantara transmisi ciphertext. Server tidak pernah menerima atau menyimpan kunci teks asli.
            </p>
          </div>

          {/* Passkey Editor / View */}
          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                Kunci Passkey Ruang Saat Ini:
              </label>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-indigo-600 font-semibold hover:underline cursor-pointer"
                >
                  Ubah Kunci
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveNewKey} className="space-y-2">
                <input
                  type="text"
                  required
                  value={editingKey}
                  onChange={(e) => setEditingKey(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 font-mono text-indigo-600 font-bold border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-indigo-500"
                  placeholder="Masukkan passkey baru..."
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingKey(passkey);
                      setIsEditing(false);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    Terapkan & Dekripsi Ulang
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between font-mono text-xs text-indigo-600 font-bold">
                <span className="truncate">{passkey}</span>
                {savedSuccess && (
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Berhasil diubah
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
