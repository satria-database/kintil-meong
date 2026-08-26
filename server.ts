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

interface EventLogEntry {
  seq: number;
  event: any;
}

interface Room {
  id: string;
  name: string;
  createdAt: number;
  messages: EncryptedMessage[];
  participants: Map<WebSocket, RoomParticipant>;
  pollingParticipants: Map<string, RoomParticipant>;
  pinnedMessageId?: string | null;
  disappearingTimer?: number; // 0 = off, >0 seconds
  eventLog: EventLogEntry[];
  nextEventSeq: number;
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
      pollingParticipants: new Map(),
      pinnedMessageId: null,
      disappearingTimer: 0,
      eventLog: [],
      nextEventSeq: 0,
    };
    rooms.set(roomId, room);
  } else if (roomName && room.name.startsWith('Ruang #')) {
    room.name = roomName;
  }
  return room;
}

function getAllParticipants(room: Room): RoomParticipant[] {
  return [
    ...Array.from(room.participants.values()),
    ...Array.from(room.pollingParticipants.values()),
  ];
}

// Broadcast an event to WebSocket clients AND push to the event log for polling clients
function broadcastToRoom(room: Room, event: any, excludeWs?: WebSocket) {
  const seq = room.nextEventSeq++;
  room.eventLog.push({ seq, event });
  if (room.eventLog.length > 500) {
    room.eventLog.shift();
  }

  const data = JSON.stringify(event);
  room.participants.forEach((_, clientWs) => {
    if (clientWs !== excludeWs && clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data);
    }
  });
}

