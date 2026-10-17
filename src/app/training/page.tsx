'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useXpSystem } from '@/hooks/useXpSystem';
import { DuolingoPathView } from '@/components/learning/DuolingoPathView';
import { PersonalizedAdaptiveHub } from '@/components/training/PersonalizedAdaptiveHub';
import { LearningPathNode } from '@/lib/learningPathData';
import {
  Target,
  Sparkles,
  Brain,
  Shield,
  Flame,
  Zap,
  Award,
  Crown,
  Link as LinkIcon,
  RotateCw,
} from 'lucide-react';

function TrainingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile: xpProfile } = useXpSystem();
  const { effectiveRating, isSynced, syncedPlatform, openAuthModal } = useAuth();

  // Tab state: 'path' | 'cognitive' | 'blunders'
  const initialTab = searchParams.get('tab') === 'cognitive' ? 'cognitive' : 'path';
  const [activeTab, setActiveTab] = useState<'path' | 'cognitive' | 'blunders'>(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'cognitive') setActiveTab('cognitive');
    else if (tabParam === 'blunders') setActiveTab('blunders');
    else if (tabParam === 'path') setActiveTab('path');
  }, [searchParams]);

  const handleSelectNode = (node: LearningPathNode) => {
    if (node.type === 'puzzle') {
      router.push(`/puzzles?id=${node.targetId}`);
    } else if (node.type === 'endgame') {
      router.push(`/endgames?study=${node.targetId}`);
    } else if (node.type === 'opening') {
      router.push(`/openings?eco=${node.targetId}`);
    } else {
      router.push('/puzzles');
    }
  };

  return (
    <div className="flex-1 p-3 sm:p-5 pb-24 md:pb-6 flex flex-col items-center bg-[#161512] text-zinc-100 overflow-y-auto select-none">
      <div className="w-full max-w-6xl flex flex-col gap-4">
        {/* Compact Minimalist Header & Global HUD Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b-2 border-[#282522]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#58cc02]/15 border-2 border-[#58cc02]/40 flex items-center justify-center text-[#58cc02] shadow-[0_2px_0_0_#388302] shrink-0">
              <Target className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
                Training Academy &amp; Cognitive Hub
              </h1>
              <p className="text-[11px] sm:text-xs text-zinc-400 font-medium">
                Duolingo progression path &bull; Cognitive DNA &bull; Real match blunder repair
              </p>
            </div>
          </div>

          {/* User Progression & Authentic Rating HUD Chips */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Official Rating (Sourced strictly from synced profile, no fake app Elo) */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-black border shadow-sm ${
                isSynced && effectiveRating
                  ? syncedPlatform === 'chesscom'
                    ? 'bg-[#81b64c]/15 text-[#81b64c] border-[#81b64c]/40'
                    : 'bg-zinc-700/30 text-white border-zinc-600'
                  : 'bg-[#201e1a] text-zinc-400 border-[#35322b]'
              }`}
              title={isSynced ? 'Official Synced Platform Rating' : 'Connect account to sync official rating'}
            >
              <span>{syncedPlatform === 'chesscom' ? '♟' : syncedPlatform === 'lichess' ? '♞' : '○'}</span>
              <span>
                {isSynced && effectiveRating
                  ? `${syncedPlatform === 'chesscom' ? 'Chess.com' : 'Lichess'} ${effectiveRating}`
                  : 'Unranked'}
              </span>
            </div>

            {/* Daily Streak */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#201e1a] border-2 border-[#35322b] rounded-xl text-[11px] font-black text-amber-400 shadow-[0_2px_0_0_#141311]">
              <Flame className="w-3.5 h-3.5 fill-amber-400 shrink-0" />
              <span className="font-mono">{xpProfile.streak}d</span>
            </div>

            {/* XP Total */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#201e1a] border-2 border-[#35322b] rounded-xl text-[11px] font-black text-emerald-400 shadow-[0_2px_0_0_#141311]">
              <Zap className="w-3.5 h-3.5 fill-emerald-400 shrink-0" />
              <span className="font-mono">{xpProfile.totalXp} XP</span>
            </div>

            {/* League Badge */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-black border-2 shadow-[0_2px_0_0_#141311]"
              style={{
                backgroundColor: xpProfile.league.badgeBg,
                borderColor: xpProfile.league.badgeBorder,
                color: xpProfile.league.color,
              }}
            >
              <Award className="w-3.5 h-3.5 shrink-0" />
              <span>{xpProfile.league.name}</span>
            </div>
          </div>
        </div>

        {/* Clean, Non-overloaded Tab Switcher */}
        <div className="flex items-center justify-between gap-2 p-1 bg-[#141311] border-2 border-[#282522] rounded-2xl">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveTab('path')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'path'
                  ? 'bg-[#58cc02] text-white shadow-[0_2px_0_0_#388302]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Mastery Path</span>
            </button>

            <button
              onClick={() => setActiveTab('cognitive')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'cognitive'
                  ? 'bg-indigo-600 text-white shadow-[0_2px_0_0_#3730a3]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Brain className="w-3.5 h-3.5 text-indigo-300" />
              <span>Cognitive DNA &amp; Leaks</span>
            </button>

            <button
              onClick={() => setActiveTab('blunders')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'blunders'
                  ? 'bg-rose-600 text-white shadow-[0_2px_0_0_#9f1239]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-rose-300" />
              <span>Blunder Repair Side Quest</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono font-bold text-zinc-400 pr-2">
            <span>Goal: {xpProfile.dailyXp}/{xpProfile.dailyGoal} XP</span>
          </div>
        </div>

        {/* TAB 1: DUOLINGO-STYLE MASTERY PROGRESSION PATH */}
        {activeTab === 'path' && (
          <div className="w-full flex flex-col items-center animate-fadeIn">
            <div className="w-full max-w-xl">
              <DuolingoPathView
                category="tactics"
                onSelectNode={handleSelectNode}
                onOpenFreeArena={() => router.push('/puzzles')}
                freeArenaLabel="Tactics Free Arena"
                showHeader={false}
              />
            </div>
          </div>
        )}

        {/* TAB 2: COGNITIVE DNA & LEAKS */}
        {activeTab === 'cognitive' && (
          <div className="w-full animate-fadeIn">
            <PersonalizedAdaptiveHub initialSubTab="dna" />
          </div>
        )}

        {/* TAB 3: BLUNDER REPAIR SIDE QUEST */}
        {activeTab === 'blunders' && (
          <div className="w-full animate-fadeIn">
            <PersonalizedAdaptiveHub initialSubTab="blunders" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrainingLandingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center bg-[#161512] text-zinc-400 text-xs font-mono">
          Loading Training Academy...
        </div>
      }
    >
      <TrainingContent />
    </Suspense>
  );
}
