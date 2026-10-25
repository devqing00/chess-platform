'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Clock,
  Swords,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Search,
  Filter,
  RefreshCw,
  Trophy,
  ArrowRight,
  Shield,
  Layers,
} from 'lucide-react';
import { GameSession } from '@/types/chess';
import { useAuth } from '@/context/AuthContext';
import { soundService } from '@/lib/audioService';
import { isSessionUserWhite, getSessionUserOutcome } from '@/lib/gameSessionStore';
import { Button } from '@/components/ui/button';

interface FullGameArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: GameSession[];
  onReviewGame: (gameId: string) => void;
  onOpenSyncModal?: () => void;
  onRefreshArchive?: () => Promise<void>;
}

export const FullGameArchiveModal: React.FC<FullGameArchiveModalProps> = ({
  isOpen,
  onClose,
  sessions,
  onReviewGame,
  onOpenSyncModal,
  onRefreshArchive,
}) => {
  const { user, effectiveDisplayName, syncedChessCom } = useAuth();
  const [activeSourceTab, setActiveSourceTab] = useState<'all' | 'checkmate' | 'chesscom'>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'win' | 'loss' | 'draw'>('all');
  const [timeControlFilter, setTimeControlFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Group and count sessions by source
  const checkmateSessions = useMemo(
    () => sessions.filter((s) => s.source !== 'chesscom' && !s.id.startsWith('chesscom-')),
    [sessions]
  );
  const chesscomSessions = useMemo(
    () => sessions.filter((s) => s.source === 'chesscom' || s.id.startsWith('chesscom-')),
    [sessions]
  );

  // Filtered games list
  const filteredSessions = useMemo(() => {
    let list = sessions;

    // 1. Source Tab
    if (activeSourceTab === 'checkmate') {
      list = checkmateSessions;
    } else if (activeSourceTab === 'chesscom') {
      list = chesscomSessions;
    }

    // 2. Search query (opponent or player name)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.whitePlayer?.name.toLowerCase().includes(q) ||
          s.blackPlayer?.name.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q)
      );
    }

    // 3. Outcome filter
    if (outcomeFilter !== 'all') {
      const currentUsername = effectiveDisplayName || 'Player';
      list = list.filter((s) => {
        const outcome = getSessionUserOutcome(s, currentUsername);
        if (outcomeFilter === 'win') return outcome === 'win';
        if (outcomeFilter === 'loss') return outcome === 'loss';
        if (outcomeFilter === 'draw') return outcome === 'draw';
        return true;
      });
    }

    // 4. Time Control filter
    if (timeControlFilter !== 'all') {
      list = list.filter((s) => {
        const tc = s.timeControl || 600;
        if (timeControlFilter === 'bullet') return tc < 180;
        if (timeControlFilter === 'blitz') return tc >= 180 && tc < 600;
        if (timeControlFilter === 'rapid') return tc >= 600 && tc < 3600;
        if (timeControlFilter === 'daily') return tc >= 3600;
        return true;
      });
    }

    // Always sort descending by most recent
    return list.slice().sort((a, b) => {
      const timeB = b.createdAt || b.updatedAt || 0;
      const timeA = a.createdAt || a.updatedAt || 0;
      return timeB - timeA;
    });
  }, [
    sessions,
    checkmateSessions,
    chesscomSessions,
    activeSourceTab,
    searchQuery,
    outcomeFilter,
    timeControlFilter,
    effectiveDisplayName,
  ]);

  const handleCopyPgn = (session: GameSession) => {
    const pgnText = session.pgn || session.moves.map((m, i) => (i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ${m.san}` : m.san)).join(' ');
    navigator.clipboard.writeText(pgnText);
    setCopiedId(session.id);
    soundService.playMove();
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRefresh = async () => {
    if (!onRefreshArchive) return;
    setIsRefreshing(true);
    try {
      await onRefreshArchive();
      soundService.playPuzzleSuccess();
    } catch {
      soundService.playPuzzleFail();
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 pt-safe pb-safe bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-4xl max-h-[85dvh] sm:max-h-[88vh] my-auto bg-[#211f1c] border-2 border-[#35322b] rounded-3xl flex flex-col shadow-[0_8px_0_0_#141311] overflow-hidden text-zinc-100">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#262420] border-b-2 border-[#35322b] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-b from-[#8fd649] via-[#7cb53d] to-[#699c30] text-zinc-950 border-t border-white/35 border-x-emerald-600/30 border-b-emerald-950/40 shadow-[0_3px_0_0_#385a16] flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-950" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2 flex-wrap">
                <span className="truncate">Complete Match Archive</span>
                <span className="text-[10px] sm:text-xs font-mono font-black px-2 sm:px-2.5 py-0.5 rounded-full bg-[#181614] text-zinc-300 border-2 border-[#38342e] shrink-0">
                  {filteredSessions.length} Games
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-400 font-medium truncate sm:whitespace-normal">
                Sorted by most recent. Review tactical mistakes and game accuracies.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onRefreshArchive && (
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-2.5 sm:px-3.5 py-1.5 bg-[#282521] hover:bg-[#322f2a] text-[10px] sm:text-xs font-black uppercase tracking-wider text-zinc-200 rounded-full border-2 border-[#3d3a34] shadow-[0_2px_0_0_#141311] hover:-translate-y-[1px] active:translate-y-[1px] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Fetch latest games from Chess.com & local storage"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : 'text-zinc-400'}`} />
                <span className="hidden sm:inline">Sync Latest</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-full text-zinc-400 hover:text-white hover:bg-[#2c2924] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters & Tabs Bar */}
        <div className="p-3 sm:p-4 bg-[#1c1a17] border-b-2 border-[#35322b] flex flex-col gap-2.5 sm:gap-3 shrink-0">
          {/* Source Tabs & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-1 bg-[#141311] p-1 rounded-full border-2 border-[#35322b] shadow-[0_2px_0_0_#0f0e0c] overflow-x-auto scrollbar-none shrink-0">
              <button
                onClick={() => setActiveSourceTab('all')}
                className={`tactile-btn px-3 py-1 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  activeSourceTab === 'all'
                    ? 'bg-gradient-to-b from-[#8fd649] via-[#7cb53d] to-[#699c30] text-zinc-950 border-t border-white/35 shadow-[0_2px_0_0_#385a16]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>All ({sessions.length})</span>
              </button>

              <button
                onClick={() => setActiveSourceTab('checkmate')}
                className={`tactile-btn px-3 py-1 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  activeSourceTab === 'checkmate'
                    ? 'bg-gradient-to-b from-[#8fd649] via-[#7cb53d] to-[#699c30] text-zinc-950 border-t border-white/35 shadow-[0_2px_0_0_#385a16]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Swords className="w-3.5 h-3.5" />
                <span>Arena ({checkmateSessions.length})</span>
              </button>

              <button
                onClick={() => setActiveSourceTab('chesscom')}
                className={`tactile-btn px-3 py-1 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  activeSourceTab === 'chesscom'
                    ? 'bg-gradient-to-b from-[#8fd649] via-[#7cb53d] to-[#699c30] text-zinc-950 border-t border-white/35 shadow-[0_2px_0_0_#385a16]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>♟️</span>
                <span>Chess.com ({chesscomSessions.length})</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 min-w-[180px] sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search opponent..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#141311] border-2 border-[#35322b] rounded-full pl-9 pr-3.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 shadow-[0_2px_0_0_#0f0e0c]"
              />
            </div>
          </div>

          {/* Secondary Filters: Outcome & Time Control */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none w-full sm:w-auto pb-1 sm:pb-0">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-zinc-400 mr-1 shrink-0">Result:</span>
              {[
                { id: 'all', label: 'All' },
                { id: 'win', label: 'Wins' },
                { id: 'loss', label: 'Losses' },
                { id: 'draw', label: 'Draws' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setOutcomeFilter(f.id as any)}
                  className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer border-2 ${
                    outcomeFilter === f.id
                      ? 'bg-[#332f28] text-white border-[#4d473b] shadow-[0_2px_0_0_#1c1a17]'
                      : 'border-transparent text-zinc-400 hover:text-white hover:bg-[#252320]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none w-full sm:w-auto">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-zinc-400 mr-1 shrink-0">Speed:</span>
              {[
                { id: 'all', label: 'All' },
                { id: 'bullet', label: 'Bullet' },
                { id: 'blitz', label: 'Blitz' },
                { id: 'rapid', label: 'Rapid' },
                { id: 'daily', label: 'Daily' },
              ].map((tc) => (
                <button
                  key={tc.id}
                  onClick={() => setTimeControlFilter(tc.id)}
                  className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer border-2 ${
                    timeControlFilter === tc.id
                      ? 'bg-[#332f28] text-white border-[#4d473b] shadow-[0_2px_0_0_#1c1a17]'
                      : 'border-transparent text-zinc-400 hover:text-white hover:bg-[#252320]'
                  }`}
                >
                  {tc.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Games List Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredSessions.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center gap-3 text-zinc-400">
              <div className="w-14 h-14 rounded-2xl bg-[#282521] border-2 border-[#383530] shadow-[0_3px_0_0_#141311] flex items-center justify-center text-3xl">
                ♟️
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black text-white">No matches found in this view</span>
                <span className="text-xs text-zinc-400 font-medium mt-1">
                  {searchQuery ? 'Try adjusting your search filter or clear your criteria.' : 'Play a rated live match or sync your Chess.com games!'}
                </span>
              </div>
              {onOpenSyncModal && activeSourceTab === 'chesscom' && (
                <div className="mt-2">
                  <Button
                    variant="primary"
                    size="md"
                    rounded="full"
                    onClick={onOpenSyncModal}
                  >
                    Sync Chess.com Games
                  </Button>
                </div>
              )}
            </div>
          ) : (
            filteredSessions.map((session, index) => {
              const isChessCom = session.source === 'chesscom' || session.id.startsWith('chesscom-');
              const currentUsername = effectiveDisplayName || 'Player';
              const isUserWhite = isSessionUserWhite(session, currentUsername);
              const userPlayer = isUserWhite ? session.whitePlayer : session.blackPlayer;
              const oppPlayer = isUserWhite ? session.blackPlayer : session.whitePlayer;

              const outcome = getSessionUserOutcome(session, currentUsername);
              const isWin = outcome === 'win';
              const isDraw = outcome === 'draw';

              const moveCount =
                session.moves && session.moves.length > 0
                  ? Math.ceil(session.moves.length / 2)
                  : session.movesCount || 0;

              const dateFormatted = session.createdAt
                ? new Date(session.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Recent';

              return (
                <div
                  key={session.id || index}
                  className="bg-[#282521] border-2 border-[#383530] hover:border-[#4d483f] rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_3px_0_0_#141311] hover:-translate-y-[1px] transition-all"
                >
                  {/* Left Section: Source, Date, Players */}
                  <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1 w-full sm:w-auto">
                    {/* Outcome Badge */}
                    <div
                      className={`w-12 h-11 sm:w-14 sm:h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 font-black font-mono text-xs border-2 ${
                        isWin
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_2px_0_0_#385a16]'
                          : isDraw
                          ? 'bg-zinc-800 text-zinc-300 border-zinc-600 shadow-[0_2px_0_0_#27272a]'
                          : 'bg-rose-950/35 text-rose-400 border-rose-900/50 shadow-[0_2px_0_0_#7f1d1d]'
                      }`}
                    >
                      <span className="text-[9px] sm:text-[10px] tracking-wider uppercase font-black">
                        {isWin ? 'WIN' : isDraw ? 'DRAW' : 'LOSS'}
                      </span>
                      <span className="text-[8px] sm:text-[9px] font-mono font-bold opacity-80">
                        {session.gameResult?.includes('1-0')
                          ? '1-0'
                          : session.gameResult?.includes('0-1')
                          ? '0-1'
                          : session.gameResult?.includes('1/2')
                          ? '½-½'
                          : ''}
                      </span>
                    </div>

                    {/* Game Metadata & Players */}
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px]">
                        <span
                          className={`font-black uppercase tracking-wider text-[9px] px-2 py-0.5 rounded-full border ${
                            isChessCom
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {isChessCom ? 'Chess.com' : 'Check.mate'}
                        </span>
                        <span className="text-zinc-400 font-medium truncate max-w-[130px] sm:max-w-none">{dateFormatted}</span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-zinc-300 font-mono font-bold">
                          {session.timeControl ? `${Math.floor(session.timeControl / 60)}m` : 'Casual'}
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-zinc-300 font-mono font-bold">
                          {moveCount} moves
                        </span>
                      </div>

                      {/* Opponents line */}
                      <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                        <span className="text-xs" title={isUserWhite ? 'White pieces' : 'Black pieces'}>
                          {isUserWhite ? '⚪' : '⚫'}
                        </span>
                        <span className="font-black text-white text-xs truncate max-w-[160px] sm:max-w-none">
                          {userPlayer.name}{' '}
                          <span className="text-[10px] text-zinc-400 font-mono font-normal">
                            ({userPlayer.rating})
                          </span>
                        </span>
                        <span className="text-zinc-500 text-xs font-normal">vs</span>
                        <span className="text-xs" title={isUserWhite ? 'Black pieces' : 'White pieces'}>
                          {isUserWhite ? '⚫' : '⚪'}
                        </span>
                        <span className="font-black text-zinc-200 text-xs truncate max-w-[160px] sm:max-w-none">
                          {oppPlayer.name}{' '}
                          <span className="text-[10px] text-zinc-400 font-mono font-normal">
                            ({oppPlayer.rating})
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Section: Action Buttons */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t border-[#312e28] sm:border-0">
                    {/* Copy PGN Button */}
                    <Button
                      variant="secondary"
                      size="xs"
                      rounded="full"
                      onClick={() => handleCopyPgn(session)}
                      title="Copy PGN notation"
                    >
                      {copiedId === session.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-[10px] font-bold text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold">PGN</span>
                        </>
                      )}
                    </Button>

                    {/* Review Game Button */}
                    <Button
                      variant="primary"
                      size="xs"
                      rounded="full"
                      onClick={() => {
                        onClose();
                        onReviewGame(session.id);
                      }}
                      className="flex-1 sm:flex-initial"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Review</span>
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
