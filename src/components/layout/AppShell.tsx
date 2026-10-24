'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { SidebarNav } from '@/components/sidebar/SidebarNav';
import { useShell } from '@/context/ShellContext';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { MembershipModal } from '@/components/modals/MembershipModal';
import { ChessComSyncModal } from '@/components/modals/ChessComSyncModal';

import { MobileNavigation } from '@/components/navigation/MobileNavigation';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const isArenaScreen =
    pathname?.startsWith('/game/') ||
    pathname === '/play' ||
    pathname?.startsWith('/play/') ||
    pathname === '/analysis' ||
    pathname === '/puzzles' ||
    pathname === '/bots' ||
    pathname === '/endgames' ||
    pathname === '/variants' ||
    pathname === '/lessons';
  const {
    boardTheme,
    setBoardTheme,
    pieceTheme,
    setPieceTheme,
    soundTheme,
    setSoundTheme,
    soundEnabled,
    setSoundEnabled,
    membershipTier,
    setMembershipTier,
    isSettingsOpen,
    openSettings,
    closeSettings,
    isMembershipOpen,
    openMembership,
    closeMembership,
    isChessComSyncOpen,
    openChessComSync,
    closeChessComSync,
  } = useShell();

  return (
    <div className="flex flex-col md:flex-row min-h-[100dvh] md:h-[100dvh] md:max-h-[100dvh] w-full bg-[#161512] text-zinc-100 overflow-x-hidden">
      {/* Mobile Top Header, Bottom Bar & Drawer (< md screens) */}
      <MobileNavigation
        onOpenMembershipModal={openMembership}
        onOpenSettingsModal={openSettings}
      />

      {/* Persistent Left Sidebar (md and desktop screens) */}
      <SidebarNav
        membership={membershipTier}
        onOpenMembershipModal={openMembership}
        onOpenSettingsModal={openSettings}
        onOpenChessComSync={openChessComSync}
      />

      {/* Main Page Content Area - Naturally Scrollable on Mobile, Viewport-Locked on Desktop */}
      <main className="flex-1 flex flex-col min-h-0 min-w-0 bg-[#161512] relative overflow-y-auto md:overflow-hidden">
        {children}
      </main>

      {/* Global Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={closeSettings}
        boardTheme={boardTheme}
        onChangeBoardTheme={setBoardTheme}
        pieceTheme={pieceTheme}
        onChangePieceTheme={setPieceTheme}
        soundTheme={soundTheme}
        onChangeSoundTheme={setSoundTheme}
        soundEnabled={soundEnabled}
        onToggleSound={setSoundEnabled}
        onOpenChessComSync={openChessComSync}
      />

      <MembershipModal
        isOpen={isMembershipOpen}
        onClose={closeMembership}
        currentTier={membershipTier}
        onSelectTier={setMembershipTier}
      />

      <ChessComSyncModal
        isOpen={isChessComSyncOpen}
        onClose={closeChessComSync}
      />
    </div>
  );
};
