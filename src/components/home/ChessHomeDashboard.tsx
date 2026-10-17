'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Swords,
  Bot,
  Zap,
  Flame,
  Clock,
  Trophy,
  RotateCw,
  ExternalLink,
  ChevronRight,
  Shield,
  Target,
  Sparkles,
  ArrowRight,
  History,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { ChessBoard } from '@/components/board/ChessBoard';
import { Chess } from 'chess.js';
import { GameSessionStore, isSessionUserWhite, getSessionUserOutcome } from '@/lib/gameSessionStore';
import { GameSession } from '@/types/chess';
import { useAuth } from '@/context/AuthContext';
import { useXpSystem } from '@/hooks/useXpSystem';
import { SlideDrawer } from '@/components/ui/SlideDrawer';
import { LEAGUE_TIERS } from '@/lib/xpSystem';

interface ChessHomeDashboardProps {
  onStartGame: (timeControl: number) => void;
  onOpenBots: (botId?: string) => void;
  onOpenLessons: () => void;
  onOpenPuzzles: () => void;
  onOpenReview: (gameId?: string) => void;
  onOpenInsights?: () => void;
  onOpenSyncModal?: () => void;
}

interface TimeControlOption {
  label: string;
  category: 'Bullet' | 'Blitz' | 'Rapid' | 'Classical';
  sec: number;
}

const TIME_CONTROLS: TimeControlOption[] = [
  { label: '1 min', category: 'Bullet', sec: 60 },
  { label: '3 min', category: 'Blitz', sec: 180 },
  { label: '5 min', category: 'Blitz', sec: 300 },
  { label: '10 min', category: 'Rapid', sec: 600 },
  { label: '30 min', category: 'Classical', sec: 1800 },
];

