'use client';

import React, { useState } from 'react';
import {
  Home,
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
  Flame,
  Compass,
  LogIn,
  LogOut,
  User as UserIcon,
  Camera,
} from 'lucide-react';
import { MembershipTier } from '@/types/chess';
import { useAuth } from '@/context/AuthContext';
import { AvatarUploader } from '@/components/profile/AvatarUploader';

export type ActiveTab =
  | 'home'
  | 'play'
  | 'puzzles'
  | 'lessons'
  | 'openings'
  | 'analysis'
  | 'insights'
  | 'bots'
  | 'historical'
  | 'variants'
  | 'landing'
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
  const { user, profile, openAuthModal, logout } = useAuth();
  const effectiveTier = profile?.tier || membership;
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const navItems = [
    { id: 'home' as ActiveTab, label: 'Home', icon: Home, badge: 'Lobby' },
    { id: 'play' as ActiveTab, label: 'Play', icon: Gamepad2, badge: 'Live' },
    { id: 'puzzles' as ActiveTab, label: 'Puzzles', icon: Puzzle, badge: 'Rush' },
    { id: 'lessons' as ActiveTab, label: 'Lessons', icon: GraduationCap, badge: 'Master' },
    { id: 'analysis' as ActiveTab, label: 'Analysis & Review', icon: Microscope, badge: 'AI' },
    { id: 'bots' as ActiveTab, label: 'Computer Bots', icon: Bot, badge: '20+' },
    { id: 'landing' as ActiveTab, label: 'About Chess.com', icon: Sparkles, badge: 'Site' },
    { id: 'openings' as ActiveTab, label: 'Openings', icon: Compass, badge: 'ECO' },
    { id: 'insights' as ActiveTab, label: 'Diamond Insights', icon: Flame, badge: 'PRO' },
    { id: 'historical' as ActiveTab, label: 'Master Games', icon: History, badge: 'GM' },
    { id: 'variants' as ActiveTab, label: 'Chess Variants', icon: Sparkles, badge: '960' },
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

      {/* Bottom Section: User Auth, Membership Tier Card & Settings */}
      <div className="p-3 border-t border-[#2d2a26] space-y-2 bg-[#161512]">
        {/* User Account / Auth Card */}
        {user ? (
          <div className="p-2.5 bg-[#21201d] rounded-xl border border-[#302e2b] flex items-center justify-between">
            <div
              onClick={() => setIsAvatarModalOpen(true)}
              className="flex items-center gap-2 min-w-0 cursor-pointer group"
              title="Click to change avatar (Cloudflare R2)"
            >
              <div className="relative w-8 h-8 rounded-lg bg-zinc-700 overflow-hidden flex items-center justify-center text-sm font-bold shrink-0 border border-[#403e3a] group-hover:border-amber-400 transition-colors">
                {profile?.avatar && profile.avatar.startsWith('http') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar}
                    alt={profile.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{profile?.avatar || '♟️'}</span>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                  {profile?.displayName || user.displayName || 'Player'}
                </span>
                <span className="text-[10px] text-zinc-400">
                  Blitz {profile?.ratings.blitz || 1200}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={openAuthModal}
            className="w-full py-2 px-3 bg-[#81b64c] hover:bg-[#92c855] text-black font-black text-xs rounded-xl transition shadow flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In / Register</span>
          </button>
        )}

        {/* Tier Banner */}
        <div
          onClick={onOpenMembershipModal}
          className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-transparent border border-amber-500/30 hover:border-amber-500/60 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-amber-300 capitalize">
                {effectiveTier === 'free' ? 'Free Member' : `${effectiveTier} VIP`}
              </span>
            </div>
            <span className="text-[10px] text-amber-400 font-semibold uppercase bg-amber-400/20 px-1.5 py-0.5 rounded">
              {effectiveTier === 'diamond' ? 'Active' : 'Upgrade'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1">
            {effectiveTier === 'diamond'
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

      {/* Cloudflare R2 Avatar Upload Modal */}
      <AvatarUploader
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
      />
    </aside>
  );
};
