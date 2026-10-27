'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
  Users,
  Compass,
  Target,
  BookOpen,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Download,
  Camera,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useShell } from '@/context/ShellContext';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { AvatarUploader } from '@/components/profile/AvatarUploader';
import { Button } from '@/components/ui/button';
import { soundService } from '@/lib/audioService';

interface MobileNavigationProps {
  onOpenMembershipModal?: () => void;
  onOpenSettingsModal?: () => void;
  onOpenPwaInstall?: () => void;
  isPwaInstalled?: boolean;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  onOpenMembershipModal,
  onOpenSettingsModal,
  onOpenPwaInstall,
  isPwaInstalled,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const {
    user,
    profile,
    effectiveDisplayName,
    effectiveRating,
    effectiveAvatar,
    syncedChessCom,
    syncedLichess,
    openAuthModal,
    logout,
  } = useAuth();

  const { membershipTier } = useShell();
  const effectiveTier = profile?.tier || membershipTier;

  // Hide the top mobile header on immersive arena/board screens to maximize play area
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

  // Accurate active state matching that avoids substring collisions (e.g. /play vs /players)
  const isItemActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href === '/play') {
      return (
        pathname === '/play' ||
        pathname?.startsWith('/play/') ||
        (pathname?.startsWith('/game/') && !pathname?.startsWith('/game/review/'))
      );
    }
    if (href === '/analysis') {
      return (
        pathname === '/analysis' ||
        pathname?.startsWith('/analysis/') ||
        pathname?.startsWith('/game/review/')
      );
    }
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  // Comprehensive, audited navigation items with simple, relatable labels
  const navItems = [
    {
      id: 'home',
      label: 'Home',
      sublabel: 'Dashboard & activity',
      icon: Home,
      href: '/',
      badge: 'Hub',
    },
    {
      id: 'play',
      label: 'Play',
      sublabel: 'Live online matches',
      icon: Gamepad2,
      href: '/play',
      badge: 'Live',
    },
    {
      id: 'puzzles',
      label: 'Puzzles',
      sublabel: 'Tactics & streak drills',
      icon: Puzzle,
      href: '/puzzles',
      badge: 'Tactics',
    },
    {
      id: 'lessons',
      label: 'Lessons',
      sublabel: 'Interactive courses',
      icon: GraduationCap,
      href: '/lessons',
      badge: 'Learn',
    },
    {
      id: 'analysis',
      label: 'Analysis',
      sublabel: 'Review moves & lines',
      icon: Microscope,
      href: '/analysis',
      badge: 'Review',
    },
    {
      id: 'bots',
      label: 'Bots',
      sublabel: 'Practice against AI',
      icon: Bot,
      href: '/bots',
      badge: 'AI',
    },
    {
      id: 'training',
      label: 'Training',
      sublabel: 'Daily practice & exercises',
      icon: Target,
      href: '/training',
      badge: 'Drills',
    },
    {
      id: 'openings',
      label: 'Openings',
      sublabel: 'Book moves & win rates',
      icon: BookOpen,
      href: '/openings',
      badge: 'Book',
    },
    {
      id: 'endgames',
      label: 'Endgames',
      sublabel: 'Tablebase practice',
      icon: Crown,
      href: '/endgames',
      badge: 'Tablebase',
    },
    {
      id: 'insights',
      label: 'Insights',
      sublabel: 'Performance & stats',
      icon: Compass,
      href: '/insights',
      badge: 'Stats',
    },
    {
      id: 'players',
      label: 'Players',
      sublabel: 'Search players & masters',
      icon: Users,
      href: '/players',
      badge: 'Search',
    },
    {
      id: 'games',
      label: 'Master Games',
      sublabel: 'Historic famous games',
      icon: History,
      href: '/games',
      badge: 'Archive',
    },
    {
      id: 'variants',
      label: 'Variants',
      sublabel: 'Chess960 & fun modes',
      icon: Sparkles,
      href: '/variants',
      badge: 'Fun',
    },
  ];

  const handleNavClick = (href: string) => {
    soundService.playTactilePop();
    setIsModalOpen(false);
    router.push(href);
  };

  return (
    <>
      {/* 1. Mobile Top Header (Only on screens < md and non-arena pages) */}
      {!isArenaScreen && (
        <header className="md:hidden h-14 bg-[#181614] border-b border-[#2d2a26] px-3.5 flex items-center justify-between z-40 shrink-0 select-none">
          <BrandLogo size="sm" onClick={() => router.push('/')} />

          <div className="flex items-center gap-2">
            {/* User Profile Glance & Avatar Trigger (Minimal, No Redundant Name Text) */}
            <button
              type="button"
              onClick={() => {
                soundService.playTactilePop();
                user ? setIsAvatarModalOpen(true) : openAuthModal();
              }}
              className="relative w-9 h-9 rounded-full bg-[#211f1c] border border-white/15 p-0.5 cursor-pointer active:scale-95 transition-all hover:border-emerald-500/50 shadow-sm flex items-center justify-center overflow-visible"
              title={user ? 'Profile Glance & Change Avatar' : 'Sign In'}
              aria-label="Profile and Avatar"
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-[#2b2824] flex items-center justify-center text-xs">
                {effectiveAvatar && effectiveAvatar.startsWith('http') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={effectiveAvatar} alt={effectiveDisplayName} className="w-full h-full object-cover" />
                ) : (
                  <span>{effectiveAvatar || '♟️'}</span>
                )}
              </div>
              {/* Minimal Glance & Edit Indicator Badge */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#161512] rounded-full border border-white/20 flex items-center justify-center text-emerald-400 shadow-sm">
                <Camera className="w-2 h-2" />
              </div>
            </button>

            {/* Quick Settings Cog */}
            <Button
              variant="secondary"
              size="icon-sm"
              rounded="xl"
              onClick={onOpenSettingsModal}
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </header>
      )}

      {/* 2. Floating Tactile Navigation Action Button (Bottom Right on < md screens, hidden on active game/review/live arena screens where board actions occupy the bottom) */}
      {!pathname?.startsWith('/game/') && !pathname?.startsWith('/play/live') && (
        <div className="md:hidden fixed bottom-5 right-5 z-50 select-none">
          <button
            type="button"
            onClick={() => {
              soundService.playTactilePop();
              setIsModalOpen((open) => !open);
            }}
            className="tactile-btn flex items-center justify-center w-13 h-13 rounded-2xl bg-gradient-to-b from-[#8fd649] via-[#7cb53d] to-[#699c30] text-zinc-950 font-black border-t border-white/35 border-x-emerald-600/30 border-b-emerald-950/40 shadow-[0_4px_0_0_#385a16,0_8px_20px_rgba(0,0,0,0.55)] hover:shadow-[0_5px_0_0_#385a16] hover:-translate-y-[1px] active:translate-y-[3px] active:shadow-[0_1px_0_0_#385a16] transition-all cursor-pointer"
            title="Navigation Menu"
            aria-label="Open Navigation Menu"
          >
            {isModalOpen ? (
              <X className="w-6 h-6 text-zinc-950 stroke-[2.5]" />
            ) : (
              <Menu className="w-6 h-6 text-zinc-950 stroke-[2.5]" />
            )}
          </button>
        </div>
      )}

      {/* 3. Comprehensive Mobile Navigation Modal */}
      {isModalOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          {/* Backdrop Click to Dismiss */}
          <div className="flex-1 w-full" onClick={() => setIsModalOpen(false)} />

          {/* Modal Bottom Sheet Card */}
          <div className="relative w-full max-h-[88vh] bg-[#1a1815] border-t-2 border-[#38342c] rounded-t-[32px] shadow-[0_-12px_40px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-250 select-none">
            {/* Grabber Handle */}
            <div className="pt-3 pb-1 flex justify-center cursor-pointer" onClick={() => setIsModalOpen(false)}>
              <div className="w-12 h-1.5 bg-[#3a362f] hover:bg-[#4a453c] rounded-full transition-colors" />
            </div>

            {/* Modal Top Header */}
            <div className="px-5 py-2.5 flex items-center justify-between border-b border-[#2d2a26]">
              <div className="flex items-center gap-2.5">
                <BrandLogo size="sm" />
                <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-emerald-400 font-black">
                  All Navigations
                </span>
              </div>
              <Button
                variant="secondary"
                size="icon-sm"
                rounded="full"
                onClick={() => setIsModalOpen(false)}
                title="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Scrollable Navigation Grid */}
            <div className="px-4 py-3.5 overflow-y-auto max-h-[64vh] flex flex-col gap-3">
              {/* Connected Account Mini Pill */}
              {(syncedChessCom || syncedLichess) && (
                <div className="px-3 py-2 bg-[#211f1c] border border-[#35322b] rounded-2xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Connected:</span>
                    {syncedChessCom && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 truncate">
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

              {/* Grid of All Valid Navigations (2 Columns) */}
              <div className="grid grid-cols-2 gap-2.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isItemActive(item.href);

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.href)}
                      className={`tactile-btn relative p-3 rounded-2xl flex flex-col justify-between text-left transition-all active:scale-95 shadow-[0_2px_0_0_#12110f] cursor-pointer group min-h-[82px] border ${
                        isActive
                          ? 'bg-gradient-to-b from-[#8fd649] via-[#7cb53d] to-[#699c30] text-zinc-950 border-t border-white/35 border-x-emerald-600/30 border-b-emerald-950/40 shadow-[0_3px_0_0_#385a16]'
                          : 'bg-gradient-to-br from-[#24211d] via-[#1d1b17] to-[#171512] border-t-2 border-[#353128] border-b-[#12110f] border-x-[#292620] hover:border-emerald-500/60'
                      }`}
                    >
                      {/* Top Row: Icon + Badge */}
                      <div className="flex items-center justify-between w-full">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                            isActive
                              ? 'bg-zinc-950/20 text-zinc-950 font-black'
                              : 'bg-[#2b2823] text-zinc-300 group-hover:text-white group-hover:scale-105'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                              isActive
                                ? 'bg-zinc-950/25 text-zinc-950 font-black'
                                : 'bg-[#27241f] border border-[#38342c] text-zinc-400'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>

                      {/* Bottom Row: Label & Sublabel */}
                      <div className="flex flex-col mt-2">
                        <span
                          className={`text-[12px] font-black leading-tight ${
                            isActive ? 'text-zinc-950 drop-shadow-[0_1px_0_rgba(255,255,255,0.2)]' : 'text-white group-hover:text-emerald-400'
                          }`}
                        >
                          {item.label}
                        </span>
                        <span
                          className={`text-[9.5px] font-medium truncate mt-0.5 ${
                            isActive ? 'text-zinc-900/80 font-bold' : 'text-zinc-400'
                          }`}
                        >
                          {item.sublabel}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Install PWA App Row */}
              <button
                onClick={() => {
                  soundService.playTactilePop();
                  setIsModalOpen(false);
                  onOpenPwaInstall?.();
                }}
                className="tactile-btn p-3 rounded-2xl bg-[#211f1c] border border-[#35322b] hover:border-emerald-500/50 flex items-center justify-between cursor-pointer active:scale-98 transition shadow-[0_2px_0_0_#12110f]"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl ${
                      isPwaInstalled
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-[#2a2722] text-zinc-300'
                    } flex items-center justify-center`}
                  >
                    <Download className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">
                        {isPwaInstalled ? 'Check.mate Web App' : 'Install Check.mate'}
                      </span>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded-full font-bold">
                        {isPwaInstalled ? 'INSTALLED' : 'PWA'}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400">
                      {isPwaInstalled
                        ? 'Running in standalone native mode'
                        : 'Add to home screen for 120 FPS full-screen play'}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>

              {/* Quick Settings & Themes Row */}
              <button
                onClick={() => {
                  soundService.playTactilePop();
                  setIsModalOpen(false);
                  onOpenSettingsModal?.();
                }}
                className="tactile-btn p-3 rounded-2xl bg-[#211f1c] border border-[#35322b] hover:border-emerald-500/50 flex items-center justify-between cursor-pointer active:scale-98 transition shadow-[0_2px_0_0_#12110f]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#2a2722] flex items-center justify-center text-zinc-300">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-black text-white">Board &amp; Audio Settings</span>
                    <span className="text-[10px] text-zinc-400">Piece styles, board themes, sound effects</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>

              {/* VIP Membership Card */}
              <div
                onClick={() => {
                  soundService.playTactilePop();
                  setIsModalOpen(false);
                  onOpenMembershipModal?.();
                }}
                className="tactile-btn p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-600/10 to-[#22201c] border-2 border-amber-500/40 shadow-[0_3px_0_0_#78350f30] flex items-center justify-between cursor-pointer active:scale-98 transition"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                    <Crown className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-black text-amber-300 capitalize">
                      {effectiveTier === 'free' ? 'Free Tier' : `${effectiveTier} Member`}
                    </span>
                    <span className="text-[10px] text-zinc-400">Unlimited game review &amp; grandmaster bots</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-400" />
              </div>
            </div>

            {/* Modal Bottom Footer: Profile / Login / Logout */}
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
                <Button
                  variant="destructive"
                  size="sm"
                  rounded="xl"
                  onClick={() => {
                    logout();
                    setIsModalOpen(false);
                  }}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  rounded="xl"
                  onClick={() => {
                    setIsModalOpen(false);
                    openAuthModal();
                  }}
                >
                  Log In
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cloudflare R2 Avatar Upload Modal */}
      <AvatarUploader
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
      />
    </>
  );
};
