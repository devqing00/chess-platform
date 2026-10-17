'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Home,
  Gamepad2,
  Target,
  Bot,
  Menu,
  X,
  GraduationCap,
  Microscope,
  Flame,
  History,
  Users,
  Settings,
  Crown,
  LogOut,
  Search,
  Award,
  Sparkles,
  BookOpen,
  ChevronRight,
  Shield,
  Layers,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useShell } from '@/context/ShellContext';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { AvatarUploader } from '@/components/profile/AvatarUploader';

interface MobileNavigationProps {
  onOpenMembershipModal?: () => void;
  onOpenSettingsModal?: () => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  onOpenMembershipModal,
  onOpenSettingsModal,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isBottomModalOpen, setIsBottomModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const {
    user,
    profile,
    effectiveDisplayName,
    effectiveRating,
    effectiveAvatar,
    effectiveCountry,
    syncedChessCom,
    syncedLichess,
    openAuthModal,
    logout,
  } = useAuth();

  const { membershipTier } = useShell();
  const effectiveTier = profile?.tier || membershipTier;

  // Zero-scroll optimization: Hide general top mobile header and navbar on immersive play/arena/study screens
  const isArenaScreen =
    pathname === '/play' ||
    pathname?.startsWith('/play/') ||
    pathname?.startsWith('/game/') ||
    pathname === '/analysis' ||
    pathname === '/puzzles' ||
    pathname === '/bots' ||
    pathname === '/endgames' ||
    pathname === '/variants' ||
    pathname === '/lessons';

  if (isArenaScreen) {
    return null;
  }

  const bottomNavItems = [
    { id: 'home', label: 'Home', icon: Home, href: '/' },
    { id: 'play', label: 'Play', icon: Gamepad2, href: '/play' },
    { id: 'puzzles', label: 'Puzzles', icon: Target, href: '/puzzles' },
    { id: 'bots', label: 'Bots', icon: Bot, href: '/bots' },
    { id: 'menu', label: 'More', icon: Menu, isMenuToggle: true },
  ];

  // Full navigation items arranged in a diagonal symmetry layout with simple, relatable labels
  const navGridItems = [
    {
      id: 'lessons',
      label: 'Lessons',
      sublabel: 'Interactive courses',
      icon: GraduationCap,
      href: '/lessons',
      color: 'emerald',
      diagonal: 'br', // top-left to bottom-right
      badge: 'Learn',
    },
    {
      id: 'training',
      label: 'Training Path',
      sublabel: 'Daily learning road',
      icon: Target,
      href: '/training',
      color: 'amber',
      diagonal: 'bl', // top-right to bottom-left
      badge: 'Daily XP',
    },
    {
      id: 'analysis',
      label: 'Game Analysis',
      sublabel: 'Computer move review',
      icon: Microscope,
      href: '/analysis',
      color: 'blue',
      diagonal: 'br',
      badge: 'Stockfish',
    },
    {
      id: 'openings',
      label: 'Opening Library',
      sublabel: 'Explore classic moves',
      icon: BookOpen,
      href: '/openings',
      color: 'purple',
      diagonal: 'bl',
      badge: 'Catalog',
    },
    {
      id: 'endgames',
      label: 'Endgame Study',
      sublabel: 'Winning final positions',
      icon: Award,
      href: '/endgames',
      color: 'rose',
      diagonal: 'br',
      badge: 'Practice',
    },
    {
      id: 'players',
      label: 'Player Scout',
      sublabel: 'Inspect & compare opponents',
      icon: Users,
      href: '/players',
      color: 'cyan',
      diagonal: 'bl',
      badge: 'Scout',
    },
    {
      id: 'games',
      label: 'Master Games',
      sublabel: 'Grandmaster matches',
      icon: History,
      href: '/games',
      color: 'yellow',
      diagonal: 'br',
      badge: 'Archives',
    },
    {
      id: 'variants',
      label: 'Chess Variants',
      sublabel: 'Fog, 960 & speed modes',
      icon: Sparkles,
      href: '/variants',
      color: 'fuchsia',
      diagonal: 'bl',
      badge: 'Fun',
    },
    {
      id: 'players',
      label: 'Leaderboards',
      sublabel: 'Global player ranks',
      icon: Users,
      href: '/players',
      color: 'teal',
      diagonal: 'br',
      badge: 'Rankings',
    },
    {
      id: 'settings',
      label: 'Board Themes',
      sublabel: 'Pieces, sound & style',
      icon: Settings,
      isAction: 'settings',
      color: 'zinc',
      diagonal: 'bl',
      badge: 'Custom',
    },
  ];

