import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { UserProfile, WireMessagePayload, ChatMessage, ChatRoom } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      },
    })
  : null;

// Mock active radar users for rich immediate testing & experience
export const MOCK_RADAR_USERS: UserProfile[] = [
  {
    id: 'usr_mock_1',
    handle: 'neon_rider',
    displayName: 'NeonRider',
    avatarId: 2,
    vibe: '⚡ Late night crypto & coding talks',
    isAvailable: true,
    country: 'India',
    state: 'Maharashtra',
    city: 'Mumbai',
    lastActive: Date.now() - 1000 * 30,
  },
  {
    id: 'usr_mock_2',
    handle: 'shadow_alex',
    displayName: 'ShadowAlex',
    avatarId: 4,
    vibe: '🕶️ Ghost mode active. Ask me anything.',
    isAvailable: true,
    country: 'India',
    state: 'Delhi',
    city: 'New Delhi',
    lastActive: Date.now() - 1000 * 60,
  },
  {
    id: 'usr_mock_3',
    handle: 'cyber_priya',
    displayName: 'CyberPriya',
    avatarId: 6,
    vibe: '🔥 Burn after reading. Music & tech.',
    isAvailable: true,
    country: 'India',
    state: 'Karnataka',
    city: 'Bengaluru',
    lastActive: Date.now() - 1000 * 120,
  },
  {
    id: 'usr_mock_4',
    handle: 'silent_ninja',
    displayName: 'SilentNinja',
    avatarId: 7,
    vibe: '🌙 Sleep is for the weak',
    isAvailable: true,
    country: 'United States',
    state: 'California',
    city: 'San Francisco',
    lastActive: Date.now() - 1000 * 45,
  },
  {
    id: 'usr_mock_5',
    handle: 'zen_voyager',
    displayName: 'ZenVoyager',
    avatarId: 3,
    vibe: '☕ Looking for deep philosophy chats',
    isAvailable: true,
    country: 'India',
    state: 'Rajasthan',
    city: 'Jaipur',
    lastActive: Date.now() - 1000 * 90,
  },
];

// Persistent channel registries to prevent memory leaks & duplicate listeners
const activeBroadcastChannels = new Map<string, BroadcastChannel>();
const activeSupabaseChannels = new Map<string, RealtimeChannel>();
let lastTypingTime = 0;

export function normalizeRoomId(roomId: string): string {
  if (!roomId) return 'room_000000';
  const clean = roomId.trim();
  if (clean.startsWith('room_') || clean.startsWith('dm_')) return clean;
  return `room_${clean}`;
}

export interface RoomSubscriptionCallbacks {
  onMessage: (payload: WireMessagePayload | ChatMessage) => void;
  onTyping?: (userHandle: string) => void;
  onReaction?: (data: { msgId: string; reaction?: string }) => void;
  onBurnReveal?: (data: { msgId: string; expiresAt: number }) => void;
}

export class NetworkService {
  private static getBroadcastChannel(normId: string): BroadcastChannel {
    let bc = activeBroadcastChannels.get(normId);
    if (!bc) {
      bc = new BroadcastChannel(`blinkmsg_${normId}`);
      activeBroadcastChannels.set(normId, bc);
    }
    return bc;
  }

  /**
   * Subscribe to room events (encrypted messages, typing, reaction, burn_reveal)
   */
  static subscribeToRoom(
    roomId: string,
    callbacks: RoomSubscriptionCallbacks
  ): () => void {
    const normId = normalizeRoomId(roomId);
    const channelName = normId;

    if (supabase) {
      // Clean up previous channel if it exists
      const existing = activeSupabaseChannels.get(channelName);
      if (existing) {
        supabase.removeChannel(existing);
        activeSupabaseChannels.delete(channelName);
      }

      // Important: Bind .on() handlers BEFORE calling .subscribe()
      const ch = supabase.channel(channelName, {
        config: { broadcast: { self: false } },
      });

      ch.on('broadcast', { event: 'message' }, ({ payload }) => {
        if (payload) {
          callbacks.onMessage(payload);
        }
      });

      ch.on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (callbacks.onTyping && payload?.handle) {
          callbacks.onTyping(payload.handle);
        }
      });

      ch.on('broadcast', { event: 'reaction' }, ({ payload }) => {
        if (callbacks.onReaction && payload?.msgId) {
          callbacks.onReaction(payload);
        }
      });

      ch.on('broadcast', { event: 'burn_reveal' }, ({ payload }) => {
        if (callbacks.onBurnReveal && payload?.msgId) {
          callbacks.onBurnReveal(payload);
        }
      });

