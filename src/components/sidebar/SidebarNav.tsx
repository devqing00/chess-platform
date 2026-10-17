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
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Target,
} from 'lucide-react';
import { MembershipTier } from '@/types/chess';
import { useAuth } from '@/context/AuthContext';
import { AvatarUploader } from '@/components/profile/AvatarUploader';
import { BrandLogo } from '@/components/ui/BrandLogo';

export type ActiveTab =
  | 'home'
  | 'play'
  | 'training'
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
  const isGameRoute = pathname?.startsWith('/game/') && !pathname?.startsWith('/game/review/');

  // Screen responsiveness states
  const [isTabletOrSmallLaptop, setIsTabletOrSmallLaptop] = useState(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      const isTabletOrSmall = typeof window !== 'undefined' && window.innerWidth >= 768 && window.innerWidth <= 1024;
      setIsTabletOrSmallLaptop(isTabletOrSmall);
      if (typeof window !== 'undefined' && window.innerWidth <= 1024) {
        setIsOverlayOpen(false);
      }
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  useEffect(() => {
    setIsOverlayOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isGameRoute) {
      setIsDesktopCollapsed(true);
      setIsOverlayOpen(false);
    }
  }, [isGameRoute]);

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: '1', title: 'Daily Tactical Puzzle', text: 'New puzzle available: Smothered Knight deflection challenge', time: '10m ago', unread: true, link: '/puzzles' },
    { id: '2', title: 'Grandmaster Bot Challenge', text: 'Can you defeat GM Hikaru in a 3-minute blitz arena?', time: '1h ago', unread: true, link: '/bots' },
    { id: '3', title: 'Performance Review', text: 'Your recent game review is processed with accuracy breakdown.', time: '2h ago', unread: false, link: '/analysis' },
  ]);
  const [messages, setMessages] = useState([
    { id: '1', sender: 'Coach Danny Rensch', role: 'Grandmaster Coach', text: 'Welcome to Check.mate! Focus on central control and king safety before launching flank pawn storms.', time: 'Just now', unread: true },
    { id: '2', sender: 'Check.mate Arena', role: 'Matchmaking System', text: 'Tournament pairings and live rated 1v1 arenas are live. Choose your time control and test your rating!', time: '1d ago', unread: false },
  ]);

  const navItems: { id: ActiveTab; label: string; icon: any; href: string }[] = [
    { id: 'home', label: 'Home', icon: Home, href: '/' },
    { id: 'play', label: 'Play', icon: Gamepad2, href: '/play' },
    { id: 'training', label: 'Training Academy', icon: Target, href: '/training' },
    { id: 'lessons', label: 'Lessons', icon: GraduationCap, href: '/lessons' },
    { id: 'analysis', label: 'Analysis Studio', icon: Microscope, href: '/analysis' },
    { id: 'bots', label: 'Computer Bots', icon: Bot, href: '/bots' },
    { id: 'players', label: 'Players Explorer', icon: Users, href: '/players' },
    { id: 'historical', label: 'Master Games', icon: History, href: '/games' },
    { id: 'variants', label: 'Chess Variants', icon: Sparkles, href: '/variants' },
  ];

  const handleNavClick = (item: typeof navItems[0]) => {
    setIsOverlayOpen(false);
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

  const renderSidebarContent = (collapsed: boolean, isOverlay: boolean) => (
    <>
      {/* Platform Header */}
      <div className="flex flex-col">
        {/* Platform Header with Bespoke Redesigned Logo */}
        <div
          onClick={() => {
            if (collapsed && isTabletOrSmallLaptop) {
              setIsOverlayOpen(true);
            } else {
              if (isOverlay) setIsOverlayOpen(false);
              router.push('/');
            }
          }}
          className={`h-16 ${
            collapsed ? 'px-2 justify-center' : 'px-4'
          } flex items-center justify-between border-b border-[#2d2a26] bg-[#161512] cursor-pointer hover:bg-[#1a1916] transition-all group`}
          title={collapsed ? (isTabletOrSmallLaptop ? 'Expand Menu' : 'Check·mate Home') : undefined}
        >
          <div className="flex items-center gap-3 min-w-0">
            <BrandLogo size="md" showText={!collapsed} />
          </div>

          {/* If Drawer Overlay on Tablet/Laptop, show an explicit close Chevron button */}
          {isOverlay && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOverlayOpen(false);
              }}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#25221e] border border-[#35322b] transition cursor-pointer"
              title="Close Menu"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className={`space-y-1.5 ${collapsed ? 'p-1.5' : 'p-3'}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : item.id === 'training'
                ? pathname?.startsWith('/training') ||
                  pathname === '/puzzles' ||
                  pathname === '/endgames' ||
                  pathname === '/openings'
                : pathname?.startsWith(item.href);

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                title={item.label}
                className={`w-full flex items-center ${
                  collapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3.5 py-2.5'
                } rounded-2xl text-sm font-extrabold border-2 transition-all duration-150 cursor-pointer select-none ${
                  isActive
                    ? 'bg-[#81b64c] text-white border-transparent shadow-[0_4px_0_0_#4d7a24] active:translate-y-[2px] active:shadow-[0_1px_0_0_#4d7a24]'
                    : 'text-zinc-300 border-transparent hover:text-white hover:bg-[#24221f] hover:border-[#38342c] hover:shadow-[0_2px_0_0_#141311] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-none'
                }`}
              >
                <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive ? 'text-white' : 'text-zinc-400'
                    }`}
                  />
                  {!collapsed && <span>{item.label}</span>}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Search, User Account, Tier Banner, and Social/Settings Toolbar */}
      <div className={`border-t-2 border-[#2d2a26] bg-[#161512] ${collapsed ? 'p-2 flex flex-col items-center gap-2.5' : 'p-3 space-y-2.5'}`}>
        {!collapsed ? (
          <>
            {/* Search button navigating to /players */}
            <button
              onClick={() => {
                if (isOverlay) setIsOverlayOpen(false);
                router.push('/players');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border-2 border-[#332f28] bg-[#1f1d1a] text-xs font-bold text-zinc-300 hover:text-white hover:border-[#48433a] hover:-translate-y-[1px] shadow-[0_2px_0_0_#141311] transition-all cursor-pointer"
            >
              <Search className="w-4 h-4 text-zinc-400" />
              <span>Search Players...</span>
            </button>

            {/* User Account / Profile Card */}
            <div className="p-2.5 bg-[#211f1c] rounded-2xl border-2 border-[#35322b] shadow-[0_3px_0_0_#141311] flex items-center justify-between">
              <div
                onClick={() => (user ? setIsAvatarModalOpen(true) : openAuthModal())}
                className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
                title={user ? 'Click to change avatar' : 'Click to Log In'}
              >
                <div className="relative w-8 h-8 rounded-xl bg-[#2b2824] border-2 border-[#3d3a34] overflow-hidden flex items-center justify-center text-sm font-bold shrink-0 group-hover:border-[#81b64c] transition-colors shadow-sm">
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
                  <span className="text-xs font-black text-white truncate group-hover:text-[#81b64c] transition-colors">
                    {effectiveDisplayName}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                    <span>({effectiveRating !== null ? effectiveRating : 'Unranked'})</span>
                    <span>{effectiveCountry === 'ng' ? '🇳🇬' : effectiveCountry.toUpperCase()}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {user ? (
                  <button
                    onClick={logout}
                    className="p-1.5 rounded-xl border border-transparent hover:border-rose-500/30 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={openAuthModal}
                    className="px-3 py-1 rounded-full bg-[#81b64c] hover:bg-[#92cb56] text-white text-[10px] font-black shadow-[0_2px_0_0_#4d7a24] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                  >
                    Log In
                  </button>
                )}
              </div>
            </div>

            {/* Tier Banner */}
            <div
              onClick={onOpenMembershipModal || (() => {})}
              className="p-2.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-600/10 to-[#211f1c] border-2 border-amber-500/40 shadow-[0_3px_0_0_#78350f30] hover:border-amber-500/70 hover:-translate-y-[1px] transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-black text-amber-300 capitalize">
                    {effectiveTier === 'free' ? 'Free Member' : `${effectiveTier} VIP`}
                  </span>
                </div>
                <span className="text-[10px] text-amber-300 font-black uppercase bg-amber-500/25 px-2 py-0.5 rounded-full border border-amber-500/40">
                  {effectiveTier === 'diamond' ? 'Active' : 'Upgrade'}
                </span>
              </div>
            </div>

            {/* Bottom Social/Tool Action Icons */}
            <div ref={popoversRef} className="flex items-center justify-between px-2 pt-1 border-t border-[#252320] text-zinc-400 relative">
              <button
                onClick={() => {
                  if (isOverlay) setIsOverlayOpen(false);
                  router.push('/players');
                }}
                className="p-1.5 rounded-lg hover:text-white hover:bg-[#272522] transition cursor-pointer"
                title="Players Explorer"
              >
                <Users className="w-4 h-4" />
              </button>

              {/* Messages Button with Unread Badge & Flyout */}
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

              {/* Notifications Button with Unread Badge & Flyout */}
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
                        onClick={() => setNotifications([])}
                        className="text-[10px] text-[#81b64c] hover:underline cursor-pointer font-semibold"
                      >
                        Clear all
                      </button>
                    </div>
                    {notifications.length === 0 ? (
                      <div className="py-7 flex flex-col items-center justify-center text-center gap-1.5 text-zinc-500">
                        <CheckCircle className="w-5 h-5 text-[#81b64c]" />
                        <span className="text-xs font-bold text-zinc-300">All caught up!</span>
                        <span className="text-[10px] text-zinc-500">No unread notifications or alerts.</span>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#282622] max-h-64 overflow-y-auto mt-2">
                        {notifications.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => {
                              setIsNotificationsOpen(false);
                              if (isOverlay) setIsOverlayOpen(false);
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
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  if (isOverlay) setIsOverlayOpen(false);
                  onOpenSettingsModal?.();
                }}
                className="p-1.5 rounded-lg hover:text-white hover:bg-[#272522] transition cursor-pointer"
                title="Board, Sound & Account Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Collapsed Mode Profile Avatar */}
            <div
              onClick={() => {
                if (isTabletOrSmallLaptop) {
                  setIsOverlayOpen(true);
                } else {
                  user ? setIsAvatarModalOpen(true) : openAuthModal();
                }
              }}
              className="relative w-9 h-9 rounded-lg bg-[#2b2824] border border-[#3d3a34] overflow-hidden flex items-center justify-center text-sm font-bold cursor-pointer hover:border-[#81b64c] transition-colors shadow"
              title={isTabletOrSmallLaptop ? 'Expand Menu' : `${effectiveDisplayName} (${effectiveRating})`}
            >
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
            </div>

            {/* Collapsed Mode Settings */}
            <button
              onClick={onOpenSettingsModal || (() => {})}
              className="p-2 rounded-lg hover:text-white hover:bg-[#272522] transition cursor-pointer text-zinc-400"
              title="Board, Sound & Account Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Collapse / Expand Toggle Button */}
        <button
          onClick={() => {
            if (isTabletOrSmallLaptop) {
              setIsOverlayOpen(!isOverlayOpen);
            } else {
              setIsDesktopCollapsed(!isDesktopCollapsed);
            }
          }}
          className="w-full flex items-center justify-center py-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-[#272522] transition-colors cursor-pointer text-xs font-semibold gap-1.5 border border-transparent hover:border-[#33302b]"
          title={
            isTabletOrSmallLaptop
              ? isOverlayOpen
                ? 'Collapse Sidebar'
                : 'Expand Sidebar (Overlay)'
              : isDesktopCollapsed
              ? 'Expand Sidebar'
              : 'Collapse Sidebar'
          }
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-[11px]">Collapse</span>
            </>
          )}
        </button>
      </div>
    </>
  );

  const isInlineCollapsed = isTabletOrSmallLaptop ? true : isDesktopCollapsed;

  return (
    <>
      {/* Inline Persistent Left Sidebar */}
      <aside
        className={`hidden md:flex ${
          isInlineCollapsed ? 'md:w-16' : 'md:w-56 xl:w-64'
        } h-full bg-[#1b1917] border-r border-[#2d2a26] flex-col justify-between select-none shrink-0 z-30 transition-all duration-200`}
      >
        {renderSidebarContent(isInlineCollapsed, false)}
      </aside>

      {/* Tablet & Small Laptop (768px-1024px) Slide-Out Expanded Drawer over Dark Overlay */}
      {isTabletOrSmallLaptop && isOverlayOpen && (
        <div className="fixed inset-0 z-50 select-none">
          {/* Dark Backdrop Overlay */}
          <div
            onClick={() => setIsOverlayOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-opacity animate-in fade-in duration-200 cursor-pointer"
          />

          {/* Expanded Drawer on Dark Overlay */}
          <aside
            className="fixed inset-y-0 left-0 w-64 h-full bg-[#1b1917] border-r border-[#2d2a26] flex flex-col justify-between select-none z-50 shadow-2xl animate-in slide-in-from-left duration-200"
          >
            {renderSidebarContent(false, true)}
          </aside>
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
