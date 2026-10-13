'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Globe,
  Award,
  TrendingUp,
  User,
  ShieldCheck,
  Loader2,
  Calendar,
  Trophy,
  Video,
  ExternalLink,
  Flame,
  Zap,
} from 'lucide-react';

interface PlayerProfile {
  username: string;
  title?: string;
  name?: string;
  avatar?: string;
  country?: string;
  followers?: number;
  status?: string;
}

interface PlayerStats {
  chess_bullet?: { last?: { rating: number }; best?: { rating: number }; record?: { win: number; loss: number; draw: number } };
  chess_blitz?: { last?: { rating: number }; best?: { rating: number }; record?: { win: number; loss: number; draw: number } };
  chess_rapid?: { last?: { rating: number }; best?: { rating: number }; record?: { win: number; loss: number; draw: number } };
  tactics?: { highest?: { rating: number } };
  puzzle_rush?: { best?: { score: number } };
}

interface ArchivedGame {
  url: string;
  pgn: string;
  time_control: string;
  time_class: string;
  white: { username: string; rating: number; result: string };
  black: { username: string; rating: number; result: string };
  accuracies?: { white: number; black: number };
}

interface LeaderboardItem {
  username: string;
  score: number;
  rank: number;
}

interface StreamerItem {
  username: string;
  avatar: string;
  twitch_url?: string;
  is_live: boolean;
}