// Shared action handler — used by both WebSocket and HTTP polling clients
function processMessageAction(data: any) {
  switch (data.type) {
    case 'message': {
      const { roomId, message } = data;
      if (!roomId || !message) return;

      const room = rooms.get(roomId);
      if (!room) return;

      const msgTtl = message.ttl !== undefined ? message.ttl : (room.disappearingTimer || 0);
      const expiresAt = msgTtl > 0 ? (message.expiresAt || (Date.now() + msgTtl * 1000)) : undefined;

      const otherParticipants = getAllParticipants(room).filter(p => p.id !== message.senderId);
      const initialDeliveredTo = otherParticipants.map(p => p.id);

      const processedMessage: EncryptedMessage = {
        ...message,
        ttl: msgTtl > 0 ? msgTtl : undefined,
        expiresAt,
        deliveredTo: Array.from(new Set([...(message.deliveredTo || []), ...initialDeliveredTo])),
        readBy: message.readBy || {},
        status: initialDeliveredTo.length > 0 ? 'delivered' : 'sent',
      };

      room.messages.push(processedMessage);
      if (room.messages.length > 200) {
        room.messages.shift();
      }

      broadcastToRoom(room, { type: 'message', message: processedMessage });
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

        broadcastToRoom(room, { type: 'message_edited', message: room.messages[idx] });
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

        broadcastToRoom(room, { type: 'message_deleted', messageId, senderId });
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

      broadcastToRoom(room, {
        type: 'message_pinned',
        pinnedMessageId: newPinnedId,
        pinnedBy,
        pinnedAt: Date.now(),
      });
      break;
    }

    case 'set_disappearing_timer': {
      const { roomId, timerSeconds, changedBy } = data;
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room) return;

      room.disappearingTimer = Number(timerSeconds) || 0;

      broadcastToRoom(room, {
        type: 'disappearing_timer_changed',
        timerSeconds: room.disappearingTimer,
        changedBy: changedBy || 'Anggota',
      });
      break;
    }

    case 'read_receipt': {
      const { roomId, messageIds, reader, readAt } = data;
      if (!roomId || !Array.isArray(messageIds) || messageIds.length === 0 || !reader) return;

      const room = rooms.get(roomId);
      if (!room) return;

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
        broadcastToRoom(room, {
          type: 'read_receipt',
          messageIds: updatedIds,
          reader,
          readAt: readAt || Date.now(),
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
        broadcastToRoom(room, {
          type: 'delivery_ack',
          messageIds: updatedIds,
          recipientId,
          deliveredAt: deliveredAt || Date.now(),
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
        existingGroup.users.splice(existingUserIndex, 1);
        if (existingGroup.users.length === 0) {
          delete targetMsg.reactions[emoji];
        } else {
          targetMsg.reactions[emoji] = existingGroup;
        }
      } else {
        existingGroup.users.push({ id: user.id, name: user.name });
        targetMsg.reactions[emoji] = existingGroup;
      }

      broadcastToRoom(room, {
        type: 'reaction',
        messageId,
        emoji,
        user,
        reactions: targetMsg.reactions,
      });
      break;
    }

    case 'typing': {
      const { roomId, user, isTyping } = data;
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room) return;

      broadcastToRoom(room, { type: 'typing', user, isTyping });
      break;
    }
  }
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
      participantCount: room.participants.size + room.pollingParticipants.size,
      createdAt: room.createdAt,
    });
  });

  // ---- HTTP Polling fallback (for environments where WebSocket is blocked) ----

  // Join a room via HTTP polling
  app.post('/api/poll/join', (req, res) => {
    const { roomId, roomName, user } = req.body;
    if (!roomId || !user) {
      res.status(400).json({ error: 'Missing roomId or user' });
      return;
    }

    const room = getOrCreateRoom(roomId, roomName);
    const participant: RoomParticipant = {
      ...user,
      isOnline: true,
      joinedAt: Date.now(),
    };

    room.pollingParticipants.set(user.id, participant);

    const participantsList = getAllParticipants(room);

    // Broadcast user_joined to WS clients + event log
    broadcastToRoom(room, {
      type: 'user_joined',
      user: participant,
      participants: participantsList,
    });

    // Return initial state (same shape as WS room_init)
    res.json({
      type: 'room_init',
      roomId: room.id,
      roomName: room.name,
      participants: participantsList,
      messages: room.messages,
      pinnedMessageId: room.pinnedMessageId || null,
      disappearingTimer: room.disappearingTimer || 0,
    });
  });

  // Poll for events since a sequence number
  app.get('/api/poll', (req, res) => {
    const { roomId, since } = req.query;
    if (!roomId) {
      res.status(400).json({ error: 'Missing roomId' });
      return;
    }

    const room = rooms.get(roomId as string);
    if (!room) {
      res.json({ events: [] });
      return;
    }

    const sinceSeq = parseInt(String(since ?? '-1'), 10);
    const events = room.eventLog.filter(e => e.seq > sinceSeq);

    res.json({ events });
  });

  // Send an action via HTTP (same message types as WebSocket)
  app.post('/api/poll/action', (req, res) => {
    processMessageAction(req.body);
    res.json({ ok: true });
  });

  // Leave a room via HTTP
  app.post('/api/poll/leave', (req, res) => {
    const { roomId, userId } = req.body;
    if (!roomId || !userId) {
      res.status(400).json({ error: 'Missing roomId or userId' });
      return;
    }

    const room = rooms.get(roomId);
    if (!room) {
      res.json({ ok: true });
      return;
    }

    const user = room.pollingParticipants.get(userId);
    if (!user) {
      res.json({ ok: true });
      return;
    }

    room.pollingParticipants.delete(userId);

    const remainingParticipants = getAllParticipants(room);

    broadcastToRoom(room, {
      type: 'user_left',
      userId: user.id,
      userName: user.name,
      participants: remainingParticipants,
    });

    res.json({ ok: true });
  });

  // ---- WebSocket Server Setup on /ws ----
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

            const participantsList = getAllParticipants(room);

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
            broadcastToRoom(room, {
              type: 'user_joined',
              user: participant,
              participants: participantsList,
            }, ws);
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

          default: {
            processMessageAction(data);
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

    const remainingParticipants = getAllParticipants(room);

    broadcastToRoom(room, {
      type: 'user_left',
      userId: user.id,
      userName: user.name,
      participants: remainingParticipants,
    });

    // Cleanup empty rooms after 3 hours
    if (room.participants.size === 0 && room.pollingParticipants.size === 0) {
      setTimeout(() => {
        const currentRoom = rooms.get(roomId);
        if (currentRoom && currentRoom.participants.size === 0 && currentRoom.pollingParticipants.size === 0) {
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
      server: { middlewareMode: true },
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
