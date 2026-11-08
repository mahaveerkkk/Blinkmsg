import React from 'react';
import { MessageSquare, Radio, KeyRound, User } from 'lucide-react';
import { ActiveTab } from '../types';
import { sound } from '../services/sound';

interface BottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  unreadCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  unreadCount = 0,
}) => {
  const handleSelect = (tab: ActiveTab) => {
    sound.vibrate(8);
    onTabChange(tab);
  };

  const navItems = [
    {
      id: 'chats' as ActiveTab,
      label: 'Messages',
      icon: MessageSquare,
      badge: unreadCount > 0 ? unreadCount : null,
    },
    {
      id: 'vault' as ActiveTab,
      label: 'Connect',
      icon: KeyRound,
      badge: null,
    },
    {
      id: 'profile' as ActiveTab,
      label: 'Settings',
      icon: User,
      badge: null,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-1 pointer-events-none flex justify-center">
      {/* Floating Frosted Dock Container */}
      <nav className="pointer-events-auto max-w-sm w-full bg-[#0E1016]/85 backdrop-blur-3xl border border-white/[0.1] rounded-3xl p-1.5 flex items-center justify-between shadow-[0_12px_40px_rgba(0,0,0,0.8),0_0_1px_1px_rgba(255,255,255,0.06)_inset]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`relative flex-1 flex flex-col items-center justify-center py-2 px-2 rounded-2xl transition-all duration-300 active:scale-95 ${
                isActive
                  ? 'bg-gradient-to-b from-white/[0.12] to-white/[0.04] text-[#D4FF00] shadow-[0_0_20px_rgba(212,255,0,0.15)] border border-[#D4FF00]/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-300 ${
                    isActive
                      ? 'scale-110 stroke-[2.3] text-[#D4FF00] drop-shadow-[0_0_8px_rgba(212,255,0,0.6)]'
                      : 'stroke-[1.8]'
                  }`}
                />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-[#D4FF00] text-black text-[9px] font-black flex items-center justify-center shadow-lg ring-2 ring-black animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>

              <span
                className={`text-[10px] mt-1 font-mono transition-colors tracking-tight ${
                  isActive ? 'font-black text-white' : 'font-medium'
                }`}
              >
                {item.label}
              </span>

              {/* Active Glowing Micro Dot underneath */}
              {isActive && (
                <div className="absolute -bottom-0.5 w-3 h-0.5 rounded-full bg-[#D4FF00] shadow-[0_0_6px_#D4FF00]" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
