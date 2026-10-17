'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Users,
  Award,
  Zap,
  Flame,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Calendar,
  Trophy,
  Loader2,
  TrendingUp,
  RefreshCw,
  Eye,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface PlayerProfile {
  username: string;
  displayName: string;
  avatar: string;
  country: string;
  league: string;
  status: string;
  joined: string | null;
  profileUrl: string;
}

interface RatingCategory {
  rating: number | null;
  best: number | null;
  record: { win: number; loss: number; draw: number } | null;
}

interface PlayerStats {
  rapid: RatingCategory;
  blitz: RatingCategory;
  bullet: RatingCategory;
  tactics: { highest: number; lowest: number };
}

interface RecentGame {
  id: string;
  url: string;
  playedAt: string;
  timeClass: string;
  timeControl: string;
  userResult: 'win' | 'loss' | 'draw';
  isUserWhite: boolean;
  userPlayer: { username: string; rating: number };
  opponent: { username: string; rating: number };
  pgn?: string;
}

const FEATURED_PLAYERS = [
  { username: 'magnuscarlsen', label: 'Magnus Carlsen 🇳🇴', tag: 'GM' },
  { username: 'hikaru', label: 'Hikaru Nakamura 🇺🇸', tag: 'GM' },
  { username: 'danielnaroditsky', label: 'Daniel Naroditsky 🇺🇸', tag: 'GM' },
  { username: 'gothamchess', label: 'GothamChess 🇺🇸', tag: 'IM' },
  { username: 'firouzja2003', label: 'Alireza Firouzja 🇫🇷', tag: 'GM' },
];

