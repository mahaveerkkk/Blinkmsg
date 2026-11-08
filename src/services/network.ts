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

// Empty list - only real registered profiles are fetched from Supabase
export const MOCK_RADAR_USERS: UserProfile[] = [];

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

/**
 * Generates a stable, unique 6-digit Personal Connection PIN from a user's handle.
 * e.g. "falcon_9" -> "742819", always identical for the same handle.
 */
export function handleToPin(handle: string): string {
  if (!handle) return '100001';
  let hash = 5381;
  const clean = handle.toLowerCase().trim().replace(/^@/, '');
  for (let i = 0; i < clean.length; i++) {
    hash = ((hash << 5) + hash) + clean.charCodeAt(i);
    hash = hash & hash;
  }
  const pos = Math.abs(hash) % 900000 + 100000;
  return String(pos);
}

export interface RoomSubscriptionCallbacks {
  onMessage: (payload: WireMessagePayload | ChatMessage) => void;
  onTyping?: (userHandle: string) => void;
  onReaction?: (data: { msgId: string; reaction?: string }) => void;
  onBurnReveal?: (data: { msgId: string; expiresAt: number }) => void;
  onTimerChange?: (data: { timerSeconds: number; isBurnOnRead: boolean; setByHandle: string }) => void;
  onPeerJoin?: (data: { handle: string; displayName?: string; avatarId: number }) => void;
  onDeliveryAck?: (data: { msgId: string; status: 'delivered' | 'read' }) => void;
  onScreenshotAlert?: (data: { handle: string }) => void;
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

      ch.on('broadcast', { event: 'timer_change' }, ({ payload }) => {
        if (callbacks.onTimerChange && payload) {
          callbacks.onTimerChange(payload);
        }
      });

      ch.on('broadcast', { event: 'peer_join' }, ({ payload }) => {
        if (callbacks.onPeerJoin && payload) {
          callbacks.onPeerJoin(payload);
        }
      });

      ch.on('broadcast', { event: 'delivery_ack' }, ({ payload }) => {
        if (callbacks.onDeliveryAck && payload?.msgId) {
          callbacks.onDeliveryAck(payload);
        }
      });

