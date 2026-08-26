import React, { useEffect, useState } from 'react';
import { User, SavedRoom } from '../types';
import { generateRandomPasskey } from '../lib/crypto';
import { 
  ShieldCheck, 
  PlusCircle, 
  LogIn, 
  Sparkles, 
  Lock, 
  KeyRound, 
  MessageSquare, 
  Clock, 
  ArrowRight, 
  Trash2, 
  RefreshCw,
  Zap,
  Users,
  Copy,
  Check
} from 'lucide-react';
import logoImage from '../assets/logo.jpg';

interface HomeViewProps {
  currentUser: User | null;
  currentRoomId: string | null;
  currentRoomName: string;
  savedRooms: SavedRoom[];
  initialRoomId?: string;
  initialPasskey?: string;
  onJoinRoom: (user: User, roomId: string, roomName: string, passkey: string) => void;
  onSelectSavedRoom: (room: SavedRoom) => void;
  onDeleteSavedRoom: (roomId: string) => void;
  onGoToChat: () => void;
  defaultTab?: 'create' | 'join';
}

const AVATAR_OPTIONS = [
  '🦊', '🐼', '🦁', '🐯', '🚀', '💎', '🌸', '⚡',
  '🦉', '🦄', '🐱', '🐶', '🔮', '🍀', '🌟', '🎯'
];

const COLOR_OPTIONS = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b',
  '#ec4899', '#06b6d4', '#ef4444', '#14b8a6',
];

