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
import { GameSessionStore } from '@/lib/gameSessionStore';
import { soundService } from '@/lib/audioService';

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
  const [username, setUsername] = useState<string>('rapid_qing');
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
        setErrorMsg(json.error || 'Failed to sync Chess.com profile.');
        soundService.playPuzzleFail();
        setIsLoading(false);
        return;
      }

      setSyncData(json);
      soundService.playPuzzleSuccess();

      // Save to localStorage
      try {
        localStorage.setItem('chess_com_profile', JSON.stringify(json.profile));
        localStorage.setItem('chess_com_stats', JSON.stringify(json.stats));
        if (json.games && json.games.length > 0) {
          localStorage.setItem('chess_com_imported_games', JSON.stringify(json.games));

          // Also inject into GameSessionStore so they appear in Match History!
          json.games.forEach((g: any) => {
            GameSessionStore.saveSession({
              id: g.id,
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
              moves: [],
              fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
              isGameOver: true,
              gameResult: g.userResult === 'win' ? (g.isUserWhite ? '1-0' : '0-1') : g.userResult === 'loss' ? (g.isUserWhite ? '0-1' : '1-0') : '1/2-1/2',
              resultDetails: {
                winner: g.userResult === 'win' ? (g.isUserWhite ? 'w' : 'b') : g.userResult === 'loss' ? (g.isUserWhite ? 'b' : 'w') : 'draw',
                reason: g.userPlayer.result === 'win' ? 'checkmate' : 'resignation',
                ratingDelta: g.userResult === 'win' ? 8 : g.userResult === 'loss' ? -8 : 0,
                newRating: g.userPlayer.rating,
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
      setErrorMsg(err.message || 'Network error syncing with Chess.com.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewGame = (game: any) => {
    if (onSelectGameForReview) {
      onSelectGameForReview(game.id, game.pgn);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#1b1916] border border-[#2d2a26] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#2d2a26] flex items-center justify-between bg-[#211f1c]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#81b64c]/20 border border-[#81b64c]/40 flex items-center justify-center">
              <span className="text-base">♟️</span>
            </div>
            <div className="flex flex-col">
              <h2 className="text-sm font-black text-white flex items-center gap-1.5">
                <span>Chess.com Profile & Games Sync</span>
                <span className="text-[10px] font-bold uppercase bg-[#81b64c] text-white px-1.5 py-0.2 rounded">
                  Live Sync
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                Connect your Chess.com account to import your official ratings, avatar, and live games.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Username Input Form */}
        <div className="p-5 border-b border-[#2d2a26] bg-[#181614] flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter Chess.com Username (e.g. rapid_qing)"
                onKeyDown={(e) => e.key === 'Enter' && handleSync()}
                className="w-full px-3.5 py-2.5 bg-[#211f1c] border border-[#35322c] rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#81b64c] font-medium"
              />
            </div>
            <button
              onClick={handleSync}
              disabled={isLoading || !username.trim()}
              className="px-5 py-2.5 bg-[#81b64c] hover:bg-[#73a542] disabled:opacity-50 text-white font-black text-xs rounded-xl shadow transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Syncing...' : 'Sync Account'}</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Synced Content Body */}
        <div className="p-5 overflow-y-auto flex flex-col gap-4">
          {syncData ? (
            <>
              {/* Profile Card */}
              <div className="p-4 bg-[#211f1c] rounded-xl border border-[#302e2b] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#2a2723] border border-[#3d3830] overflow-hidden flex items-center justify-center text-xl shadow shrink-0">
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
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-white">{syncData.profile.username}</span>
                      <span className="text-sm">
                        {syncData.profile.country === 'NG'
                          ? '🇳🇬'
                          : syncData.profile.country === 'US'
                          ? '🇺🇸'
                          : '🌍'}
                      </span>
                      <span className="text-[10px] uppercase font-bold bg-[#81b64c]/20 text-[#81b64c] px-1.5 py-0.5 rounded">
                        {syncData.profile.league} League
                      </span>
                    </div>
                    <span className="text-xs text-zinc-400">
                      Chess.com Member • Joined {new Date(syncData.profile.joined).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <a
                  href={syncData.profile.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                  title="View on Chess.com"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {/* Ratings Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-[#211f1c] rounded-xl border border-[#302e2b] flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Rapid Rating
                  </span>
                  <span className="text-xl font-black text-white font-mono">
                    {syncData.stats.rapid.rating}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {syncData.stats.rapid.record.win}W / {syncData.stats.rapid.record.loss}L / {syncData.stats.rapid.record.draw}D
                  </span>
                </div>

                <div className="p-3 bg-[#211f1c] rounded-xl border border-[#302e2b] flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1">
                    <Swords className="w-3.5 h-3.5 text-amber-500" />
                    Blitz Rating
                  </span>
                  <span className="text-xl font-black text-white font-mono">
                    {syncData.stats.blitz.rating}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {syncData.stats.blitz.record.win}W / {syncData.stats.blitz.record.loss}L / {syncData.stats.blitz.record.draw}D
                  </span>
                </div>

                <div className="p-3 bg-[#211f1c] rounded-xl border border-[#302e2b] flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-[#81b64c]" />
                    Tactics Rating
                  </span>
                  <span className="text-xl font-black text-[#81b64c] font-mono">
                    {syncData.stats.tactics.highest}
                  </span>
                  <span className="text-[10px] text-zinc-400">Personal Best</span>
                </div>
              </div>

              {/* Imported Games Section */}
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#81b64c]" />
                    <span>Imported Live Games ({syncData.games.length})</span>
                  </span>
                  <span className="text-[10px] text-zinc-400">Click Review to analyze with Stockfish & Coach Danny</span>
                </div>

                <div className="flex flex-col divide-y divide-[#2a2723] bg-[#211f1c] rounded-xl border border-[#302e2b] overflow-hidden max-h-[280px] overflow-y-auto">
                  {syncData.games.map((g: any) => (
                    <div
                      key={g.id}
                      className="p-3 flex items-center justify-between hover:bg-[#282622] transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xs font-mono text-amber-400">⚡</span>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white truncate">
                              vs {g.opponent.username}
                            </span>
                            <span className="text-[11px] text-zinc-400 font-mono">
                              ({g.opponent.rating})
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-400 capitalize">
                            {g.timeClass} • {new Date(g.playedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                            g.userResult === 'win'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : g.userResult === 'loss'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
                          }`}
                        >
                          {g.userResult.toUpperCase()}
                        </span>

                        <button
                          onClick={() => handleReviewGame(g)}
                          className="px-2.5 py-1 bg-[#81b64c] hover:bg-[#72a542] text-white text-[11px] font-black rounded-lg transition shadow cursor-pointer flex items-center gap-1"
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
              <div className="w-12 h-12 rounded-2xl bg-[#262420] border border-[#35322c] flex items-center justify-center text-2xl shadow">
                🌐
              </div>
              <div className="flex flex-col max-w-sm">
                <span className="text-xs font-bold text-white">No profile synced yet</span>
                <span className="text-[11px] text-zinc-400 mt-1">
                  Click "Sync Account" above to instantly load your Chess.com avatar, active ELO ratings, and last 30 live games.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
