'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Home,
  Gamepad2,
  Target,
  Bot,
  Sparkles,
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
  LogIn,
  Search,
  Bell,
  Mail,
  ChevronRight,
  Award,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useShell } from '@/context/ShellContext';
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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const {
    user,
    profile,
    effectiveDisplayName,
    effectiveRating,
    effectiveAvatar,
    effectiveCountry,
    openAuthModal,
    logout,
  } = useAuth();

  const { membershipTier } = useShell();
  const effectiveTier = profile?.tier || membershipTier;

  const bottomNavItems = [
    { id: 'home', label: 'Home', icon: Home, href: '/' },
    { id: 'play', label: 'Play', icon: Gamepad2, href: '/play' },
    { id: 'puzzles', label: 'Puzzles', icon: Target, href: '/puzzles' },
    { id: 'bots', label: 'Bots', icon: Bot, href: '/bots' },
    { id: 'menu', label: 'More', icon: Menu, isMenuToggle: true },
  ];

  const drawerNavItems = [
    { label: 'Lessons & Courses', icon: GraduationCap, href: '/lessons', badge: 'Learn' },
    { label: 'Training Roadmap', icon: Target, href: '/training', badge: 'XP' },
    { label: 'Analysis Studio', icon: Microscope, href: '/analysis', badge: 'Stockfish' },
    { label: 'Openings Explorer', icon: Search, href: '/openings', badge: 'ECO' },
    { label: 'Endgames Practice', icon: Award, href: '/endgames', badge: 'Drills' },
    { label: 'Performance Insights', icon: Flame, href: '/insights', badge: 'CAPS 2.0' },
    { label: 'Master Games Archive', icon: History, href: '/games', badge: 'Database' },
    { label: 'Chess Variants', icon: Sparkles, href: '/variants', badge: 'Fun' },
    { label: 'Players Explorer', icon: Users, href: '/players', badge: 'FIDE' },
  ];

  const handleNavClick = (href: string) => {
    setIsDrawerOpen(false);
    router.push(href);
  };

  const isPlayOrGameScreen =
    pathname === '/play' ||
    pathname?.startsWith('/play/') ||
    pathname?.startsWith('/game/');

  if (isPlayOrGameScreen) {
    return null;
  }

  return (
    <>
      {/* 1. Mobile Top Header Bar (Only visible on screens < md) */}
      <header className="md:hidden h-14 bg-[#181614] border-b border-[#2d2a26] px-3.5 flex items-center justify-between z-40 shrink-0 select-none">
        {/* Logo Lockup */}
        <div
          onClick={() => router.push('/')}
          className="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
        >
          <div className="w-8 h-8 rounded-xl bg-[#201e1a] border border-[#35312b] flex items-center justify-center shadow">
            <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4">
              <path d="M5 21L7 10L10.5 13.5L14 7L17.5 13.5L21 10L23 21H5Z" fill="#81b64c" />
              <path d="M9 16.5L12.5 20L19.5 13" stroke="#201e1a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="14" cy="5" r="1.25" fill="#ffffff" />
            </svg>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-semibold tracking-wider text-zinc-300 uppercase">check</span>
            <span className="text-[#81b64c] font-black text-xs leading-none">·</span>
            <span className="text-sm font-black tracking-tight text-white uppercase">mate</span>
          </div>
        </div>

        {/* Right Top Mobile Actions: User Avatar / Rating & Settings */}
        <div className="flex items-center gap-2">
          {/* User Quick Pill */}
          <div
            onClick={() => (user ? setIsAvatarModalOpen(true) : openAuthModal())}
            className="flex items-center gap-1.5 px-2 py-1 bg-[#211f1c] border border-[#35322b] rounded-full text-xs cursor-pointer active:scale-95 transition-transform"
          >
            <div className="w-5 h-5 rounded-full overflow-hidden bg-[#2b2824] flex items-center justify-center text-[10px]">
              {effectiveAvatar && effectiveAvatar.startsWith('http') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={effectiveAvatar} alt={effectiveDisplayName} className="w-full h-full object-cover" />
              ) : (
                <span>♟️</span>
              )}
            </div>
            <span className="text-[11px] font-black text-white max-w-[80px] truncate">{effectiveDisplayName}</span>
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
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-[#181614]/95 backdrop-blur-md border-t-2 border-[#2d2a26] z-50 flex items-center justify-around px-2 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] select-none">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href ? (item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href)) : false;

          if (item.isMenuToggle) {
            return (
              <button
                key={item.id}
                onClick={() => setIsDrawerOpen(true)}
                className="flex flex-col items-center justify-center flex-1 py-1 text-zinc-400 hover:text-white active:scale-95 transition-all cursor-pointer"
              >
                <div className="w-9 h-7 flex items-center justify-center rounded-xl">
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

      {/* 3. Slide-out Mobile Menu Drawer */}
      {isDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-80 max-w-[85vw] h-full bg-[#1b1917] border-l border-[#2d2a26] flex flex-col justify-between shadow-2xl p-4 animate-in slide-in-from-right duration-200 select-none overflow-y-auto"
          >
            {/* Drawer Header */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#2d2a26]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#201e1a] border border-[#35312b] flex items-center justify-center shadow">
                    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4">
                      <path d="M5 21L7 10L10.5 13.5L14 7L17.5 13.5L21 10L23 21H5Z" fill="#81b64c" />
                      <circle cx="14" cy="5" r="1.25" fill="#ffffff" />
                    </svg>
                  </div>
                  <span className="text-sm font-black text-white uppercase tracking-wider">Navigation Menu</span>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-xl bg-[#24221f] text-zinc-400 hover:text-white border border-[#35322b]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* VIP Tier Banner */}
              <div
                onClick={() => {
                  setIsDrawerOpen(false);
                  onOpenMembershipModal?.();
                }}
                className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-600/10 to-[#24221f] border-2 border-amber-500/40 flex items-center justify-between cursor-pointer active:scale-98 transition"
              >
                <div className="flex items-center gap-2.5">
                  <Crown className="w-5 h-5 text-amber-400" />
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-amber-300 capitalize">
                      {effectiveTier === 'free' ? 'Free Member' : `${effectiveTier} VIP`}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-medium">Full Stockfish 18 Review</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-400" />
              </div>

              {/* Drawer Navigation Links */}
              <div className="flex flex-col gap-1.5 pt-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 px-2 pb-1">
                  Features & Tools
                </span>
                {drawerNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname?.startsWith(item.href);

                  return (
                    <button
                      key={item.href}
                      onClick={() => handleNavClick(item.href)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-black transition-all ${
                        isActive
                          ? 'bg-[#81b64c] text-white shadow-[0_2px_0_0_#4d7a24]'
                          : 'text-zinc-300 hover:bg-[#252320] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-zinc-400" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            isActive
                              ? 'bg-white/20 text-white border-white/30'
                              : 'bg-[#292622] text-zinc-400 border-[#38352f]'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Drawer Footer Account & Settings */}
            <div className="pt-4 border-t border-[#2d2a26] flex flex-col gap-2">
              <div className="p-3 bg-[#211f1c] rounded-2xl border border-[#35322b] flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-[#2b2824] border border-[#3d3a34] flex items-center justify-center text-sm font-bold overflow-hidden">
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
                      Rating {effectiveRating} {effectiveCountry === 'ng' ? '🇳🇬' : ''}
                    </span>
                  </div>
                </div>

                {user ? (
                  <button
                    onClick={() => {
                      logout();
                      setIsDrawerOpen(false);
                    }}
                    className="p-2 text-zinc-400 hover:text-rose-400 rounded-xl hover:bg-rose-500/10 transition"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsDrawerOpen(false);
                      openAuthModal();
                    }}
                    className="px-3 py-1 bg-[#81b64c] text-white text-xs font-black rounded-full shadow"
                  >
                    Log In
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  onOpenSettingsModal?.();
                }}
                className="w-full py-2.5 rounded-xl bg-[#24221f] hover:bg-[#2e2a26] text-zinc-300 hover:text-white border border-[#35322b] text-xs font-black flex items-center justify-center gap-2"
              >
                <Settings className="w-4 h-4" />
                <span>Preferences & Board Themes</span>
              </button>
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
