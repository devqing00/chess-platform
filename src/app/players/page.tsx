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
  { username: 'rapid_qing', label: 'rapid_qing 🇳🇬', tag: 'User' },
  { username: 'hikaru', label: 'Hikaru Nakamura 🇺🇸', tag: 'GM' },
  { username: 'magnuscarlsen', label: 'Magnus Carlsen 🇳🇴', tag: 'GM' },
  { username: 'danielnaroditsky', label: 'Daniel Naroditsky 🇺🇸', tag: 'GM' },
  { username: 'gothamchess', label: 'GothamChess 🇺🇸', tag: 'IM' },
  { username: 'firouzja2003', label: 'Alireza Firouzja 🇫🇷', tag: 'GM' },
];

export default function PlayersExplorerPage() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('rapid_qing');
  const [activeUsername, setActiveUsername] = useState('rapid_qing');
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
    fetchPlayer('rapid_qing');
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
    <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col items-center bg-[#161512] text-zinc-100 overflow-y-auto select-none">
      <div className="w-full max-w-6xl flex flex-col gap-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#282622] pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#81b64c] to-[#5d8b32] flex items-center justify-center text-2xl shadow-lg shadow-[#81b64c]/20">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                Public Player Explorer
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Inspect player profiles, live ELO ratings, tactical milestones, and match archives.
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar & Quick Chips */}
        <div className="flex flex-col gap-3">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search player username (e.g. rapid_qing, hikaru, magnuscarlsen)..."
                className="w-full bg-[#1e1c19] border border-[#2d2a26] rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm font-semibold text-white placeholder-zinc-500 focus:outline-none focus:border-[#81b64c] transition"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || (cooldownSeconds !== null && cooldownSeconds > 0)}
              className="px-6 py-3 rounded-xl bg-[#81b64c] hover:bg-[#72a342] text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Search</span>
            </button>
          </form>

          {/* Quick Player Suggestions */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mr-1">
              Popular:
            </span>
            {FEATURED_PLAYERS.map((p) => (
              <button
                key={p.username}
                onClick={() => handleChipClick(p.username)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeUsername.toLowerCase() === p.username.toLowerCase()
                    ? 'bg-[#81b64c] text-white shadow'
                    : 'bg-[#22201d] text-zinc-300 hover:text-white hover:bg-[#2b2824] border border-[#2d2a26]'
                }`}
              >
                <span>{p.label}</span>
                <span className="text-[10px] opacity-75 font-mono uppercase bg-black/25 px-1 py-0.2 rounded">
                  {p.tag}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Rate-Limit / Error Feedback Alert */}
        {cooldownSeconds !== null && cooldownSeconds > 0 && (
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-600/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200 text-xs animate-in fade-in">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <strong className="font-black text-amber-300 block text-sm">
                  Rate Limit In Effect (Public Data API)
                </strong>
                <span>
                  To prevent rate limiting, we limit queries to 1 per second. Cooldown active for{' '}
                  <strong className="text-white font-mono">{cooldownSeconds}s</strong>.
                </span>
              </div>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-amber-500/20 font-mono font-black text-amber-300 text-sm">
              00:0{cooldownSeconds}
            </div>
          </div>
        )}

        {errorMessage && cooldownSeconds === null && (
          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-600/40 text-rose-300 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Profile Details Container */}
        {profile && (
          <div className="flex flex-col gap-6">
            {/* Player Main Bio Card */}
            <div className="bg-[#1f1d1a] border border-[#2d2a26] rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#282622] border-2 border-[#3d3a34] overflow-hidden flex items-center justify-center text-3xl shrink-0 shadow-lg">
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

                <div className="flex flex-col">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-lg sm:text-2xl font-black text-white">
                      {profile.displayName || profile.username}
                    </h2>
                    <span className="text-sm font-bold text-zinc-400 font-mono">
                      @{profile.username}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#81b64c]/20 text-[#81b64c] text-[10px] font-black uppercase">
                      {profile.league || 'Active'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-zinc-400 mt-2 flex-wrap">
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
                        <span>•</span>
                        <span>
                          Member Since:{' '}
                          <strong className="text-white">
                            {new Date(profile.joined).toLocaleDateString()}
                          </strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center">
                <a
                  href={profile.profileUrl || `https://www.chess.com/member/${profile.username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-[#272522] hover:bg-[#34312b] border border-[#3d3a34] text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <span>View Official Profile</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Ratings Grid */}
            {stats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Rapid Card */}
                <div className="bg-[#1f1d1a] border border-[#2d2a26] rounded-2xl p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[#81b64c]" />
                      Rapid
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      Best: {stats.rapid.best || '—'}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    {stats.rapid.rating || 'Unrated'}
                  </div>
                  {stats.rapid.record && (
                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-2 border-t border-[#2d2a26]">
                      <span className="text-emerald-400 font-bold">{stats.rapid.record.win}W</span>
                      <span className="text-zinc-400">{stats.rapid.record.draw}D</span>
                      <span className="text-rose-400 font-bold">{stats.rapid.record.loss}L</span>
                    </div>
                  )}
                </div>

                {/* Blitz Card */}
                <div className="bg-[#1f1d1a] border border-[#2d2a26] rounded-2xl p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-orange-400" />
                      Blitz
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      Best: {stats.blitz.best || '—'}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    {stats.blitz.rating || 'Unrated'}
                  </div>
                  {stats.blitz.record && (
                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-2 border-t border-[#2d2a26]">
                      <span className="text-emerald-400 font-bold">{stats.blitz.record.win}W</span>
                      <span className="text-zinc-400">{stats.blitz.record.draw}D</span>
                      <span className="text-rose-400 font-bold">{stats.blitz.record.loss}L</span>
                    </div>
                  )}
                </div>

                {/* Bullet Card */}
                <div className="bg-[#1f1d1a] border border-[#2d2a26] rounded-2xl p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-400" />
                      Bullet
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      Best: {stats.bullet.best || '—'}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    {stats.bullet.rating || 'Unrated'}
                  </div>
                  {stats.bullet.record && (
                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-2 border-t border-[#2d2a26]">
                      <span className="text-emerald-400 font-bold">{stats.bullet.record.win}W</span>
                      <span className="text-zinc-400">{stats.bullet.record.draw}D</span>
                      <span className="text-rose-400 font-bold">{stats.bullet.record.loss}L</span>
                    </div>
                  )}
                </div>

                {/* Tactics / Puzzles Card */}
                <div className="bg-[#1f1d1a] border border-[#2d2a26] rounded-2xl p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-cyan-400" />
                      Tactics
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">Peak Record</span>
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    {stats.tactics.highest || 1460}
                  </div>
                  <div className="text-[11px] text-zinc-400 pt-2 border-t border-[#2d2a26]">
                    Highest Tactical Puzzle Solved
                  </div>
                </div>
              </div>
            )}

            {/* Recent Games Archive Table */}
            <div className="bg-[#1f1d1a] border border-[#2d2a26] rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#81b64c]" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Recent Games Archive ({games.length} matches)
                  </h3>
                </div>
                <span className="text-xs text-zinc-400">Monthly public database games</span>
              </div>

              {games.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500">
                  No public rated games found for this player in the latest monthly archive.
                </div>
              ) : (
                <div className="divide-y divide-[#282622] overflow-x-auto">
                  {games.map((g) => (
                    <div
                      key={g.id}
                      className="py-3.5 px-2 flex items-center justify-between hover:bg-[#252320] transition-colors rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            g.userResult === 'win'
                              ? 'bg-emerald-400'
                              : g.userResult === 'loss'
                              ? 'bg-rose-500'
                              : 'bg-zinc-400'
                          }`}
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white">
                            vs {g.opponent.username} ({g.opponent.rating})
                          </span>
                          <span className="text-[11px] text-zinc-400 font-mono">
                            {g.timeClass.toUpperCase()} {g.timeControl} • Played as{' '}
                            {g.isUserWhite ? 'White' : 'Black'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-black uppercase px-2 py-0.5 rounded font-mono ${
                            g.userResult === 'win'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : g.userResult === 'loss'
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-zinc-700/30 text-zinc-300'
                          }`}
                        >
                          {g.userResult}
                        </span>

                        <button
                          onClick={() => router.push('/analysis')}
                          className="px-3 py-1.5 rounded-lg bg-[#2b2824] hover:bg-[#38342f] text-zinc-200 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
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