export const ChessHomeDashboard: React.FC<ChessHomeDashboardProps> = ({
  onStartGame,
  onOpenBots,
  onOpenLessons,
  onOpenPuzzles,
  onOpenReview,
  onOpenInsights,
  onOpenSyncModal,
}) => {
  const { effectiveDisplayName, effectiveRating, effectiveAvatar, effectiveCountry, syncedChessCom, isSynced } = useAuth();
  const { profile: xpProfile } = useXpSystem();

  const [selectedTimeControl, setSelectedTimeControl] = useState<number>(600); // 10m Rapid default
  const [activeMode, setActiveMode] = useState<'online' | 'bots' | 'puzzles'>('online');
  const [recentSessions, setRecentSessions] = useState<GameSession[]>([]);
  const [isArchiveDrawerOpen, setIsArchiveDrawerOpen] = useState(false);
  const [isLeagueDrawerOpen, setIsLeagueDrawerOpen] = useState(false);

  useEffect(() => {
    setRecentSessions(GameSessionStore.listRecentSessions().slice(0, 3));
  }, []);

  const selectedTcObj = useMemo(
    () => TIME_CONTROLS.find((tc) => tc.sec === selectedTimeControl) || TIME_CONTROLS[3],
    [selectedTimeControl]
  );

  // Mini board preview for daily tactical puzzle
  const puzzleMiniBoard = useMemo(
    () => new Chess('r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5'),
    []
  );

  const handleLaunchPrimary = () => {
    if (activeMode === 'online') {
      onStartGame(selectedTimeControl);
    } else if (activeMode === 'bots') {
      onOpenBots();
    } else {
      onOpenPuzzles();
    }
  };

  return (
    <div className="w-full h-full max-h-full overflow-hidden p-3 sm:p-5 lg:p-7 flex flex-col justify-between select-none text-zinc-100 bg-[#161512]">
      {/* 1. TOP AMBIENT STRIP (P3 Tertiary / Context) */}
      <header className="flex items-center justify-between gap-3 px-1 shrink-0">
        {/* Left: Player Identity Minimalist Pill */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#211f1c] border border-white/10 flex items-center justify-center shrink-0 overflow-hidden text-base">
            {effectiveAvatar && effectiveAvatar.startsWith('http') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={effectiveAvatar} alt={effectiveDisplayName} className="w-full h-full object-cover" />
            ) : (
              <span>♟️</span>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
                {effectiveDisplayName}
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">
                {effectiveCountry === 'ng' ? '🇳🇬' : '🌐'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              <span className="font-mono">
                {effectiveRating !== null ? (
                  <span className="text-zinc-200 font-semibold">{effectiveRating} Elo</span>
                ) : (
                  <span className="text-zinc-500">Unranked</span>
                )}
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-400">Level {xpProfile.level}</span>
            </div>
          </div>
        </div>

        {/* Right: Quick Context Badges & Sync Action */}
        <div className="flex items-center gap-2">
          {/* League Chip */}
          <button
            onClick={() => setIsLeagueDrawerOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] font-medium text-zinc-300 transition-colors cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>{xpProfile.league.name}</span>
            <span className="text-zinc-500 font-mono">#{xpProfile.leagueRank}</span>
          </button>

          {/* Daily Streak Chip */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-[11px] font-medium text-zinc-300">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span className="font-mono text-white">{xpProfile.streak}d</span>
          </div>

          {/* Sync Button */}
          {onOpenSyncModal && (
            <button
              onClick={onOpenSyncModal}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] font-medium text-zinc-300 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RotateCw className="w-3 h-3 text-[#81b64c]" />
              <span className="hidden md:inline">{isSynced ? 'Synced' : 'Sync Profile'}</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. CENTRAL COMMAND STAGE (P1 Primary Anchor + P2 Supporting Context) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-center max-w-6xl w-full mx-auto my-auto min-h-0">
        {/* Left Column (7 Cols): PRIMARY COMMAND CENTER (P1 Anchor) */}
        <div className="lg:col-span-7 flex flex-col justify-center gap-4 max-w-lg w-full mx-auto lg:mx-0">
          {/* Mode Switcher Tabs (P2 Neutral) */}
          <div className="flex items-center gap-1 p-1 bg-[#1c1a17] rounded-xl border border-white/5 w-fit">
            <button
              onClick={() => setActiveMode('online')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeMode === 'online'
                  ? 'bg-white/10 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Swords className="w-3.5 h-3.5 text-[#81b64c]" />
              <span>Live Match</span>
            </button>
            <button
              onClick={() => setActiveMode('bots')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeMode === 'bots'
                  ? 'bg-white/10 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-cyan-400" />
              <span>Play Bot</span>
            </button>
            <button
              onClick={() => setActiveMode('puzzles')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeMode === 'puzzles'
                  ? 'bg-white/10 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span>Tactics</span>
            </button>
          </div>

          {/* Time Control Grid (If Online Mode) */}
          {activeMode === 'online' && (
            <div className="grid grid-cols-5 gap-2">
              {TIME_CONTROLS.map((tc) => {
                const isSelected = selectedTimeControl === tc.sec;
                return (
                  <button
                    key={tc.sec}
                    onClick={() => setSelectedTimeControl(tc.sec)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white/10 border-[#81b64c] text-white shadow-xs'
                        : 'bg-[#1c1a17] border-white/5 text-zinc-400 hover:border-white/10 hover:text-zinc-200'
                    }`}
                  >
                    <span className="text-xs font-bold font-mono">{tc.label}</span>
                    <span className="text-[10px] text-zinc-500">{tc.category}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* PRIMARY ACTION ANCHOR (P1 Visual Anchor) */}
          <div className="pt-1">
            <button
              onClick={handleLaunchPrimary}
              className="w-full py-4 px-6 rounded-2xl bg-[#81b64c] hover:bg-[#92cb56] text-black font-extrabold text-base tracking-tight shadow-lg shadow-[#81b64c]/20 hover:shadow-[#81b64c]/30 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer flex items-center justify-center gap-3"
              style={{
                transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <Zap className="w-5 h-5 fill-black" />
              <span>
                {activeMode === 'online'
                  ? `Play ${selectedTcObj.label} ${selectedTcObj.category}`
                  : activeMode === 'bots'
                  ? 'Select Chess Bot'
                  : 'Solve Tactics Puzzle'}
              </span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
            <p className="text-center text-[11px] text-zinc-500 mt-2 font-medium">
              {activeMode === 'online'
                ? 'Instant rated matchmaking with Stockfish server evaluation'
                : activeMode === 'bots'
                ? 'Practice against 20+ grandmasters and historical personalities'
                : 'Adaptive tactical exercises tailored to your tactical leaks'}
            </p>
          </div>
        </div>

        {/* Right Column (5 Cols): SUPPORTING CONTEXT (P2 Context) */}
        <div className="lg:col-span-5 flex flex-col gap-3.5 max-w-sm w-full mx-auto lg:mx-0">
          {/* Card A: Daily Tactical Challenge */}
          <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Daily Challenge</span>
              </div>
              <h3 className="text-xs font-bold text-white tracking-tight">Tactical Mate in 2</h3>
              <p className="text-[11px] text-zinc-400">+15 XP • 1,420 Rating</p>
              <button
                onClick={onOpenPuzzles}
                className="mt-2 text-xs font-semibold text-[#81b64c] hover:underline flex items-center gap-1 cursor-pointer w-fit"
              >
                <span>Solve Today's Puzzle</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Micro Chessboard Preview */}
            <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden border border-white/10 pointer-events-none opacity-90">
              <ChessBoard
                chess={puzzleMiniBoard}
                boardTheme="wood"
                pieceTheme="neo"
                disabled={true}
              />
            </div>
          </div>

          {/* Card B: Daily XP Mission Meter */}
          <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300">Daily Quest</span>
              <span className="font-mono text-xs text-white">
                {xpProfile.dailyXp} <span className="text-zinc-500">/ {xpProfile.dailyGoal} XP</span>
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full bg-[#81b64c] rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.round((xpProfile.dailyXp / xpProfile.dailyGoal) * 100))}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-zinc-400">
              {xpProfile.dailyGoalAchieved
                ? '✨ Daily goal achieved! Streak continued.'
                : `${xpProfile.dailyGoal - xpProfile.dailyXp} XP remaining to maintain streak.`}
            </p>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM ACTIVITY DOCK (P2 / P3 Context with Progressive Disclosure) */}
      <footer className="pt-2 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
        {/* Recent Matches Micro Ribbon */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full py-1">
          <span className="text-[11px] text-zinc-500 font-medium shrink-0">Recent Matches:</span>
          {recentSessions.length > 0 ? (
            recentSessions.map((session) => {
              const userOutcome = getSessionUserOutcome(session, effectiveDisplayName);
              const isWin = userOutcome === 'win';
              const isLoss = userOutcome === 'loss';
              return (
                <button
                  key={session.id}
                  onClick={() => onOpenReview(session.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] transition-colors cursor-pointer shrink-0"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isWin ? 'bg-[#81b64c]' : isLoss ? 'bg-red-400' : 'bg-zinc-400'
                    }`}
                  />
                  <span className="font-mono text-zinc-300">
                    {session.whitePlayer.name === effectiveDisplayName
                      ? session.blackPlayer.name
                      : session.whitePlayer.name}
                  </span>
                  <span className="text-zinc-500 text-[10px]">
                    {isWin ? '+40 XP' : isLoss ? '+10 XP' : 'Draw'}
                  </span>
                </button>
              );
            })
          ) : (
            <span className="text-[11px] text-zinc-600">No recent matches played yet</span>
          )}
        </div>

        {/* Progressive Disclosure Triggers */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsArchiveDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 hover:text-white transition-colors cursor-pointer text-[11px] font-semibold"
          >
            <History className="w-3.5 h-3.5 text-zinc-400" />
            <span>Full Archive</span>
          </button>
          <button
            onClick={() => setIsLeagueDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 hover:text-white transition-colors cursor-pointer text-[11px] font-semibold"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>League Standings</span>
          </button>
        </div>
      </footer>

      {/* PROGRESSIVE DISCLOSURE DRAWER 1: Game History Archive */}
      <SlideDrawer
        isOpen={isArchiveDrawerOpen}
        onClose={() => setIsArchiveDrawerOpen(false)}
        title="Match History & Game Archive"
        subtitle="Review past games with engine analysis and export PGN records."
      >
        <div className="flex flex-col gap-3">
          {recentSessions.length > 0 ? (
            GameSessionStore.listRecentSessions().map((s) => {
              const outcome = getSessionUserOutcome(s, effectiveDisplayName);
              const isWin = outcome === 'win';
              const isLoss = outcome === 'loss';
              return (
                <div
                  key={s.id}
                  className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-3 hover:border-white/10 transition-colors"
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          isWin
                            ? 'bg-[#81b64c]/20 text-[#81b64c]'
                            : isLoss
                            ? 'bg-red-400/20 text-red-400'
                            : 'bg-zinc-400/20 text-zinc-400'
                        }`}
                      >
                        {isWin ? 'VICTORY' : isLoss ? 'DEFEAT' : 'DRAW'}
                      </span>
                      <span className="text-xs font-bold text-white truncate">
                        vs {s.whitePlayer.name === effectiveDisplayName ? s.blackPlayer.name : s.whitePlayer.name}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400 font-mono">
                      {s.timeControl ? `${Math.round(s.timeControl / 60)} min` : 'Standard'} •{' '}
                      {new Date(s.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setIsArchiveDrawerOpen(false);
                      onOpenReview(s.id);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer shrink-0"
                  >
                    Review
                  </button>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-zinc-500 text-xs">
              No matches found in archive. Play a game to record analysis!
            </div>
          )}
        </div>
      </SlideDrawer>

      {/* PROGRESSIVE DISCLOSURE DRAWER 2: League Standings & Ladder */}
      <SlideDrawer
        isOpen={isLeagueDrawerOpen}
        onClose={() => setIsLeagueDrawerOpen(false)}
        title={`${xpProfile.league.name} Standings`}
        subtitle="Weekly XP leaderboard. Top 5 players promote to higher tier."
      >
        <div className="flex flex-col gap-2">
          {Array.from({ length: 15 }).map((_, i) => {
            const rank = i + 1;
            const isUser = rank === xpProfile.leagueRank;
            const isPromotion = rank <= 5;
            const isDemotion = rank >= 13;
            return (
              <div
                key={rank}
                className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                  isUser
                    ? 'bg-[#81b64c]/10 border-[#81b64c]/30 text-white'
                    : 'bg-white/5 border-white/5 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`font-mono text-xs font-bold w-5 text-center ${
                      rank <= 3 ? 'text-amber-400' : 'text-zinc-500'
                    }`}
                  >
                    #{rank}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold">
                      {isUser ? `${effectiveDisplayName} (You)` : `Grandmaster_${rank * 7}`}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {isPromotion ? '🟢 Promotion Zone' : isDemotion ? '🔴 Demotion Zone' : 'Safe Zone'}
                    </span>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-zinc-300">
                  {isUser
                    ? `${xpProfile.totalXp} XP`
                    : `${Math.max(120, xpProfile.totalXp + (10 - rank) * 65)} XP`}
                </span>
              </div>
            );
          })}
        </div>
      </SlideDrawer>
    </div>
  );
};
