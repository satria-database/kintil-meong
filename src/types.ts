export interface User {
  id: string;
  name: string;
  avatar: string;
  color: string;
  isOnline?: boolean;
  joinedAt: number;
}

export interface AttachedFile {
  name: string;
  type: string;
  size: number;
  dataUrl: string; // Base64 data URL encrypted in payload
}

export interface ReplyPreview {
  id: string;
  senderName: string;
  textSnippet: string;
  hasFile?: boolean;
  fileName?: string;
}

export interface ReadReceiptEntry {
  readAt: number;
  userName: string;
}

export interface MessageReactionGroup {
  emoji: string;
  users: { id: string; name: string }[];
}

export interface EncryptedPayload {
  text: string;
  mentions: string[]; // array of usernames or user IDs
  replyTo?: ReplyPreview | null;
  file?: AttachedFile | null;
  timestamp: number;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  readBy?: Record<string, ReadReceiptEntry>;
  deliveredTo?: string[];
  reactions?: Record<string, MessageReactionGroup>;
  ttl?: number; // Time-to-live in seconds for self-destructing messages (e.g. 10, 30, 300, 3600, 86400)
  expiresAt?: number; // Unix timestamp in ms when message self-destructs
  editedAt?: number; // Unix timestamp in ms when message was last edited
  isDeleted?: boolean; // If message was retracted/deleted for everyone
}

export interface EncryptedMessage {
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
  readBy?: Record<string, ReadReceiptEntry>;
  reactions?: Record<string, MessageReactionGroup>;
  ttl?: number;
  expiresAt?: number;
  editedAt?: number;
  isDeleted?: boolean;
  isPinned?: boolean;
  pinnedBy?: string;
  pinnedAt?: number;
}

export interface DecryptedMessage extends EncryptedMessage {
  decryptedPayload?: EncryptedPayload;
  decryptionFailed?: boolean;
}

export interface RoomParticipant extends User {
  socketId?: string;
}

export interface RoomState {
  id: string;
  name: string;
  createdAt: number;
  participants: RoomParticipant[];
  messages: DecryptedMessage[];
  pinnedMessage?: DecryptedMessage | null;
  disappearingTimer?: number; // 0 = off, >0 seconds
}

export interface SavedRoom {
  id: string;
  name: string;
  passkey: string;
  lastVisited: number;
}

export type WSClientAction =
  | { type: 'join'; roomId: string; roomName?: string; user: User }
  | { type: 'message'; roomId: string; message: EncryptedMessage }
  | { type: 'edit_message'; roomId: string; message: EncryptedMessage }
  | { type: 'delete_message'; roomId: string; messageId: string; senderId: string }
  | { type: 'pin_message'; roomId: string; messageId: string; unpin?: boolean; pinnedBy?: string }
  | { type: 'set_disappearing_timer'; roomId: string; timerSeconds: number; changedBy: string }
  | { type: 'read_receipt'; roomId: string; messageIds: string[]; reader: { id: string; name: string }; readAt: number }
  | { type: 'delivery_ack'; roomId: string; messageIds: string[]; recipientId: string; deliveredAt: number }
  | { type: 'reaction'; roomId: string; messageId: string; emoji: string; user: { id: string; name: string } }
  | { type: 'typing'; roomId: string; user: { id: string; name: string }; isTyping: boolean }
  | { type: 'leave'; roomId: string; userId: string }
  | { type: 'ping' };

export type WSServerEvent =
  | { type: 'room_init'; roomId: string; roomName: string; participants: RoomParticipant[]; messages: EncryptedMessage[]; pinnedMessageId?: string | null; disappearingTimer?: number }
  | { type: 'user_joined'; user: RoomParticipant; participants: RoomParticipant[] }
  | { type: 'user_left'; userId: string; userName: string; participants: RoomParticipant[] }
  | { type: 'message'; message: EncryptedMessage }
  | { type: 'message_edited'; message: EncryptedMessage }
  | { type: 'message_deleted'; messageId: string; senderId: string }
  | { type: 'message_pinned'; pinnedMessageId: string | null; pinnedBy?: string; pinnedAt?: number }
  | { type: 'disappearing_timer_changed'; timerSeconds: number; changedBy: string }
  | { type: 'read_receipt'; messageIds: string[]; reader: { id: string; name: string }; readAt: number }
  | { type: 'delivery_ack'; messageIds: string[]; recipientId: string; deliveredAt: number }
  | { type: 'reaction'; messageId: string; emoji: string; user: { id: string; name: string }; reactions: Record<string, MessageReactionGroup> }
  | { type: 'typing'; user: { id: string; name: string }; isTyping: boolean }
  | { type: 'pong' }
  | { type: 'error'; message: string };
