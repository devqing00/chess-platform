'use client';

import React from 'react';
import {
  Gamepad2,
  Puzzle,
  GraduationCap,
  Microscope,
  Bot,
  Crown,
  Settings,
  History,
  Sparkles,
  Search,
  Volume2,
} from 'lucide-react';
import { MembershipTier } from '@/types/chess';

export type ActiveTab =
  | 'play'
  | 'puzzles'
  | 'openings'
  | 'analysis'
  | 'bots'
  | 'historical'
  | 'variants'
  | 'pubapi';

interface SidebarNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  membership: MembershipTier;
  onOpenMembershipModal: () => void;
  onOpenSettingsModal: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  onTabChange,
  membership,
  onOpenMembershipModal,
  onOpenSettingsModal,
}) => {
  const navItems = [
    { id: 'play' as ActiveTab, label: 'Play', icon: Gamepad2, badge: 'Live' },
    { id: 'puzzles' as ActiveTab, label: 'Puzzles', icon: Puzzle, badge: 'Rush' },
    { id: 'openings' as ActiveTab, label: 'Openings', icon: GraduationCap, badge: 'ECO' },
    { id: 'analysis' as ActiveTab, label: 'Analysis & Review', icon: Microscope, badge: 'AI' },
    { id: 'bots' as ActiveTab, label: 'Computer Bots', icon: Bot, badge: '20+' },
    { id: 'historical' as ActiveTab, label: 'Master Games', icon: History, badge: 'GM' },
    { id: 'variants' as ActiveTab, label: 'Variants & Solo', icon: Sparkles },
    { id: 'pubapi' as ActiveTab, label: 'Chess.com API', icon: Search, badge: 'Live' },
  ];

  return (
    <aside className="w-64 h-full bg-[#1b1917] border-r border-[#2d2a26] flex flex-col justify-between select-none">
      {/* Platform Header */}
      <div className="flex flex-col">
        <div className="h-16 px-5 flex items-center gap-3 border-b border-[#2d2a26] bg-[#161512]">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#81b64c] to-[#5d8b32] flex items-center justify-center shadow-lg shadow-[#81b64c]/20">
            <span className="text-xl">♟️</span>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-wide text-white flex items-center gap-1.5">
              Chess<span className="text-[#81b64c]">.com</span>
            </span>
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">
              Grandmaster Suite
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#81b64c] text-white shadow-md shadow-[#81b64c]/20 font-bold'
                    : 'text-zinc-300 hover:text-white hover:bg-[#272522]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded tracking-wider ${
                      isActive
                        ? 'bg-black/25 text-white'
                        : 'bg-[#312e2b] text-zinc-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Membership Tier Card & Settings */}
      <div className="p-3 border-t border-[#2d2a26] space-y-2 bg-[#161512]">
        {/* Tier Banner */}
        <div
          onClick={onOpenMembershipModal}
          className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-transparent border border-amber-500/30 hover:border-amber-500/60 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-amber-300 capitalize">
                {membership === 'free' ? 'Free Member' : `${membership} VIP`}
              </span>
            </div>
            <span className="text-[10px] text-amber-400 font-semibold uppercase bg-amber-400/20 px-1.5 py-0.5 rounded">
              {membership === 'diamond' ? 'Active' : 'Upgrade'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1">
            {membership === 'diamond'
              ? 'Unlimited Game Review & AI Coach active'
              : 'Unlock Diamond AI Coach, Game Review & Bots'}
          </p>
        </div>

        {/* Settings Button */}
        <button
          onClick={onOpenSettingsModal}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white hover:bg-[#272522] transition-colors cursor-pointer"
        >
          <Settings className="w-4 h-4" />
          <span>Board & Sound Settings</span>
        </button>
      </div>
    </aside>
  );
};
