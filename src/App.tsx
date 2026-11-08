import React, { useState, useEffect } from 'react';
import { UserProfile, ChatRoom, ActiveTab, BlinkRequest } from './types';
import { StorageService } from './services/storage';
import { CryptoService } from './services/crypto';
import { sound } from './services/sound';
import { NetworkService, supabase } from './services/network';
import { BottomNav } from './components/BottomNav';
import { RadarView } from './components/RadarView';
import { SecretVaultView } from './components/SecretVaultView';
import { ChatsListView } from './components/ChatsListView';
import { ChatView } from './components/ChatView';
import { SearchModal } from './components/SearchModal';
import { ProfileView } from './components/ProfileView';
import { PanicModal } from './components/PanicModal';
import { SplashScreen } from './components/SplashScreen';
import { QRScannerModal } from './components/QRScannerModal';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() =>
    StorageService.getProfile()
  );
  const [showSplash, setShowSplash] = useState<boolean>(!StorageService.getProfile());
  const [activeTab, setActiveTab] = useState<ActiveTab>('chats');
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [activeRoomsList, setActiveRoomsList] = useState<ChatRoom[]>(() =>
    StorageService.getProfile() ? StorageService.getRooms(StorageService.getProfile()!.handle) : []
  );
  const [blinkRequests, setBlinkRequests] = useState<BlinkRequest[]>([]);

  // Modals
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPanicOpen, setIsPanicOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // When user switches or logs in, load only that user's rooms
  useEffect(() => {
    if (currentUser?.handle) {
      setActiveRoomsList(StorageService.getRooms(currentUser.handle));
    } else {
      setActiveRoomsList([]);
    }
  }, [currentUser?.handle]);

  // Sync rooms list to user-scoped localStorage
  useEffect(() => {
    if (currentUser?.handle) {
      StorageService.saveRooms(activeRoomsList, currentUser.handle);
    }
  }, [activeRoomsList, currentUser?.handle]);

  // Sync profile to Supabase on startup
  useEffect(() => {
    if (currentUser) {
      NetworkService.syncProfileToSupabase(currentUser);
    }
  }, [currentUser?.handle]);

  // Deep-link join handling (e.g. /#room=123456)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('room=')) {
      const params = new URLSearchParams(hash.replace('#', ''));
      const roomCode = params.get('room');
      const key = params.get('key');

      if (roomCode) {
        const room: ChatRoom = {
          id: 'room_' + roomCode,
          code: roomCode,
          participantCount: 2,
          timerSeconds: 30,
          isBurnOnRead: false,
          secretKey: key || undefined,
          peerHandle: 'Peer',
          peerAvatarId: 4,
        };
        setActiveRoomsList((prev) => [room, ...prev.filter((r) => r.id !== room.id)]);
        setActiveRoom(room);
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  // Background real-time inbox listener (< 100ms instant delivery from anywhere)
  useEffect(() => {
    if (!currentUser?.handle || !supabase) return;

    const inboxChannelName = `inbox_${currentUser.handle.toLowerCase().replace(/^@/, '')}`;
    const ch = supabase.channel(inboxChannelName, {
      config: { broadcast: { self: false } },
    });

    ch.on('broadcast', { event: 'incoming_message' }, ({ payload }) => {
      if (!payload || !payload.message) return;
      const incomingMsg = payload.message;
      const roomInfo = payload.room;

      // Play audio & vibration
      sound.playReceive();
      sound.vibrate([25, 45, 25]);

      const roomId = incomingMsg.roomId || roomInfo?.id;
      const isCurrentlyOpen = activeRoom?.id === roomId;

      setActiveRoomsList((prev) => {
        const existing = prev.find((r) => r.id === roomId);
        const updatedRoom: ChatRoom = existing
          ? {
              ...existing,
              lastMessageText: incomingMsg.text || '📸 Ephemeral Photo',
              lastMessageTime: incomingMsg.createdAt || Date.now(),
              unreadCount: isCurrentlyOpen ? 0 : (existing.unreadCount || 0) + 1,
              peerHandle: existing.peerHandle || incomingMsg.senderHandle,
              peerDisplayName: existing.peerDisplayName || incomingMsg.senderDisplayName || incomingMsg.senderHandle,
            }
          : {
              id: roomId,
              code: roomInfo?.code || 'DIRECT',
              participantCount: 2,
              timerSeconds: incomingMsg.timerSeconds || 30,
              isBurnOnRead: incomingMsg.isBurnOnRead || false,
              peerHandle: incomingMsg.senderHandle,
              peerDisplayName: incomingMsg.senderDisplayName || incomingMsg.senderHandle,
              peerAvatarId: 3,
              lastMessageText: incomingMsg.text || '📸 Ephemeral Photo',
              lastMessageTime: incomingMsg.createdAt || Date.now(),
              unreadCount: isCurrentlyOpen ? 0 : 1,
            };

        // Move to the very top of conversations
        return [updatedRoom, ...prev.filter((r) => r.id !== roomId)];
      });
    });

    ch.on('broadcast', { event: 'peer_connected' }, ({ payload }) => {
      if (!payload || !payload.handle) return;
      sound.playReceive();
      sound.vibrate(20);

      const sorted = [currentUser.handle.toLowerCase(), payload.handle.toLowerCase()].sort();
      const dmRoomId = `dm_${sorted[0]}__${sorted[1]}`;

      setActiveRoomsList((prev) => {
        if (prev.some((r) => r.id === dmRoomId)) return prev;
        const newRoom: ChatRoom = {
          id: dmRoomId,
          code: 'DIRECT',
          participantCount: 2,
          timerSeconds: 30,
          isBurnOnRead: false,
          peerHandle: payload.handle,
          peerDisplayName: payload.displayName || payload.handle,
          peerAvatarId: payload.avatarId || 3,
          lastMessageText: 'Connected with personal PIN',
          lastMessageTime: Date.now(),
        };
        return [newRoom, ...prev];
      });
    });

    ch.subscribe((status) => {
      console.log(`[Inbox Channel ${inboxChannelName}] status:`, status);
    });

    // Also sync DMs from database every 4 seconds as reliable persistence fallback
    const syncDMs = async () => {
      const dmRooms = await NetworkService.fetchUserDirectMessages(currentUser.handle);
      if (dmRooms.length > 0) {
        setActiveRoomsList((prev) => {
          let updated = false;
          const map = new Map<string, ChatRoom>();
          prev.forEach((r) => map.set(r.id, r));
          dmRooms.forEach((r) => {
            if (!map.has(r.id)) {
              map.set(r.id, r);
              updated = true;
            }
          });
          return updated ? Array.from(map.values()) : prev;
        });
      }
    };

    syncDMs();
    const interval = setInterval(syncDMs, 4000);

    return () => {
      clearInterval(interval);
      if (ch && supabase) supabase.removeChannel(ch);
    };
  }, [currentUser?.handle, activeRoom?.id]);

  const handleUpdateProfile = (updated: Partial<UserProfile>) => {
    if (!currentUser) return;
    const next = { ...currentUser, ...updated };
    setCurrentUser(next);
    StorageService.saveProfile(next);
    NetworkService.syncProfileToSupabase(next);
  };

  const handleStartChatWithUser = async (target: UserProfile) => {
    if (!currentUser) return;

    // Deterministic room ID between both users: dm_alice__bob
    const sorted = [currentUser.handle.toLowerCase(), target.handle.toLowerCase()].sort();
    const dmRoomId = `dm_${sorted[0]}__${sorted[1]}`;

    const room: ChatRoom = {
      id: dmRoomId,
      code: 'DIRECT',
      participantCount: 2,
      timerSeconds: 30,
      isBurnOnRead: false,
      peerHandle: target.handle,
      peerDisplayName: target.displayName || target.handle,
      peerAvatarId: target.avatarId,
    };

    if (supabase) {
      try {
        await supabase.from('chat_rooms').upsert({
          id: dmRoomId,
          code: 'DIRECT',
          timer_seconds: 30,
          is_burn_on_read: false,
        });
      } catch (err) {
        console.warn('Upsert direct room error:', err);
      }
    }

    setActiveRoomsList((prev) => [room, ...prev.filter((r) => r.id !== room.id)]);
    setActiveRoom(room);

    // Send instant live handshake alert to peer's inbox
    NetworkService.sendPeerConnectedNotice(target.handle, currentUser);
  };

  const handleAcceptRequest = (req: BlinkRequest) => {
    const room: ChatRoom = {
      id: req.roomId || 'room_' + CryptoService.generateRoomCode(),
      code: CryptoService.generateRoomCode(),
      participantCount: 2,
      timerSeconds: 30,
      isBurnOnRead: false,
      peerHandle: req.fromUser.handle,
      peerDisplayName: req.fromUser.displayName || req.fromUser.handle,
      peerAvatarId: req.fromUser.avatarId,
    };

    setBlinkRequests((prev) => prev.filter((r) => r.id !== req.id));
    setActiveRoomsList((prev) => [room, ...prev.filter((r) => r.id !== room.id)]);
    setActiveRoom(room);

    // Send instant live handshake alert to peer's inbox
    if (currentUser) {
      NetworkService.sendPeerConnectedNotice(req.fromUser.handle, currentUser);
    }
  };

  const handleDeclineRequest = (reqId: string) => {
    setBlinkRequests((prev) => prev.filter((r) => r.id !== reqId));
  };

  const handleClearRoom = (roomId: string) => {
    setActiveRoomsList((prev) => prev.filter((r) => r.id !== roomId));
    if (activeRoom?.id === roomId) {
      setActiveRoom(null);
    }
  };

  const handleTriggerPanic = () => {
    sound.playPanic();
    setIsPanicOpen(true);
    setActiveRoom(null);
  };

  const handleScanSuccess = (decodedText: string) => {
    const text = decodedText.trim();
    let roomCode = '';

    if (text.includes('/join/')) {
      const parts = text.split('/join/');
      const seg = parts[parts.length - 1];
      if (seg.startsWith('@')) {
        const targetHandle = seg.replace('@', '');
        handleStartChatWithUser({
          id: 'scanned_' + targetHandle,
          handle: targetHandle,
          displayName: targetHandle,
          avatarId: 3,
          vibe: '',
          isAvailable: true,
          country: 'India',
          state: 'Delhi',
          city: 'New Delhi',
          lastActive: Date.now(),
        });
        return;
      } else {
        roomCode = seg.replace(/\D/g, '');
      }
    } else if (text.includes('room=')) {
      const match = text.match(/room=([a-zA-Z0-9_-]+)/);
      if (match) roomCode = match[1];
    } else if (/^\d{6}$/.test(text)) {
      roomCode = text;
    }

    if (roomCode) {
      sound.playSend();
      NetworkService.findProfileByPin(roomCode).then((foundUser) => {
        if (foundUser) {
          handleStartChatWithUser(foundUser);
        } else {
          const room: ChatRoom = {
            id: 'room_' + roomCode,
            code: roomCode,
            participantCount: 2,
            timerSeconds: 30,
            isBurnOnRead: false,
            peerHandle: `Room #${roomCode}`,
            peerAvatarId: 4,
          };
          setActiveRoomsList((prev) => [room, ...prev.filter((r) => r.id !== room.id)]);
          setActiveRoom(room);
        }
      });
      return;
    }

    const cleanHandle = text.replace(/^@/, '').replace('user:', '').trim();
    if (cleanHandle) {
      handleStartChatWithUser({
        id: 'scanned_' + cleanHandle,
        handle: cleanHandle,
        displayName: cleanHandle,
        avatarId: 3,
        vibe: '',
        isAvailable: true,
        country: 'India',
        state: 'Delhi',
        city: 'New Delhi',
        lastActive: Date.now(),
      });
    }
  };

  // If first time or user wants splash setup
  if (showSplash || !currentUser) {
    return (
      <SplashScreen
        onComplete={(user) => {
          setActiveRoomsList(StorageService.getRooms(user.handle));
          setCurrentUser(user);
          setShowSplash(false);
          NetworkService.syncProfileToSupabase(user);
        }}
      />
    );
  }

  // Active chat session
  if (activeRoom) {
    return (
      <>
        <ChatView
          room={activeRoom}
          currentUser={currentUser}
          onLeaveRoom={() => setActiveRoom(null)}
          onPeerConnected={(peerHandle, peerDisplayName, peerAvatarId) => {
            setActiveRoomsList((prev) =>
              prev.map((r) =>
                r.id === activeRoom.id
                  ? { ...r, peerHandle, peerDisplayName: peerDisplayName || r.peerDisplayName, peerAvatarId }
                  : r
              )
            );
            setActiveRoom((prev) =>
              prev && prev.id === activeRoom.id
                ? { ...prev, peerHandle, peerDisplayName: peerDisplayName || prev.peerDisplayName, peerAvatarId }
                : prev
            );
          }}
        />
        <PanicModal
          isOpen={isPanicOpen}
          onExitPanic={() => setIsPanicOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080B] text-white flex flex-col font-sans select-none overflow-x-hidden">
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'chats' && (
          <ChatsListView
            currentUser={currentUser}
            activeRooms={activeRoomsList}
            blinkRequests={blinkRequests}
            onOpenRoom={(room) => setActiveRoom(room)}
            onAcceptRequest={handleAcceptRequest}
            onDeclineRequest={handleDeclineRequest}
            onClearRoom={handleClearRoom}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenVault={() => setActiveTab('vault')}
            onTriggerPanic={handleTriggerPanic}
            onOpenScanner={() => setIsScannerOpen(true)}
            onStartChatWithUser={handleStartChatWithUser}
          />
        )}

        {activeTab === 'radar' && (
          <RadarView
            currentUser={currentUser}
            onUpdateUser={handleUpdateProfile}
            onStartChatWithUser={handleStartChatWithUser}
          />
        )}

        {activeTab === 'vault' && (
          <SecretVaultView
            currentUser={currentUser}
            onEnterRoom={(room) => {
              setActiveRoomsList((prev) => [room, ...prev.filter((r) => r.id !== room.id)]);
              setActiveRoom(room);
            }}
            onStartChatWithUser={handleStartChatWithUser}
            onOpenScanner={() => setIsScannerOpen(true)}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            currentUser={currentUser}
            onSave={handleUpdateProfile}
            onResetAccount={() => {
              StorageService.clearAll(currentUser?.handle);
              setActiveRoomsList([]);
              setActiveRoom(null);
              setCurrentUser(null);
              setShowSplash(true);
            }}
          />
        )}
      </main>

      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        unreadCount={blinkRequests.length}
      />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        currentUser={currentUser}
        onStartChat={handleStartChatWithUser}
      />

      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />

      <PanicModal
        isOpen={isPanicOpen}
        onExitPanic={() => setIsPanicOpen(false)}
      />
    </div>
  );
};
