'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Crown } from 'lucide-react';

export default function EndgamesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Seamlessly redirect to the unified Tactical, Strategic & Endgame Puzzle Hub
    router.replace('/puzzles?pillar=endgame');
  }, [router]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#161512] text-zinc-100 min-h-[60vh] select-none">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border-2 border-indigo-500/40 flex items-center justify-center text-indigo-400 animate-pulse">
          <Crown className="w-6 h-6" />
        </div>
        <p className="text-xs font-mono font-bold text-zinc-400">
          Redirecting to Unified Endgame &amp; Tactics Arena...
        </p>
      </div>
    </div>
  );
}
