import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, ReplyPreview, AttachedFile, DecryptedMessage, SavedRoom } from './types';
import { useChatRoom } from './hooks/useChatRoom';
import { AppSidebar } from './components/AppSidebar';
import { HomeView } from './components/HomeView';
import { JoinModal } from './components/JoinModal';
import { ChatHeader } from './components/ChatHeader';
import { ChatSearchBar } from './components/ChatSearchBar';
import { MessageList } from './components/MessageList';
import { ChatInput } from './components/ChatInput';
import { InviteModal } from './components/InviteModal';
import { SecurityModal } from './components/SecurityModal';
import { ParticipantsModal } from './components/ParticipantsModal';
import { InspectCryptoModal } from './components/InspectCryptoModal';
import { ImageLightboxModal } from './components/ImageLightboxModal';
import { LogoutConfirmModal } from './components/LogoutConfirmModal';
import { Bell, Sparkles, X, Users, Image as ImageIcon, FileText, Music, Lock, ShieldCheck } from 'lucide-react';
import { readFileAsDataURL } from './lib/crypto';
import { soundManager } from './lib/sound';

export default function App() {
  // Navigation view: 'chat' | 'home' | 'create'
  const [activeNav, setActiveNav] = useState<'chat' | 'home' | 'create'>('chat');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  // Extract initial room & key from URL hash or query params
  const [initialRoomId, setInitialRoomId] = useState('');
  const [initialPasskey, setInitialPasskey] = useState('');

  // Active Session State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = sessionStorage.getItem('ruangobrol_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [roomId, setRoomId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('ruangobrol_room') || null;
    } catch {
      return null;
    }
  });

  const [roomName, setRoomName] = useState<string>(() => {
    try {
      return sessionStorage.getItem('ruangobrol_room_name') || '';
    } catch {
      return '';
    }
  });

  const [passkey, setPasskey] = useState<string>(() => {
    try {
      return sessionStorage.getItem('ruangobrol_passkey') || '';
    } catch {
      return '';
    }
  });

  // Saved / Recent Rooms from LocalStorage
  const [savedRooms, setSavedRooms] = useState<SavedRoom[]>(() => {
    try {
      const raw = localStorage.getItem('ruangobrol_saved_rooms');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Modals & Interaction States
  const [replyTo, setReplyTo] = useState<ReplyPreview | null>(null);
  const [mentionToPrefill, setMentionToPrefill] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<AttachedFile | null>(null);
  const [inspectMessage, setInspectMessage] = useState<DecryptedMessage | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Privacy Blur Mode (Blurs chat messages & member names)
  const [isPrivacyBlur, setIsPrivacyBlur] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ruangobrol_privacy_blur') === 'true';
    } catch {
      return false;
    }
  });

  const handleTogglePrivacyBlur = () => {
    setIsPrivacyBlur((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ruangobrol_privacy_blur', String(next));
      } catch {}
      return next;
    });
  };

  // Sound Mute / Unmute State
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(() => soundManager.getMuted());

  const handleToggleSound = () => {
    const next = soundManager.toggleMuted();
    setIsSoundMuted(next);
  };

  // In-Chat Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);

  // Mention Banner Toast
  const [mentionBanner, setMentionBanner] = useState<{ senderName: string; text: string } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Parse URL hash or search params on load
  useEffect(() => {
    const parseUrl = () => {
      let rId = '';
      let key = '';

      // Check Hash first (preferred for zero-knowledge key passing)
      if (window.location.hash) {
        const hashStr = window.location.hash.substring(1);
        const params = new URLSearchParams(hashStr);
        rId = params.get('room') || '';
        key = params.get('key') || '';
      }

      // Fallback to query params
      if (!rId) {
        const urlParams = new URLSearchParams(window.location.search);
        rId = urlParams.get('room') || '';
        key = urlParams.get('key') || '';
      }

      if (rId) setInitialRoomId(rId);
      if (key) setInitialPasskey(key);
    };

    parseUrl();
    window.addEventListener('hashchange', parseUrl);
    return () => window.removeEventListener('hashchange', parseUrl);
  }, []);

  const handleMentionNotification = useCallback((senderName: string, text: string) => {
    setMentionBanner({ senderName, text });
    setTimeout(() => {
      setMentionBanner(null);
    }, 5000);
  }, []);

  // Hook for real-time WebSocket E2EE Chat
  const {
    isConnected,
    isReconnecting,
    participants,
    messages,
    typingUsers,
    keyFingerprint,
    currentRoomName,
    sendMessage,
    sendTyping,
    sendReaction,
  } = useChatRoom({
    user: currentUser,
    roomId,
    roomName,
    passkey,
    onMentioned: handleMentionNotification,
  });

  // Filter messages based on search query
  const filteredMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return messages;

    return messages.filter((msg) => {
      if (msg.senderName.toLowerCase().includes(q)) return true;
      if (msg.decryptedPayload?.text && msg.decryptedPayload.text.toLowerCase().includes(q)) return true;
      if (msg.decryptedPayload?.file?.name && msg.decryptedPayload.file.name.toLowerCase().includes(q)) return true;
      if (msg.decryptedPayload?.replyTo?.textSnippet && msg.decryptedPayload.replyTo.textSnippet.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [messages, searchQuery]);

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        if (currentUser && roomId) {
          e.preventDefault();
          setIsSearchOpen((prev) => !prev);
        }
      } else if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
        setSearchQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentUser, roomId, isSearchOpen]);

  const handleNextMatch = () => {
    if (filteredMessages.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % filteredMessages.length;
    setCurrentMatchIndex(nextIdx);
    const targetMsg = filteredMessages[nextIdx];
    if (targetMsg) {
      const el = document.getElementById(`msg-item-${targetMsg.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-indigo-500', 'bg-indigo-50/80');
        setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-500', 'bg-indigo-50/80'), 1500);
      }
    }
  };

  const handlePrevMatch = () => {
    if (filteredMessages.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + filteredMessages.length) % filteredMessages.length;
    setCurrentMatchIndex(prevIdx);
    const targetMsg = filteredMessages[prevIdx];
    if (targetMsg) {
      const el = document.getElementById(`msg-item-${targetMsg.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-indigo-500', 'bg-indigo-50/80');
        setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-500', 'bg-indigo-50/80'), 1500);
      }
    }
  };

  // Join or Switch Room
  const handleJoin = (user: User, newRoomId: string, newRoomName: string, newPasskey: string) => {
    setCurrentUser(user);
    setRoomId(newRoomId);
    setRoomName(newRoomName);
    setPasskey(newPasskey);
    setActiveNav('chat');

    try {
      sessionStorage.setItem('ruangobrol_user', JSON.stringify(user));
      sessionStorage.setItem('ruangobrol_room', newRoomId);
      sessionStorage.setItem('ruangobrol_room_name', newRoomName);
      sessionStorage.setItem('ruangobrol_passkey', newPasskey);
    } catch {}

    // Save to savedRooms history
    setSavedRooms((prev) => {
      const filtered = prev.filter((r) => r.id !== newRoomId);
      const newEntry: SavedRoom = {
        id: newRoomId,
        name: newRoomName || `Ruang #${newRoomId}`,
        passkey: newPasskey,
        lastVisited: Date.now(),
      };
      const nextList = [newEntry, ...filtered].slice(0, 20);
      try {
        localStorage.setItem('ruangobrol_saved_rooms', JSON.stringify(nextList));
      } catch {}
      return nextList;
    });

    // Update URL hash smoothly
    window.location.hash = `room=${encodeURIComponent(newRoomId)}&key=${encodeURIComponent(newPasskey)}`;
  };

  // Select a room from history
  const handleSelectSavedRoom = (room: SavedRoom) => {
    if (currentUser) {
      handleJoin(currentUser, room.id, room.name, room.passkey);
    } else {
      setInitialRoomId(room.id);
      setInitialPasskey(room.passkey);
      setActiveNav('home');
    }
  };

  // Delete saved room
  const handleDeleteSavedRoom = (targetRoomId: string) => {
    setSavedRooms((prev) => {
      const updated = prev.filter((r) => r.id !== targetRoomId);
      try {
        localStorage.setItem('ruangobrol_saved_rooms', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Trigger Logout Modal
  const handleLeaveRoom = () => {
    setShowLogoutModal(true);
  };

  // Confirm Logout Action
  const handleConfirmLogout = () => {
    setShowLogoutModal(false);

    // Keep current room & key in initial parameters so user or invite link can be rejoined immediately
    if (roomId) setInitialRoomId(roomId);
    if (passkey) setInitialPasskey(passkey);

    setCurrentUser(null);
    setRoomId(null);
    setPasskey('');
    setActiveNav('home');

    try {
      sessionStorage.removeItem('ruangobrol_user');
      sessionStorage.removeItem('ruangobrol_room');
      sessionStorage.removeItem('ruangobrol_room_name');
      sessionStorage.removeItem('ruangobrol_passkey');
    } catch {}
  };

  const handleUpdatePasskey = (newKey: string) => {
    setPasskey(newKey);
    try {
      sessionStorage.setItem('ruangobrol_passkey', newKey);
    } catch {}
    if (roomId) {
      window.location.hash = `room=${encodeURIComponent(roomId)}&key=${encodeURIComponent(newKey)}`;
    }
  };

  // Drag & drop file support anywhere
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !currentUser || !roomId) return;

    try {
      const dataUrl = await readFileAsDataURL(file);
      await sendMessage({
        text: '',
        mentions: [],
        replyTo: null,
        file: {
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          dataUrl,
        },
      });
    } catch (err: any) {
      alert(err.message || 'Gagal mengirim file via drag-and-drop');
    }
  };

  // If user is completely unauthenticated and visits with an invite link or empty state
  const isJoined = Boolean(currentUser && roomId && passkey);

  return (
    <div
      id="app-root-container"
      className="flex h-screen w-screen bg-slate-100 text-slate-800 font-sans antialiased overflow-hidden select-none"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 1. Left Navigation Sidebar */}
      <AppSidebar
        currentUser={currentUser}
        activeNav={activeNav}
        onNavigate={(nav) => setActiveNav(nav)}
        currentRoomId={roomId}
        currentRoomName={currentRoomName || roomName || (roomId ? `Ruang #${roomId}` : '')}
        savedRooms={savedRooms}
        onSelectSavedRoom={handleSelectSavedRoom}
        onDeleteSavedRoom={handleDeleteSavedRoom}
        onLogoutClick={handleLeaveRoom}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* 2. Center & Main App Content */}
      <main id="app-main-workspace" className="flex-1 flex flex-col h-full min-w-0 bg-white relative overflow-hidden">
        
        {/* If Active Nav is Home or Create, OR if not in a room yet */}
        {(activeNav === 'home' || activeNav === 'create' || !isJoined) ? (
          <HomeView
            currentUser={currentUser}
            currentRoomId={roomId}
            currentRoomName={currentRoomName || roomName || (roomId ? `Ruang #${roomId}` : '')}
            savedRooms={savedRooms}
            initialRoomId={initialRoomId}
            initialPasskey={initialPasskey}
            onJoinRoom={handleJoin}
            onSelectSavedRoom={handleSelectSavedRoom}
            onDeleteSavedRoom={handleDeleteSavedRoom}
            onGoToChat={() => setActiveNav('chat')}
            defaultTab="create"
          />
        ) : (
          /* Active Chat Room View */
          <div className="flex-1 flex flex-col h-full w-full relative overflow-hidden">
            
            {/* Chat Top Header */}
            <ChatHeader
              roomName={currentRoomName || roomName || `Ruang #${roomId}`}
              roomId={roomId!}
              currentUser={currentUser!}
              participants={participants}
              isConnected={isConnected}
              isReconnecting={isReconnecting}
              keyFingerprint={keyFingerprint}
              isSearchOpen={isSearchOpen}
              onToggleSearch={() => {
                setIsSearchOpen((prev) => !prev);
                if (isSearchOpen) setSearchQuery('');
              }}
              onOpenInvite={() => setShowInviteModal(true)}
              onOpenSecurity={() => setShowSecurityModal(true)}
              onOpenParticipants={() => setShowParticipantsModal(true)}
              onLeaveRoom={handleLeaveRoom}
              onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
              onToggleRightSidebar={() => setIsRightSidebarOpen((prev) => !prev)}
              isRightSidebarOpen={isRightSidebarOpen}
              isPrivacyBlur={isPrivacyBlur}
              onTogglePrivacyBlur={handleTogglePrivacyBlur}
              isSoundMuted={isSoundMuted}
              onToggleSound={handleToggleSound}
            />

            {/* In-Chat Filter Search Bar */}
            {isSearchOpen && (
              <ChatSearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onClear={() => setSearchQuery('')}
                matchesCount={searchQuery.trim() ? filteredMessages.length : 0}
                currentMatchIndex={currentMatchIndex}
                onNextMatch={handleNextMatch}
                onPrevMatch={handlePrevMatch}
                onClose={() => {
                  setIsSearchOpen(false);
                  setSearchQuery('');
                }}
              />
            )}

            {/* Privacy Blur Active Floating Alert / Toast */}
            {isPrivacyBlur && (
              <div
                id="privacy-blur-active-banner"
                className="bg-amber-500 text-white text-xs px-4 py-1.5 flex items-center justify-between shadow-xs select-none transition-all z-10"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="font-bold">🔒 Mode Privasi Aktif:</span>
                  <span className="opacity-95 truncate">Isi obrolan & nama anggota disamarkan. Arahkan mouse ke pesan atau klik tombol Blur untuk membuka.</span>
                </div>
                <button
                  onClick={handleTogglePrivacyBlur}
                  className="ml-2 text-[11px] font-semibold bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-md transition-colors cursor-pointer shrink-0"
                >
                  Buka Blur
                </button>
              </div>
            )}

            {/* Mention Banner Toast */}
            {mentionBanner && (
              <div
                id="mention-notification-toast"
                className="absolute top-20 left-4 right-4 z-40 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs shadow-xl backdrop-blur-md flex items-center justify-between animate-in fade-in slide-in-from-top-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-xl bg-amber-100 text-amber-700">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <strong>@{mentionBanner.senderName}</strong> menyebut Anda dalam pesan:
                    <span className="text-amber-800 font-medium italic ml-1 truncate">{mentionBanner.text}</span>
                  </div>
                </div>
                <button
                  onClick={() => setMentionBanner(null)}
                  className="p-1 text-amber-600 hover:text-amber-900 rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Drag & Drop Visual Overlay */}
            {isDragOver && (
              <div className="absolute inset-0 z-50 bg-indigo-900/80 backdrop-blur-xs border-2 border-dashed border-indigo-400 flex flex-col items-center justify-center gap-2 text-white">
                <Sparkles className="w-10 h-10 animate-bounce text-indigo-300" />
                <div className="text-base font-bold">Lepaskan file di sini</div>
                <div className="text-xs text-indigo-200">File akan langsung dienkripsi E2EE dan dikirim</div>
              </div>
            )}

            {/* Chat Body + Right Info Sidebar */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* Message List and Chat Input Area */}
              <div className="flex-1 flex flex-col bg-white relative min-w-0">
                <div className={`flex-1 flex flex-col min-h-0 relative transition-all duration-300 ${isPrivacyBlur ? 'filter blur-md hover:filter-none select-none' : ''}`}>
                  <MessageList
                    messages={filteredMessages}
                    currentUser={currentUser!}
                    typingUsers={typingUsers}
                    searchQuery={searchQuery}
                    onReply={(preview) => setReplyTo(preview)}
                    onMentionUser={(userName) => setMentionToPrefill(userName)}
                    onViewImage={(file) => setPreviewImage(file)}
                    onInspectCrypto={(msg) => setInspectMessage(msg)}
                    onReact={sendReaction}
                  />
                </div>

                <ChatInput
                  participants={participants}
                  replyTo={replyTo}
                  onClearReply={() => setReplyTo(null)}
                  onSendMessage={sendMessage}
                  onTyping={sendTyping}
                  mentionToPrefill={mentionToPrefill}
                  onClearPrefillMention={() => setMentionToPrefill(null)}
                />
              </div>

              {/* 3. Right Details & Media Sidebar */}
              {isRightSidebarOpen && (
                <aside
                  id="chat-right-sidebar"
                  className="hidden lg:flex w-72 xl:w-80 bg-white border-l border-slate-200 flex-shrink-0 flex-col p-5 space-y-6 overflow-y-auto"
                >
                  {/* Online Members Section */}
                  <div className={`transition-all duration-300 ${isPrivacyBlur ? 'filter blur-md hover:filter-none select-none' : ''}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-600" />
                        Anggota — {participants.length}
                      </h3>
                      <button
                        onClick={() => setShowParticipantsModal(true)}
                        className="text-[11px] text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer"
                      >
                        Lihat Semua
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {participants.slice(0, 6).map((p) => {
                        const isMe = p.id === currentUser!.id;
                        return (
                          <div key={p.id} className="flex items-center justify-between group">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="relative shrink-0">
                                <div
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-2xs"
                                  style={{ backgroundColor: p.color }}
                                >
                                  {p.avatar}
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                              </div>
                              <span className="text-sm font-medium text-slate-700 truncate">
                                {p.name} {isMe && <span className="text-xs text-slate-400 font-normal">(Anda)</span>}
                              </span>
                            </div>
                            {!isMe && (
                              <button
                                onClick={() => setMentionToPrefill(p.name)}
                                className="opacity-0 group-hover:opacity-100 text-[11px] text-indigo-600 hover:underline px-1.5 py-0.5 rounded font-medium cursor-pointer"
                                title={`Sebut @${p.name}`}
                              >
                                @
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Shared Files & Media in Room */}
                  <div className={`pt-5 border-t border-slate-100 transition-all duration-300 ${isPrivacyBlur ? 'filter blur-md hover:filter-none select-none' : ''}`}>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      Berkas Bersama
                    </h3>
                    {messages.filter((m) => m.decryptedPayload?.file).length === 0 ? (
                      <p className="text-xs text-slate-400">Belum ada berkas yang dikirim di ruang ini.</p>
                    ) : (
                      <div className="space-y-2">
                        {messages
                          .filter((m) => m.decryptedPayload?.file)
                          .slice(-5)
                          .reverse()
                          .map((m) => {
                            const file = m.decryptedPayload!.file!;
                            const isImg = file.type.startsWith('image/');
                            const isAudio = file.type.startsWith('audio/');
                            return (
                              <div
                                key={m.id}
                                onClick={() => (isImg ? setPreviewImage(file) : null)}
                                className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-slate-100"
                              >
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                    isImg
                                      ? 'bg-blue-50 text-blue-600'
                                      : isAudio
                                      ? 'bg-pink-50 text-pink-600'
                                      : 'bg-emerald-50 text-emerald-600'
                                  }`}
                                >
                                  {isImg ? (
                                    <ImageIcon className="w-4 h-4" />
                                  ) : isAudio ? (
                                    <Music className="w-4 h-4" />
                                  ) : (
                                    <FileText className="w-4 h-4" />
                                  )}
                                </div>
                                <div className="overflow-hidden flex-1 min-w-0">
                                  <p className="text-xs font-bold text-slate-700 truncate">{file.name}</p>
                                  <p className="text-[10px] text-slate-400 font-medium">
                                    {(file.size / 1024).toFixed(1)} KB •{' '}
                                    {new Date(m.timestamp).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* E2EE Info Box */}
                  <div className="mt-auto pt-4 border-t border-slate-100">
                    <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>E2EE AES-256 GCM</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Semua pesan, gambar, rekaman audio, dan berkas dienkripsi di peramban Anda. Server hanya meneruskan data terenkripsi.
                      </p>
                    </div>
                  </div>
                </aside>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        roomName={currentRoomName || roomName || (roomId ? `Ruang #${roomId}` : 'Ruang Obrolan')}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
      />

      {/* Invite Modal */}
      {showInviteModal && roomId && (
        <InviteModal
          roomId={roomId}
          passkey={passkey}
          roomName={roomName}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {/* Security & Key Verification Modal */}
      {showSecurityModal && (
        <SecurityModal
          passkey={passkey}
          keyFingerprint={keyFingerprint}
          onUpdatePasskey={handleUpdatePasskey}
          onClose={() => setShowSecurityModal(false)}
        />
      )}

      {/* Participants Modal (Mobile/Tablet) */}
      {showParticipantsModal && currentUser && (
        <ParticipantsModal
          participants={participants}
          currentUser={currentUser}
          onMention={(uName) => setMentionToPrefill(uName)}
          onClose={() => setShowParticipantsModal(false)}
          isPrivacyBlur={isPrivacyBlur}
        />
      )}

      {/* Inspect Message Crypto Modal */}
      {inspectMessage && (
        <InspectCryptoModal
          message={inspectMessage}
          onClose={() => setInspectMessage(null)}
        />
      )}

      {/* Image Fullscreen Lightbox Modal */}
      {previewImage && (
        <ImageLightboxModal
          file={previewImage}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
}
