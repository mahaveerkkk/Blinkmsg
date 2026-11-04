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
    { id: 'chats' as ActiveTab, label: 'Messages', icon: MessageSquare, badge: unreadCount > 0 ? unreadCount : null },
    { id: 'radar' as ActiveTab, label: 'Nearby', icon: Radio, badge: null },
    { id: 'vault' as ActiveTab, label: 'Secret Room', icon: KeyRound, badge: null },
    { id: 'profile' as ActiveTab, label: 'Profile', icon: User, badge: null },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-2xl border-t border-white/[0.08] pb-[env(safe-area-inset-bottom)] px-6 py-2 flex items-center justify-around max-w-md mx-auto">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => handleSelect(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-3 transition-colors ${
              isActive ? 'text-emerald-400 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-emerald-400' : ''}`} />
              {item.badge && (
                <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-emerald-500 text-black text-[9px] font-bold flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