export const PubApiExplorer: React.FC = () => {
  const [username, setUsername] = useState('hikaru');
  const [activeTab, setActiveTab] = useState<'profile' | 'games' | 'leaderboards' | 'streamers'>('profile');
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [games, setGames] = useState<ArchivedGame[]>([]);
  const [leaderboards, setLeaderboards] = useState<Record<string, LeaderboardItem[]> | null>(null);
  const [streamers, setStreamers] = useState<StreamerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlayerData = async (userToFetch: string) => {
    if (!userToFetch.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const cleanUser = userToFetch.trim().toLowerCase();
      // Try native local /pub API first
      let pData: PlayerProfile | null = null;
      let sData: PlayerStats | null = null;

      try {
        const [localP, localS] = await Promise.all([
          fetch(`/pub/player/${cleanUser}`),
          fetch(`/pub/player/${cleanUser}/stats`),
        ]);
        if (localP.ok) pData = await localP.json();
        if (localS.ok) sData = await localS.json();
      } catch {
        // Fallback to official chess.com API if local fails
      }

      if (!pData) {
        const [remoteP, remoteS] = await Promise.all([
          fetch(`https://api.chess.com/pub/player/${cleanUser}`),
          fetch(`https://api.chess.com/pub/player/${cleanUser}/stats`),
        ]);
        if (!remoteP.ok) throw new Error(`Player "${userToFetch}" not found.`);
        pData = await remoteP.json();
        sData = remoteS.ok ? await remoteS.json() : null;
      }

      setProfile(pData);
      setStats(sData);

      // Also fetch recent games archive
      try {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth() + 1 < 10 ? `0${now.getMonth() + 1}` : `${now.getMonth() + 1}`;
        const gRes = await fetch(`/pub/player/${cleanUser}/games/${y}/${m}`);
        if (gRes.ok) {
          const gJson = await gRes.json();
          setGames(gJson.games || []);
        }
      } catch {
        // ignore games error
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch player data.';
      setError(msg);
      setProfile(null);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalData = async () => {
    try {
      const [lRes, sRes] = await Promise.all([
        fetch('/pub/leaderboards'),
        fetch('/pub/streamers'),
      ]);
      if (lRes.ok) {
        const lJson = await lRes.json();
        setLeaderboards(lJson);
      }
      if (sRes.ok) {
        const sJson = await sRes.json();
        setStreamers(sJson.streamers || []);
      }
    } catch (e) {
      console.error('Failed to load global data:', e);
    }
  };

  useEffect(() => {
    fetchPlayerData('hikaru');
    fetchGlobalData();
  }, []);

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto p-4 select-none">
      {/* Header Banner */}
      <div className="p-4 bg-[#21201d] rounded-2xl border border-[#302e2b] flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#81b64c]/20 border border-[#81b64c]/30 flex items-center justify-center text-[#81b64c] shadow">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              Public REST API & Data Service (A10)
              <span className="text-[10px] bg-[#81b64c] text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                PubAPI Live
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              Query player ratings, monthly game archives, leaderboards, and titled rosters via <code className="text-zinc-300 font-mono">/pub/*</code>.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchPlayerData(username);
          }}
          className="flex items-center gap-2 w-full md:w-auto"
        >
          <div className="relative flex-1 md:w-60">
            <input
              type="text"
              placeholder="Enter Chess username (e.g. hikaru)..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#161512] border border-[#302e2b] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#81b64c]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-[#81b64c] hover:bg-[#72a342] text-white text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-md shadow-[#81b64c]/20"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>Query</span>
          </button>
        </form>
      </div>

      {/* Grandmaster Presets Bar */}
      <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-zinc-400">
        <span className="font-semibold text-zinc-500">Quick Query:</span>
        {['hikaru', 'magnuscarlsen', 'danielnaroditsky', 'alireza2003', 'guest-player'].map((u) => (
          <button
            key={u}
            onClick={() => {
              setUsername(u);
              fetchPlayerData(u);
            }}
            className="text-zinc-300 hover:text-white bg-[#22201d] hover:bg-[#2d2a26] border border-[#302e2b] px-2.5 py-1 rounded-lg cursor-pointer transition-colors font-mono text-[11px]"
          >
            @{u}
          </button>
        ))}
      </div>

      {/* Tabs Header */}
      <div className="flex gap-2 mt-4 border-b border-[#2d2a26] pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'profile'
              ? 'bg-[#81b64c] text-white shadow'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Player Profile & Ratings</span>
        </button>
        <button
          onClick={() => setActiveTab('games')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'games'
              ? 'bg-[#81b64c] text-white shadow'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Game Archives ({games.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('leaderboards')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'leaderboards'
              ? 'bg-[#81b64c] text-white shadow'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Leaderboards</span>
        </button>
        <button
          onClick={() => setActiveTab('streamers')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'streamers'
              ? 'bg-[#81b64c] text-white shadow'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          <span>Streamers</span>
        </button>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="mt-4 p-4 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Tab 1: Profile & Stats */}
      {activeTab === 'profile' && profile && (
        <div className="mt-4 flex flex-col gap-4 animate-in fade-in">
          {/* Profile Banner */}
          <div className="p-5 bg-[#21201d] rounded-2xl border border-[#302e2b] flex flex-col sm:flex-row items-center gap-5 shadow-xl">
            <div className="relative">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.username}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-[#81b64c] shadow-lg"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-[#2b2926] border border-[#3f3b35] flex items-center justify-center text-3xl shadow">
                  👤
                </div>
              )}
              {profile.title && (
                <span className="absolute -top-2 -right-2 bg-amber-500 text-black font-black text-xs px-2 py-0.5 rounded-md shadow-md">
                  {profile.title}
                </span>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h3 className="text-xl font-black text-white">{profile.username}</h3>
                {profile.name && (
                  <span className="text-xs font-semibold text-zinc-400">({profile.name})</span>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-2 text-xs text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#81b64c]" />
                  Status: <strong className="text-zinc-200 capitalize">{profile.status || 'Active'}</strong>
                </span>
                {profile.followers !== undefined && (
                  <span className="flex items-center gap-1.5">
                    <User className="w-4 h-4 text-blue-400" />
                    Followers: <strong className="text-zinc-200">{profile.followers.toLocaleString()}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Ratings Grid */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Rapid */}
              <div className="p-4 bg-[#23211e] rounded-xl border border-[#33302b] flex flex-col">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="font-bold uppercase tracking-wider text-[#81b64c]">⏱️ Rapid</span>
                  <Award className="w-4 h-4 text-[#81b64c]" />
                </div>
                <div className="text-2xl font-black text-white font-mono mt-2">
                  {stats.chess_rapid?.last?.rating || '1500'}
                </div>
                <div className="text-[11px] text-zinc-400 mt-1 flex justify-between font-mono">
                  <span>Peak: {stats.chess_rapid?.best?.rating || '1500'}</span>
                  {stats.chess_rapid?.record && (
                    <span className="text-emerald-400 font-bold">
                      {stats.chess_rapid.record.win}W / {stats.chess_rapid.record.loss}L
                    </span>
                  )}
                </div>
              </div>

              {/* Blitz */}
              <div className="p-4 bg-[#23211e] rounded-xl border border-[#33302b] flex flex-col">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="font-bold uppercase tracking-wider text-amber-400">⚡ Blitz</span>
                  <Award className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-white font-mono mt-2">
                  {stats.chess_blitz?.last?.rating || '1500'}
                </div>
                <div className="text-[11px] text-zinc-400 mt-1 flex justify-between font-mono">
                  <span>Peak: {stats.chess_blitz?.best?.rating || '1500'}</span>
                  {stats.chess_blitz?.record && (
                    <span className="text-emerald-400 font-bold">
                      {stats.chess_blitz.record.win}W / {stats.chess_blitz.record.loss}L
                    </span>
                  )}
                </div>
              </div>

              {/* Bullet */}
              <div className="p-4 bg-[#23211e] rounded-xl border border-[#33302b] flex flex-col">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="font-bold uppercase tracking-wider text-rose-400">🔥 Bullet</span>
                  <Award className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-2xl font-black text-white font-mono mt-2">
                  {stats.chess_bullet?.last?.rating || '1500'}
                </div>
                <div className="text-[11px] text-zinc-400 mt-1 flex justify-between font-mono">
                  <span>Peak: {stats.chess_bullet?.best?.rating || '1500'}</span>
                  {stats.chess_bullet?.record && (
                    <span className="text-emerald-400 font-bold">
                      {stats.chess_bullet.record.win}W / {stats.chess_bullet.record.loss}L
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Game Archives */}
      {activeTab === 'games' && (
        <div className="mt-4 flex flex-col gap-3 animate-in fade-in">
          {games.length > 0 ? (
            games.map((g, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-[#21201d] rounded-xl border border-[#302e2b] flex items-center justify-between text-xs hover:border-[#423f39] transition-colors"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 font-bold">
                    <span className="text-white">{g.white.username} ({g.white.rating})</span>
                    <span className="text-zinc-500 font-mono text-[10px]">vs</span>
                    <span className="text-white">{g.black.username} ({g.black.rating})</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-mono">
                    <span className="uppercase text-[#81b64c] font-bold">{g.time_class} ({g.time_control}s)</span>
                    {g.accuracies && (
                      <span>Accuracy: W {g.accuracies.white}% • B {g.accuracies.black}%</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded font-mono font-bold bg-[#161512] text-zinc-200 border border-[#2b2824]">
                    {g.white.result === 'win' ? '1-0' : g.black.result === 'win' ? '0-1' : '½-½'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-zinc-500 text-xs bg-[#1f1d1a] rounded-xl border border-[#2d2a26]">
              No archived games found for this monthly period.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Leaderboards */}
      {activeTab === 'leaderboards' && leaderboards && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in">
          {Object.entries(leaderboards).map(([cat, list]) => (
            <div key={cat} className="p-4 bg-[#21201d] rounded-xl border border-[#302e2b] flex flex-col gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider text-[#81b64c]">
                {cat.replace('_', ' ')}
              </span>
              <div className="divide-y divide-[#2a2824]">
                {list.map((item) => (
                  <div key={item.username} className="py-2 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 font-bold w-4">#{item.rank}</span>
                      <span className="text-zinc-200 font-bold">{item.username}</span>
                    </div>
                    <span className="text-white font-black">{item.score}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: Streamers */}
      {activeTab === 'streamers' && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
          {streamers.map((s) => (
            <div
              key={s.username}
              className="p-3.5 bg-[#21201d] rounded-xl border border-[#302e2b] flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-3">
                <img src={s.avatar} alt={s.username} className="w-10 h-10 rounded-xl object-cover" />
                <div className="flex flex-col">
                  <span className="font-bold text-white">{s.username}</span>
                  {s.is_live && (
                    <span className="text-[10px] text-rose-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                      LIVE NOW
                    </span>
                  )}
                </div>
              </div>
              {s.twitch_url && (
                <a
                  href={s.twitch_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-[#9146ff]/20 text-[#bf94ff] hover:bg-[#9146ff]/30 text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <span>Twitch</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