      ch.subscribe((status) => {
        console.log(`[Supabase Channel ${channelName}] Status:`, status);
      });

      activeSupabaseChannels.set(channelName, ch);

      // Also setup multi-tab BroadcastChannel fallback
      const bc = NetworkService.getBroadcastChannel(normId);
      const bcListener = (event: MessageEvent) => {
        const data = event.data;
        if (!data) return;
        if (data.type === 'message') callbacks.onMessage(data.payload);
        else if (data.type === 'typing' && callbacks.onTyping) callbacks.onTyping(data.handle);
        else if (data.type === 'reaction' && callbacks.onReaction) callbacks.onReaction(data);
        else if (data.type === 'burn_reveal' && callbacks.onBurnReveal) callbacks.onBurnReveal(data);
      };
      bc.addEventListener('message', bcListener);

      return () => {
        if (ch) {
          supabase.removeChannel(ch);
          activeSupabaseChannels.delete(channelName);
        }
        bc.removeEventListener('message', bcListener);
      };
    }

    // Local / multi-tab fallback only
    const bc = NetworkService.getBroadcastChannel(normId);
    const listener = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'message') {
        callbacks.onMessage(data.payload);
      } else if (data.type === 'typing' && callbacks.onTyping) {
        callbacks.onTyping(data.handle);
      } else if (data.type === 'reaction' && callbacks.onReaction) {
        callbacks.onReaction({ msgId: data.msgId, reaction: data.reaction });
      } else if (data.type === 'burn_reveal' && callbacks.onBurnReveal) {
        callbacks.onBurnReveal({ msgId: data.msgId, expiresAt: data.expiresAt });
      }
    };

    bc.addEventListener('message', listener);

    return () => {
      bc.removeEventListener('message', listener);
      bc.close();
      activeBroadcastChannels.delete(normId);
    };
  }

  /**
   * Broadcast an encrypted message over Supabase Realtime and insert into database
   */
  static async broadcastMessage(
    roomId: string,
    payload: WireMessagePayload | ChatMessage,
    roomCode?: string
  ) {
    const normId = normalizeRoomId(roomId);
    const channelName = normId;

    // 1. Supabase Realtime Broadcast (< 100ms)
    if (supabase) {
      let ch = activeSupabaseChannels.get(channelName);
      if (!ch) {
        ch = supabase.channel(channelName, {
          config: { broadcast: { self: false } },
        });
        ch.subscribe();
        activeSupabaseChannels.set(channelName, ch);
      }

      ch.send({
        type: 'broadcast',
        event: 'message',
        payload,
      }).catch((err) => {
        console.warn('Realtime broadcast send failed:', err);
      });
    }

    // 2. Supabase DB Persistence (Guarantees delivery even if peer joins after sending)
    if (supabase) {
      try {
        const code = roomCode || (normId.startsWith('room_') ? normId.replace('room_', '') : 'DIRECT');
        // Ensure room exists
        await supabase.from('chat_rooms').upsert({
          id: normId,
          code: code.substring(0, 6),
          timer_seconds: payload.timerSeconds || 30,
          is_burn_on_read: payload.isBurnOnRead || false,
        });

        const expiresAtIso = payload.expiresAt && payload.expiresAt > 0
          ? new Date(payload.expiresAt).toISOString()
          : new Date(Date.now() + 86400000).toISOString(); // 24h default for burn-on-read waiting

        await supabase.from('ephemeral_messages').insert({
          room_id: normId,
          sender_id: payload.senderId,
          sender_handle: payload.senderHandle,
          encrypted_payload: (payload as any).ciphertext || (payload as any).text || '',
          iv: (payload as any).iv || 'direct',
          timer_seconds: payload.timerSeconds || 30,
          is_burn_on_read: payload.isBurnOnRead || false,
          expires_at: expiresAtIso,
        });
      } catch (err) {
        console.warn('Supabase DB message insert failed:', err);
      }
    }

    // 3. Multi-tab fallback
    try {
      const bc = NetworkService.getBroadcastChannel(normId);
      bc.postMessage({ type: 'message', payload });
    } catch {
      // ignore
    }
  }

  /**
   * Broadcast typing indicator with 800ms debounce
   */
  static async broadcastTyping(roomId: string, handle: string) {
    const now = Date.now();
    if (now - lastTypingTime < 800) {
      return; // Debounce typing packets
    }
    lastTypingTime = now;
    const normId = normalizeRoomId(roomId);

    if (supabase) {
      const ch = activeSupabaseChannels.get(normId);
      if (ch) {
        ch.send({
          type: 'broadcast',
          event: 'typing',
          payload: { handle },
        }).catch(() => {});
      }
    }

    try {
      const bc = NetworkService.getBroadcastChannel(normId);
      bc.postMessage({ type: 'typing', handle });
    } catch {
      // ignore
    }
  }

  /**
   * Broadcast message heart / emoji reaction
   */
  static async broadcastReaction(roomId: string, msgId: string, reaction?: string) {
    const normId = normalizeRoomId(roomId);
    if (supabase) {
      const ch = activeSupabaseChannels.get(normId);
      if (ch) {
        ch.send({
          type: 'broadcast',
          event: 'reaction',
          payload: { msgId, reaction },
        }).catch(() => {});
      }
    }

    try {
      const bc = NetworkService.getBroadcastChannel(normId);
      bc.postMessage({ type: 'reaction', msgId, reaction });
    } catch {
      // ignore
    }
  }

  /**
   * Broadcast burn on read reveal so sender screen self-destructs simultaneously
   */
  static async broadcastBurnReveal(roomId: string, msgId: string, expiresAt: number) {
    const normId = normalizeRoomId(roomId);
    if (supabase) {
      const ch = activeSupabaseChannels.get(normId);
      if (ch) {
        ch.send({
          type: 'broadcast',
          event: 'burn_reveal',
          payload: { msgId, expiresAt },
        }).catch(() => {});
      }
    }

    try {
      const bc = NetworkService.getBroadcastChannel(normId);
      bc.postMessage({ type: 'burn_reveal', msgId, expiresAt });
    } catch {
      // ignore
    }
  }

  /**
   * Fetches active, unexpired messages for a room from Supabase
   */
  static async fetchRoomMessages(roomId: string): Promise<ChatMessage[]> {
    const normId = normalizeRoomId(roomId);
    if (!supabase) return [];

    try {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('ephemeral_messages')
        .select('*')
        .eq('room_id', normId)
        .gt('expires_at', nowIso)
        .order('created_at', { ascending: true });

      if (error || !data) return [];

      return data.map((row: any) => ({
        id: row.id,
        roomId: row.room_id,
        senderId: row.sender_id,
        senderHandle: row.sender_handle,
        text: row.encrypted_payload, // Plaintext or ciphertext
        ciphertext: row.encrypted_payload,
        iv: row.iv,
        createdAt: new Date(row.created_at).getTime(),
        timerSeconds: row.timer_seconds,
        expiresAt: new Date(row.expires_at).getTime(),
        isBurnOnRead: row.is_burn_on_read,
        status: 'delivered',
      }));
    } catch (err) {
      console.warn('Failed to fetch room messages from Supabase:', err);
      return [];
    }
  }

  /**
   * Sync profile to Supabase public.profiles table
   */
  static async syncProfileToSupabase(profile: UserProfile): Promise<void> {
    if (!supabase) return;
    try {
      await supabase.from('profiles').upsert(
        {
          handle: profile.handle,
          display_name: profile.displayName || profile.handle,
          avatar_id: profile.avatarId || 1,
          vibe: profile.vibe || 'Hey there, I am using BlinkMsg',
          is_available: profile.isAvailable ?? true,
          city: profile.city || 'New Delhi',
          country: profile.country || 'India',
          last_seen: new Date().toISOString(),
        },
        { onConflict: 'handle' }
      );
    } catch (err) {
      console.warn('Failed to sync profile to Supabase:', err);
    }
  }

  /**
   * Fetches recent direct message conversations for the current user's handle
   */
  static async fetchUserDirectMessages(userHandle: string): Promise<ChatRoom[]> {
    if (!supabase || !userHandle) return [];
    try {
      const cleanHandle = userHandle.toLowerCase();
      const { data, error } = await supabase
        .from('ephemeral_messages')
        .select('*')
        .like('room_id', `dm_%${cleanHandle}%`)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error || !data || data.length === 0) return [];

      const roomMap = new Map<string, ChatRoom>();

      for (const row of data) {
        const roomId = row.room_id;
        if (roomMap.has(roomId)) continue;

        // Parse peer handle from room_id (e.g. dm_alice__bob)
        const parts = roomId.replace('dm_', '').split('__');
        const peerHandle = parts[0]?.toLowerCase() === cleanHandle ? parts[1] : parts[0];

        if (peerHandle) {
          roomMap.set(roomId, {
            id: roomId,
            code: 'DM',
            participantCount: 2,
            timerSeconds: row.timer_seconds || 30,
            isBurnOnRead: row.is_burn_on_read || false,
            peerHandle,
            peerAvatarId: 3,
          });
        }
      }

      return Array.from(roomMap.values());
    } catch (err) {
      console.warn('Failed to fetch user DMs:', err);
      return [];
    }
  }
}