export default function PlayersExplorerPage() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('magnuscarlsen');
  const [activeUsername, setActiveUsername] = useState('magnuscarlsen');
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [games, setGames] = useState<RecentGame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Rate-limiting countdown state
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);

  const fetchPlayer = useCallback(async (user: string) => {
    if (!user.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/sync/chesscom?username=${encodeURIComponent(user.trim().toLowerCase())}`);
      const data = await res.json();

      if (res.status === 429 || data.rateLimited) {
        setCooldownSeconds(data.retryAfterSeconds || 5);
        setErrorMessage(
          'Public API rate limit reached (1 request/second). Cooling down before accepting new requests...'
        );
        setIsLoading(false);
        return;
      }

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || `Could not find player "${user}".`);
        setIsLoading(false);
        return;
      }

      setProfile(data.profile);
      setStats(data.stats);
      setGames(data.games || []);
      setActiveUsername(user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to connect to player lookup API.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchPlayer('magnuscarlsen');
  }, [fetchPlayer]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds === null || cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setErrorMessage(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownSeconds && cooldownSeconds > 0) return;
    if (searchInput.trim()) {
      fetchPlayer(searchInput.trim());
    }
  };

  const handleChipClick = (u: string) => {
    if (cooldownSeconds && cooldownSeconds > 0) return;
    setSearchInput(u);
    fetchPlayer(u);
  };

  return (
    <div className="flex-1 p-3 sm:p-5 lg:p-6 pb-24 md:pb-8 flex flex-col items-center bg-[#161512] text-zinc-100 overflow-y-auto select-none">
      <div className="w-full max-w-5xl flex flex-col gap-4 sm:gap-5">
        {/* Compact Header & Integrated Search Hero */}
        <div className="flex flex-col gap-3 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[#1f1d1a] border-2 border-[#35322b] shadow-[0_5px_0_0_#141311]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#81b64c] border-2 border-[#4d7a24] shadow-[0_3px_0_0_#4d7a24] flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-black text-white flex items-center gap-2">
                  Public Player Explorer
                </h1>
                <p className="text-[11px] sm:text-xs text-zinc-400 font-medium">
                  Inspect player profiles, live ELO ratings, tactical milestones, and match archives.
                </p>
              </div>
            </div>
            <div className="hidden md:flex px-3 py-1 rounded-full bg-[#262420] border-2 border-[#35322b] shadow-[0_2px_0_0_#141311] text-[11px] font-mono font-bold text-[#81b64c] items-center gap-1.5 shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>FIDE &amp; Chess.com Public</span>
            </div>
          </div>

          {/* Search Input Row */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search player username (e.g. magnuscarlsen, hikaru)..."
                className="w-full bg-[#161512] border-2 border-[#35322b] rounded-xl pl-9 sm:pl-10 pr-3 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-[#81b64c] transition shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || (cooldownSeconds !== null && cooldownSeconds > 0)}
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-[#81b64c] hover:bg-[#72a342] text-white text-xs sm:text-sm font-black flex items-center gap-1.5 border-2 border-[#4d7a24] shadow-[0_3px_0_0_#4d7a24] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Search</span>
            </button>
          </form>

          {/* Quick Player Suggestions */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider mr-0.5">
              Popular:
            </span>
            {FEATURED_PLAYERS.map((p) => {
              const isActive = activeUsername.toLowerCase() === p.username.toLowerCase();
              return (
                <button
                  key={p.username}
                  onClick={() => handleChipClick(p.username)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                    isActive
                      ? 'bg-[#81b64c] border-[#4d7a24] text-white shadow-[0_2px_0_0_#4d7a24]'
                      : 'bg-[#181614] border-[#2f2c26] text-zinc-300 shadow-[0_2px_0_0_#141311] hover:text-white hover:border-[#423e36]'
                  }`}
                >
                  <span>{p.label}</span>
                  <span className="text-[9px] font-black uppercase bg-black/30 px-1 py-0.2 rounded">
                    {p.tag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Rate-Limit / Error Feedback Alert */}
        {cooldownSeconds !== null && cooldownSeconds > 0 && (
          <div className="p-3.5 rounded-2xl bg-amber-950/40 border-2 border-amber-600/50 shadow-[0_3px_0_0_#78350f] flex items-center justify-between gap-3 text-amber-200 text-xs animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <strong className="font-black text-amber-300 block text-xs">
                  Rate Limit In Effect (1 req/sec)
                </strong>
                <span className="text-[11px] font-medium text-amber-200/80">
                  Cooldown active for <strong className="text-white font-mono">{cooldownSeconds}s</strong>.
                </span>
              </div>
            </div>
            <div className="px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 font-mono font-black text-amber-300 text-xs shrink-0">
              00:0{cooldownSeconds}
            </div>
          </div>
        )}

        {errorMessage && cooldownSeconds === null && (
          <div className="p-3.5 rounded-2xl bg-rose-950/40 border-2 border-rose-600/40 shadow-[0_3px_0_0_#881337] text-rose-300 text-xs flex items-center gap-2.5 font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Profile Details Container */}
        {profile && (
          <div className="flex flex-col gap-4 sm:gap-5">
            {/* Player Main Bio Card */}
            <div className="bg-[#1f1d1a] border-2 border-[#35322b] rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-[0_5px_0_0_#141311] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-[#282622] border-2 border-[#35322b] shadow-[0_3px_0_0_#141311] overflow-hidden flex items-center justify-center text-xl sm:text-2xl shrink-0">
                  {profile.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar}
                      alt={profile.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>♟️</span>
                  )}
                </div>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-lg font-black text-white truncate">
                      {profile.displayName || profile.username}
                    </h2>
                    <span className="text-[11px] sm:text-xs font-bold text-zinc-400 font-mono">
                      @{profile.username}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[#81b64c]/20 border border-[#81b64c]/50 text-[#81b64c] text-[9px] font-black uppercase tracking-wider">
                      {profile.league || 'Active'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-2.5 text-[11px] sm:text-xs text-zinc-400 mt-1 flex-wrap font-medium">
                    <span>
                      Country:{' '}
                      <strong className="text-white">
                        {profile.country === 'NG' ? 'Nigeria 🇳🇬' : profile.country}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Status: <strong className="text-white capitalize">{profile.status}</strong>
                    </span>
                    {profile.joined && (
                      <>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline font-mono">
                          Since {new Date(profile.joined).getFullYear()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <a
                href={profile.profileUrl || `https://www.chess.com/member/${profile.username}`}
                target="_blank"
                rel="noreferrer"
                className="self-stretch sm:self-center justify-center px-3.5 py-1.5 sm:py-2 rounded-xl bg-[#262420] hover:bg-[#322f29] border-2 border-[#35322b] shadow-[0_2px_0_0_#141311] hover:-translate-y-[1px] active:translate-y-[1px] text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer text-center"
              >
                <span>Official Profile</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Ratings Grid */}
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
                {/* Rapid Card */}
                <div className="bg-[#1f1d1a] border-2 border-[#35322b] rounded-xl sm:rounded-2xl p-3 sm:p-3.5 shadow-[0_3px_0_0_#141311] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#81b64c]" />
                      Rapid
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 font-bold">
                      Best: {stats.rapid.best || '—'}
                    </span>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-white font-mono">
                    {stats.rapid.rating || 'Unrated'}
                  </div>
                  {stats.rapid.record && (
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold text-zinc-400 pt-1.5 border-t border-[#282622]">
                      <span className="text-emerald-400">{stats.rapid.record.win}W</span>
                      <span className="text-zinc-400">{stats.rapid.record.draw}D</span>
                      <span className="text-rose-400">{stats.rapid.record.loss}L</span>
                    </div>
                  )}
                </div>

                {/* Blitz Card */}
                <div className="bg-[#1f1d1a] border-2 border-[#35322b] rounded-xl sm:rounded-2xl p-3 sm:p-3.5 shadow-[0_3px_0_0_#141311] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                      Blitz
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 font-bold">
                      Best: {stats.blitz.best || '—'}
                    </span>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-white font-mono">
                    {stats.blitz.rating || 'Unrated'}
                  </div>
                  {stats.blitz.record && (
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold text-zinc-400 pt-1.5 border-t border-[#282622]">
                      <span className="text-emerald-400">{stats.blitz.record.win}W</span>
                      <span className="text-zinc-400">{stats.blitz.record.draw}D</span>
                      <span className="text-rose-400">{stats.blitz.record.loss}L</span>
                    </div>
                  )}
                </div>

                {/* Bullet Card */}
                <div className="bg-[#1f1d1a] border-2 border-[#35322b] rounded-xl sm:rounded-2xl p-3 sm:p-3.5 shadow-[0_3px_0_0_#141311] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Bullet
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 font-bold">
                      Best: {stats.bullet.best || '—'}
                    </span>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-white font-mono">
                    {stats.bullet.rating || 'Unrated'}
                  </div>
                  {stats.bullet.record && (
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold text-zinc-400 pt-1.5 border-t border-[#282622]">
                      <span className="text-emerald-400">{stats.bullet.record.win}W</span>
                      <span className="text-zinc-400">{stats.bullet.record.draw}D</span>
                      <span className="text-rose-400">{stats.bullet.record.loss}L</span>
                    </div>
                  )}
                </div>

                {/* Tactics / Puzzles Card */}
                <div className="bg-[#1f1d1a] border-2 border-[#35322b] rounded-xl sm:rounded-2xl p-3 sm:p-3.5 shadow-[0_3px_0_0_#141311] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5 text-cyan-400" />
                      Tactics
                    </span>
                    <span className="text-[10px] font-mono font-bold text-zinc-500">Peak</span>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-white font-mono">
                    {stats.tactics.highest || 1460}
                  </div>
                  <div className="text-[10px] font-medium text-zinc-400 pt-1.5 border-t border-[#282622] truncate">
                    Highest Solved
                  </div>
                </div>
              </div>
            )}

            {/* Recent Games Archive Table */}
            <div className="bg-[#1f1d1a] border-2 border-[#35322b] rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-[0_5px_0_0_#141311] flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#282622]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#81b64c]/20 border border-[#81b64c]/40 flex items-center justify-center shrink-0">
                    <Award className="w-3.5 h-3.5 text-[#81b64c]" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                    Recent Games ({games.length})
                  </h3>
                </div>
                <span className="text-[11px] font-medium text-zinc-400">Public Archive</span>
              </div>

              {games.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-500 font-medium">
                  No public rated games found for this player in the latest monthly archive.
                </div>
              ) : (
                <div className="divide-y divide-[#262420]">
                  {games.map((g) => (
                    <div
                      key={g.id}
                      className="py-2 sm:py-2.5 px-2 flex items-center justify-between gap-2 hover:bg-[#23211e] transition-colors rounded-xl"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            g.userResult === 'win'
                              ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]'
                              : g.userResult === 'loss'
                              ? 'bg-rose-500'
                              : 'bg-zinc-400'
                          }`}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-black text-white truncate">
                            vs {g.opponent.username} ({g.opponent.rating})
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono font-medium truncate">
                            {g.timeClass.toUpperCase()} {g.timeControl} &bull; {g.isUserWhite ? 'White' : 'Black'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full font-mono border ${
                            g.userResult === 'win'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : g.userResult === 'loss'
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                              : 'bg-zinc-700/30 text-zinc-300 border-zinc-600/40'
                          }`}
                        >
                          {g.userResult}
                        </span>

                        <button
                          onClick={() => router.push('/analysis')}
                          className="px-2.5 sm:px-3 py-1 rounded-lg bg-[#262420] hover:bg-[#322f29] border border-[#35322b] shadow-[0_1.5px_0_0_#141311] text-zinc-200 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                          title="Open in Stockfish Studio"
                        >
                          <Eye className="w-3 h-3 text-[#81b64c]" />
                          <span>Analyze</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
