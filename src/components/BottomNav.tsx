import React from 'react';
import { Radar, MessageSquare, KeyRound, User } from 'lucide-react';
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
    sound.vibrate(10);
    onTabChange(tab);
  };

  const navItems = [
    { id: 'radar' as ActiveTab, label: 'Radar', icon: Radar, badge: null },
    { id: 'chats' as ActiveTab, label: 'Blinks', icon: MessageSquare, badge: unreadCount > 0 ? unreadCount : null },
    { id: 'vault' as ActiveTab, label: 'Secret Room', icon: KeyRound, badge: null },
    { id: 'profile' as ActiveTab, label: 'Ghost ID', icon: User, badge: null },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#05070d]/95 backdrop-blur-lg border-t border-[#1f293d] pb-[env(safe-area-inset-bottom)] px-3 py-1.5 flex items-center justify-around">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => handleSelect(item.id)}
            className={`relative flex flex-col items-center justify-center py-1 px-4 rounded-2xl transition-all duration-200 ${
              isActive
                ? 'text-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {/* Active Pill Glow */}
            {isActive && (
              <span className="absolute inset-0 bg-emerald-500/10 rounded-2xl border border-emerald-500/30 shadow-[0_0_12px_rgba(0,255,170,0.2)]" />
            )}

            <div className="relative">
              <Icon className={`w-5 h-5 mb-0.5 transition-transform duration-200 ${isActive ? 'scale-110 drop-shadow-[0_0_6px_rgba(0,255,170,0.8)]' : ''}`} />
              {item.badge && (
                <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-emerald-500 text-black text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[11px] tracking-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
