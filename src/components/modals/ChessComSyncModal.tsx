'use client';

import React, { useState } from 'react';
import {
  X,
  RefreshCw,
  ExternalLink,
  Award,
  Swords,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap,
} from 'lucide-react';
import { GameSessionStore, parsePgnToMoveRecords } from '@/lib/gameSessionStore';
import { soundService } from '@/lib/audioService';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

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
  const { saveSyncedChessCom, syncedChessCom } = useAuth();
  const [username, setUsername] = useState<string>(syncedChessCom?.username || '');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [syncData, setSyncData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSync = async () => {
    if (!username.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/sync/chesscom?username=${encodeURIComponent(username.trim())}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        setErrorMsg(json.error || 'Failed to sync Check.mate profile.');
        soundService.playPuzzleFail();
        setIsLoading(false);
        return;
      }

      setSyncData(json);
      soundService.playPuzzleSuccess();

      // Save to AuthContext and localStorage
      saveSyncedChessCom(json.profile, json.stats);
      try {
        localStorage.setItem('chess_com_profile', JSON.stringify(json.profile));
        localStorage.setItem('chess_com_stats', JSON.stringify(json.stats));
        if (json.games && json.games.length > 0) {
          localStorage.setItem('chess_com_imported_games', JSON.stringify(json.games));

          // Also inject into GameSessionStore with fully parsed MoveRecords so they appear in Match History & Review!
          json.games.forEach((g: any) => {
            const parsedMoves = g.pgn ? parsePgnToMoveRecords(g.pgn) : [];
            GameSessionStore.saveSession({
              id: g.id,
              source: 'chesscom',
              whitePlayer: {
                id: g.isUserWhite ? 'user-local' : 'opp',
                name: g.isUserWhite ? json.profile.username : g.opponent.username,
                rating: g.isUserWhite ? g.userPlayer.rating : g.opponent.rating,
                avatar: g.isUserWhite ? json.profile.avatar : '',
                country: g.isUserWhite ? json.profile.country : '',
              },
              blackPlayer: {
                id: !g.isUserWhite ? 'user-local' : 'opp',
                name: !g.isUserWhite ? json.profile.username : g.opponent.username,
                rating: !g.isUserWhite ? g.userPlayer.rating : g.opponent.rating,
                avatar: !g.isUserWhite ? json.profile.avatar : '',
                country: !g.isUserWhite ? json.profile.country : '',
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
                reason: g.userPlayer?.result === 'win' ? 'checkmate' : 'resignation',
                ratingDelta: g.userResult === 'win' ? 8 : g.userResult === 'loss' ? -8 : 0,
                newRating: g.userPlayer?.rating || 1200,
                league: 'Elite',
                trophiesDelta: g.userResult === 'win' ? 10 : 0,
              },
              reviewReport: null,
              createdAt: new Date(g.playedAt).getTime(),
              updatedAt: Date.now(),
            });
          });
        }
      } catch (err) {
        console.warn('Storage error on sync:', err);
      }

      if (onProfileSynced) {
        onProfileSynced({
          ...json.profile,
          ratings: {
            rapid: json.stats?.rapid?.rating || 429,
            blitz: json.stats?.blitz?.rating || 370,
            bullet: json.stats?.bullet?.rating || 300,
          },
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error syncing with Check.mate.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewGame = (game: any) => {
    if (onSelectGameForReview) {
      onSelectGameForReview(game.id, game.pgn);
    } else {
      router.push(`/game/review/${game.id}`);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#211f1c] border-2 border-[#35322b] rounded-3xl shadow-[0_8px_0_0_#141311] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b-2 border-[#35322b] flex items-center justify-between bg-[#262420] shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#81b64c]/20 border-2 border-[#81b64c]/40 flex items-center justify-center shadow-[0_2px_0_0_#4d7a24] shrink-0">
              <span className="text-sm sm:text-base">♟️</span>
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5 flex-wrap">
                <span>Check.mate Account Sync</span>
                <span className="text-[9px] sm:text-[10px] font-black uppercase bg-[#81b64c] border border-[#5d8b32] text-white px-2 py-0.5 rounded-full shadow-[0_1.5px_0_0_#4d7a24] shrink-0">
                  Live Sync
                </span>
              </h2>
              <p className="text-[10px] sm:text-[11px] text-zinc-400 font-medium truncate sm:whitespace-normal">
                Connect your account to import your official ratings, avatar, and live games.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-full text-zinc-400 hover:text-white hover:bg-[#2c2924] transition cursor-pointer shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Username Input Form */}
        <div className="p-3.5 sm:p-5 border-b-2 border-[#35322b] bg-[#1c1a17] flex flex-col gap-2.5 sm:gap-3 shrink-0">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter Chess.com username (e.g. your_username)"
                onKeyDown={(e) => e.key === 'Enter' && handleSync()}
                className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 bg-[#141311] border-2 border-[#35322b] rounded-full text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#81b64c] font-bold shadow-[0_2px_0_0_#0f0e0c]"
              />
            </div>
            <button
              onClick={handleSync}
              disabled={isLoading || !username.trim()}
              className="px-5 sm:px-6 py-2 sm:py-2.5 bg-[#81b64c] hover:bg-[#72a342] disabled:opacity-50 text-white font-black text-[11px] sm:text-xs uppercase tracking-wider rounded-full border-2 border-[#5d8b32] shadow-[0_3px_0_0_#4d7a24] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-[0_1px_0_0_#4d7a24] transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Syncing...' : 'Sync Account'}</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-500/15 border-2 border-rose-500/30 rounded-2xl text-xs text-rose-300 font-bold flex items-center gap-2 shadow-[0_2px_0_0_#7f1d1d]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Synced Content Body */}
        <div className="p-3.5 sm:p-5 overflow-y-auto flex flex-col gap-3.5 sm:gap-4">
          {syncData ? (
            <>
              {/* Profile Card */}
              <div className="p-3.5 sm:p-4 bg-[#282521] rounded-2xl border-2 border-[#383530] flex items-center justify-between gap-3 shadow-[0_3px_0_0_#141311]">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#211f1c] border-2 border-[#3d3830] shadow-[0_2px_0_0_#141311] overflow-hidden flex items-center justify-center text-lg sm:text-xl shrink-0">
                    {syncData.profile.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={syncData.profile.avatar}
                        alt={syncData.profile.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>♟️</span>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span className="text-sm sm:text-base font-black text-white truncate">{syncData.profile.username}</span>
                      <span className="text-xs sm:text-sm">
                        {syncData.profile.country === 'NG'
                          ? '🇳🇬'
                          : syncData.profile.country === 'US'
                          ? '🇺🇸'
                          : '🌍'}
                      </span>
                      <span className="text-[9px] sm:text-[10px] uppercase font-black bg-[#81b64c]/20 text-[#81b64c] border border-[#81b64c]/40 px-2 py-0.5 rounded-full shrink-0">
                        {syncData.profile.league} League
                      </span>
                    </div>
                    <span className="text-[11px] sm:text-xs text-zinc-400 font-medium truncate">
                      Check.mate Member • Joined {new Date(syncData.profile.joined).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <a
                  href={syncData.profile.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition shrink-0"
                  title="View on Check.mate"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {/* Ratings Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                <div className="p-3 sm:p-3.5 bg-[#282521] rounded-2xl border-2 border-[#383530] shadow-[0_3px_0_0_#141311] flex flex-col gap-1">
                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Rapid Rating
                  </span>
                  <span className="text-lg sm:text-xl font-black text-white font-mono">
                    {syncData.stats.rapid.rating}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono font-bold">
                    {syncData.stats.rapid.record.win}W / {syncData.stats.rapid.record.loss}L / {syncData.stats.rapid.record.draw}D
                  </span>
                </div>

                <div className="p-3 sm:p-3.5 bg-[#282521] rounded-2xl border-2 border-[#383530] shadow-[0_3px_0_0_#141311] flex flex-col gap-1">
                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                    <Swords className="w-3.5 h-3.5 text-amber-500" />
                    Blitz Rating
                  </span>
                  <span className="text-lg sm:text-xl font-black text-white font-mono">
                    {syncData.stats.blitz.rating}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono font-bold">
                    {syncData.stats.blitz.record.win}W / {syncData.stats.blitz.record.loss}L / {syncData.stats.blitz.record.draw}D
                  </span>
                </div>

                <div className="p-3 sm:p-3.5 bg-[#282521] rounded-2xl border-2 border-[#383530] shadow-[0_3px_0_0_#141311] flex flex-col gap-1">
                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-[#81b64c]" />
                    Tactics Rating
                  </span>
                  <span className="text-lg sm:text-xl font-black text-[#81b64c] font-mono">
                    {syncData.stats.tactics.highest}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium">Personal Best</span>
                </div>
              </div>

              {/* Imported Games Section */}
              <div className="flex flex-col gap-2 pt-1 sm:pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-xs font-black text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#81b64c]" />
                    <span>Imported Live Games ({syncData.games.length})</span>
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium">Click Review to analyze with Stockfish & Coach Danny</span>
                </div>

                <div className="flex flex-col divide-y-2 divide-[#282522] bg-[#282521] rounded-2xl border-2 border-[#383530] overflow-hidden max-h-[280px] overflow-y-auto shadow-[0_3px_0_0_#141311]">
                  {syncData.games.map((g: any) => (
                    <div
                      key={g.id}
                      className="p-2.5 sm:p-3 flex items-center justify-between hover:bg-[#302d28] transition gap-2"
                    >
                      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                        <span className="text-xs font-mono text-amber-400 shrink-0">⚡</span>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="text-xs font-black text-white truncate max-w-[120px] sm:max-w-none">
                              vs {g.opponent.username}
                            </span>
                            <span className="text-[10px] sm:text-[11px] text-zinc-400 font-mono font-bold shrink-0">
                              ({g.opponent.rating})
                            </span>
                          </div>
                          <span className="text-[9px] sm:text-[10px] text-zinc-400 font-medium capitalize truncate">
                            {g.timeClass} • {new Date(g.playedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <span
                          className={`text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full font-mono border ${
                            g.userResult === 'win'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : g.userResult === 'loss'
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                              : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                          }`}
                        >
                          {g.userResult.toUpperCase()}
                        </span>

                        <button
                          onClick={() => handleReviewGame(g)}
                          className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 bg-[#81b64c] hover:bg-[#72a342] text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider rounded-full border-2 border-[#5d8b32] shadow-[0_2px_0_0_#4d7a24] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-[0_0.5px_0_0_#4d7a24] transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3 text-amber-200" />
                          <span>Review</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-3 text-zinc-400">
              <div className="w-14 h-14 rounded-2xl bg-[#282521] border-2 border-[#383530] shadow-[0_3px_0_0_#141311] flex items-center justify-center text-3xl">
                🌐
              </div>
              <div className="flex flex-col max-w-sm">
                <span className="text-xs font-black text-white">No profile synced yet</span>
                <span className="text-[11px] text-zinc-400 font-medium mt-1">
                  Click "Sync Account" above to instantly load your Check.mate avatar, active ELO ratings, and last 30 live games.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
