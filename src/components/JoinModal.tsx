import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { generateRandomPasskey } from '../lib/crypto';
import { Lock, ShieldCheck, User as UserIcon, PlusCircle, LogIn, Sparkles, RefreshCw, KeyRound } from 'lucide-react';
import logoImage from '../assets/logo.jpg';

interface JoinModalProps {
  onJoin: (user: User, roomId: string, roomName: string, passkey: string) => void;
  initialRoomId?: string;
  initialPasskey?: string;
}

const AVATAR_OPTIONS = [
  '🦊', '🐼', '🦁', '🐯', '🚀', '💎', '🌸', '⚡',
  '🦉', '🦄', '🐱', '🐶', '🔮', '🍀', '🌟', '🎯'
];

const COLOR_OPTIONS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#ef4444', // red
  '#14b8a6', // teal
];

export const JoinModal: React.FC<JoinModalProps> = ({
  onJoin,
  initialRoomId = '',
  initialPasskey = '',
}) => {
  const isInvited = Boolean(initialRoomId);
  const [activeTab, setActiveTab] = useState<'create' | 'join'>(isInvited ? 'join' : 'create');
  
  const [userName, setUserName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🦊');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  
  // Room states
  const [roomName, setRoomName] = useState('');
  const [roomId, setRoomId] = useState(initialRoomId || '');
  const [passkey, setPasskey] = useState(initialPasskey || '');
  const [error, setError] = useState('');

  // Auto-generate room ID and passkey for create tab
  useEffect(() => {
    if (!isInvited) {
      const randomRoomId = 'room-' + Math.random().toString(36).substring(2, 8);
      const generatedPasskey = generateRandomPasskey();
      setRoomId(randomRoomId);
      setPasskey(generatedPasskey);
    }
  }, [isInvited]);

  const handleRegenerateKey = () => {
    setPasskey(generateRandomPasskey());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanName = userName.trim();
    if (!cleanName) {
      setError('Harap masukkan nama Anda');
      return;
    }

    const cleanRoomId = roomId.trim();
    if (!cleanRoomId) {
      setError('Harap masukkan atau buat ID Ruang');
      return;
    }

    const cleanPasskey = passkey.trim();
    if (!cleanPasskey) {
      setError('Kunci enkripsi / Passkey rahasia diperlukan untuk keamanan');
      return;
    }

    const user: User = {
      id: 'usr-' + Math.random().toString(36).substring(2, 9),
      name: cleanName,
      avatar: selectedAvatar,
      color: selectedColor,
      joinedAt: Date.now(),
    };

    const finalRoomName = roomName.trim() || `Ruang #${cleanRoomId.slice(0, 6)}`;
    onJoin(user, cleanRoomId, finalRoomName, cleanPasskey);
  };

  return (
    <div id="join-modal-container" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div id="join-modal-card" className="w-full max-w-lg bg-white border border-slate-200 text-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Branding */}
        <div id="join-modal-header" className="p-6 pb-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs shrink-0 flex items-center justify-center">
              <img
                src={logoImage}
                alt="Kintil Meong Logo"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                Kintil Meong <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">E2EE Aman</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Chat room real-time terenkripsi ujung-ke-ujung (AES-256 GCM)
              </p>
            </div>
          </div>

          {/* Invitation Banner if invited */}
          {isInvited && (
            <div id="invite-detected-banner" className="mt-4 p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-800 text-xs flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                Anda diundang ke ruang <strong className="text-indigo-900 font-semibold">{initialRoomId}</strong> dengan kunci enkripsi terpasang.
              </span>
            </div>
          )}

          {/* Tab Selector */}
          {!isInvited && (
            <div id="join-tab-selector" className="grid grid-cols-2 gap-1.5 mt-5 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                id="tab-create-room-btn"
                type="button"
                onClick={() => setActiveTab('create')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'create'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Buat Ruang Baru
              </button>
              <button
                id="tab-join-room-btn"
                type="button"
                onClick={() => setActiveTab('join')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'join'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                Gabung Ruang
              </button>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div id="join-error-alert" className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
              {error}
            </div>
          )}

          {/* Profile Section */}
          <div className="space-y-3">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Profil Anda
            </label>
            
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl border-2 border-white shadow-md shrink-0 text-white"
                style={{ backgroundColor: selectedColor }}
              >
                {selectedAvatar}
              </div>
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    id="input-user-name"
                    type="text"
                    required
                    maxLength={30}
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Masukkan nama Anda (misal: Rian, Sarah)"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Avatar & Color Pickers */}
            <div className="space-y-2 pt-1">
              <div className="text-[11px] font-semibold text-slate-500">Pilih Avatar:</div>
              <div className="flex flex-wrap gap-1.5">
                {AVATAR_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSelectedAvatar(emoji)}
                    className={`w-8 h-8 text-base rounded-lg flex items-center justify-center transition-transform cursor-pointer ${
                      selectedAvatar === emoji
                        ? 'bg-indigo-50 border-2 border-indigo-600 scale-110 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <div className="text-[11px] font-semibold text-slate-500">Pilih Warna Aksen:</div>
              <div className="flex items-center gap-2">
                {COLOR_OPTIONS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setSelectedColor(col)}
                    className={`w-6 h-6 rounded-full border transition-all cursor-pointer ${
                      selectedColor === col ? 'scale-125 border-white ring-2 ring-indigo-500 shadow-sm' : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-4">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {activeTab === 'create' ? 'Pengaturan Ruang Obrolan' : 'Informasi Ruang & Kunci'}
            </label>

            {/* Room Name (if create mode) */}
            {activeTab === 'create' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nama Ruang (Opsional):</label>
                <input
                  id="input-room-name"
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Contoh: Kintil Meong atau Tim Rahasia"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Room ID */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                ID Ruang {activeTab === 'create' ? '(Otomatis dibuat)' : '(Dari pengundang)'}:
              </label>
              <input
                id="input-room-id"
                type="text"
                required
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="misal: room-7x9q2p"
                className="w-full px-3 py-2 bg-slate-50 font-mono border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500"
              />
            </div>

            {/* Secret Passkey (E2EE Key) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                  Kunci Enkripsi Rahasia (Passkey):
                </label>
                {activeTab === 'create' && (
                  <button
                    type="button"
                    onClick={handleRegenerateKey}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Acak Baru
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  id="input-passkey"
                  type="text"
                  required
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  placeholder="Kunci rahasia untuk mendekripsi pesan"
                  className="w-full px-3 py-2 bg-slate-50 font-mono text-indigo-600 font-semibold border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                Pesan hanya dapat dibaca oleh orang yang memiliki kunci yang sama.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="btn-join-room-submit"
            type="submit"
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-semibold rounded-xl text-sm shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            {activeTab === 'create' ? 'Mulai Ruang Obrolan Aman' : 'Masuk ke Ruang Obrolan'}
          </button>
        </form>
      </div>
    </div>
  );
};
