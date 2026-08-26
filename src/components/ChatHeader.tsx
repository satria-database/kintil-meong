import React, { useState } from 'react';
import { ShieldCheck, Users, UserPlus, KeyRound, LogOut, Copy, Check, Lock, Shield, Search, Menu, PanelRight, Eye, EyeOff, Volume2, VolumeX, Timer, ShieldAlert } from 'lucide-react';
import { User, RoomParticipant } from '../types';
import logoImage from '../assets/logo.jpg';

interface ChatHeaderProps {
  roomName: string;
  roomId: string;
  currentUser: User;
  participants: RoomParticipant[];
  isConnected: boolean;
  isReconnecting: boolean;
  keyFingerprint: { hexCode: string; emojiCode: string } | null;
  isSearchOpen: boolean;
  disappearingTimer?: number | null;
  onOpenDisappearingModal?: () => void;
  isWatermarkActive?: boolean;
  onToggleWatermark?: () => void;
  onToggleSearch: () => void;
  onOpenInvite: () => void;
  onOpenSecurity: () => void;
  onOpenParticipants: () => void;
  onLeaveRoom: () => void;
  onToggleMobileSidebar?: () => void;
  onToggleRightSidebar?: () => void;
  isRightSidebarOpen?: boolean;
  isPrivacyBlur?: boolean;
  onTogglePrivacyBlur?: () => void;
  isSoundMuted?: boolean;
  onToggleSound?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  roomName,
  roomId,
  currentUser,
  participants,
  isConnected,
  isReconnecting,
  keyFingerprint,
  isSearchOpen,
  disappearingTimer = null,
  onOpenDisappearingModal,
  isWatermarkActive = false,
  onToggleWatermark,
  onToggleSearch,
  onOpenInvite,
  onOpenSecurity,
  onOpenParticipants,
  onLeaveRoom,
  onToggleMobileSidebar,
  onToggleRightSidebar,
  isRightSidebarOpen = true,
  isPrivacyBlur = false,
  onTogglePrivacyBlur,
  isSoundMuted = false,
  onToggleSound,
}) => {
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <header id="chat-header-bar" className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-5 shrink-0 shadow-2xs z-20 select-none">
      
      {/* Left: Mobile Menu Trigger + Room Icon & Name & E2EE status */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Menu */}
        {onToggleMobileSidebar && (
          <button
            type="button"
            id="btn-mobile-sidebar-toggle"
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Buka Menu Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div 
          id="chat-header-logo-container"
          className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden shadow-xs shrink-0 flex items-center justify-center relative group"
          title={`Ruang Obrolan: ${roomName}`}
        >
          <img
            src={logoImage}
            alt="Kintil Meong Logo"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="min-w-0">
          <h1 className="font-bold text-slate-800 text-sm sm:text-base leading-tight truncate max-w-[140px] xs:max-w-[180px] sm:max-w-[240px] md:max-w-[320px]">
            {roomName || `Ruang #${roomId}`}
          </h1>
          
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : isReconnecting ? 'bg-amber-500 animate-ping' : 'bg-rose-500'}`}></span>
              <span className="text-[11px] font-medium text-slate-500">
                {isConnected ? 'E2EE Terenkripsi' : isReconnecting ? 'Menghubungkan...' : 'Terputus'}
              </span>
            </div>

            {disappearingTimer && disappearingTimer > 0 && (
              <button
                onClick={onOpenDisappearingModal}
                className="hidden sm:inline-flex items-center gap-1 font-mono text-[10px] text-amber-700 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200 transition-colors cursor-pointer"
                title="Pesan Menghilang Aktif"
              >
                <Timer className="w-2.5 h-2.5 text-amber-600" />
                <span>
                  {disappearingTimer < 60
                    ? `${disappearingTimer}s`
                    : disappearingTimer < 3600
                    ? `${Math.floor(disappearingTimer / 60)}m`
                    : `${Math.floor(disappearingTimer / 3600)}j`}
                </span>
              </button>
            )}

            {keyFingerprint && (
              <button
                onClick={onOpenSecurity}
                className="hidden lg:inline-flex items-center gap-1 font-mono text-[10px] text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-100 transition-colors cursor-pointer"
                title="Lihat sidik jari kriptografis"
              >
                <Lock className="w-2.5 h-2.5" />
                <span>{keyFingerprint.emojiCode}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right: Invite Pill, Search, Key, User badge & Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        
        {/* Room ID Snippet Pill (Tablet/Desktop) */}
        <div className="hidden md:flex items-center bg-slate-100 rounded-xl px-2.5 py-1.5 border border-slate-200">
          <span className="text-[10px] text-slate-500 mr-2 uppercase tracking-wider font-bold">ID</span>
          <code className="text-xs text-indigo-600 font-mono font-semibold">{roomId}</code>
          <button
            id="btn-copy-room-id"
            onClick={handleCopyRoomId}
            title="Salin ID Ruang"
            className="ml-2 p-1 hover:bg-slate-200 text-slate-500 rounded transition-colors cursor-pointer"
          >
            {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Disappearing Timer Button */}
        {onOpenDisappearingModal && (
          <button
            type="button"
            id="btn-disappearing-timer"
            onClick={onOpenDisappearingModal}
            className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              disappearingTimer
                ? 'bg-amber-50 text-amber-700 border-amber-300 ring-1 ring-amber-200'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
            }`}
            title="Pengaturan Pesan Menghilang Otomatis (Self-Destruct)"
          >
            <Timer className="w-4 h-4 text-amber-600" />
            <span className="hidden xl:inline text-[11px] font-semibold">
              {disappearingTimer ? 'Timer Aktif' : 'Timer'}
            </span>
          </button>
        )}

        {/* Anti-Screenshot Watermark Button */}
        {onToggleWatermark && (
          <button
            type="button"
            id="btn-toggle-watermark"
            onClick={onToggleWatermark}
            className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              isWatermarkActive
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
            }`}
            title={isWatermarkActive ? 'Matikan Tanda Air Anti-Screenshot' : 'Aktifkan Tanda Air Anti-Screenshot'}
          >
            <Shield className="w-4 h-4" />
            <span className="hidden xl:inline text-[11px] font-semibold">
              {isWatermarkActive ? 'Watermark ON' : 'Watermark'}
            </span>
          </button>
        )}

        {/* Privacy / Blur Chat & Members Button */}
        {onTogglePrivacyBlur && (
          <button
            type="button"
            id="btn-toggle-privacy-blur"
            onClick={onTogglePrivacyBlur}
            className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              isPrivacyBlur
                ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            title={isPrivacyBlur ? 'Matikan Mode Blur (Tampilkan Chat & Anggota)' : 'Aktifkan Mode Blur (Sembunyikan / Blur Chat & Anggota demi Privasi)'}
          >
            {isPrivacyBlur ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-slate-600" />}
            <span className="hidden sm:inline font-semibold text-[11px]">
              {isPrivacyBlur ? 'Blur Aktif' : 'Blur'}
            </span>
          </button>
        )}

        {/* Audio Sound Notification Toggle */}
        {onToggleSound && (
          <button
            type="button"
            id="btn-toggle-sound"
            onClick={onToggleSound}
            className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
              isSoundMuted
                ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            title={isSoundMuted ? 'Bunyi Notifikasi: Dibisukan (Klik untuk Mengaktifkan)' : 'Bunyi Notifikasi: Aktif (Klik untuk Membisukan)'}
          >
            {isSoundMuted ? (
              <VolumeX className="w-4 h-4 text-rose-500" />
            ) : (
              <Volume2 className="w-4 h-4 text-slate-600" />
            )}
          </button>
        )}

        {/* Search in Chat Button */}
        <button
          id="btn-header-search"
          onClick={onToggleSearch}
          className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
            isSearchOpen
              ? 'bg-indigo-50 border-indigo-200 text-indigo-600 ring-2 ring-indigo-100'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
          }`}
          title="Cari Pesan dalam Obrolan (Ctrl+F)"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Invite Link Button */}
        <button
          id="btn-header-invite"
          onClick={onOpenInvite}
          className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          title="Undang Teman Melalui Link & QR"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Undang</span>
        </button>

        {/* Security & Key Verification */}
        <button
          id="btn-header-key"
          onClick={onOpenSecurity}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs transition-colors cursor-pointer"
          title="Verifikasi Kunci & Sidik Jari Kriptografi"
        >
          <KeyRound className="w-4 h-4 text-slate-600" />
        </button>

        {/* Participants Pill (Mobile) */}
        <button
          id="btn-header-participants"
          onClick={onOpenParticipants}
          className="lg:hidden px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Daftar Pengguna Online"
        >
          <Users className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-bold text-slate-800">{participants.length}</span>
        </button>

        {/* Toggle Right Details Sidebar (Desktop) */}
        {onToggleRightSidebar && (
          <button
            type="button"
            id="btn-toggle-right-sidebar"
            onClick={onToggleRightSidebar}
            className={`hidden lg:flex p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
              isRightSidebarOpen
                ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
            }`}
            title={isRightSidebarOpen ? 'Sembunyikan Panel Informasi' : 'Tampilkan Panel Informasi'}
          >
            <PanelRight className="w-4 h-4" />
          </button>
        )}

        <div className="h-6 w-px bg-slate-200 mx-0.5 sm:mx-1 hidden sm:block"></div>

        {/* User Profile Badge */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="hidden xl:inline text-xs font-semibold text-slate-700 truncate max-w-[100px]">
            {currentUser.name}
          </span>
          <div
            className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-xs shrink-0"
            style={{ backgroundColor: currentUser.color }}
            title={`Profil Anda: ${currentUser.name}`}
          >
            {currentUser.avatar}
          </div>
        </div>

        {/* Leave Room Button */}
        <button
          id="btn-header-leave"
          onClick={onLeaveRoom}
          className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 text-xs transition-colors cursor-pointer"
          title="Keluar dari Ruang"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};



