import React from 'react';
import { MessageCircle, Compass, PlusSquare, User } from 'lucide-react';
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
    { id: 'chats' as ActiveTab, label: 'Chats', icon: MessageCircle, badge: unreadCount > 0 ? unreadCount : null },
    { id: 'radar' as ActiveTab, label: 'Explore', icon: Compass, badge: null },
    { id: 'vault' as ActiveTab, label: 'New Room', icon: PlusSquare, badge: null },
    { id: 'profile' as ActiveTab, label: 'Profile', icon: User, badge: null },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-xl border-t border-[#262626] pb-[env(safe-area-inset-bottom)] px-6 py-2 flex items-center justify-between max-w-md mx-auto">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => handleSelect(item.id)}
            className="flex flex-col items-center justify-center py-1 transition-transform active:scale-90"
          >
            <div className="relative">
              <Icon
                className={`w-6 h-6 transition-colors ${
                  isActive ? 'text-white stroke-[2.5]' : 'text-zinc-500 stroke-[1.8]'
                }`}
              />
              {item.badge && (
                <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-[#ff3040] text-white text-[9px] font-bold flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </nav>
  );
};
