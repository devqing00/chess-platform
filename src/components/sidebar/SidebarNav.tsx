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
  Users,
  Mail,
  Bell,
  RefreshCw,
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
  | 'pubapi';

interface SidebarNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  membership: MembershipTier;
  onOpenMembershipModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenChessComSync?: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  onTabChange,
  membership,
  onOpenMembershipModal,
  onOpenSettingsModal,
  onOpenChessComSync,
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
      {/* Bottom Section: Search, User Account, Tier Banner, and Social/Settings Toolbar */}
      <div className="p-3 border-t border-[#2d2a26] space-y-2 bg-[#161512]">
        {/* Search button (Image 5 Parity) */}
        <button
          onClick={() => {}}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white hover:bg-[#272522] transition-colors cursor-pointer"
        >
          <Search className="w-4 h-4 text-zinc-400" />
          <span>Search</span>
        </button>

        {/* User Account / Profile Card (Displays rapid_qing 🇳🇬 429 by default) */}
        <div className="p-2.5 bg-[#21201d] rounded-xl border border-[#302e2b] flex items-center justify-between">
          <div
            onClick={() => (user ? setIsAvatarModalOpen(true) : openAuthModal())}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
            title={user ? 'Click to change avatar' : 'Click to Log In'}
          >
            <div className="relative w-8 h-8 rounded-lg bg-[#2b2824] border border-[#3d3a34] overflow-hidden flex items-center justify-center text-sm font-bold shrink-0 group-hover:border-[#81b64c] transition-colors shadow">
              {profile?.avatar && profile.avatar.startsWith('http') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar}
                  alt={profile.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-zinc-300">♟️</span>
              )}
              {user && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate group-hover:text-[#81b64c] transition-colors">
                {profile?.displayName || user?.displayName || 'rapid_qing'}
              </span>
              <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                <span>({profile?.ratings?.rapid || 429})</span>
                <span>🇳🇬</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onOpenChessComSync && (
              <button
                onClick={onOpenChessComSync}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-[#81b64c] hover:bg-zinc-800 transition cursor-pointer"
                title="Sync Chess.com Profile & Games"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
            {user ? (
              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={openAuthModal}
                className="px-2 py-1 rounded bg-[#81b64c]/20 hover:bg-[#81b64c] text-[#81b64c] hover:text-white text-[10px] font-bold transition cursor-pointer"
              >
                Log In
              </button>
            )}
          </div>
        </div>

        {/* Tier Banner */}
        <div
          onClick={onOpenMembershipModal}
          className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-transparent border border-amber-500/30 hover:border-amber-500/60 transition-all cursor-pointer group"
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
        </div>

        {/* Bottom 4 Social/Tool Action Icons (Image 3 & 5 Parity: Friends, Mail, Bell, Settings) */}
        <div className="flex items-center justify-between px-2 pt-1 border-t border-[#252320] text-zinc-400">
          <button
            onClick={() => {}}
            className="p-1.5 rounded-lg hover:text-white hover:bg-[#272522] transition cursor-pointer"
            title="Friends"
          >
            <Users className="w-4 h-4" />
          </button>
          <button
            onClick={() => {}}
            className="p-1.5 rounded-lg hover:text-white hover:bg-[#272522] transition cursor-pointer"
            title="Messages"
          >
            <Mail className="w-4 h-4" />
          </button>
          <button
            onClick={() => {}}
            className="p-1.5 rounded-lg hover:text-white hover:bg-[#272522] transition cursor-pointer"
            title="Alerts & Notifications"
          >
            <Bell className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenSettingsModal}
            className="p-1.5 rounded-lg hover:text-white hover:bg-[#272522] transition cursor-pointer"
            title="Board & Sound Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cloudflare R2 Avatar Upload Modal */}
      <AvatarUploader
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
      />
    </aside>
  );
};
