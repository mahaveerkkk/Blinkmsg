export interface UserProfile {
  id: string;
  handle: string; // e.g. "shadow_falcon" (without @)
  displayName: string;
  avatarId: number;
  vibe: string;
  isAvailable: boolean;
  country: string;
  state: string;
  city: string;
  lastActive: number;
  pin?: string;
}

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderHandle: string;
  senderDisplayName?: string;
  text: string;
  mediaUrl?: string; // Encrypted / ephemeral image data URL
  audioUrl?: string; // Encrypted / ephemeral voice note data URL
  audioDuration?: number; // voice note duration in seconds
  createdAt: number;
  timerSeconds: number; // e.g. 0 (off), 10, 30, 60, 300
  expiresAt: number; // timestamp when it burns (0 = burn on read waiting for reveal or off)
  isBurnOnRead: boolean;
  isHoldToReveal?: boolean; // Requires holding finger to unveil
  isRevealed?: boolean;
  isRead?: boolean;
  readAt?: number;
  status: MessageStatus;
  reaction?: string;
  isBurning?: boolean; // trigger flame animation
  ciphertext?: string;
  iv?: string;
}

export interface WireMessagePayload {
  id: string;
  roomId: string;
  senderId: string;
  senderHandle: string;
  senderDisplayName?: string;
  ciphertext: string;
  iv: string;
  createdAt: number;
  timerSeconds: number;
  expiresAt: number;
  isBurnOnRead: boolean;
  isHoldToReveal?: boolean;
  status: MessageStatus;
  reaction?: string;
  mediaUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
}

export interface ChatRoom {
  id: string;
  code: string; // 6-digit code
  name?: string;
  participantCount: number;
  timerSeconds: number;
  isBurnOnRead: boolean;
  secretKey?: string; // Base64 AES-GCM key
  peerHandle?: string;
  peerDisplayName?: string;
  peerAvatarId?: number;
  peerStatus?: 'online' | 'offline' | 'typing';
  lastMessageText?: string;
  lastMessageTime?: number;
  unreadCount?: number;
}

export interface BlinkRequest {
  id: string;
  fromUser: UserProfile;
  toHandle: string;
  timestamp: number;
  status: 'pending' | 'accepted' | 'declined';
  roomId?: string;
}

export type ActiveTab = 'radar' | 'chats' | 'vault' | 'profile';
