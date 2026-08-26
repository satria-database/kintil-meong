import { EncryptedPayload } from '../types';

const SALT_FIXED = new TextEncoder().encode('RuangObrol-E2EE-Salt-2026');
const EMOJI_SET = ['🛡️', '🔑', '🔒', '⚡', '💎', '🚀', '🌟', '🧩', '🎯', '🧭', '🔮', '🎨', '🔥', '🌈', '🍀', '🛰️'];

// Helper to convert ArrayBuffer to Base64
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper to convert Base64 to ArrayBuffer
export function base64ToBuffer(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Generate random high-entropy passkey
export function generateRandomPasskey(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let result = 'ro-';
  const randomValues = new Uint8Array(12);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) result += '-';
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

// Derive AES-GCM 256-bit CryptoKey from passphrase
export async function deriveKeyFromPassphrase(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase.trim()),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: SALT_FIXED,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// Calculate fingerprint for security verification
export async function calculateKeyFingerprint(passphrase: string): Promise<{
  hexCode: string;
  emojiCode: string;
}> {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(passphrase.trim()));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  
  // Format hex: 8 bytes grouped as XXXX-XXXX
  const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  const hexCode = `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;

  // Format 4 emojis
  const emojiCode = [
    EMOJI_SET[hashArray[0] % EMOJI_SET.length],
    EMOJI_SET[hashArray[1] % EMOJI_SET.length],
    EMOJI_SET[hashArray[2] % EMOJI_SET.length],
    EMOJI_SET[hashArray[3] % EMOJI_SET.length],
  ].join(' ');

  return { hexCode, emojiCode };
}

// Encrypt payload object
export async function encryptPayload(
  payload: EncryptedPayload,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const enc = new TextEncoder();
  const jsonString = JSON.stringify(payload);
  const data = enc.encode(jsonString);

  // Generate random 12-byte IV for AES-GCM
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    data
  );

  return {
    ciphertext: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv),
  };
}

// Decrypt payload object
export async function decryptPayload(
  ciphertext: string,
  iv: string,
  key: CryptoKey
): Promise<EncryptedPayload> {
  const dec = new TextEncoder();
  const encryptedBytes = base64ToBuffer(ciphertext);
  const ivBytes = base64ToBuffer(iv);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes,
    },
    key,
    encryptedBytes
  );

  const jsonString = new TextDecoder().decode(decryptedBuffer);
  return JSON.parse(jsonString) as EncryptedPayload;
}

// Convert File to Base64 Data URL with automatic size limit check
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    // Limit to 5MB for fast real-time websocket transmission
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error('Ukuran file maksimal adalah 8MB'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

// Format human-readable file size
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
