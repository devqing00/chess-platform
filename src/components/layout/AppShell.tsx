'use client';

import React from 'react';
import { SidebarNav } from '@/components/sidebar/SidebarNav';
import { useShell } from '@/context/ShellContext';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { MembershipModal } from '@/components/modals/MembershipModal';
import { ChessComSyncModal } from '@/components/modals/ChessComSyncModal';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
    <div className="flex h-screen w-screen overflow-hidden bg-[#161512] text-zinc-100">
      {/* Persistent Left Sidebar */}
      <SidebarNav
        membership={membershipTier}
        onOpenMembershipModal={openMembership}
        onOpenSettingsModal={openSettings}
        onOpenChessComSync={openChessComSync}
      />

      {/* Main Page Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto overflow-x-hidden min-w-0 bg-[#161512] relative">
        {children}
      </div>

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
