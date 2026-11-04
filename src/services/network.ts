import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { UserProfile, WireMessagePayload, ChatMessage } from '../types';

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

// Persistent channel registries to prevent memory leaks & port exhaustion
const activeBroadcastChannels = new Map<string, BroadcastChannel>();
const activeSupabaseChannels = new Map<string, RealtimeChannel>();
let lastTypingTime = 0;

export interface RoomSubscriptionCallbacks {
  onMessage: (payload: WireMessagePayload | ChatMessage) => void;
  onTyping?: (userHandle: string) => void;
  onReaction?: (data: { msgId: string; reaction?: string }) => void;
  onBurnReveal?: (data: { msgId: string; expiresAt: number }) => void;
}

export class NetworkService {
  private static getBroadcastChannel(roomId: string): BroadcastChannel {
    let bc = activeBroadcastChannels.get(roomId);
    if (!bc) {
      bc = new BroadcastChannel(`blinkmsg_room_${roomId}`);
      activeBroadcastChannels.set(roomId, bc);
    }
    return bc;
  }

  private static getSupabaseChannel(roomId: string): RealtimeChannel | null {
    if (!supabase) return null;
    let ch = activeSupabaseChannels.get(roomId);
    if (!ch) {
      ch = supabase.channel(`room_${roomId}`, {
        config: { broadcast: { self: false } },
      });
      ch.subscribe();
      activeSupabaseChannels.set(roomId, ch);
    }
    return ch;
  }

  /**
   * Subscribe to room events (encrypted messages, typing, reaction, burn_reveal)
   */
  static subscribeToRoom(
    roomId: string,
    callbacks: RoomSubscriptionCallbacks
  ): () => void {
    const { onMessage, onTyping, onReaction, onBurnReveal } = callbacks;

    if (supabase) {
      const channel = NetworkService.getSupabaseChannel(roomId);

      if (channel) {
        channel
          .on('broadcast', { event: 'message' }, ({ payload }) => {
            onMessage(payload as WireMessagePayload);
          })
          .on('broadcast', { event: 'typing' }, ({ payload }) => {
            if (onTyping && payload?.handle) {
              onTyping(payload.handle);
            }
          })
          .on('broadcast', { event: 'reaction' }, ({ payload }) => {
            if (onReaction && payload?.msgId) {
              onReaction(payload);
            }
          })
          .on('broadcast', { event: 'burn_reveal' }, ({ payload }) => {
            if (onBurnReveal && payload?.msgId) {
              onBurnReveal(payload);
            }
          });
      }

      return () => {
        if (channel) {
          supabase.removeChannel(channel);
          activeSupabaseChannels.delete(roomId);
        }
      };
    }

    // Local / multi-tab fallback
    const bc = NetworkService.getBroadcastChannel(roomId);
    const listener = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'message') {
        onMessage(data.payload);
      } else if (data.type === 'typing' && onTyping) {
        onTyping(data.handle);
      } else if (data.type === 'reaction' && onReaction) {
        onReaction({ msgId: data.msgId, reaction: data.reaction });
      } else if (data.type === 'burn_reveal' && onBurnReveal) {
        onBurnReveal({ msgId: data.msgId, expiresAt: data.expiresAt });
      }
    };

    bc.addEventListener('message', listener);

    return () => {
      bc.removeEventListener('message', listener);
      // If no other listeners, close channel
      bc.close();
      activeBroadcastChannels.delete(roomId);
    };
  }

  /**
   * Broadcast an encrypted message over network
   */
  static async broadcastMessage(roomId: string, payload: WireMessagePayload | ChatMessage) {
    if (supabase) {
      const ch = NetworkService.getSupabaseChannel(roomId);
      if (ch) {
        await ch.send({
          type: 'broadcast',
          event: 'message',
          payload,
        });
        return;
      }
    }

    const bc = NetworkService.getBroadcastChannel(roomId);
    bc.postMessage({ type: 'message', payload });
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

    if (supabase) {
      const ch = NetworkService.getSupabaseChannel(roomId);
      if (ch) {
        await ch.send({
          type: 'broadcast',
          event: 'typing',
          payload: { handle },
        });
        return;
      }
    }

    const bc = NetworkService.getBroadcastChannel(roomId);
    bc.postMessage({ type: 'typing', handle });
  }

  /**
   * Broadcast message heart / emoji reaction
   */
  static async broadcastReaction(roomId: string, msgId: string, reaction?: string) {
    if (supabase) {
      const ch = NetworkService.getSupabaseChannel(roomId);
      if (ch) {
        await ch.send({
          type: 'broadcast',
          event: 'reaction',
          payload: { msgId, reaction },
        });
        return;
      }
    }

    const bc = NetworkService.getBroadcastChannel(roomId);
    bc.postMessage({ type: 'reaction', msgId, reaction });
  }

  /**
   * Broadcast burn on read reveal so sender screen self-destructs simultaneously
   */
  static async broadcastBurnReveal(roomId: string, msgId: string, expiresAt: number) {
    if (supabase) {
      const ch = NetworkService.getSupabaseChannel(roomId);
      if (ch) {
        await ch.send({
          type: 'broadcast',
          event: 'burn_reveal',
          payload: { msgId, expiresAt },
        });
        return;
      }
    }

    const bc = NetworkService.getBroadcastChannel(roomId);
    bc.postMessage({ type: 'burn_reveal', msgId, expiresAt });
  }
}