export const HomeView: React.FC<HomeViewProps> = ({
  currentUser,
  currentRoomId,
  currentRoomName,
  savedRooms,
  initialRoomId = '',
  initialPasskey = '',
  onJoinRoom,
  onSelectSavedRoom,
  onDeleteSavedRoom,
  onGoToChat,
  defaultTab = 'create',
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>(
    initialRoomId ? 'join' : defaultTab
  );

  const [userName, setUserName] = useState(currentUser?.name || '');
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser?.avatar || '🦊');
  const [selectedColor, setSelectedColor] = useState(currentUser?.color || COLOR_OPTIONS[0]);

  const [createRoomName, setCreateRoomName] = useState('');
  const [createRoomId, setCreateRoomId] = useState(() => 'room-' + Math.random().toString(36).substring(2, 8));
  const [createPasskey, setCreatePasskey] = useState(() => generateRandomPasskey());

  const [joinRoomId, setJoinRoomId] = useState(initialRoomId || '');
  const [joinPasskey, setJoinPasskey] = useState(initialPasskey || '');
  const [error, setError] = useState('');

  // URL invite data arrives after the first render, so keep the join form in sync.
  useEffect(() => {
    if (initialRoomId) setJoinRoomId(initialRoomId);
    if (initialPasskey) setJoinPasskey(initialPasskey);
  }, [initialRoomId, initialPasskey]);

  const handleRegenerateCreate = () => {
    setCreateRoomId('room-' + Math.random().toString(36).substring(2, 8));
    setCreatePasskey(generateRandomPasskey());
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanName = userName.trim();
    if (!cleanName) {
      setError('Harap masukkan nama tampilan Anda');
      return;
    }

    const cleanRoomId = createRoomId.trim();
    const cleanPasskey = createPasskey.trim();
    if (!cleanRoomId || !cleanPasskey) {
      setError('ID Ruang dan Passkey rahasia wajib diisi');
      return;
    }

    const user: User = currentUser || {
      id: 'usr-' + Math.random().toString(36).substring(2, 9),
      name: cleanName,
      avatar: selectedAvatar,
      color: selectedColor,
      joinedAt: Date.now(),
    };

    const finalName = createRoomName.trim() || `Ruang #${cleanRoomId.slice(0, 6)}`;
    onJoinRoom(user, cleanRoomId, finalName, cleanPasskey);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanName = userName.trim();
    if (!cleanName) {
      setError('Harap masukkan nama tampilan Anda');
      return;
    }

    let rawRoomId = joinRoomId.trim();
    let rawPasskey = joinPasskey.trim();

    // Check if user pasted a full URL
    if (rawRoomId.includes('http://') || rawRoomId.includes('https://') || rawRoomId.includes('#room=')) {
      try {
        const hashIdx = rawRoomId.indexOf('#');
        if (hashIdx !== -1) {
          const hashParams = new URLSearchParams(rawRoomId.substring(hashIdx + 1));
          if (hashParams.get('room')) rawRoomId = hashParams.get('room')!;
          if (hashParams.get('key')) rawPasskey = hashParams.get('key')!;
        } else {
          const urlObj = new URL(rawRoomId);
          if (urlObj.searchParams.get('room')) rawRoomId = urlObj.searchParams.get('room')!;
          if (urlObj.searchParams.get('key')) rawPasskey = urlObj.searchParams.get('key')!;
        }
      } catch {}
    }

    if (!rawRoomId) {
      setError('Harap masukkan ID Ruang atau tautan undangan');
      return;
    }

    if (!rawPasskey) {
      setError('Harap masukkan Passkey rahasia untuk mendekripsi obrolan');
      return;
    }

    const user: User = currentUser || {
      id: 'usr-' + Math.random().toString(36).substring(2, 9),
      name: cleanName,
      avatar: selectedAvatar,
      color: selectedColor,
      joinedAt: Date.now(),
    };

    onJoinRoom(user, rawRoomId, `Ruang #${rawRoomId.slice(0, 6)}`, rawPasskey);
  };

  return (
    <div id="home-view-container" className="flex-1 h-full overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Top Hero Banner */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-1 flex items-center justify-center shrink-0 shadow-lg">
                <img
                  src={logoImage}
                  alt="Kintil Meong Logo"
                  className="w-full h-full object-cover rounded-xl"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-semibold mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Ujung-ke-Ujung (AES-256 GCM)
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Kintil Meong
                </h1>
                <p className="text-xs sm:text-sm text-indigo-200 mt-1 max-w-md">
                  Ruang obrolan pribadi instan tanpa penyimpanan log pesan di server. Aman, cepat, dan terenkripsi.
                </p>
              </div>
            </div>

            {/* If user has an active room, show Quick Jump */}
            {currentRoomId && (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shrink-0 w-full sm:w-auto">
                <div className="text-[11px] text-indigo-200 uppercase tracking-wider font-semibold mb-1">
                  Ruang Aktif
                </div>
                <div className="text-sm font-bold text-white truncate max-w-[200px]">
                  {currentRoomName}
                </div>
                <button
                  type="button"
                  onClick={onGoToChat}
                  className="mt-2.5 w-full py-2 px-3 bg-white text-indigo-900 hover:bg-indigo-50 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Buka Obrolan
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Invited banner notification */}
        {initialRoomId && (
          <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold">Undangan Ruang Terdeteksi</div>
                <div className="text-[11px] text-indigo-700">
                  ID: <strong className="font-mono">{initialRoomId}</strong> {initialPasskey && '• Kunci enkripsi otomatis terpasang'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('join')}
              className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shrink-0 cursor-pointer shadow-xs"
            >
              Gabung Sekarang
            </button>
          </div>
        )}

        {/* Main Grid: Create/Join Cards & Saved Rooms */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left/Main Column: Form */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
            
            {/* Tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                type="button"
                id="home-tab-create"
                onClick={() => setActiveTab('create')}
                className={`py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'create'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                Buat Ruang Baru
              </button>
              <button
                type="button"
                id="home-tab-join"
                onClick={() => setActiveTab('join')}
                className={`py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'join'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LogIn className="w-4 h-4" />
                Gabung Ruang
              </button>
            </div>

            {error && (
              <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
                {error}
              </div>
            )}

            {/* Profile Inputs */}
            <div className="space-y-3">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Profil Tampilan Anda
              </label>

              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border-2 border-white shadow-md shrink-0 text-white"
                  style={{ backgroundColor: selectedColor }}
                >
                  {selectedAvatar}
                </div>
                <input
                  type="text"
                  required
                  maxLength={30}
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Masukkan nama Anda (misal: Satria, Budi)"
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Avatar Selector */}
              <div className="pt-1">
                <div className="text-[11px] font-semibold text-slate-500 mb-1.5">Avatar:</div>
                <div className="flex flex-wrap gap-1.5">
                  {AVATAR_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedAvatar(emoji)}
                      className={`w-8 h-8 text-base rounded-xl flex items-center justify-center transition-transform cursor-pointer ${
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

              {/* Color Selector */}
              <div className="pt-1">
                <div className="text-[11px] font-semibold text-slate-500 mb-1.5">Warna Aksen:</div>
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

            {/* Create Room Form */}
            {activeTab === 'create' ? (
              <form onSubmit={handleCreateSubmit} className="space-y-4 pt-3 border-t border-slate-100">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Pengaturan Ruang Baru
                </label>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Nama Ruang (Opsional):
                  </label>
                  <input
                    type="text"
                    value={createRoomName}
                    onChange={(e) => setCreateRoomName(e.target.value)}
                    placeholder="Contoh: Kintil Meong atau Tim Rahasia"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-600">ID Ruang:</label>
                    <button
                      type="button"
                      onClick={handleRegenerateCreate}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" /> Acak Baru
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={createRoomId}
                    onChange={(e) => setCreateRoomId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 font-mono text-sm font-bold border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5 mb-1">
                    <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                    Kunci Enkripsi (Passkey Otomatis):
                  </label>
                  <input
                    type="text"
                    required
                    value={createPasskey}
                    onChange={(e) => setCreatePasskey(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 font-mono text-sm text-indigo-600 font-bold border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold rounded-2xl text-sm shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
                >
                  <PlusCircle className="w-4 h-4" />
                  Mulai & Masuk Ruang Obrolan
                </button>
              </form>
            ) : (
              /* Join Room Form */
              <form onSubmit={handleJoinSubmit} className="space-y-4 pt-3 border-t border-slate-100">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Masukkan ID Ruang / Link & Passkey
                </label>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    ID Ruang atau Tempel Link Undangan:
                  </label>
                  <input
                    type="text"
                    required
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value)}
                    placeholder="misal: room-yr4or7 atau tempel link lengkap"
                    className="w-full px-3.5 py-2.5 bg-slate-50 font-mono text-sm border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5 mb-1">
                    <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                    Kunci Enkripsi (Passkey):
                  </label>
                  <input
                    type="text"
                    required
                    value={joinPasskey}
                    onChange={(e) => setJoinPasskey(e.target.value)}
                    placeholder="Masukkan passkey rahasia untuk membuka pesan"
                    className="w-full px-3.5 py-2.5 bg-slate-50 font-mono text-sm text-indigo-600 font-bold border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold rounded-2xl text-sm shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
                >
                  <LogIn className="w-4 h-4" />
                  Masuk ke Ruang Obrolan
                </button>
              </form>
            )}
          </div>

          {/* Right Column: Saved Rooms & Security Tips */}
          <div className="lg:col-span-5 space-y-6">
            {/* Saved Rooms List Card */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  Riwayat Ruang Tersimpan
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                  {savedRooms.length}
                </span>
              </div>

              {savedRooms.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Belum ada riwayat ruang tersimpan. Ruang yang Anda buat atau masuki akan otomatis tersimpan di sini.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {savedRooms.map((room) => {
                    const isCurrent = room.id === currentRoomId;
                    return (
                      <div
                        key={room.id}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isCurrent
                            ? 'bg-indigo-50/80 border-indigo-200'
                            : 'bg-slate-50 hover:bg-slate-100/80 border-slate-100'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-800 truncate">
                            {room.name || room.id}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate flex items-center gap-1 mt-0.5">
                            <Lock className="w-2.5 h-2.5 text-slate-400" />
                            ID: {room.id}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => onSelectSavedRoom(room)}
                            className="py-1 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            title="Gabung ke Ruang Ini"
                          >
                            <span>Masuk</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteSavedRoom(room.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                            title="Hapus dari Riwayat"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Zero-Knowledge & Security Highlights */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl p-5 text-white space-y-3 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-wider">
                <Zap className="w-4 h-4 text-amber-400" />
                Fitur Keamanan Utama
              </div>
              <ul className="text-xs space-y-2 text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Enkripsi <strong>AES-256-GCM</strong> langsung di peramban browser Anda.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Kunci rahasia (Passkey) tidak pernah dikirim atau disimpan di server.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Mendukung pengiriman rekaman suara (audio), stiker meong, berkas bersama, dan reaksi emoji.</span>
                </li>
              </ul>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
