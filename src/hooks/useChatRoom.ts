import { useState, useEffect, useRef, useCallback } from 'react';
import {
  User,
  RoomParticipant,
  EncryptedMessage,
  DecryptedMessage,
  EncryptedPayload,
  AttachedFile,
  ReplyPreview,
  WSServerEvent,
} from '../types';
import {
  deriveKeyFromPassphrase,
  calculateKeyFingerprint,
  encryptPayload,
  decryptPayload,
} from '../lib/crypto';
import { soundManager } from '../lib/sound';
import { resolveWsUrl } from '../lib/wsUrl';

interface UseChatRoomOptions {
  user: User | null;
  roomId: string | null;
  roomName?: string;
  passkey: string;
  onMentioned?: (senderName: string, text: string) => void;
  onIncomingMessage?: (msg: DecryptedMessage) => void;
}

export function useChatRoom({
  user,
  roomId,
  roomName,
  passkey,
  onMentioned,
  onIncomingMessage,
}: UseChatRoomOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<{ id: string; name: string }[]>([]);
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [keyFingerprint, setKeyFingerprint] = useState<{ hexCode: string; emojiCode: string } | null>(null);
  const [currentRoomName, setCurrentRoomName] = useState<string>(roomName || '');
  const [pinnedMessageId, setPinnedMessageId] = useState<string | null>(null);
  const [disappearingTimer, setDisappearingTimerState] = useState<number>(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const pingIntervalRef = useRef<any>(null);
  const typingTimeoutMapRef = useRef<Map<string, any>>(new Map());
  const cryptoKeyRef = useRef<CryptoKey | null>(null);
  const passkeyRef = useRef<string>(passkey);

  // Initialize or update cryptographic key whenever passkey changes
  useEffect(() => {
    passkeyRef.current = passkey;
    let isCancelled = false;

    async function initCrypto() {
      if (!passkey) return;
      try {
        const key = await deriveKeyFromPassphrase(passkey);
        const fp = await calculateKeyFingerprint(passkey);
        if (!isCancelled) {
          setCryptoKey(key);
          cryptoKeyRef.current = key;
          setKeyFingerprint(fp);

          // Re-decrypt existing messages if passkey was modified
          setMessages(prevMessages => {
            return prevMessages.map(msg => {
              if (msg.isSystem) return msg;
              try {
                // Async decrypt cannot block map directly, but we schedule it
                decryptPayload(msg.ciphertext, msg.iv, key)
                  .then(payload => {
                    setMessages(curr =>
                      curr.map(m => (m.id === msg.id ? { ...m, decryptedPayload: payload, decryptionFailed: false } : m))
                    );
                  })
                  .catch(() => {
                    setMessages(curr =>
                      curr.map(m => (m.id === msg.id ? { ...m, decryptionFailed: true } : m))
                    );
                  });
              } catch (e) {
                // Ignored
              }
              return msg;
            });
          });
        }
      } catch (err) {
        console.error('Failed to initialize encryption key:', err);
      }
    }

    initCrypto();
    return () => {
      isCancelled = true;
    };
  }, [passkey]);

  // Decrypt single message helper
  const decryptSingleMessage = useCallback(
    async (msg: EncryptedMessage, key: CryptoKey | null): Promise<DecryptedMessage> => {
      if (msg.isSystem) {
        return { ...msg };
      }
      if (!key) {
        return { ...msg, decryptionFailed: true };
      }
      try {
        const decryptedPayload = await decryptPayload(msg.ciphertext, msg.iv, key);
        const mergedReadBy = { ...(decryptedPayload.readBy || {}), ...(msg.readBy || {}) };
        const mergedDeliveredTo = Array.from(new Set([...(decryptedPayload.deliveredTo || []), ...(msg.deliveredTo || [])]));
        const mergedReactions = msg.reactions || decryptedPayload.reactions || {};
        const effectiveStatus: 'sending' | 'sent' | 'delivered' | 'read' = 
          Object.keys(mergedReadBy).length > 0 ? 'read' : (mergedDeliveredTo.length > 0 || msg.status === 'delivered' ? 'delivered' : (msg.status || 'sent'));

        return {
          ...msg,
          status: effectiveStatus,
          readBy: mergedReadBy,
          deliveredTo: mergedDeliveredTo,
          reactions: mergedReactions,
          decryptedPayload: {
            ...decryptedPayload,
            status: effectiveStatus,
            readBy: mergedReadBy,
            deliveredTo: mergedDeliveredTo,
            reactions: mergedReactions,
          },
          decryptionFailed: false,
        };
      } catch (err) {
        return {
          ...msg,
          decryptionFailed: true,
        };
      }
    },
    []
  );

  // Connect to WebSocket
  useEffect(() => {
    if (!user || !roomId || !passkey) return;

    let isUnmounted = false;

    function connect() {
      if (isUnmounted) return;

      const wsUrl = resolveWsUrl();

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isUnmounted) {
          ws.close();
          return;
        }
        setIsConnected(true);
        setIsReconnecting(false);

        // Send join event
        ws.send(
          JSON.stringify({
            type: 'join',
            roomId,
            roomName: roomName || `Ruang #${roomId.slice(0, 6)}`,
            user,
          })
        );

        // Heartbeat ping
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 20000);
      };

      ws.onmessage = async (event) => {
        try {
          const data: WSServerEvent = JSON.parse(event.data);

          switch (data.type) {
            case 'room_init': {
              // The room is truly ready only after the server accepts the join.
              // This also prevents a reconnecting state from lingering after the
              // socket was reopened during the room setup transition.
              setIsConnected(true);
              setIsReconnecting(false);
              setCurrentRoomName(data.roomName || `Ruang #${roomId.slice(0, 6)}`);
              setParticipants(data.participants);
              setPinnedMessageId(data.pinnedMessageId || null);
              setDisappearingTimerState(data.disappearingTimer || 0);

              const currentKey = cryptoKeyRef.current;
              const decryptedList = await Promise.all(
                data.messages.map(m => decryptSingleMessage(m, currentKey))
              );
              setMessages(decryptedList);

              // Automatically send delivery_ack and read_receipt for received messages from peers
              const unreadFromOthers = decryptedList
                .filter(m => !m.isSystem && m.senderId !== user.id && !m.isDeleted)
                .map(m => m.id);

              if (unreadFromOthers.length > 0 && ws.readyState === WebSocket.OPEN) {
                const now = Date.now();
                ws.send(
                  JSON.stringify({
                    type: 'delivery_ack',
                    roomId,
                    messageIds: unreadFromOthers,
                    recipientId: user.id,
                    deliveredAt: now,
                  })
                );
                ws.send(
                  JSON.stringify({
                    type: 'read_receipt',
                    roomId,
                    messageIds: unreadFromOthers,
                    reader: { id: user.id, name: user.name },
                    readAt: now,
                  })
                );
              }
              break;
            }

            case 'message_edited': {
              const currentKey = cryptoKeyRef.current;
              const decMsg = await decryptSingleMessage(data.message, currentKey);
              setMessages(prev =>
                prev.map(m => (m.id === decMsg.id ? { ...m, ...decMsg, editedAt: decMsg.editedAt } : m))
              );
              break;
            }

            case 'message_deleted': {
              const { messageId } = data;
              setMessages(prev =>
                prev.map(m => (m.id === messageId ? { ...m, isDeleted: true } : m))
              );
              setPinnedMessageId(prev => (prev === messageId ? null : prev));
              break;
            }

            case 'message_pinned': {
              setPinnedMessageId(data.pinnedMessageId || null);
              if (data.pinnedBy && data.pinnedMessageId) {
                // Subtle system notification
                const sysMsg: DecryptedMessage = {
                  id: `sys-pin-${Date.now()}`,
                  roomId,
                  senderId: 'system',
                  senderName: 'Sistem',
                  senderAvatar: '📌',
                  senderColor: '#4f46e5',
                  iv: '',
                  ciphertext: '',
                  timestamp: Date.now(),
                  keyFingerprint: '',
                  isSystem: true,
                  decryptedPayload: {
                    text: `${data.pinnedBy} menyematkan sebuah pesan`,
                    mentions: [],
                    timestamp: Date.now(),
                  },
                };
                setMessages(prev => [...prev, sysMsg]);
              }
              break;
            }

            case 'disappearing_timer_changed': {
              setDisappearingTimerState(data.timerSeconds);
              const label = data.timerSeconds === 0 
                ? 'dimatikan' 
                : data.timerSeconds < 60 
                  ? `${data.timerSeconds} detik` 
                  : data.timerSeconds < 3600 
                    ? `${Math.floor(data.timerSeconds / 60)} menit` 
                    : `${Math.floor(data.timerSeconds / 3600)} jam`;
              
              const sysMsg: DecryptedMessage = {
                id: `sys-timer-${Date.now()}`,
                roomId,
                senderId: 'system',
                senderName: 'Sistem',
                senderAvatar: '⏱️',
                senderColor: '#f59e0b',
                iv: '',
                ciphertext: '',
                timestamp: Date.now(),
                keyFingerprint: '',
                isSystem: true,
                decryptedPayload: {
                  text: `${data.changedBy} mengatur timer pesan hancur otomatis menjadi ${label}`,
                  mentions: [],
                  timestamp: Date.now(),
                },
              };
              setMessages(prev => [...prev, sysMsg]);
              break;
            }

            case 'user_joined': {
              setParticipants(data.participants);
              // Add subtle system log
              const systemMsg: DecryptedMessage = {
                id: `sys-${Date.now()}-${Math.random()}`,
                roomId,
                senderId: 'system',
                senderName: 'Sistem',
                senderAvatar: '👋',
                senderColor: '#64748b',
                iv: '',
                ciphertext: '',
                timestamp: Date.now(),
                keyFingerprint: '',
                isSystem: true,
                decryptedPayload: {
                  text: `${data.user.name} bergabung ke dalam obrolan`,
                  mentions: [],
                  timestamp: Date.now(),
                },
              };
              setMessages(prev => [...prev, systemMsg]);
              break;
            }

            case 'user_left': {
              setParticipants(data.participants);
              const systemMsg: DecryptedMessage = {
                id: `sys-${Date.now()}-${Math.random()}`,
                roomId,
                senderId: 'system',
                senderName: 'Sistem',
                senderAvatar: '🚪',
                senderColor: '#64748b',
                iv: '',
                ciphertext: '',
                timestamp: Date.now(),
                keyFingerprint: '',
                isSystem: true,
                decryptedPayload: {
                  text: `${data.userName} telah keluar dari ruang`,
                  mentions: [],
                  timestamp: Date.now(),
                },
              };
              setMessages(prev => [...prev, systemMsg]);
              break;
            }

            case 'message': {
              const currentKey = cryptoKeyRef.current;
              const decMsg = await decryptSingleMessage(data.message, currentKey);

              setMessages(prev => {
                // Prevent duplicates or update if matching ID
                const exists = prev.some(m => m.id === decMsg.id);
                if (exists) {
                  return prev.map(m => (m.id === decMsg.id ? { ...m, ...decMsg } : m));
                }
                return [...prev, decMsg];
              });

              // If message is from someone else, acknowledge delivery and read immediately
              if (decMsg.senderId !== user.id && !decMsg.isSystem && ws.readyState === WebSocket.OPEN) {
                const now = Date.now();
                ws.send(
                  JSON.stringify({
                    type: 'delivery_ack',
                    roomId,
                    messageIds: [decMsg.id],
                    recipientId: user.id,
                    deliveredAt: now,
                  })
                );
                ws.send(
                  JSON.stringify({
                    type: 'read_receipt',
                    roomId,
                    messageIds: [decMsg.id],
                    reader: { id: user.id, name: user.name },
                    readAt: now,
                  })
                );
              }

              // Check for mentions or incoming message sound
              if (decMsg.senderId !== user.id && !decMsg.isSystem) {
                const isMentioned =
                  decMsg.decryptedPayload?.mentions &&
                  (decMsg.decryptedPayload.mentions.includes(user.name) ||
                    decMsg.decryptedPayload.mentions.includes(`@${user.name}`));

                if (isMentioned) {
                  soundManager.playMentionSound();
                  onMentioned?.(decMsg.senderName, decMsg.decryptedPayload?.text || '');
                } else {
                  soundManager.playIncomingMessageSound();
                  onIncomingMessage?.(decMsg);
                }
              }
              break;
            }

            case 'read_receipt': {
              const { messageIds, reader, readAt } = data;
              setMessages(prev =>
                prev.map(m => {
                  if (messageIds.includes(m.id)) {
                    const updatedReadBy = {
                      ...(m.readBy || {}),
                      [reader.id]: { readAt: readAt || Date.now(), userName: reader.name },
                    };
                    const updatedPayload = m.decryptedPayload
                      ? {
                          ...m.decryptedPayload,
                          status: 'read' as const,
                          readBy: updatedReadBy,
                        }
                      : undefined;
                    return {
                      ...m,
                      status: 'read',
                      readBy: updatedReadBy,
                      decryptedPayload: updatedPayload || m.decryptedPayload,
                    };
                  }
                  return m;
                })
              );
              break;
            }

            case 'delivery_ack': {
              const { messageIds, recipientId } = data;
              setMessages(prev =>
                prev.map(m => {
                  if (messageIds.includes(m.id)) {
                    const currentDelivered = m.deliveredTo || [];
                    const updatedDelivered = currentDelivered.includes(recipientId)
                      ? currentDelivered
                      : [...currentDelivered, recipientId];
                    const newStatus = m.status === 'read' ? 'read' : 'delivered';
                    const updatedPayload = m.decryptedPayload
                      ? {
                          ...m.decryptedPayload,
                          status: newStatus as any,
                          deliveredTo: updatedDelivered,
                        }
                      : undefined;
                    return {
                      ...m,
                      status: newStatus,
                      deliveredTo: updatedDelivered,
                      decryptedPayload: updatedPayload || m.decryptedPayload,
                    };
                  }
                  return m;
                })
              );
              break;
            }

            case 'reaction': {
              const { messageId, reactions } = data;
              setMessages(prev =>
                prev.map(m => {
                  if (m.id === messageId) {
                    return {
                      ...m,
                      reactions,
                      decryptedPayload: m.decryptedPayload
                        ? { ...m.decryptedPayload, reactions }
                        : undefined,
                    };
                  }
                  return m;
                })
              );
              break;
            }

            case 'typing': {
              const { user: typingUser, isTyping } = data;
              if (typingUser.id === user.id) break;

              // Clear existing timeout
              if (typingTimeoutMapRef.current.has(typingUser.id)) {
                clearTimeout(typingTimeoutMapRef.current.get(typingUser.id));
                typingTimeoutMapRef.current.delete(typingUser.id);
              }

              if (isTyping) {
                setTypingUsers(prev => {
                  if (prev.some(u => u.id === typingUser.id)) return prev;
                  return [...prev, typingUser];
                });

                // Auto clear after 4 seconds if no update
                const timeout = setTimeout(() => {
                  setTypingUsers(prev => prev.filter(u => u.id !== typingUser.id));
                  typingTimeoutMapRef.current.delete(typingUser.id);
                }, 4000);

                typingTimeoutMapRef.current.set(typingUser.id, timeout);
              } else {
                setTypingUsers(prev => prev.filter(u => u.id !== typingUser.id));
              }
              break;
            }
          }
        } catch (err) {
          console.error('Error handling WS message:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

        if (!isUnmounted) {
          setIsReconnecting(true);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      isUnmounted = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [user, roomId, passkey, roomName, decryptSingleMessage, onMentioned]);

  // Auto-remove expired self-destructing messages locally every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setMessages(prev => {
        const hasExpired = prev.some(m => m.expiresAt && m.expiresAt <= now && !m.isDeleted);
        if (!hasExpired) return prev;
        return prev.filter(m => !m.expiresAt || m.expiresAt > now);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Send Encrypted Message
  const sendMessage = useCallback(
    async ({
      text,
      mentions = [],
      replyTo = null,
      file = null,
      ttl,
    }: {
      text: string;
      mentions?: string[];
      replyTo?: ReplyPreview | null;
      file?: AttachedFile | null;
      ttl?: number;
    }) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        throw new Error('Koneksi belum terhubung ke server');
      }
      if (!cryptoKey || !user || !roomId) {
        throw new Error('Kunci enkripsi atau data pengguna belum siap');
      }

      const effectiveTtl = ttl !== undefined ? ttl : (disappearingTimer || 0);
      const timestamp = Date.now();
      const expiresAt = effectiveTtl > 0 ? timestamp + effectiveTtl * 1000 : undefined;

      const payload: EncryptedPayload = {
        text,
        mentions,
        replyTo,
        file,
        timestamp,
        status: 'sent',
        deliveredTo: [],
        readBy: {},
        ttl: effectiveTtl > 0 ? effectiveTtl : undefined,
        expiresAt,
      };

      const { ciphertext, iv } = await encryptPayload(payload, cryptoKey);
      const fp = keyFingerprint?.hexCode || 'UNKNOWN';

      const encryptedMsg: EncryptedMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        roomId,
        senderId: user.id,
        senderName: user.name,
        senderAvatar: user.avatar,
        senderColor: user.color,
        iv,
        ciphertext,
        timestamp,
        keyFingerprint: fp,
        status: 'sent',
        deliveredTo: [],
        readBy: {},
        ttl: effectiveTtl > 0 ? effectiveTtl : undefined,
        expiresAt,
      };

      wsRef.current.send(
        JSON.stringify({
          type: 'message',
          roomId,
          message: encryptedMsg,
        })
      );
    },
    [cryptoKey, user, roomId, keyFingerprint, disappearingTimer]
  );

  // Edit an existing message
  const editMessage = useCallback(
    async (messageId: string, newText: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !cryptoKey || !user || !roomId) {
        throw new Error('Koneksi atau kunci belum siap');
      }

      const targetMsg = messages.find(m => m.id === messageId);
      if (!targetMsg || targetMsg.senderId !== user.id || !targetMsg.decryptedPayload) {
        throw new Error('Pesan tidak ditemukan atau bukan milik Anda');
      }

      const editedAt = Date.now();
      const updatedPayload: EncryptedPayload = {
        ...targetMsg.decryptedPayload,
        text: newText,
        editedAt,
      };

      const { ciphertext, iv } = await encryptPayload(updatedPayload, cryptoKey);
      const editedEncryptedMsg: EncryptedMessage = {
        ...targetMsg,
        ciphertext,
        iv,
        editedAt,
      };

      wsRef.current.send(
        JSON.stringify({
          type: 'edit_message',
          roomId,
          message: editedEncryptedMsg,
        })
      );
    },
    [cryptoKey, user, roomId, messages]
  );

  // Delete message for everyone
  const deleteMessage = useCallback(
    (messageId: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !user || !roomId) return;
      wsRef.current.send(
        JSON.stringify({
          type: 'delete_message',
          roomId,
          messageId,
          senderId: user.id,
        })
      );
    },
    [user, roomId]
  );

  // Pin / Unpin message
  const pinMessage = useCallback(
    (messageId: string, unpin = false) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !user || !roomId) return;
      wsRef.current.send(
        JSON.stringify({
          type: 'pin_message',
          roomId,
          messageId,
          unpin,
          pinnedBy: user.name,
        })
      );
    },
    [user, roomId]
  );

  // Set Disappearing message timer for room
  const setDisappearingTimer = useCallback(
    (timerSeconds: number) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !user || !roomId) return;
      wsRef.current.send(
        JSON.stringify({
          type: 'set_disappearing_timer',
          roomId,
          timerSeconds,
          changedBy: user.name,
        })
      );
    },
    [user, roomId]
  );

  // Mark specific or all messages as read
  const markMessagesAsRead = useCallback(
    (messageIds: string[]) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !user || !roomId) return;
      if (!messageIds || messageIds.length === 0) return;

      wsRef.current.send(
        JSON.stringify({
          type: 'read_receipt',
          roomId,
          messageIds,
          reader: { id: user.id, name: user.name },
          readAt: Date.now(),
        })
      );
    },
    [user, roomId]
  );

  // Send Typing Indicator
  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !user || !roomId) return;
      wsRef.current.send(
        JSON.stringify({
          type: 'typing',
          roomId,
          user: { id: user.id, name: user.name },
          isTyping,
        })
      );
    },
    [user, roomId]
  );

  // Send or toggle reaction on a message
  const sendReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !user || !roomId) return;
      wsRef.current.send(
        JSON.stringify({
          type: 'reaction',
          roomId,
          messageId,
          emoji,
          user: { id: user.id, name: user.name },
        })
      );
    },
    [user, roomId]
  );

  const pinnedMessage = messages.find(m => m.id === pinnedMessageId) || null;

  return {
    isConnected,
    isReconnecting,
    participants,
    messages,
    typingUsers,
    cryptoKey,
    keyFingerprint,
    currentRoomName,
    pinnedMessageId,
    pinnedMessage,
    disappearingTimer,
    sendMessage,
    editMessage,
    deleteMessage,
    pinMessage,
    setDisappearingTimer,
    sendTyping,
    markMessagesAsRead,
    sendReaction,
  };
}
