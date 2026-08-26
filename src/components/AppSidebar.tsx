import React from 'react';
import { User, SavedRoom } from '../types';
import { 
  Home, 
  MessageSquare, 
  PlusCircle, 
  ShieldCheck, 
  LogOut, 
  Clock, 
  X, 
  Trash2, 
  ArrowRight,
  Sparkles,
  Lock
} from 'lucide-react';
import logoImage from '../assets/logo.jpg';

interface AppSidebarProps {
  currentUser: User | null;
  activeNav: 'home' | 'chat' | 'create';
  onNavigate: (nav: 'home' | 'chat' | 'create') => void;
  currentRoomId: string | null;
  currentRoomName: string;
  savedRooms: SavedRoom[];
  onSelectSavedRoom: (room: SavedRoom) => void;
  onDeleteSavedRoom: (roomId: string) => void;
  onLogoutClick: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentUser,
  activeNav,
  onNavigate,
  currentRoomId,
  currentRoomName,
  savedRooms,
  onSelectSavedRoom,
  onDeleteSavedRoom,
  onLogoutClick,
  isMobileOpen = false,
  onMobileClose,
}) => {
  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden animate-in fade-in"
        />
      )}

      <aside
        id="app-sidebar"
        className={`
          fixed md:static inset-y-0 left-0 z-40 w-72 md:w-64 lg:w-72 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 transition-transform duration-200 ease-in-out
          ${isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Top Branding */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs shrink-0 flex items-center justify-center">
              <img
                src={logoImage}
                alt="Kintil Meong Logo"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-800 truncate flex items-center gap-1.5">
                Kintil Meong
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  E2EE
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 truncate">Pesan Rahasia Terenkripsi</p>
            </div>
          </div>

          {/* Close button on mobile */}
          {onMobileClose && (
            <button
              onClick={onMobileClose}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Menu */}
        <div className="p-3 space-y-1 border-b border-slate-100">
          {/* Beranda Button */}
          <button
            type="button"
            id="nav-btn-home"
            onClick={() => {
              onNavigate('home');
              if (onMobileClose) onMobileClose();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeNav === 'home'
                ? 'bg-indigo-50 text-indigo-700 shadow-2xs font-semibold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Home className={`w-4 h-4 ${activeNav === 'home' ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span className="flex-1 text-left">Beranda</span>
          </button>

          {/* Obrolan / Room Saat Ini */}
          <button
            type="button"
            id="nav-btn-chat"
            onClick={() => {
              onNavigate('chat');
              if (onMobileClose) onMobileClose();
            }}
            disabled={!currentRoomId}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeNav === 'chat'
                ? 'bg-indigo-600 text-white shadow-sm'
                : currentRoomId
                ? 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                : 'text-slate-300 cursor-not-allowed opacity-60'
            }`}
          >
            <div className="relative flex items-center">
              <MessageSquare className={`w-4 h-4 ${activeNav === 'chat' ? 'text-white' : 'text-slate-400'}`} />
              {currentRoomId && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white" />
              )}
            </div>
            <div className="flex-1 text-left truncate">
              <span className="block truncate">{currentRoomName || 'Obrolan Saat Ini'}</span>
              {currentRoomId && (
                <span className={`text-[10px] font-normal block truncate ${activeNav === 'chat' ? 'text-indigo-100' : 'text-slate-400'}`}>
                  ID: {currentRoomId}
                </span>
              )}
            </div>
          </button>

          {/* Buat Room Baru */}
          <button
            type="button"
            id="nav-btn-create"
            onClick={() => {
              onNavigate('create');
              if (onMobileClose) onMobileClose();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeNav === 'create'
                ? 'bg-indigo-50 text-indigo-700 shadow-2xs font-semibold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <PlusCircle className={`w-4 h-4 ${activeNav === 'create' ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span className="flex-1 text-left">Buat Room Baru</span>
          </button>
        </div>

        {/* Saved / Recent Rooms Section */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Riwayat Ruang
            </span>
            <span className="text-[10px] font-medium text-slate-400">
              {savedRooms.length}
            </span>
          </div>

          {savedRooms.length === 0 ? (
            <div className="px-3 py-4 text-center rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[11px] text-slate-400">Belum ada riwayat ruang tersimpan.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {savedRooms.map((room) => {
                const isCurrent = room.id === currentRoomId;
                return (
                  <div
                    key={room.id}
                    className={`group flex items-center justify-between p-2 rounded-xl transition-all ${
                      isCurrent
                        ? 'bg-indigo-50/80 border border-indigo-100'
                        : 'hover:bg-slate-50 border border-transparent hover:border-slate-100'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectSavedRoom(room);
                        if (onMobileClose) onMobileClose();
                      }}
                      className="flex-1 flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        isCurrent ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        #
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-700 truncate group-hover:text-indigo-600">
                          {room.name || room.id}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          <span>{room.id}</span>
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSavedRoom(room.id);
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Hapus dari Riwayat"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* User Profile & Logout Bottom Bar */}
        {currentUser ? (
          <div className="p-3 border-t border-slate-100 bg-slate-50/70">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <div
                    className="w-9 h-9 rounded-xl border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-xs"
                    style={{ backgroundColor: currentUser.color }}
                  >
                    {currentUser.avatar}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 truncate">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    Online
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                id="btn-sidebar-logout"
                onClick={onLogoutClick}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200/80 bg-white transition-all shadow-2xs cursor-pointer"
                title="Keluar / Ganti Ruang"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 border-t border-slate-100 bg-slate-50/70">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Masuk / Gabung</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
