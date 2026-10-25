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
  BookOpen,
} from 'lucide-react';
import { MembershipTier } from '@/types/chess';
import { useAuth } from '@/context/AuthContext';
import { AvatarUploader } from '@/components/profile/AvatarUploader';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Button } from '@/components/ui/button';
import { soundService } from '@/lib/audioService';

export type ActiveTab =
  | 'home'
  | 'play'
  | 'puzzles'
  | 'lessons'
  | 'analysis'
  | 'bots'
  | 'training'
  | 'openings'
  | 'endgames'
  | 'insights'
  | 'players'
  | 'historical'
  | 'variants';

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
    { id: 'puzzles', label: 'Puzzles', icon: Puzzle, href: '/puzzles' },
    { id: 'lessons', label: 'Lessons', icon: GraduationCap, href: '/lessons' },
    { id: 'analysis', label: 'Analysis', icon: Microscope, href: '/analysis' },
    { id: 'bots', label: 'Bots', icon: Bot, href: '/bots' },
    { id: 'training', label: 'Training', icon: Target, href: '/training' },
    { id: 'openings', label: 'Openings', icon: BookOpen, href: '/openings' },
    { id: 'endgames', label: 'Endgames', icon: Crown, href: '/endgames' },
    { id: 'insights', label: 'Insights', icon: Compass, href: '/insights' },
    { id: 'players', label: 'Players', icon: Users, href: '/players' },
    { id: 'historical', label: 'Master Games', icon: History, href: '/games' },
    { id: 'variants', label: 'Variants', icon: Sparkles, href: '/variants' },
  ];

  const isItemActive = (itemHref: string) => {
    if (itemHref === '/') return pathname === '/';
    if (itemHref === '/play') {
      return (
        pathname === '/play' ||
        pathname?.startsWith('/play/') ||
        (pathname?.startsWith('/game/') && !pathname?.startsWith('/game/review/'))
      );
    }
    if (itemHref === '/analysis') {
      return (
        pathname === '/analysis' ||
        pathname?.startsWith('/analysis/') ||
        pathname?.startsWith('/game/review/')
      );
    }
    return pathname === itemHref || pathname?.startsWith(`${itemHref}/`);
  };

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
      {/* Platform Header & Navigation Items */}
      <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
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
          } flex items-center justify-between border-b border-[#2d2a26] bg-[#161512] shrink-0 cursor-pointer hover:bg-[#1a1916] transition-all group`}
          title={collapsed ? (isTabletOrSmallLaptop ? 'Expand Menu' : 'Check·mate Home') : undefined}
        >
          <div className="flex items-center gap-3 min-w-0">
            <BrandLogo size="md" showText={!collapsed} />
          </div>

          {/* If Drawer Overlay on Tablet/Laptop, show an explicit close Chevron button */}
          {isOverlay && (
            <Button
              variant="secondary"
              size="icon-sm"
              rounded="lg"
              onClick={(e) => {
                e.stopPropagation();
                setIsOverlayOpen(false);
              }}
              title="Close Menu"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Navigation Items (Scrollable when needed) */}
        <nav className={`space-y-1 ${collapsed ? 'p-1.5' : 'px-2.5 py-2'} flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700/40`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(item.href);

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                onPointerDown={() => soundService.playTactilePop()}
                title={item.label}
                className={`tactile-btn w-full flex items-center ${
                  collapsed ? 'justify-center px-0 py-2' : 'justify-between px-3 py-2'
                } rounded-xl text-[13px] font-extrabold border transition-all duration-150 cursor-pointer select-none ${
                  isActive
                    ? 'bg-gradient-to-b from-[#8fd649] via-[#7cb53d] to-[#699c30] text-zinc-950 font-black border-t border-white/35 border-x-emerald-600/30 border-b-emerald-950/40 shadow-[0_3px_0_0_#385a16,0_4px_12px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_0_0_#385a16] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-[0_1px_0_0_#385a16]'
                    : 'text-zinc-300 border-t border-transparent border-x-transparent border-b-transparent hover:text-white hover:bg-[#25221e] hover:border-t-white/10 hover:border-x-[#35322b] hover:border-b-[#12110f] hover:shadow-[0_2px_0_0_#12110f] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-none'
                }`}
              >
                <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
                  <Icon
                    className={`w-4.5 h-4.5 shrink-0 ${
                      isActive ? 'text-zinc-950 drop-shadow-[0_1px_0_rgba(255,255,255,0.3)]' : 'text-zinc-400'
                    }`}
                  />
                  {!collapsed && <span className={isActive ? 'drop-shadow-[0_1px_0_rgba(255,255,255,0.25)]' : ''}>{item.label}</span>}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Search, User Account, Tier Banner, and Social/Settings Toolbar */}
      <div className={`border-t-2 border-[#2d2a26] bg-[#161512] shrink-0 ${collapsed ? 'p-2 flex flex-col items-center gap-2.5' : 'p-3 space-y-2.5'}`}>
        {!collapsed ? (
          <>
            {/* Search button navigating to /players */}
            <Button
              variant="secondary"
              size="sm"
              rounded="xl"
              fullWidth
              onClick={() => {
                if (isOverlay) setIsOverlayOpen(false);
                router.push('/players');
              }}
              className="justify-start gap-2.5 text-xs font-bold text-zinc-300"
            >
              <Search className="w-4 h-4 text-zinc-400" />
              <span>Search Players...</span>
            </Button>

            {/* User Account / Profile Card */}
            <div className="p-2.5 bg-[#211f1c] rounded-2xl border-2 border-[#35322b] shadow-[0_3px_0_0_#141311] flex items-center justify-between">
              <div
                onClick={() => (user ? setIsAvatarModalOpen(true) : openAuthModal())}
                className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
                title={user ? 'Click to change avatar' : 'Click to Log In'}
              >
                <div className="relative w-8 h-8 rounded-xl bg-[#2b2824] border-2 border-[#3d3a34] overflow-hidden flex items-center justify-center text-sm font-bold shrink-0 group-hover:border-emerald-500 transition-colors shadow-sm">
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
                  <span className="text-xs font-black text-white truncate group-hover:text-emerald-400 transition-colors">
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
                  <Button
                    variant="destructive"
                    size="icon-sm"
                    rounded="xl"
                    onClick={logout}
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="xs"
                    rounded="full"
                    onClick={openAuthModal}
                    className="text-[10px] px-3.5 py-1"
                  >
                    Log In
                  </Button>
                )}
              </div>
            </div>

            {/* Tier Banner */}
            <div
              onClick={onOpenMembershipModal || (() => {})}
              onPointerDown={() => soundService.playTactilePop()}
              className="p-2.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-600/10 to-[#211f1c] border-t border-white/35 border-x-amber-500/30 border-b-amber-950/50 shadow-[0_4px_0_0_#78350f40,0_4px_12px_rgba(245,158,11,0.2)] hover:shadow-[0_5px_0_0_#78350f60] hover:-translate-y-[1px] active:translate-y-[3px] active:shadow-[0_1px_0_0_#78350f40] transition-all cursor-pointer group tactile-btn"
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
            <div ref={popoversRef} className="flex items-center justify-between px-1 pt-1.5 border-t border-[#252320] text-zinc-400 relative">
              <Button
                variant="secondary"
                size="icon-sm"
                rounded="xl"
                onClick={() => {
                  if (isOverlay) setIsOverlayOpen(false);
                  router.push('/players');
                }}
                title="Players Explorer"
              >
                <Users className="w-4 h-4" />
              </Button>

              {/* Messages Button with Unread Badge & Flyout */}
              <div className="relative">
                <Button
                  variant={isMessagesOpen ? 'primary' : 'secondary'}
                  size="icon-sm"
                  rounded="xl"
                  onClick={() => {
                    setIsMessagesOpen(!isMessagesOpen);
                    setIsNotificationsOpen(false);
                  }}
                  title="Messages & Inbox"
                  className="relative"
                >
                  <Mail className="w-4 h-4" />
                  {messages.some((m) => m.unread) && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#161512]" />
                  )}
                </Button>

                {isMessagesOpen && (
                  <div className="fixed sm:absolute bottom-16 sm:bottom-0 left-4 sm:left-full sm:ml-3 w-80 max-w-[calc(100vw-2rem)] bg-[#1e1c19] border border-[#33302b] rounded-2xl shadow-2xl p-3.5 z-[999] animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-2.5 border-b border-[#2d2a26]">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Inbox & Coaching</span>
                      </span>
                      <button
                        onClick={() => setMessages((prev) => prev.map((m) => ({ ...m, unread: false })))}
                        className="text-[10px] text-emerald-400 hover:underline cursor-pointer font-semibold"
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
                <Button
                  variant={isNotificationsOpen ? 'warning' : 'secondary'}
                  size="icon-sm"
                  rounded="xl"
                  onClick={() => {
                    setIsNotificationsOpen(!isNotificationsOpen);
                    setIsMessagesOpen(false);
                  }}
                  title="Alerts & Notifications"
                  className="relative"
                >
                  <Bell className="w-4 h-4" />
                  {notifications.some((n) => n.unread) && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#161512]" />
                  )}
                </Button>

                {isNotificationsOpen && (
                  <div className="fixed sm:absolute bottom-16 sm:bottom-0 left-4 sm:left-full sm:ml-3 w-80 max-w-[calc(100vw-2rem)] bg-[#1e1c19] border border-[#33302b] rounded-2xl shadow-2xl p-3.5 z-[999] animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-2.5 border-b border-[#2d2a26]">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-amber-400" />
                        <span>Notifications</span>
                      </span>
                      <button
                        onClick={() => setNotifications([])}
                        className="text-[10px] text-emerald-400 hover:underline cursor-pointer font-semibold"
                      >
                        Clear all
                      </button>
                    </div>
                    {notifications.length === 0 ? (
                      <div className="py-7 flex flex-col items-center justify-center text-center gap-1.5 text-zinc-500">
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
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

              <Button
                variant="secondary"
                size="icon-sm"
                rounded="xl"
                onClick={() => {
                  if (isOverlay) setIsOverlayOpen(false);
                  onOpenSettingsModal?.();
                }}
                title="Board, Sound & Account Settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
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
              className="relative w-9 h-9 rounded-lg bg-[#2b2824] border border-[#3d3a34] overflow-hidden flex items-center justify-center text-sm font-bold cursor-pointer hover:border-emerald-500 transition-colors shadow"
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
            <Button
              variant="secondary"
              size="icon-sm"
              rounded="xl"
              onClick={onOpenSettingsModal || (() => {})}
              title="Board, Sound & Account Settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </>
        )}

        {/* Collapse / Expand Toggle Button */}
        <Button
          variant="subtle"
          size="xs"
          rounded="xl"
          fullWidth
          onClick={() => {
            if (isTabletOrSmallLaptop) {
              setIsOverlayOpen(!isOverlayOpen);
            } else {
              setIsDesktopCollapsed(!isDesktopCollapsed);
            }
          }}
          className="text-zinc-400 hover:text-white"
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
        </Button>
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
