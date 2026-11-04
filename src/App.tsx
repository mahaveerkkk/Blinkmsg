import React, { useState, useEffect } from 'react';
import { UserProfile, ChatRoom, ActiveTab, BlinkRequest } from './types';
import { StorageService } from './services/storage';
import { CryptoService } from './services/crypto';
import { sound } from './services/sound';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { RadarView } from './components/RadarView';
import { SecretVaultView } from './components/SecretVaultView';
import { ChatsListView } from './components/ChatsListView';
import { ChatView } from './components/ChatView';
import { SearchModal } from './components/SearchModal';
import { ProfileModal } from './components/ProfileModal';
import { PanicModal } from './components/PanicModal';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(() =>
    StorageService.getOrCreateProfile()
  );
  // Default tab is 'chats' for real messenger feel
  const [activeTab, setActiveTab] = useState<ActiveTab>('chats');
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [activeRoomsList, setActiveRoomsList] = useState<ChatRoom[]>([]);
  const [blinkRequests, setBlinkRequests] = useState<BlinkRequest[]>([]);

  // Modals
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
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
    const next = { ...currentUser, ...updated };
    setCurrentUser(next);
    StorageService.saveProfile(next);
  };

  const handleStartChatWithUser = async (target: UserProfile) => {
    const code = CryptoService.generateRoomCode();
    const { base64Key } = await CryptoService.generateRoomKey();

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

  const getTabTitle = () => {
    switch (activeTab) {
      case 'chats':
        return 'Messages';
      case 'radar':
        return 'People Nearby';
      case 'vault':
        return 'Secret Room';
      case 'profile':
        return 'Settings';
      default:
        return 'Blink';
    }
  };

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
      <Navbar
        user={currentUser}
        title={getTabTitle()}
        onOpenSearch={() => setIsSearchOpen(true)}
        onNewChat={() => setActiveTab('vault')}
        onPanic={handleTriggerPanic}
      />

      <main className="flex-1 overflow-y-auto">
        {activeTab === 'chats' && (
          <ChatsListView
            activeRooms={activeRoomsList}
            blinkRequests={blinkRequests}
            onOpenRoom={(room) => setActiveRoom(room)}
            onAcceptRequest={handleAcceptRequest}
            onDeclineRequest={handleDeclineRequest}
            onClearRoom={handleClearRoom}
            onNewChat={() => setActiveTab('vault')}
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
          <div className="pb-24 pt-4 px-4 max-w-md mx-auto">
            <ProfileModal
              isOpen={true}
              onClose={() => setActiveTab('chats')}
              currentUser={currentUser}
              onSave={handleUpdateProfile}
            />
          </div>
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

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        onSave={handleUpdateProfile}
      />

      <PanicModal
        isOpen={isPanicOpen}
        onExitPanic={() => setIsPanicOpen(false)}
      />
    </div>
  );
};
