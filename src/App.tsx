import React, { useState, useEffect } from 'react';
import { UserProfile, ChatRoom, ActiveTab, BlinkRequest } from './types';
import { StorageService } from './services/storage';
import { CryptoService } from './services/crypto';
import { sound } from './services/sound';
import { BottomNav } from './components/BottomNav';
import { RadarView } from './components/RadarView';
import { SecretVaultView } from './components/SecretVaultView';
import { ChatsListView } from './components/ChatsListView';
import { ChatView } from './components/ChatView';
import { SearchModal } from './components/SearchModal';
import { ProfileView } from './components/ProfileView';
import { PanicModal } from './components/PanicModal';
import { SplashScreen } from './components/SplashScreen';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() =>
    StorageService.getProfile()
  );
  const [showSplash, setShowSplash] = useState<boolean>(!StorageService.getProfile());
  const [activeTab, setActiveTab] = useState<ActiveTab>('chats');
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [activeRoomsList, setActiveRoomsList] = useState<ChatRoom[]>([]);
  const [blinkRequests, setBlinkRequests] = useState<BlinkRequest[]>([]);

  // Modals
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPanicOpen, setIsPanicOpen] = useState(false);

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
        setActiveRoom(room);
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  const handleUpdateProfile = (updated: Partial<UserProfile>) => {
    if (!currentUser) return;
    const next = { ...currentUser, ...updated };
    setCurrentUser(next);
    StorageService.saveProfile(next);
  };

  const handleStartChatWithUser = async (target: UserProfile) => {
    const code = CryptoService.generateRoomCode();
    let base64Key = 'key_' + Math.random().toString(36).substring(2);
    try {
      const gen = await CryptoService.generateRoomKey();
      base64Key = gen.base64Key;
    } catch {
      // fallback
    }

    const room: ChatRoom = {
      id: 'room_' + code,
      code,
      participantCount: 2,
      timerSeconds: 30,
      isBurnOnRead: false,
      secretKey: base64Key,
      peerHandle: target.handle,
      peerAvatarId: target.avatarId,
    };

    setActiveRoomsList((prev) => [room, ...prev.filter((r) => r.id !== room.id)]);
    setActiveRoom(room);
  };

  const handleAcceptRequest = (req: BlinkRequest) => {
    const room: ChatRoom = {
      id: req.roomId || 'room_' + CryptoService.generateRoomCode(),
      code: CryptoService.generateRoomCode(),
      participantCount: 2,
      timerSeconds: 30,
      isBurnOnRead: false,
      peerHandle: req.fromUser.handle,
      peerAvatarId: req.fromUser.avatarId,
    };

    setBlinkRequests((prev) => prev.filter((r) => r.id !== req.id));
    setActiveRoomsList((prev) => [room, ...prev]);
    setActiveRoom(room);
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

  // If first time or user wants splash setup
  if (showSplash || !currentUser) {
    return (
      <SplashScreen
        onComplete={(user) => {
          setCurrentUser(user);
          setShowSplash(false);
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
        />
        <PanicModal
          isOpen={isPanicOpen}
          onExitPanic={() => setIsPanicOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans select-none">
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
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            currentUser={currentUser}
            onSave={handleUpdateProfile}
            onResetAccount={() => {
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

      <PanicModal
        isOpen={isPanicOpen}
        onExitPanic={() => setIsPanicOpen(false)}
      />
    </div>
  );
};