  const handleNavClick = (href: string) => {
    setIsBottomModalOpen(false);
    router.push(href);
  };

  return (
    <>
      {/* 1. Mobile Top Header Bar (Only visible on screens < md and non-arena pages) */}
      <header className="md:hidden h-14 bg-[#181614] border-b border-[#2d2a26] px-3.5 flex items-center justify-between z-40 shrink-0 select-none">
        {/* Solid Brand Logo Lockup */}
        <BrandLogo size="sm" onClick={() => router.push('/')} />

        {/* Right Top Mobile Actions: User Avatar / Rating & Quick Settings */}
        <div className="flex items-center gap-2">
          {/* User Quick Pill */}
          <div
            onClick={() => (user ? setIsAvatarModalOpen(true) : openAuthModal())}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#211f1c] border border-[#35322b] rounded-full text-xs cursor-pointer active:scale-95 transition-transform"
          >
            <div className="w-5 h-5 rounded-full overflow-hidden bg-[#2b2824] flex items-center justify-center text-[10px]">
              {effectiveAvatar && effectiveAvatar.startsWith('http') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={effectiveAvatar} alt={effectiveDisplayName} className="w-full h-full object-cover" />
              ) : (
                <span>♟️</span>
              )}
            </div>
            <span className="text-[11px] font-black text-white max-w-[85px] truncate">{effectiveDisplayName}</span>
            <span className="text-[10px] font-mono font-bold text-[#81b64c]">({effectiveRating})</span>
          </div>

