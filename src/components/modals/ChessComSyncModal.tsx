'use client';

import React, { useState } from 'react';
import {
  X,
  RefreshCw,
  ExternalLink,
  Award,
  Swords,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap,
  Unlink,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { GameSessionStore, parsePgnToMoveRecords } from '@/lib/gameSessionStore';
import { soundService } from '@/lib/audioService';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface ChessComSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGameForReview?: (gameId: string, pgn?: string) => void;
  onProfileSynced?: (profile: any) => void;
}

export const ChessComSyncModal: React.FC<ChessComSyncModalProps> = ({
  isOpen,
  onClose,
  onSelectGameForReview,
  onProfileSynced,
}) => {
  const router = useRouter();
  const {
    saveSyncedChessCom,
    clearSyncedChessCom,
    syncedChessCom,
    saveSyncedLichess,
    clearSyncedLichess,
    syncedLichess,
  } = useAuth();

  const [activePlatform, setActivePlatform] = useState<'chesscom' | 'lichess'>('chesscom');
  const [username, setUsername] = useState<string>(
    activePlatform === 'chesscom'
      ? syncedChessCom?.username || ''
      : syncedLichess?.username || ''
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [syncData, setSyncData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePlatformChange = (platform: 'chesscom' | 'lichess') => {
    setActivePlatform(platform);
    setUsername(
      platform === 'chesscom'
        ? syncedChessCom?.username || ''
        : syncedLichess?.username || ''
    );
    setSyncData(null);
    setErrorMsg(null);
  };

  const handleSync = async () => {
    if (!username.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);

    const apiEndpoint =
      activePlatform === 'chesscom'
        ? `/api/sync/chesscom?username=${encodeURIComponent(username.trim())}`
        : `/api/sync/lichess?username=${encodeURIComponent(username.trim())}`;

    try {
      const res = await fetch(apiEndpoint);
      const json = await res.json();

      if (!res.ok || !json.success) {
        setErrorMsg(json.error || `Failed to connect ${activePlatform === 'chesscom' ? 'Chess.com' : 'Lichess'} profile.`);
        soundService.playPuzzleFail();
        setIsLoading(false);
        return;
      }

      setSyncData(json);
      soundService.playPuzzleSuccess();

      if (activePlatform === 'chesscom') {
        saveSyncedChessCom(json.profile, json.stats);
      } else {
        saveSyncedLichess(json.profile, json.stats);
      }

      // Import recent games into local GameSessionStore for review
      if (json.games && json.games.length > 0) {
        try {
          json.games.forEach((g: any) => {
            const parsedMoves = g.pgn ? parsePgnToMoveRecords(g.pgn) : [];
            GameSessionStore.saveSession({
              id: g.id,
              source: activePlatform,
              whitePlayer: {
                id: g.isUserWhite ? 'user-synced' : 'opp',
                name: g.isUserWhite ? (json.profile.username || username) : g.opponent.username,
                rating: g.isUserWhite ? g.userPlayer.rating : g.opponent.rating,
                avatar: g.isUserWhite ? (json.profile.avatar || '') : '',
                country: g.isUserWhite ? (json.profile.country || '') : '',
              },
              blackPlayer: {
                id: !g.isUserWhite ? 'user-synced' : 'opp',
                name: !g.isUserWhite ? (json.profile.username || username) : g.opponent.username,
                rating: !g.isUserWhite ? g.userPlayer.rating : g.opponent.rating,
                avatar: !g.isUserWhite ? (json.profile.avatar || '') : '',
                country: !g.isUserWhite ? (json.profile.country || '') : '',
              },
              timeControl: parseInt(g.timeControl) || 600,
              variant: 'standard',
              moves: parsedMoves,
              movesCount: parsedMoves.length > 0 ? Math.ceil(parsedMoves.length / 2) : (g.movesCount || 0),
              pgn: g.pgn || '',
              fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
              isGameOver: true,
              gameResult: g.userResult === 'win' ? (g.isUserWhite ? '1-0' : '0-1') : g.userResult === 'loss' ? (g.isUserWhite ? '0-1' : '1-0') : '1/2-1/2',
              resultDetails: {
                winner: g.userResult === 'win' ? (g.isUserWhite ? 'w' : 'b') : g.userResult === 'loss' ? (g.isUserWhite ? 'b' : 'w') : 'draw',
                reason: 'resignation',
                ratingDelta: 0,
                newRating: g.userPlayer?.rating || 800,
                league: 'External Sync',
                trophiesDelta: 0,
              },
              reviewReport: null,
              createdAt: g.playedAt ? new Date(g.playedAt).getTime() : Date.now(),
              updatedAt: Date.now(),
            });
          });
        } catch (storageErr) {
          console.warn('Could not cache imported games:', storageErr);
        }
      }

      if (onProfileSynced) {
        onProfileSynced(json.profile);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error syncing external account.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    if (activePlatform === 'chesscom') {
      clearSyncedChessCom();
    } else {
      clearSyncedLichess();
    }
    setSyncData(null);
    setUsername('');
  };

  const handleReviewGame = (game: any) => {
    if (onSelectGameForReview) {
      onSelectGameForReview(game.id, game.pgn);
    } else {
      router.push(`/game/review/${game.id}`);
    }
    onClose();
  };

  const currentlyConnected =
    activePlatform === 'chesscom' ? syncedChessCom : syncedLichess;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-2xl bg-[#211f1c] border-2 border-[#35322b] rounded-3xl shadow-[0_12px_32px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#35322b] flex items-center justify-between bg-[#262420] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-lg shrink-0">
              {activePlatform === 'chesscom' ? '♟️' : '⚔️'}
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <span>Connect External Account</span>
                <span className="text-[9px] font-mono uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                  Optional
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400 font-medium">
                Link to import your past matches for analysis. Your Checkmate account and in-app rating remain completely separate.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-[#2c2924] transition cursor-pointer shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Platform Tabs (Chess.com vs Lichess) */}
        <div className="px-5 pt-3 pb-2 bg-[#1c1a17] border-b border-[#2d2a26] flex items-center justify-between gap-2 shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => handlePlatformChange('chesscom')}
              className={`tactile-btn px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
                activePlatform === 'chesscom'
                  ? 'bg-gradient-to-b from-[#8fd649] via-[#7cb53d] to-[#699c30] text-zinc-950 font-black border-t border-white/35 shadow-[0_2px_0_0_#385a16]'
                  : 'bg-[#25221d] text-zinc-400 hover:text-white border border-[#35322b]'
              }`}
            >
              <span>♟️</span>
              <span>Chess.com</span>
              {syncedChessCom && (
                <span className="w-2 h-2 rounded-full bg-emerald-300" title="Connected" />
              )}
            </button>
            <button
              onClick={() => handlePlatformChange('lichess')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
                activePlatform === 'lichess'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-[#25221d] text-zinc-400 hover:text-white border border-[#35322b]'
              }`}
            >
              <span>⚔️</span>
              <span>Lichess.org</span>
              {syncedLichess && (
                <span className="w-2 h-2 rounded-full bg-emerald-300" title="Connected" />
              )}
            </button>
          </div>

          {currentlyConnected && (
            <button
              onClick={handleDisconnect}
              className="text-[11px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition cursor-pointer"
            >
              <Unlink className="w-3.5 h-3.5" />
              <span>Unlink</span>
            </button>
          )}
        </div>

        {/* Input Form */}
        <div className="p-4 sm:p-5 border-b border-[#35322b] bg-[#1c1a17] flex flex-col gap-2.5 shrink-0">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={`Enter ${activePlatform === 'chesscom' ? 'Chess.com' : 'Lichess'} username`}
              onKeyDown={(e) => e.key === 'Enter' && handleSync()}
              className="flex-1 px-4 py-2.5 bg-[#141311] border border-[#35322b] rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-semibold"
            />
            <Button
              variant="primary"
              size="md"
              rounded="xl"
              onClick={handleSync}
              disabled={isLoading || !username.trim()}
              className="shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Connecting...' : currentlyConnected ? 'Update Link' : 'Connect'}</span>
            </Button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-950/70 border border-rose-800/80 rounded-xl text-xs text-rose-200 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Connected Details / Recent Matches */}
        <div className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-3.5">
          {syncData || currentlyConnected ? (
            <>
              {/* Linked Card */}
              <div className="p-3.5 bg-[#262420] rounded-2xl border border-[#383530] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#1d1b17] border border-[#38342c] overflow-hidden flex items-center justify-center text-lg shrink-0">
                    {currentlyConnected?.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={currentlyConnected.avatar}
                        alt={currentlyConnected.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{activePlatform === 'chesscom' ? '♟️' : '⚔️'}</span>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-black text-white truncate">
                      @{currentlyConnected?.username}
                    </span>
                    <span className="text-[11px] text-zinc-400 font-medium">
                      Connected to {activePlatform === 'chesscom' ? 'Chess.com' : 'Lichess'} • Retained in your account
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase">
                    Linked
                  </span>
                </div>
              </div>

              {/* External Ratings Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 bg-[#262420] rounded-xl border border-[#35322b] flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" /> Rapid
                  </span>
                  <span className="text-base sm:text-lg font-black text-white font-mono mt-0.5">
                    {currentlyConnected?.ratings?.rapid || 800}
                  </span>
                </div>

                <div className="p-3 bg-[#262420] rounded-xl border border-[#35322b] flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                    <Swords className="w-3 h-3 text-amber-500" /> Blitz
                  </span>
                  <span className="text-base sm:text-lg font-black text-white font-mono mt-0.5">
                    {currentlyConnected?.ratings?.blitz || 800}
                  </span>
                </div>

                <div className="p-3 bg-[#262420] rounded-xl border border-[#35322b] flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                    <Award className="w-3 h-3 text-emerald-400" /> Bullet
                  </span>
                  <span className="text-base sm:text-lg font-black text-white font-mono mt-0.5">
                    {currentlyConnected?.ratings?.bullet || 800}
                  </span>
                </div>
              </div>

              {/* Imported Games Section */}
              {syncData?.games && syncData.games.length > 0 && (
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Imported Games ({syncData.games.length})</span>
                    </span>
                    <span className="text-[10px] text-zinc-400">Click Review to analyze</span>
                  </div>

                  <div className="flex flex-col divide-y divide-[#2d2a24] bg-[#262420] rounded-2xl border border-[#35322b] overflow-hidden max-h-[220px] overflow-y-auto">
                    {syncData.games.map((g: any) => (
                      <div
                        key={g.id}
                        className="p-2.5 flex items-center justify-between hover:bg-[#2e2a25] transition gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-xs font-mono text-amber-400 shrink-0">⚡</span>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-white truncate">
                              vs {g.opponent.username} ({g.opponent.rating})
                            </span>
                            <span className="text-[10px] text-zinc-400 capitalize truncate">
                              {g.timeClass}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full font-mono border ${
                              g.userResult === 'win'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : g.userResult === 'loss'
                                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                            }`}
                          >
                            {g.userResult}
                          </span>

                          <Button
                            variant="primary"
                            size="xs"
                            rounded="lg"
                            onClick={() => handleReviewGame(g)}
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Review</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-3 text-zinc-400">
              <div className="w-12 h-12 rounded-2xl bg-[#282521] border border-[#383530] flex items-center justify-center text-2xl">
                🌐
              </div>
              <div className="flex flex-col max-w-sm">
                <span className="text-xs font-black text-white">No external account linked</span>
                <span className="text-[11px] text-zinc-400 font-medium mt-1">
                  Connecting an account is entirely optional. It imports your external match history so you can run game reviews with Stockfish.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
