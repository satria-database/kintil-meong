import React from 'react';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';

interface ChatSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClear: () => void;
  matchesCount: number;
  currentMatchIndex?: number;
  onNextMatch?: () => void;
  onPrevMatch?: () => void;
  onClose: () => void;
}

export const ChatSearchBar: React.FC<ChatSearchBarProps> = ({
  searchQuery,
  onSearchChange,
  onClear,
  matchesCount,
  currentMatchIndex = 0,
  onNextMatch,
  onPrevMatch,
  onClose,
}) => {
  return (
    <div
      id="chat-search-filter-bar"
      className="bg-slate-50 border-b border-indigo-100/80 px-4 py-2.5 flex items-center justify-between gap-3 shadow-xs animate-in slide-in-from-top duration-150 z-10"
    >
      <div className="flex-1 flex items-center gap-2 relative max-w-xl">
        <div className="relative flex-1 flex items-center">
          <Search className="w-4 h-4 text-indigo-500 absolute left-3 pointer-events-none" />
          <input
            id="chat-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari pesan dalam obrolan..."
            autoFocus
            className="w-full pl-9 pr-8 py-1.5 rounded-xl text-xs bg-white border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-slate-800 placeholder:text-slate-400 font-medium transition-all shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={onClear}
              className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              title="Hapus pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Match Count Badge */}
        {searchQuery.trim() && (
          <div className="flex items-center gap-1.5 shrink-0 select-none">
            <span
              id="chat-search-match-badge"
              className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${
                matchesCount > 0
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
            >
              {matchesCount > 0 ? `${matchesCount} pesan ditemukan` : 'Tidak ditemukan'}
            </span>

            {matchesCount > 0 && onPrevMatch && onNextMatch && (
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={onPrevMatch}
                  title="Pesan sebelumnya"
                  className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onNextMatch}
                  title="Pesan berikutnya"
                  className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Close Search Mode */}
      <button
        id="btn-close-chat-search"
        onClick={onClose}
        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 rounded-xl transition-colors text-xs flex items-center gap-1 font-medium cursor-pointer shrink-0"
        title="Tutup pencarian (Esc)"
      >
        <X className="w-4 h-4" />
        <span className="hidden sm:inline">Tutup</span>
      </button>
    </div>
  );
};
