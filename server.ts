import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

interface User {
  id: string;
  name: string;
  avatar: string;
  color: string;
  isOnline?: boolean;
  joinedAt: number;
}

interface RoomParticipant extends User {
  socketId?: string;
}

interface EncryptedMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderColor: string;
  iv: string;
  ciphertext: string;
  timestamp: number;
  keyFingerprint: string;
  isSystem?: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  deliveredTo?: string[];
  readBy?: Record<string, { readAt: number; userName: string }>;
  reactions?: Record<string, { emoji: string; users: { id: string; name: string }[] }>;
  ttl?: number;
  expiresAt?: number;
  editedAt?: number;
  isDeleted?: boolean;
  isPinned?: boolean;
  pinnedBy?: string;
  pinnedAt?: number;
}

interface Room {
  id: string;
  name: string;
  createdAt: number;
  messages: EncryptedMessage[];
  participants: Map<WebSocket, RoomParticipant>;
  pinnedMessageId?: string | null;
  disappearingTimer?: number; // 0 = off, >0 seconds
}

// In-memory room store
const rooms = new Map<string, Room>();

function getOrCreateRoom(roomId: string, roomName?: string): Room {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      id: roomId,
      name: roomName || `Ruang #${roomId.slice(0, 6)}`,
      createdAt: Date.now(),
      messages: [],
      participants: new Map(),
      pinnedMessageId: null,
      disappearingTimer: 0,
    };
    rooms.set(roomId, room);
  } else if (roomName && room.name.startsWith('Ruang #')) {
    room.name = roomName;
  }
  return room;
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);

  app.use(express.json({ limit: '15mb' }));

  // REST API Routes
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      activeRooms: rooms.size,
      uptime: process.uptime(),
    });
  });

  app.get('/api/rooms/:roomId', (req, res) => {
    const room = rooms.get(req.params.roomId);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    res.json({
      id: room.id,
      name: room.name,
      participantCount: room.participants.size,
      createdAt: room.createdAt,
    });
  });

  // WebSocket Server Setup on /ws
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Map to find client room & user quickly
  const clientData = new WeakMap<WebSocket, { roomId: string; user: RoomParticipant }>();

  wss.on('connection', (ws: WebSocket) => {
    let isAlive = true;
    (ws as any).isAlive = true;

    ws.on('pong', () => {
      (ws as any).isAlive = true;
    });

    ws.on('message', (rawData: string) => {
      try {
        const data = JSON.parse(rawData.toString());

        switch (data.type) {
          case 'join': {
            const { roomId, roomName, user } = data;
            if (!roomId || !user) return;

            const room = getOrCreateRoom(roomId, roomName);
            const participant: RoomParticipant = {
              ...user,
              isOnline: true,
              joinedAt: Date.now(),
            };

            // Register socket
            room.participants.set(ws, participant);
            clientData.set(ws, { roomId, user: participant });

            const participantsList = Array.from(room.participants.values());

            // Send full initial state to joined client
            ws.send(
              JSON.stringify({
                type: 'room_init',
                roomId: room.id,
                roomName: room.name,
                participants: participantsList,
                messages: room.messages,
                pinnedMessageId: room.pinnedMessageId || null,
                disappearingTimer: room.disappearingTimer || 0,
              })
            );

            // Broadcast to other room members
            const joinBroadcast = JSON.stringify({
              type: 'user_joined',
              user: participant,
              participants: participantsList,
            });

            room.participants.forEach((_, clientWs) => {
              if (clientWs !== ws && clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(joinBroadcast);
              }
            });
            break;
          }

          case 'message': {
            const { roomId, message } = data;
            if (!roomId || !message) return;

            const room = rooms.get(roomId);
            if (!room) return;

            // Compute self-destruct expiresAt if ttl is present
            const msgTtl = message.ttl !== undefined ? message.ttl : (room.disappearingTimer || 0);
            const expiresAt = msgTtl > 0 ? (message.expiresAt || (Date.now() + msgTtl * 1000)) : undefined;

            // Mark initial delivery to connected participants in the room
            const otherParticipants = Array.from(room.participants.values()).filter(p => p.id !== message.senderId);
            const initialDeliveredTo = otherParticipants.map(p => p.id);
            
            const processedMessage: EncryptedMessage = {
              ...message,
              ttl: msgTtl > 0 ? msgTtl : undefined,
              expiresAt,
              deliveredTo: Array.from(new Set([...(message.deliveredTo || []), ...initialDeliveredTo])),
              readBy: message.readBy || {},
              status: initialDeliveredTo.length > 0 ? 'delivered' : 'sent',
            };

            // Store message (keep last 200)
            room.messages.push(processedMessage);
            if (room.messages.length > 200) {
              room.messages.shift();
            }

            // Broadcast message to everyone in the room (including sender for ack confirmation)
            const messageBroadcast = JSON.stringify({
              type: 'message',
              message: processedMessage,
            });

            room.participants.forEach((_, clientWs) => {
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(messageBroadcast);
              }
            });
            break;
          }

          case 'edit_message': {
            const { roomId, message } = data;
            if (!roomId || !message) return;

            const room = rooms.get(roomId);
            if (!room) return;

            const idx = room.messages.findIndex(m => m.id === message.id);
            if (idx !== -1 && room.messages[idx].senderId === message.senderId) {
              room.messages[idx] = {
                ...room.messages[idx],
                ciphertext: message.ciphertext,
                iv: message.iv,
                editedAt: message.editedAt || Date.now(),
              };

              const editBroadcast = JSON.stringify({
                type: 'message_edited',
                message: room.messages[idx],
              });

              room.participants.forEach((_, clientWs) => {
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(editBroadcast);
                }
              });
            }
            break;
          }

          case 'delete_message': {
            const { roomId, messageId, senderId } = data;
            if (!roomId || !messageId) return;

            const room = rooms.get(roomId);
            if (!room) return;

            const idx = room.messages.findIndex(m => m.id === messageId);
            if (idx !== -1 && (room.messages[idx].senderId === senderId || !senderId)) {
              room.messages[idx].isDeleted = true;
              if (room.pinnedMessageId === messageId) {
                room.pinnedMessageId = null;
              }

              const deleteBroadcast = JSON.stringify({
                type: 'message_deleted',
                messageId,
                senderId,
              });

              room.participants.forEach((_, clientWs) => {
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(deleteBroadcast);
                }
              });
            }
            break;
          }

          case 'pin_message': {
            const { roomId, messageId, unpin, pinnedBy } = data;
            if (!roomId) return;

            const room = rooms.get(roomId);
            if (!room) return;

            const newPinnedId = unpin ? null : messageId;
            room.pinnedMessageId = newPinnedId;

            const pinBroadcast = JSON.stringify({
              type: 'message_pinned',
              pinnedMessageId: newPinnedId,
              pinnedBy,
              pinnedAt: Date.now(),
            });

            room.participants.forEach((_, clientWs) => {
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(pinBroadcast);
              }
            });
            break;
          }

          case 'set_disappearing_timer': {
            const { roomId, timerSeconds, changedBy } = data;
            if (!roomId) return;

            const room = rooms.get(roomId);
            if (!room) return;

            room.disappearingTimer = Number(timerSeconds) || 0;

            const timerBroadcast = JSON.stringify({
              type: 'disappearing_timer_changed',
              timerSeconds: room.disappearingTimer,
              changedBy: changedBy || 'Anggota',
            });

            room.participants.forEach((_, clientWs) => {
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(timerBroadcast);
              }
            });
            break;
          }

          case 'read_receipt': {
            const { roomId, messageIds, reader, readAt } = data;
            if (!roomId || !Array.isArray(messageIds) || messageIds.length === 0 || !reader) return;

            const room = rooms.get(roomId);
            if (!room) return;

            // Update stored messages in room
            const updatedIds: string[] = [];
            room.messages.forEach(msg => {
              if (messageIds.includes(msg.id) && msg.senderId !== reader.id) {
                msg.readBy = msg.readBy || {};
                msg.readBy[reader.id] = { readAt: readAt || Date.now(), userName: reader.name };
                msg.status = 'read';
                updatedIds.push(msg.id);
              }
            });

            if (updatedIds.length > 0) {
              const receiptBroadcast = JSON.stringify({
                type: 'read_receipt',
                messageIds: updatedIds,
                reader,
                readAt: readAt || Date.now(),
              });

              room.participants.forEach((_, clientWs) => {
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(receiptBroadcast);
                }
              });
            }
            break;
          }

          case 'delivery_ack': {
            const { roomId, messageIds, recipientId, deliveredAt } = data;
            if (!roomId || !Array.isArray(messageIds) || !recipientId) return;

            const room = rooms.get(roomId);
            if (!room) return;

            const updatedIds: string[] = [];
            room.messages.forEach(msg => {
              if (messageIds.includes(msg.id) && msg.senderId !== recipientId) {
                msg.deliveredTo = msg.deliveredTo || [];
                if (!msg.deliveredTo.includes(recipientId)) {
                  msg.deliveredTo.push(recipientId);
                  if (msg.status !== 'read') {
                    msg.status = 'delivered';
                  }
                  updatedIds.push(msg.id);
                }
              }
            });

            if (updatedIds.length > 0) {
              const deliveryBroadcast = JSON.stringify({
                type: 'delivery_ack',
                messageIds: updatedIds,
                recipientId,
                deliveredAt: deliveredAt || Date.now(),
              });

              room.participants.forEach((_, clientWs) => {
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(deliveryBroadcast);
                }
              });
            }
            break;
          }

          case 'reaction': {
            const { roomId, messageId, emoji, user } = data;
            if (!roomId || !messageId || !emoji || !user) return;

            const room = rooms.get(roomId);
            if (!room) return;

            const targetMsg = room.messages.find(m => m.id === messageId);
            if (!targetMsg) return;

            targetMsg.reactions = targetMsg.reactions || {};
            const existingGroup = targetMsg.reactions[emoji] || { emoji, users: [] };
            const existingUserIndex = existingGroup.users.findIndex(u => u.id === user.id);

            if (existingUserIndex !== -1) {
              // Toggle off
              existingGroup.users.splice(existingUserIndex, 1);
              if (existingGroup.users.length === 0) {
                delete targetMsg.reactions[emoji];
              } else {
                targetMsg.reactions[emoji] = existingGroup;
              }
            } else {
              // Toggle on
              existingGroup.users.push({ id: user.id, name: user.name });
              targetMsg.reactions[emoji] = existingGroup;
            }

            const reactionBroadcast = JSON.stringify({
              type: 'reaction',
              messageId,
              emoji,
              user,
              reactions: targetMsg.reactions,
            });

            room.participants.forEach((_, clientWs) => {
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(reactionBroadcast);
              }
            });
            break;
          }

          case 'typing': {
            const { roomId, user, isTyping } = data;
            if (!roomId) return;
            const room = rooms.get(roomId);
            if (!room) return;

            const typingBroadcast = JSON.stringify({
              type: 'typing',
              user,
              isTyping,
            });

            room.participants.forEach((_, clientWs) => {
              if (clientWs !== ws && clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(typingBroadcast);
              }
            });
            break;
          }

          case 'leave': {
            handleClientDisconnect(ws);
            break;
          }

          case 'ping': {
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
          }
        }
      } catch (err) {
        console.error('WebSocket message parsing error:', err);
      }
    });

    ws.on('close', () => {
      handleClientDisconnect(ws);
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
      handleClientDisconnect(ws);
    });
  });

  function handleClientDisconnect(ws: WebSocket) {
    const meta = clientData.get(ws);
    if (!meta) return;

    const { roomId, user } = meta;
    const room = rooms.get(roomId);
    if (!room) return;

    room.participants.delete(ws);
    clientData.delete(ws);

    const remainingParticipants = Array.from(room.participants.values());

    const leaveBroadcast = JSON.stringify({
      type: 'user_left',
      userId: user.id,
      userName: user.name,
      participants: remainingParticipants,
    });

    room.participants.forEach((_, clientWs) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(leaveBroadcast);
      }
    });

    // Cleanup empty rooms after 3 hours
    if (room.participants.size === 0) {
      setTimeout(() => {
        const currentRoom = rooms.get(roomId);
        if (currentRoom && currentRoom.participants.size === 0) {
          rooms.delete(roomId);
        }
      }, 3 * 60 * 60 * 1000);
    }
  }

  // Heartbeat interval to clean dead connections
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws: WebSocket) => {
      if ((ws as any).isAlive === false) {
        handleClientDisconnect(ws);
        return ws.terminate();
      }
      (ws as any).isAlive = false;
      ws.ping();
    });
  }, 30000);

  // Self-destructing messages cleanup interval
  const expirationInterval = setInterval(() => {
    const now = Date.now();
    rooms.forEach((room) => {
      const expiredMsgs = room.messages.filter(m => m.expiresAt && m.expiresAt <= now && !m.isDeleted);
      if (expiredMsgs.length > 0) {
        expiredMsgs.forEach(m => {
          m.isDeleted = true;
          if (room.pinnedMessageId === m.id) {
            room.pinnedMessageId = null;
          }
        });
        // Also remove expired messages from memory array
        room.messages = room.messages.filter(m => !m.expiresAt || m.expiresAt > now);
      }
    });
  }, 3000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
    clearInterval(expirationInterval);
  });

  // Vite middleware in dev / static in prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      // The custom WebSocket server owns the HTTP server. Vite's HMR socket
      // must not create a second listener (which causes EADDRINUSE and leaves
      // the room client stuck in “Menghubungkan...” ).
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`RuangObrol Fullstack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
