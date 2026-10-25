'use client';

import React from 'react';
import { VariantsArena } from '@/components/variants/VariantsArena';
import { useShell } from '@/context/ShellContext';

export default function VariantsPage() {
  const { boardTheme, pieceTheme } = useShell();

  return (
    <div className="w-full min-h-full xl:h-full xl:max-h-full overflow-y-auto xl:overflow-hidden flex flex-col bg-[#161512] text-zinc-100 select-none">
      <VariantsArena boardTheme={boardTheme} pieceTheme={pieceTheme} />
    </div>
  );
}
