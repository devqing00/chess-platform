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
            className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-[0_4px_16px_rgba(16,185,129,0.35)] active:scale-95 transition-all cursor-pointer border border-emerald-400/30"
            title="Navigation Menu"
            aria-label="Open Navigation Menu"
          >
            {isModalOpen ? (
              <X className="w-5 h-5 text-zinc-950 stroke-[2.5]" />
            ) : (
              <Menu className="w-5 h-5 text-zinc-950 stroke-[2.5]" />
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
          <div className="relative w-full max-h-[88vh] bg-[#1a1815] border-t border-white/10 rounded-t-[28px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-250 select-none">
            {/* Grabber Handle */}
            <div className="pt-3 pb-1 flex justify-center cursor-pointer" onClick={() => setIsModalOpen(false)}>
              <div className="w-10 h-1 bg-[#3a362f] hover:bg-[#4a453c] rounded-full transition-colors" />
            </div>

            {/* Modal Top Header */}
            <div className="px-5 py-2.5 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <BrandLogo size="sm" />
                <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-emerald-400 font-bold">
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
                <div className="px-3 py-2 bg-[#211f1c] border border-white/10 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Connected:</span>
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
                      className={`relative p-3 rounded-xl flex flex-col justify-between text-left transition-all active:scale-[0.98] cursor-pointer group min-h-[80px] border ${
                        isActive
                          ? 'bg-[#24221f] text-white border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.3)]'
                          : 'bg-[#1c1a17] hover:bg-[#201e1b] text-zinc-300 border-white/5 hover:border-white/10'
                      }`}
                    >
                      {/* Top Row: Icon + Badge */}
                      <div className="flex items-center justify-between w-full">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                            isActive
                              ? 'bg-emerald-500/20 text-emerald-400 font-bold'
                              : 'bg-white/5 text-zinc-400 group-hover:text-zinc-200'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              isActive
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-white/5 text-zinc-400 border border-white/10'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>

                      {/* Bottom Row: Label & Sublabel */}
                      <div className="flex flex-col mt-2">
                        <span
                          className={`text-[12px] font-bold leading-tight ${
                            isActive ? 'text-white' : 'text-zinc-200 group-hover:text-white'
                          }`}
                        >
                          {item.label}
                        </span>
                        <span className="text-[9.5px] font-medium truncate mt-0.5 text-zinc-400">
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
                className="p-3 rounded-xl bg-[#1c1a17] border border-white/10 hover:border-white/20 flex items-center justify-between cursor-pointer active:scale-[0.98] transition"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg ${
                      isPwaInstalled
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-white/5 text-zinc-300'
                    } flex items-center justify-center`}
                  >
                    <Download className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        {isPwaInstalled ? 'Check.mate Web App' : 'Install Check.mate'}
                      </span>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-bold">
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
                className="p-3 rounded-xl bg-[#1c1a17] border border-white/10 hover:border-white/20 flex items-center justify-between cursor-pointer active:scale-[0.98] transition"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-zinc-300">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-white">Board &amp; Audio Settings</span>
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
                className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 flex items-center justify-between cursor-pointer active:scale-[0.98] transition"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                    <Crown className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-amber-300 capitalize">
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