          {/* Quick Settings Cog */}
          <button
            onClick={onOpenSettingsModal}
            className="p-2 rounded-xl text-zinc-400 hover:text-white bg-[#211f1c] border border-[#35322b] active:scale-95 transition cursor-pointer"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Mobile Bottom Navigation Bar (Fixed bottom on < md screens) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-[#181614]/95 backdrop-blur-md border-t-2 border-[#2d2a26] z-40 flex items-center justify-around px-2 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] select-none">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href ? (item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href)) : false;

          if (item.isMenuToggle) {
            return (
              <button
                key={item.id}
                onClick={() => setIsBottomModalOpen((open) => !open)}
                className={`flex flex-col items-center justify-center flex-1 py-1 active:scale-95 transition-all cursor-pointer ${
                  isBottomModalOpen ? 'text-[#81b64c]' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <div
                  className={`w-9 h-7 flex items-center justify-center rounded-xl transition-all ${
                    isBottomModalOpen ? 'bg-[#81b64c]/20 border border-[#81b64c]/40 shadow-sm' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider">{item.label}</span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.href!)}
              className={`flex flex-col items-center justify-center flex-1 py-1 active:scale-95 transition-all cursor-pointer ${
                isActive ? 'text-[#81b64c]' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <div
                className={`w-10 h-7 flex items-center justify-center rounded-xl transition-all ${
                  isActive ? 'bg-[#81b64c]/20 border border-[#81b64c]/40 shadow-sm' : ''
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#81b64c]' : 'text-zinc-400'}`} />
              </div>
              <span className={`text-[10px] font-extrabold uppercase tracking-wider ${isActive ? 'text-[#81b64c]' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* 3. Creative Expanding Bottom Navigation Modal */}
      {isBottomModalOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          {/* Backdrop Click to Dismiss */}
          <div className="flex-1 w-full" onClick={() => setIsBottomModalOpen(false)} />

          {/* Modal Bottom Sheet Card */}
          <div className="relative w-full max-h-[82vh] bg-[#1a1815] border-t-2 border-[#38342c] rounded-t-[32px] shadow-[0_-12px_40px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-250 select-none">
            {/* Grabber Handle */}
            <div className="pt-3 pb-1 flex justify-center cursor-pointer" onClick={() => setIsBottomModalOpen(false)}>
              <div className="w-12 h-1.5 bg-[#3a362f] hover:bg-[#4a453c] rounded-full transition-colors" />
            </div>

            {/* Modal Top Header */}
            <div className="px-5 py-2.5 flex items-center justify-between border-b border-[#2d2a26]">
              <div className="flex items-center gap-2">
                <BrandLogo size="sm" />
                <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#81b64c] font-black">
                  Navigation
                </span>
              </div>
              <button
                onClick={() => setIsBottomModalOpen(false)}
                className="p-1.5 rounded-full bg-[#24211d] text-zinc-400 hover:text-white border border-[#35322b] transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Navigation Grid (Diagonal Symmetry Layout) */}
            <div className="px-4 py-3.5 overflow-y-auto max-h-[58vh] flex flex-col gap-3">
              {/* Connected Account Mini Pill (if any) */}
              {(syncedChessCom || syncedLichess) && (
                <div className="px-3 py-2 bg-[#211f1c] border border-[#35322b] rounded-2xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Connected:</span>
                    {syncedChessCom && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#81b64c] truncate">
                        ♟️ {syncedChessCom.username} ({syncedChessCom.ratings?.rapid || 800})
                      </span>
                    )}
                    {syncedLichess && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 truncate">
                        ⚔️ {syncedLichess.username} ({syncedLichess.ratings?.rapid || 1500})
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Diagonal Symmetry Grid: 2 Columns with Alternating Corner Accents & Directional Gradients */}
              <div className="grid grid-cols-2 gap-2.5">
                {navGridItems.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = item.href ? pathname?.startsWith(item.href) : false;
                  const isEven = index % 2 === 0;

                  // Alternating diagonal styles for symmetrical balance
                  const diagonalClasses = isEven
                    ? 'bg-gradient-to-br from-[#24211d] via-[#1d1b17] to-[#171512] border-t-2 border-l-2 border-r border-b border-[#353128] hover:border-[#81b64c]/60'
                    : 'bg-gradient-to-bl from-[#24211d] via-[#1d1b17] to-[#171512] border-t-2 border-r-2 border-l border-b border-[#353128] hover:border-amber-500/60';

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.isAction === 'settings') {
                          setIsBottomModalOpen(false);
                          onOpenSettingsModal?.();
                        } else if (item.href) {
                          handleNavClick(item.href);
                        }
                      }}
                      className={`relative p-3 rounded-2xl flex flex-col justify-between text-left transition-all active:scale-95 shadow-[0_2px_0_0_#12110f] cursor-pointer group min-h-[82px] ${diagonalClasses} ${
                        isActive ? 'ring-2 ring-[#81b64c] shadow-lg' : ''
                      }`}
                    >
                      {/* Top Row: Icon + Badge */}
                      <div className="flex items-center justify-between w-full">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                            isActive
                              ? 'bg-[#81b64c] text-white'
                              : 'bg-[#2b2823] text-zinc-300 group-hover:text-white group-hover:scale-105'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        {item.badge && (
                          <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[#27241f] border border-[#38342c] text-zinc-400">
                            {item.badge}
                          </span>
                        )}
                      </div>

                      {/* Bottom Row: Label & Sublabel */}
                      <div className="flex flex-col mt-2">
                        <span className="text-[11px] font-black text-white group-hover:text-[#81b64c] transition-colors leading-tight">
                          {item.label}
                        </span>
                        <span className="text-[9px] text-zinc-400 font-medium truncate mt-0.5">
                          {item.sublabel}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* VIP Membership Card */}
              <div
                onClick={() => {
                  setIsBottomModalOpen(false);
                  onOpenMembershipModal?.();
                }}
                className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-600/10 to-[#22201c] border-2 border-amber-500/40 flex items-center justify-between cursor-pointer active:scale-98 transition"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                    <Crown className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-amber-300 capitalize">
                      {effectiveTier === 'free' ? 'Free Tier' : `${effectiveTier} Member`}
                    </span>
                    <span className="text-[10px] text-zinc-400">Unlimited game review &amp; grandmaster bots</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-400" />
              </div>
            </div>

            {/* Modal Bottom Sticky Footer: Account / Logout */}
            <div className="px-5 py-3 border-t border-[#2d2a26] bg-[#161512] flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#26231e] border border-[#38342c] flex items-center justify-center overflow-hidden text-xs">
                  {effectiveAvatar && effectiveAvatar.startsWith('http') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={effectiveAvatar} alt={effectiveDisplayName} className="w-full h-full object-cover" />
                  ) : (
                    <span>♟️</span>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-white truncate">{effectiveDisplayName}</span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    Rating {effectiveRating}
                  </span>
                </div>
              </div>

              {user ? (
                <button
                  onClick={() => {
                    logout();
                    setIsBottomModalOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#24211d] hover:bg-rose-950/60 text-zinc-400 hover:text-rose-300 border border-[#35322b] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsBottomModalOpen(false);
                    openAuthModal();
                  }}
                  className="px-4 py-1.5 bg-[#81b64c] hover:bg-[#72a342] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow cursor-pointer transition"
                >
                  Log In
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Avatar Modal */}
      <AvatarUploader
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
      />
    </>
  );
};