      ch.on('broadcast', { event: 'screenshot_alert' }, ({ payload }) => {
        if (callbacks.onScreenshotAlert && payload?.handle) {
          callbacks.onScreenshotAlert(payload);
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
        else if (data.type === 'timer_change' && callbacks.onTimerChange) callbacks.onTimerChange(data);
        else if (data.type === 'peer_join' && callbacks.onPeerJoin) callbacks.onPeerJoin(data);
        else if (data.type === 'delivery_ack' && callbacks.onDeliveryAck) callbacks.onDeliveryAck(data);
        else if (data.type === 'screenshot_alert' && callbacks.onScreenshotAlert) callbacks.onScreenshotAlert(data);
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
      } else if (data.type === 'timer_change' && callbacks.onTimerChange) {
        callbacks.onTimerChange(data);
      } else if (data.type === 'peer_join' && callbacks.onPeerJoin) {
        callbacks.onPeerJoin(data);
      } else if (data.type === 'delivery_ack' && callbacks.onDeliveryAck) {
        callbacks.onDeliveryAck(data);
      } else if (data.type === 'screenshot_alert' && callbacks.onScreenshotAlert) {
        callbacks.onScreenshotAlert(data);
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
   * Broadcast an encrypted message over Supabase Realtime and insert into database.
   * If peerHandle is known or roomId is dm_userA__userB, it broadcasts directly to the
   * peer's personal realtime inbox channel so the peer's phone receives an instant alert
   * even from the home screen!
   */
  static async broadcastMessage(
    roomId: string,
    payload: WireMessagePayload | ChatMessage,
    roomCode?: string,
    peerHandle?: string
  ) {
    const normId = normalizeRoomId(roomId);
    const channelName = normId;

    // Detect target peer handle for direct inbox delivery
    let targetPeer = peerHandle ? peerHandle.toLowerCase().replace(/^@/, '') : '';
    if (!targetPeer && normId.startsWith('dm_')) {
      const parts = normId.replace('dm_', '').split('__');
      const sender = (payload.senderHandle || '').toLowerCase().replace(/^@/, '');
      targetPeer = parts[0]?.toLowerCase() === sender ? parts[1]?.toLowerCase() : parts[0]?.toLowerCase();
    }

    // 1. Supabase Realtime Broadcast (< 100ms) to Room
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

      // Also broadcast directly to target peer's personal inbox channel!
      if (targetPeer) {
        const inboxChannelName = `inbox_${targetPeer}`;
        let inboxCh = activeSupabaseChannels.get(inboxChannelName);
        if (!inboxCh) {
          inboxCh = supabase.channel(inboxChannelName, {
            config: { broadcast: { self: false } },
          });
          inboxCh.subscribe();
          activeSupabaseChannels.set(inboxChannelName, inboxCh);
        }

        inboxCh.send({
          type: 'broadcast',
          event: 'incoming_message',
          payload: {
            message: payload,
            room: {
              id: normId,
              code: roomCode || 'DIRECT',
              peerHandle: payload.senderHandle,
              peerDisplayName: payload.senderDisplayName || payload.senderHandle,
              timerSeconds: payload.timerSeconds || 30,
              isBurnOnRead: payload.isBurnOnRead || false,
            },
          },
        }).catch((err) => {
          console.warn('Inbox broadcast send failed:', err);
        });
      }
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

        const insertRow: any = {
          room_id: normId,
          sender_id: payload.senderId,
          sender_handle: payload.senderHandle,
          encrypted_payload: (payload as any).ciphertext || (payload as any).text || '',
          iv: (payload as any).iv || 'direct',
          timer_seconds: payload.timerSeconds || 30,
          is_burn_on_read: payload.isBurnOnRead || false,
          expires_at: expiresAtIso,
        };

        // If payload.id is a standard UUID, insert it directly to guarantee matching IDs between peers
        if (payload.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.id)) {
          insertRow.id = payload.id;
        }

        await supabase.from('ephemeral_messages').insert(insertRow);
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
   * Broadcast room timer change (Signal style room sync)
   */
  static async broadcastTimerChange(
    roomId: string,
    timerSeconds: number,
    isBurnOnRead: boolean,
    setByHandle: string
  ) {
    const normId = normalizeRoomId(roomId);
    const payload = { timerSeconds, isBurnOnRead, setByHandle };

    if (supabase) {
      // Update room in DB
      supabase
        .from('chat_rooms')
        .update({ timer_seconds: timerSeconds, is_burn_on_read: isBurnOnRead })
        .eq('id', normId)
        .then();

      const ch = activeSupabaseChannels.get(normId);
      if (ch) {
        ch.send({
          type: 'broadcast',
          event: 'timer_change',
          payload,
        }).catch(() => {});
      }
    }

    try {
      const bc = NetworkService.getBroadcastChannel(normId);
      bc.postMessage({ type: 'timer_change', ...payload });
    } catch {
      // ignore
    }
  }

  /**
   * Handshake when entering room to let peer discover our name, handle and avatar
   */
  static async broadcastPeerJoin(
    roomId: string,
    handle: string,
    displayName?: string,
    avatarId?: number
  ) {
    const normId = normalizeRoomId(roomId);
    const payload = {
      handle,
      displayName: displayName || handle,
      avatarId: avatarId || 1,
    };

    if (supabase) {
      let ch = activeSupabaseChannels.get(normId);
      if (!ch) {
        ch = supabase.channel(normId, { config: { broadcast: { self: false } } });
        ch.subscribe();
        activeSupabaseChannels.set(normId, ch);
      }
      ch.send({
        type: 'broadcast',
        event: 'peer_join',
        payload,
      }).catch(() => {});
    }

    try {
      const bc = NetworkService.getBroadcastChannel(normId);
      bc.postMessage({ type: 'peer_join', ...payload });
    } catch {
      // ignore
    }
  }

  /**
   * Broadcast read / delivery acknowledgement (single tick -> double tick -> double neon tick)
   */
  static async broadcastDeliveryAck(roomId: string, msgId: string, status: 'delivered' | 'read') {
    const normId = normalizeRoomId(roomId);
    const payload = { msgId, status };

    if (supabase) {
      let ch = activeSupabaseChannels.get(normId);
      if (!ch) {
        ch = supabase.channel(normId, { config: { broadcast: { self: false } } });
        ch.subscribe();
        activeSupabaseChannels.set(normId, ch);
      }
      ch.send({
        type: 'broadcast',
        event: 'delivery_ack',
        payload,
      }).catch((err) => {
        console.warn('Realtime delivery ack broadcast failed:', err);
      });
    }

    try {
      const bc = NetworkService.getBroadcastChannel(normId);
      bc.postMessage({ type: 'delivery_ack', ...payload });
    } catch {
      // ignore
    }
  }

  /**
   * Broadcast screenshot detection alert
   */
  static async broadcastScreenshotAlert(roomId: string, handle: string) {
    const normId = normalizeRoomId(roomId);
    const payload = { handle };

    if (supabase) {
      const ch = activeSupabaseChannels.get(normId);
      if (ch) {
        ch.send({
          type: 'broadcast',
          event: 'screenshot_alert',
          payload,
        }).catch(() => {});
      }
    }

    try {
      const bc = NetworkService.getBroadcastChannel(normId);
      bc.postMessage({ type: 'screenshot_alert', ...payload });
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
          const previewText = row.encrypted_payload?.startsWith('data:image')
            ? '📸 Ephemeral Photo'
            : row.encrypted_payload || '';

          roomMap.set(roomId, {
            id: roomId,
            code: 'DM',
            participantCount: 2,
            timerSeconds: row.timer_seconds || 30,
            isBurnOnRead: row.is_burn_on_read || false,
            peerHandle,
            peerAvatarId: 3,
            lastMessageText: previewText,
            lastMessageTime: new Date(row.created_at).getTime(),
          });
        }
      }

      return Array.from(roomMap.values());
    } catch (err) {
      console.warn('Failed to fetch user DMs:', err);
      return [];
    }
  }

  /**
   * Fetches real active user profiles registered in Supabase
   */
  static async fetchActiveProfiles(currentHandle?: string): Promise<UserProfile[]> {
    if (!supabase) return [];
    try {
      let query = supabase.from('profiles').select('*').eq('is_available', true).limit(50);
      if (currentHandle) {
        query = query.neq('handle', currentHandle.toLowerCase());
      }
      const { data, error } = await query;
      if (error || !data) return [];

      return data.map((d: any) => ({
        id: d.id || 'usr_' + d.handle,
        handle: d.handle,
        displayName: d.display_name || d.handle,
        avatarId: d.avatar_id || 1,
        vibe: d.vibe || '',
        isAvailable: d.is_available ?? true,
        country: d.country || 'India',
        state: d.state || '',
        city: d.city || 'New Delhi',
        lastActive: Date.now(),
      }));
    } catch (err) {
      console.warn('Failed to fetch active profiles:', err);
      return [];
    }
  }

  /**
   * Find a user profile by their 6-digit Personal PIN or @handle
   */
  static async findProfileByPin(pinOrHandle: string): Promise<UserProfile | null> {
    if (!supabase || !pinOrHandle) return null;
    const clean = pinOrHandle.trim().toLowerCase().replace(/^@/, '');

    try {
      // 1. Direct handle match
      const { data: directData } = await supabase
        .from('profiles')
        .select('*')
        .eq('handle', clean)
        .maybeSingle();

      if (directData) {
        return {
          id: directData.id || 'usr_' + directData.handle,
          handle: directData.handle,
          displayName: directData.display_name || directData.handle,
          avatarId: directData.avatar_id || 1,
          vibe: directData.vibe || '',
          isAvailable: directData.is_available ?? true,
          country: directData.country || 'India',
          state: directData.state || '',
          city: directData.city || 'New Delhi',
          lastActive: Date.now(),
          pin: handleToPin(directData.handle),
        };
      }

      // 2. Scan profiles to match 6-digit PIN
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('*')
        .limit(200);

      if (allProfiles && allProfiles.length > 0) {
        const match = allProfiles.find((p: any) => handleToPin(p.handle) === clean);
        if (match) {
          return {
            id: match.id || 'usr_' + match.handle,
            handle: match.handle,
            displayName: match.display_name || match.handle,
            avatarId: match.avatar_id || 1,
            vibe: match.vibe || '',
            isAvailable: match.is_available ?? true,
            country: match.country || 'India',
            state: match.state || '',
            city: match.city || 'New Delhi',
            lastActive: Date.now(),
            pin: clean,
          };
        }
      }

      return null;
    } catch (err) {
      console.warn('Failed to find profile by PIN:', err);
      return null;
    }
  }

  /**
   * Broadcast a peer connection notice so the friend's device receives an immediate handshake
   */
  static async sendPeerConnectedNotice(targetHandle: string, fromUser: UserProfile): Promise<void> {
    if (!supabase || !targetHandle) return;
    const inboxName = `inbox_${targetHandle.toLowerCase().replace(/^@/, '')}`;

    try {
      let ch = activeSupabaseChannels.get(inboxName);
      if (!ch) {
        ch = supabase.channel(inboxName, {
          config: { broadcast: { self: false } },
        });
        ch.subscribe();
        activeSupabaseChannels.set(inboxName, ch);
      }

      await ch.send({
        type: 'broadcast',
        event: 'peer_connected',
        payload: {
          handle: fromUser.handle,
          displayName: fromUser.displayName || fromUser.handle,
          avatarId: fromUser.avatarId || 1,
        },
      });
    } catch (err) {
      console.warn('Failed to send peer connected notice:', err);
    }
  }
}
