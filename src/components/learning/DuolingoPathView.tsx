'use client';

import React, { useState, useEffect } from 'react';
import {
  LearningUnit,
  LearningPathNode,
  LearningProgress,
  LearningProgressStore,
  LEARNING_UNITS,
} from '@/lib/learningPathData';
import { useXpSystem } from '@/hooks/useXpSystem';
import { XpGainToast } from '@/components/xp/XpGainToast';
import { soundService } from '@/lib/audioService';
import {
  Check,
  Lock,
  Star,
  Gift,
  BookOpen,
  Sparkles,
  Zap,
  Flame,
  Award,
  ChevronRight,
  X,
  Target,
  Shield,
  Compass,
  ArrowRight,
  Play,
  RotateCcw,
} from 'lucide-react';

interface DuolingoPathViewProps {
  category?: 'tactics' | 'openings' | 'endgames';
  onSelectNode: (node: LearningPathNode) => void;
  onOpenFreeArena?: () => void;
  freeArenaLabel?: string;
  showHeader?: boolean;
}

export const DuolingoPathView: React.FC<DuolingoPathViewProps> = ({
  category = 'tactics',
  onSelectNode,
  onOpenFreeArena,
  freeArenaLabel = 'Free Practice Arena',
  showHeader = false,
}) => {
  const [activeCategory, setActiveCategory] = useState<'tactics' | 'openings' | 'endgames'>(category);
  const [progress, setProgress] = useState<LearningProgress>(() => LearningProgressStore.getProgress());
  const [activeGuidebook, setActiveGuidebook] = useState<LearningUnit['guidebook'] | null>(null);
  const [openedChest, setOpenedChest] = useState<{ id: string; xp: number } | null>(null);

  const { profile: xpProfile, recentGain, awardXp } = useXpSystem();

  // Sync category prop if it changes
  useEffect(() => {
    setActiveCategory(category);
  }, [category]);

  const units = LEARNING_UNITS.filter((u) => u.category === activeCategory);

  const handleNodeClick = (node: LearningPathNode, isUnlocked: boolean, isCompleted: boolean) => {
    if (!isUnlocked) {
      soundService.playPuzzleFail();
      return;
    }

    if (node.type === 'chest') {
      const isClaimed = progress.claimedChests.includes(node.targetId);
      if (!isClaimed) {
        soundService.playPuzzleSuccess();
        const updated = LearningProgressStore.claimChest(node.targetId, node.xpReward);
        setProgress({ ...updated });
        setOpenedChest({ id: node.targetId, xp: node.xpReward });
      }
      return;
    }

    soundService.playMove();
    onSelectNode(node);
  };

  // Node horizontal offset sequence for authentic Duolingo zigzag trail
  // 0: center, 1: offset-right, 2: center, 3: offset-left
  const getOffsetClass = (idx: number) => {
    const cycle = idx % 4;
    switch (cycle) {
      case 0:
        return 'translate-x-0';
      case 1:
        return 'translate-x-6 sm:translate-x-12';
      case 2:
        return 'translate-x-0';
      case 3:
        return '-translate-x-6 sm:-translate-x-12';
      default:
        return 'translate-x-0';
    }
  };

  return (
    <div className="w-full flex flex-col items-center select-none animate-in fade-in duration-200">
      {/* Optional Top Learning Path HUD Header (Only rendered when showHeader is explicitly true) */}
      {showHeader && (
        <div className="w-full max-w-2xl px-3 sm:px-4 py-2.5 sm:py-3 bg-[#1e1c19] border-2 border-[#35322b] rounded-2xl sm:rounded-3xl shadow-[0_6px_0_0_#141311] mb-6 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
          {/* Track Category Selector Tabs - Uniform balanced padding without excessive bottom void */}
          <div className="flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 bg-[#141311] rounded-xl sm:rounded-2xl border-2 border-[#2b2824] shadow-[0_2px_0_0_#0f0e0c]">
            <button
              onClick={() => setActiveCategory('tactics')}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeCategory === 'tactics'
                  ? 'bg-[#58cc02] text-white shadow-[0_2px_0_0_#3da300] active:translate-y-[1px] active:shadow-none'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Tactics
            </button>
            <button
              onClick={() => setActiveCategory('endgames')}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeCategory === 'endgames'
                  ? 'bg-[#ce82ff] text-white shadow-[0_2px_0_0_#a855f7] active:translate-y-[1px] active:shadow-none'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Endgames
            </button>
            <button
              onClick={() => setActiveCategory('openings')}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeCategory === 'openings'
                  ? 'bg-[#eab308] text-white shadow-[0_2px_0_0_#ca8a04] active:translate-y-[1px] active:shadow-none'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Openings
            </button>
          </div>

          {/* Stats: Streak, League & XP Counters */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-[#262420] border-2 border-[#3b372e] rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-black text-amber-400 shadow-[0_2px_0_0_#141311]">
              <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-400" />
              <span className="font-mono">{xpProfile.streak}d streak</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-[#262420] border-2 border-[#3b372e] rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-black text-emerald-400 shadow-[0_2px_0_0_#141311]">
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-emerald-400" />
              <span className="font-mono">{xpProfile.totalXp} XP</span>
            </div>

            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-black border-2 shadow-[0_2px_0_0_#141311]"
              style={{
                backgroundColor: xpProfile.league.badgeBg,
                borderColor: xpProfile.league.badgeBorder,
                color: xpProfile.league.color,
              }}
              title={xpProfile.league.name}
            >
              <Award className="w-3.5 h-3.5" />
              <span>{xpProfile.league.name.replace(' League', '')}</span>
            </div>

            {onOpenFreeArena && (
              <button
                onClick={onOpenFreeArena}
                className="px-2.5 sm:px-3.5 py-1.5 rounded-xl sm:rounded-2xl border-2 border-[#3b372e] bg-[#22201d] text-zinc-300 hover:text-white hover:bg-[#2c2925] text-[11px] sm:text-xs font-black uppercase tracking-wider shadow-[0_2px_0_0_#141311] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>{freeArenaLabel}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Units Stepping-Stones Progression List */}
      <div className="w-full max-w-lg flex flex-col gap-8 sm:gap-10 pb-16">
        {units.map((unit) => {
          const completedInUnit = unit.nodes.filter((n) =>
            n.type === 'chest'
              ? progress.claimedChests.includes(n.targetId)
              : progress.completedNodeIds.includes(n.id)
          ).length;
          const unitPct = Math.round((completedInUnit / unit.nodes.length) * 100);

          return (
            <div key={unit.id} className="relative flex flex-col items-center w-full mb-6 sm:mb-8">
              {/* Duolingo Sticky Unit Header Card - Pinned to top while that unit is in view */}
              <div
                className="sticky top-2 z-20 w-full p-4 sm:p-5 rounded-2xl sm:rounded-3xl text-white mb-10 sm:mb-14 border-2 border-black/30 shadow-[0_8px_0_0_rgba(0,0,0,0.4)] backdrop-blur-md relative overflow-hidden transition-all"
                style={{ backgroundColor: unit.themeColor }}
              >
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  <div>
                    <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-white/80 block">
                      Unit {unit.unitNumber} &bull; {unit.category.toUpperCase()}
                    </span>
                    <h2 className="text-base sm:text-lg font-black text-white mt-0.5 leading-snug">
                      {unit.title}
                    </h2>
                    <p className="text-xs text-white/90 font-medium mt-1">
                      {unit.subtitle}
                    </p>
                  </div>

                  {/* Guidebook Button */}
                  <button
                    onClick={() => setActiveGuidebook(unit.guidebook)}
                    className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-white/20 hover:bg-white/30 border-2 border-white/30 text-white text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 shadow-[0_2px_0_0_rgba(0,0,0,0.2)] active:translate-y-[1px] transition-all cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Guidebook</span>
                  </button>
                </div>

                {/* Unit Progress Bar */}
                <div className="mt-3 sm:mt-4 flex items-center gap-3">
                  <div className="flex-1 h-2.5 sm:h-3 rounded-xl bg-black/20 overflow-hidden p-0.5 border border-white/20">
                    <div
                      className="h-full rounded-lg bg-white transition-all duration-500"
                      style={{ width: `${unitPct}%` }}
                    />
                  </div>
                  <span className="text-xs font-black font-mono text-white shrink-0">
                    {completedInUnit}/{unit.nodes.length}
                  </span>
                </div>
              </div>

              {/* S-Curve Stepping Stones - pt-3 adds top breathing space so active START bubble is never behind the unit header */}
              <div className="flex flex-col items-center gap-6 sm:gap-7 relative w-full pt-3">
                {unit.nodes.map((node, nodeIdx) => {
                  const isCompleted = progress.completedNodeIds.includes(node.id);
                  const isChestClaimed = progress.claimedChests.includes(node.targetId);
                  const isUnlocked =
                    progress.unlockedNodeIds.includes(node.id) ||
                    nodeIdx === 0 ||
                    isCompleted ||
                    isChestClaimed;
                  const isCurrentActive = isUnlocked && !isCompleted && !isChestClaimed;

                  const offsetClass = getOffsetClass(nodeIdx);

                  if (node.type === 'chest') {
                    return (
                      <div
                        key={node.id}
                        className={`relative flex flex-col items-center transition-all ${offsetClass}`}
                      >
                        <button
                          onClick={() => handleNodeClick(node, isUnlocked, isChestClaimed)}
                          disabled={!isUnlocked}
                          className={`w-18 h-18 rounded-3xl border-3 flex flex-col items-center justify-center transition-all cursor-pointer select-none relative ${
                            isChestClaimed
                              ? 'bg-[#2a2824] border-[#403c34] text-zinc-500 shadow-[0_4px_0_0_#171614]'
                              : isUnlocked
                              ? 'bg-amber-400 hover:bg-amber-300 border-amber-600 text-amber-950 shadow-[0_7px_0_0_#b45309] hover:-translate-y-[2px] active:translate-y-[3px] active:shadow-[0_2px_0_0_#b45309]'
                              : 'bg-[#22201d] border-[#35322b] text-zinc-600 shadow-[0_4px_0_0_#141311] opacity-60 cursor-not-allowed'
                          }`}
                        >
                          <Gift className="w-8 h-8 stroke-[2.5]" />
                        </button>
                        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 mt-2">
                          {isChestClaimed ? 'Claimed' : `${node.xpReward} XP Reward`}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={node.id}
                      className={`relative flex flex-col items-center transition-all ${offsetClass}`}
                    >
                      {/* Active "START" Speech Bubble Tooltip - Positioned with ample clearance below unit header */}
                      {isCurrentActive && (
                        <div className="absolute -top-10 z-10 pointer-events-none">
                          <div
                            className="px-3.5 py-1 rounded-xl text-white text-[11px] font-black uppercase tracking-wider shadow-[0_3px_0_0_rgba(0,0,0,0.35)] relative border border-white/20"
                            style={{ backgroundColor: unit.themeColor }}
                          >
                            <span>START</span>
                            {/* Downward pointer caret */}
                            <div
                              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px]"
                              style={{ borderTopColor: unit.themeColor }}
                            />
                          </div>
                        </div>
                      )}

                      {/* 3D Duolingo Stepping Stone Button */}
                      <button
                        onClick={() => handleNodeClick(node, isUnlocked, isCompleted)}
                        disabled={!isUnlocked}
                        className={`w-18 h-18 rounded-full border-3 flex items-center justify-center transition-all select-none relative cursor-pointer ${
                          isCompleted
                            ? 'bg-[#58cc02] hover:bg-[#46a302] border-[#3da300] text-white shadow-[0_6px_0_0_#2b7300] hover:-translate-y-[1px] active:translate-y-[3px] active:shadow-[0_2px_0_0_#2b7300]'
                            : isCurrentActive
                            ? 'border-white text-white shadow-[0_6px_0_0_rgba(0,0,0,0.5)] ring-4 ring-white/30 hover:-translate-y-[2px] active:translate-y-[3px] active:shadow-[0_2px_0_0_rgba(0,0,0,0.5)]'
                            : 'bg-[#22201d] border-[#35322b] text-zinc-600 shadow-[0_5px_0_0_#141311] cursor-not-allowed opacity-60'
                        }`}
                        style={{
                          backgroundColor: isCurrentActive ? unit.themeColor : undefined,
                        }}
                      >
                        {isCompleted ? (
                          <Check className="w-8 h-8 stroke-[3.5] text-white" />
                        ) : isUnlocked ? (
                          <Star className="w-7 h-7 fill-white stroke-[2.5] text-white" />
                        ) : (
                          <Lock className="w-6 h-6 stroke-[2.5]" />
                        )}
                      </button>

                      <span className="text-xs font-black text-zinc-300 mt-2 max-w-[130px] text-center truncate">
                        {node.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Guidebook Modal */}
      {activeGuidebook && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-lg bg-[#201e1a] border-2 border-[#3b3832] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-[0_12px_0_0_#141311] max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#2f2b25] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-[#58cc02]/20 border border-[#58cc02]/40 text-[#58cc02] flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-white">{activeGuidebook.title}</h3>
              </div>
              <button
                onClick={() => setActiveGuidebook(null)}
                className="p-1.5 rounded-xl border border-[#3b3832] text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 font-medium leading-relaxed mb-4">
              {activeGuidebook.summary}
            </p>

            <div className="space-y-2 mb-6">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-zinc-400 block">
                Key Principles:
              </span>
              {activeGuidebook.keyPoints.map((pt: string, idx: number) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300">
                  <div className="w-4 h-4 rounded-full bg-[#58cc02]/20 text-[#58cc02] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>{pt}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setActiveGuidebook(null)}
              className="w-full py-3 rounded-2xl bg-[#58cc02] hover:bg-[#46a302] border-2 border-[#3da300] text-white text-xs font-black uppercase tracking-wider shadow-[0_4px_0_0_#2b7300] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
            >
              Got It, Let’s Train!
            </button>
          </div>
        </div>
      )}

      {/* Chest Reward Modal */}
      {openedChest && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-sm bg-[#201e1a] border-2 border-amber-500/40 rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-center shadow-[0_12px_0_0_#141311] max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-amber-400 border-2 border-amber-600 mx-auto flex items-center justify-center text-amber-950 shadow-[0_6px_0_0_#b45309] mb-4">
              <Award className="w-8 h-8 sm:w-9 sm:h-9 stroke-[2.5]" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-white">Milestone Unlocked!</h3>
            <p className="text-xs text-zinc-300 mt-1">
              You earned <strong className="text-amber-400 font-bold">+{openedChest.xp} XP</strong> and completed this learning unit!
            </p>
            <button
              onClick={() => setOpenedChest(null)}
              className="w-full mt-6 py-3 rounded-2xl bg-[#58cc02] hover:bg-[#46a302] border-2 border-[#3da300] text-white text-xs font-black uppercase tracking-wider shadow-[0_4px_0_0_#2b7300] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
            >
              Continue Journey
            </button>
          </div>
        </div>
      )}

      {/* Tactile Floating XP Gain Toast */}
      <XpGainToast gain={recentGain} />
    </div>
  );
};
