'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  | 'players';

interface SidebarNavProps {
  activeTab?: ActiveTab;
  onTabChange?: (tab: ActiveTab) => void;
  membership?: MembershipTier;
  onOpenMembershipModal?: () => void;
  onOpenSettingsModal?: () => void;
  onOpenChessComSync?: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  onTabChange,
  membership = 'diamond',
  onOpenMembershipModal,
  onOpenSettingsModal,
  onOpenChessComSync,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const {
    user,
    profile,
    tier,
    effectiveDisplayName,
    effectiveRating,
    effectiveAvatar,
    effectiveCountry,
    openAuthModal,
    logout,
  } = useAuth();

  const effectiveTier = profile?.tier || tier || membership;
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: '1', title: 'Daily Tactical Puzzle', text: 'New puzzle available: Smothered Knight deflection (+15 ELO)', time: '10m ago', unread: true, link: '/puzzles' },
    { id: '2', title: 'Grandmaster Bot Challenge', text: 'Can you defeat GM Hikaru in a 3-minute blitz arena?', time: '1h ago', unread: true, link: '/bots' },
    { id: '3', title: 'Performance Review', text: 'Your recent game review is processed with accuracy breakdown.', time: '2h ago', unread: false, link: '/analysis' },
  ]);
  const [messages, setMessages] = useState([
    { id: '1', sender: 'Coach Danny Rensch', role: 'Grandmaster Coach', text: 'Welcome to Check.mate! Focus on central control and king safety before launching flank pawn storms.', time: 'Just now', unread: true },
    { id: '2', sender: 'Check.mate Arena', role: 'Matchmaking System', text: 'Tournament pairings and live rated 1v1 arenas are live. Choose your time control and test your rating!', time: '1d ago', unread: false },
  ]);

  const navItems: { id: ActiveTab; label: string; icon: any; badge?: string; href: string }[] = [
    { id: 'home', label: 'Home', icon: Home, badge: 'Lobby', href: '/' },
    { id: 'play', label: 'Play', icon: Gamepad2, badge: 'Live', href: '/play' },
    { id: 'puzzles', label: 'Puzzles', icon: Puzzle, badge: 'Rush', href: '/puzzles' },
    { id: 'lessons', label: 'Lessons', icon: GraduationCap, badge: 'Master', href: '/lessons' },
    { id: 'analysis', label: 'Analysis & Review', icon: Microscope, badge: 'AI', href: '/analysis' },
    { id: 'bots', label: 'Computer Bots', icon: Bot, badge: '20+', href: '/bots' },
    { id: 'openings', label: 'Openings', icon: Compass, badge: 'ECO', href: '/openings' },
    { id: 'insights', label: 'Diamond Insights', icon: Flame, badge: 'PRO', href: '/insights' },
    { id: 'historical', label: 'Master Games', icon: History, badge: 'GM', href: '/games' },
    { id: 'variants', label: 'Chess Variants', icon: Sparkles, badge: '960', href: '/variants' },
    { id: 'players', label: 'Players Explorer', icon: Users, badge: 'PUB', href: '/players' },
  ];

  const handleNavClick = (item: typeof navItems[0]) => {
    if (onTabChange) {
      onTabChange(item.id);
    }
    router.push(item.href);
  };

  // Click outside listener to dismiss notifications and messages dropdowns
  const popoversRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (popoversRef.current && !popoversRef.current.contains(e.target as Node)) {
        setIsMessagesOpen(false);
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  return (
    <aside className="w-64 h-full bg-[#1b1917] border-r border-[#2d2a26] flex flex-col justify-between select-none shrink-0 z-30">
      {/* Platform Header */}
      <div className="flex flex-col">
        <div
          onClick={() => router.push('/')}
          className="h-16 px-5 flex items-center gap-3 border-b border-[#2d2a26] bg-[#161512] cursor-pointer hover:bg-[#1a1916] transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#81b64c] to-[#5d8b32] flex items-center justify-center shadow-lg shadow-[#81b64c]/20">
            <span className="text-xl">♟️</span>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-wide text-white flex items-center gap-1.5">
              Check<span className="text-[#81b64c]">.mate</span>
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
            const isPathActive =
              item.href === '/'
                ? pathname === '/'
                : pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const isActive = isPathActive || activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
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

      {/* Bottom Section: Search, User Account, Tier Banner, and Social/Settings Toolbar */}
      <div className="p-3 border-t border-[#2d2a26] space-y-2 bg-[#161512]">
        {/* Search button navigating to /players */}
        <button
          onClick={() => router.push('/players')}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white hover:bg-[#272522] transition-colors cursor-pointer"
        >
          <Search className="w-4 h-4 text-zinc-400" />
          <span>Search Players...</span>
        </button>

        {/* User Account / Profile Card (Displays synced rapid_qing 🇳🇬 429 globally) */}
        <div className="p-2.5 bg-[#21201d] rounded-xl border border-[#302e2b] flex items-center justify-between">
          <div
            onClick={() => (user ? setIsAvatarModalOpen(true) : openAuthModal())}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
            title={user ? 'Click to change avatar' : 'Click to Log In'}
          >
            <div className="relative w-8 h-8 rounded-lg bg-[#2b2824] border border-[#3d3a34] overflow-hidden flex items-center justify-center text-sm font-bold shrink-0 group-hover:border-[#81b64c] transition-colors shadow">
              {effectiveAvatar && effectiveAvatar.startsWith('http') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={effectiveAvatar}
                  alt={effectiveDisplayName}
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
                {effectiveDisplayName}
              </span>
              <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                <span>({effectiveRating})</span>
                <span>{effectiveCountry === 'ng' ? '🇳🇬' : effectiveCountry.toUpperCase()}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
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
          onClick={onOpenMembershipModal || (() => {})}
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

        {/* Bottom Social/Tool Action Icons */}
        <div ref={popoversRef} className="flex items-center justify-between px-2 pt-1 border-t border-[#252320] text-zinc-400 relative">
          <button
            onClick={() => router.push('/players')}
            className="p-1.5 rounded-lg hover:text-white hover:bg-[#272522] transition cursor-pointer"
            title="Players Explorer"
          >
            <Users className="w-4 h-4" />
          </button>

          {/* Messages Button with Unread Badge & Flyout (opens to the right of sidebar) */}
          <div className="relative">
            <button
              onClick={() => {
                setIsMessagesOpen(!isMessagesOpen);
                setIsNotificationsOpen(false);
              }}
              className={`p-1.5 rounded-lg transition cursor-pointer relative ${
                isMessagesOpen ? 'text-white bg-[#272522]' : 'hover:text-white hover:bg-[#272522]'
              }`}
              title="Messages & Inbox"
            >
              <Mail className="w-4 h-4" />
              {messages.some((m) => m.unread) && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#81b64c] ring-2 ring-[#161512]" />
              )}
            </button>

            {isMessagesOpen && (
              <div className="fixed sm:absolute bottom-16 sm:bottom-0 left-4 sm:left-full sm:ml-3 w-80 max-w-[calc(100vw-2rem)] bg-[#1e1c19] border border-[#33302b] rounded-2xl shadow-2xl p-3.5 z-[999] animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#2d2a26]">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#81b64c]" />
                    <span>Inbox & Coaching</span>
                  </span>
                  <button
                    onClick={() => setMessages((prev) => prev.map((m) => ({ ...m, unread: false })))}
                    className="text-[10px] text-[#81b64c] hover:underline cursor-pointer font-semibold"
                  >
                    Mark read
                  </button>
                </div>
                <div className="divide-y divide-[#282622] max-h-64 overflow-y-auto mt-2">
                  {messages.map((msg) => (
                    <div key={msg.id} className="py-2.5 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-200">{msg.sender}</span>
                        <span className="text-[10px] text-zinc-500">{msg.time}</span>
                      </div>
                      <span className="text-[10px] text-amber-400 font-mono">{msg.role}</span>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">{msg.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notifications Button with Unread Badge & Flyout (opens to the right of sidebar) */}
          <div className="relative">
            <button
              onClick={() => {
                setIsNotificationsOpen(!isNotificationsOpen);
                setIsMessagesOpen(false);
              }}
              className={`p-1.5 rounded-lg transition cursor-pointer relative ${
                isNotificationsOpen ? 'text-white bg-[#272522]' : 'hover:text-white hover:bg-[#272522]'
              }`}
              title="Alerts & Notifications"
            >
              <Bell className="w-4 h-4" />
              {notifications.some((n) => n.unread) && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#161512]" />
              )}
            </button>

            {isNotificationsOpen && (
              <div className="fixed sm:absolute bottom-16 sm:bottom-0 left-4 sm:left-full sm:ml-3 w-80 max-w-[calc(100vw-2rem)] bg-[#1e1c19] border border-[#33302b] rounded-2xl shadow-2xl p-3.5 z-[999] animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#2d2a26]">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-amber-400" />
                    <span>Notifications</span>
                  </span>
                  <button
                    onClick={() => setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))}
                    className="text-[10px] text-[#81b64c] hover:underline cursor-pointer font-semibold"
                  >
                    Clear all
                  </button>
                </div>
                <div className="divide-y divide-[#282622] max-h-64 overflow-y-auto mt-2">
                  {notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setIsNotificationsOpen(false);
                        if (item.link) router.push(item.link);
                      }}
                      className="py-2.5 flex flex-col gap-1 cursor-pointer hover:bg-[#262420] px-2 rounded-lg transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-200">{item.title}</span>
                        <span className="text-[10px] text-zinc-500">{item.time}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-snug">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onOpenSettingsModal || (() => {})}
            className="p-1.5 rounded-lg hover:text-white hover:bg-[#272522] transition cursor-pointer"
            title="Board, Sound & Account Settings"
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
