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
    <div className="flex-1 p-3 sm:p-6 lg:p-8 pb-24 md:pb-8 flex flex-col items-center bg-[#161512] text-zinc-100 overflow-y-auto select-none">
      <div className="w-full max-w-6xl flex flex-col gap-5 sm:gap-6">
        {/* Header Title Card */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-3xl bg-[#1f1d1a] border-2 border-[#35322b] shadow-[0_6px_0_0_#141311]">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#81b64c] border-2 border-[#4d7a24] shadow-[0_4px_0_0_#4d7a24] flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-black text-white flex items-center gap-2">
                Public Player Explorer
              </h1>
              <p className="text-xs text-zinc-400 font-medium mt-0.5 line-clamp-2 sm:line-clamp-none">
                Inspect player profiles, live ELO ratings, tactical milestones, and match archives.
              </p>
            </div>
          </div>
          <div className="hidden sm:flex self-start sm:self-center px-3.5 py-1.5 rounded-full bg-[#262420] border-2 border-[#35322b] shadow-[0_2px_0_0_#141311] text-xs font-mono font-bold text-[#81b64c] items-center gap-2 shrink-0">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>FIDE &amp; Chess.com Public Engine</span>
          </div>
        </div>

        {/* Search Bar & Quick Chips */}
        <div className="flex flex-col gap-3">
          <form onSubmit={handleSearchSubmit} className="flex gap-2 sm:gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search player (e.g. magnuscarlsen, hikaru)..."
                className="w-full bg-[#1a1815] border-2 border-[#35322b] rounded-2xl pl-10 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-[#81b64c] transition shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || (cooldownSeconds !== null && cooldownSeconds > 0)}
              className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-full bg-[#81b64c] hover:bg-[#72a342] text-white text-xs sm:text-sm font-black flex items-center gap-1.5 sm:gap-2 border-2 border-[#4d7a24] shadow-[0_4px_0_0_#4d7a24] hover:-translate-y-[2px] active:translate-y-[2px] active:shadow-[0_1px_0_0_#4d7a24] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shrink-0"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Search</span>
            </button>
          </form>

          {/* Quick Player Suggestions */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-[11px] font-black text-zinc-500 uppercase tracking-wider mr-1">
              Popular:
            </span>
            {FEATURED_PLAYERS.map((p) => {
              const isActive = activeUsername.toLowerCase() === p.username.toLowerCase();
              return (
                <button
                  key={p.username}
                  onClick={() => handleChipClick(p.username)}
                  className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 border-2 ${
                    isActive
                      ? 'bg-[#81b64c] border-[#4d7a24] text-white shadow-[0_3px_0_0_#4d7a24]'
                      : 'bg-[#211f1c] border-[#35322b] text-zinc-300 shadow-[0_3px_0_0_#141311] hover:-translate-y-[1px] hover:border-[#4d483f]'
                  }`}
                >
                  <span>{p.label}</span>
                  <span className="text-[9px] sm:text-[10px] font-black uppercase bg-black/30 px-1.5 py-0.5 rounded-full">
                    {p.tag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Rate-Limit / Error Feedback Alert */}
        {cooldownSeconds !== null && cooldownSeconds > 0 && (
          <div className="p-4 rounded-3xl bg-amber-950/40 border-2 border-amber-600/50 shadow-[0_4px_0_0_#78350f] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200 text-xs animate-in fade-in">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0" />
              <div>
                <strong className="font-black text-amber-300 block text-sm">
                  Rate Limit In Effect (Public Data API)
                </strong>
                <span className="font-medium">
                  To prevent rate limiting, we limit queries to 1 per second. Cooldown active for{' '}
                  <strong className="text-white font-mono">{cooldownSeconds}s</strong>.
                </span>
              </div>
            </div>
            <div className="px-3.5 py-1.5 rounded-full bg-amber-500/20 border-2 border-amber-500/40 font-mono font-black text-amber-300 text-sm">
              00:0{cooldownSeconds}
            </div>
          </div>
        )}

        {errorMessage && cooldownSeconds === null && (
          <div className="p-4 rounded-3xl bg-rose-950/40 border-2 border-rose-600/40 shadow-[0_4px_0_0_#881337] text-rose-300 text-xs flex items-center gap-3 font-semibold">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Profile Details Container */}
        {profile && (
          <div className="flex flex-col gap-6">
            {/* Player Main Bio Card */}
            <div className="bg-[#1f1d1a] border-2 border-[#35322b] rounded-3xl p-4 sm:p-6 shadow-[0_6px_0_0_#141311] flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
              <div className="flex items-center gap-3.5 sm:gap-5 min-w-0">
                <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-[#282622] border-2 border-[#35322b] shadow-[0_4px_0_0_#141311] overflow-hidden flex items-center justify-center text-2xl sm:text-3xl shrink-0">
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
                    <h2 className="text-base sm:text-2xl font-black text-white truncate">
                      {profile.displayName || profile.username}
                    </h2>
                    <span className="text-xs sm:text-sm font-bold text-zinc-400 font-mono">
                      @{profile.username}
                    </span>
                    <span className="px-2.5 sm:px-3 py-0.5 rounded-full bg-[#81b64c]/20 border border-[#81b64c]/50 text-[#81b64c] text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
                      {profile.league || 'Active'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 text-xs text-zinc-400 mt-1.5 sm:mt-2 flex-wrap font-medium">
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
                        <span className="hidden sm:inline">
                          Member Since:{' '}
                          <strong className="text-white font-mono">
                            {new Date(profile.joined).toLocaleDateString()}
                          </strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <a
                  href={profile.profileUrl || `https://www.chess.com/member/${profile.username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto justify-center px-4 py-2 rounded-full bg-[#262420] hover:bg-[#322f29] border-2 border-[#35322b] shadow-[0_3px_0_0_#141311] hover:-translate-y-[2px] active:translate-y-[2px] active:shadow-[0_1px_0_0_#141311] text-zinc-200 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer text-center"
                >
                  <span>View Official Profile</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Ratings Grid */}
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Rapid Card */}
                <div className="bg-[#1f1d1a] border-2 border-[#35322b] rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-[0_4px_0_0_#141311] flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[#81b64c]" />
                      Rapid
                    </span>
                    <span className="text-[10px] font-mono font-bold text-zinc-500">
                      Best: {stats.rapid.best || '—'}
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-white font-mono">
                    {stats.rapid.rating || 'Unrated'}
                  </div>
                  {stats.rapid.record && (
                    <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono font-bold text-zinc-400 pt-2 border-t-2 border-[#282622]">
                      <span className="text-emerald-400">{stats.rapid.record.win}W</span>
                      <span className="text-zinc-400">{stats.rapid.record.draw}D</span>
                      <span className="text-rose-400">{stats.rapid.record.loss}L</span>
                    </div>
                  )}
                </div>

                {/* Blitz Card */}
                <div className="bg-[#1f1d1a] border-2 border-[#35322b] rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-[0_4px_0_0_#141311] flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-orange-400" />
                      Blitz
                    </span>
                    <span className="text-[10px] font-mono font-bold text-zinc-500">
                      Best: {stats.blitz.best || '—'}
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-white font-mono">
                    {stats.blitz.rating || 'Unrated'}
                  </div>
                  {stats.blitz.record && (
                    <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono font-bold text-zinc-400 pt-2 border-t-2 border-[#282622]">
                      <span className="text-emerald-400">{stats.blitz.record.win}W</span>
                      <span className="text-zinc-400">{stats.blitz.record.draw}D</span>
                      <span className="text-rose-400">{stats.blitz.record.loss}L</span>
                    </div>
                  )}
                </div>

                {/* Bullet Card */}
                <div className="bg-[#1f1d1a] border-2 border-[#35322b] rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-[0_4px_0_0_#141311] flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-400" />
                      Bullet
                    </span>
                    <span className="text-[10px] font-mono font-bold text-zinc-500">
                      Best: {stats.bullet.best || '—'}
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-white font-mono">
                    {stats.bullet.rating || 'Unrated'}
                  </div>
                  {stats.bullet.record && (
                    <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono font-bold text-zinc-400 pt-2 border-t-2 border-[#282622]">
                      <span className="text-emerald-400">{stats.bullet.record.win}W</span>
                      <span className="text-zinc-400">{stats.bullet.record.draw}D</span>
                      <span className="text-rose-400">{stats.bullet.record.loss}L</span>
                    </div>
                  )}
                </div>

                {/* Tactics / Puzzles Card */}
                <div className="bg-[#1f1d1a] border-2 border-[#35322b] rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-[0_4px_0_0_#141311] flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-cyan-400" />
                      Tactics
                    </span>
                    <span className="text-[10px] font-mono font-bold text-zinc-500">Peak</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-white font-mono">
                    {stats.tactics.highest || 1460}
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-medium text-zinc-400 pt-2 border-t-2 border-[#282622] truncate">
                    Highest Tactical Puzzle Solved
                  </div>
                </div>
              </div>
            )}

            {/* Recent Games Archive Table */}
            <div className="bg-[#1f1d1a] border-2 border-[#35322b] rounded-3xl p-4 sm:p-6 shadow-[0_6px_0_0_#141311] flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 pb-3 border-b-2 border-[#282622]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#81b64c]/20 border border-[#81b64c]/40 flex items-center justify-center shrink-0">
                    <Award className="w-4 h-4 text-[#81b64c]" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                    Recent Games Archive ({games.length} matches)
                  </h3>
                </div>
                <span className="text-[11px] sm:text-xs font-medium text-zinc-400">Monthly public database games</span>
              </div>

              {games.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500 font-medium">
                  No public rated games found for this player in the latest monthly archive.
                </div>
              ) : (
                <div className="divide-y-2 divide-[#282622] overflow-x-auto">
                  {games.map((g) => (
                    <div
                      key={g.id}
                      className="py-2.5 sm:py-3 px-2 sm:px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#252320] transition-colors rounded-2xl"
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <span
                          className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-black/40 shrink-0 ${
                            g.userResult === 'win'
                              ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                              : g.userResult === 'loss'
                              ? 'bg-rose-500'
                              : 'bg-zinc-400'
                          }`}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-black text-white truncate">
                            vs {g.opponent.username} ({g.opponent.rating})
                          </span>
                          <span className="text-[10px] sm:text-[11px] text-zinc-400 font-mono font-medium truncate">
                            {g.timeClass.toUpperCase()} {g.timeControl} • Played as{' '}
                            {g.isUserWhite ? 'White' : 'Black'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pl-5 sm:pl-0">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full font-mono border ${
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
                          className="px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-[#262420] hover:bg-[#322f29] border-2 border-[#35322b] shadow-[0_2px_0_0_#141311] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-none text-zinc-200 text-xs font-black transition-all cursor-pointer flex items-center gap-1.5"
                          title="Open in Stockfish Studio"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#81b64c]" />
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
