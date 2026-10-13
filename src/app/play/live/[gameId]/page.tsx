'use client';

import React, { use } from 'react';
import { LivePvPArena } from '@/components/game/LivePvPArena';

export default function LiveGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const resolvedParams = use(params);
  return <LivePvPArena gameId={resolvedParams.gameId} />;
}
