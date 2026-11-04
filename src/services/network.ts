import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserProfile, ChatMessage, BlinkRequest } from '../types';

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

export class NetworkService {
  /**
   * Broadcast message over Supabase Realtime channel or local channel
   */
  static subscribeToRoom(
    roomId: string,
    onMessage: (msg: ChatMessage) => void,
    onTyping?: (userHandle: string) => void
  ) {
    if (supabase) {
      const channel = supabase.channel(`room_${roomId}`, {
        config: { broadcast: { self: false } },
      });

      channel
        .on('broadcast', { event: 'message' }, ({ payload }) => {
          onMessage(payload as ChatMessage);
        })
        .on('broadcast', { event: 'typing' }, ({ payload }) => {
          if (onTyping && payload?.handle) {
            onTyping(payload.handle);
          }
        })
        .subscribe();

      return () => {
        supabase?.removeChannel(channel);
      };
    }

    // BroadcastChannel fallback for multi-tab / local testing
    const bc = new BroadcastChannel(`blinkmsg_room_${roomId}`);
    bc.onmessage = (event) => {
      if (event.data?.type === 'message') {
        onMessage(event.data.payload);
      } else if (event.data?.type === 'typing' && onTyping) {
        onTyping(event.data.handle);
      }
    };

    return () => {
      bc.close();
    };
  }

  static async broadcastMessage(roomId: string, message: ChatMessage) {
    if (supabase) {
      const channel = supabase.channel(`room_${roomId}`);
      await channel.send({
        type: 'broadcast',
        event: 'message',
        payload: message,
      });
      return;
    }

    const bc = new BroadcastChannel(`blinkmsg_room_${roomId}`);
    bc.postMessage({ type: 'message', payload: message });
  }

  static async broadcastTyping(roomId: string, handle: string) {
    if (supabase) {
      const channel = supabase.channel(`room_${roomId}`);
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { handle },
      });
      return;
    }

    const bc = new BroadcastChannel(`blinkmsg_room_${roomId}`);
    bc.postMessage({ type: 'typing', handle });
  }
}
