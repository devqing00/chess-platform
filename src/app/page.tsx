'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChessHomeDashboard } from '@/components/home/ChessHomeDashboard';
import { useShell } from '@/context/ShellContext';

export default function HomePage() {
  const router = useRouter();
  const { openChessComSync } = useShell();

  return (
    <div className="flex-1 w-full flex flex-col bg-[#161512] text-zinc-100 min-h-0">
      <ChessHomeDashboard
        onStartGame={() => router.push('/play')}
        onOpenBots={(botId) => router.push(botId ? `/bots?id=${botId}` : '/bots')}
        onOpenLessons={() => router.push('/lessons')}
        onOpenPuzzles={() => router.push('/puzzles')}
        onOpenReview={(gameId) => router.push(gameId ? `/game/review/${gameId}` : '/analysis')}
        onOpenInsights={() => router.push('/insights')}
        onOpenSyncModal={openChessComSync}
      />
    </div>
  );
}
