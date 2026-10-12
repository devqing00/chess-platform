'use client';

import React, { useState, useEffect } from 'react';
import { Search, Globe, Award, TrendingUp, User, ShieldCheck, Loader2 } from 'lucide-react';

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

export const PubApiExplorer: React.FC = () => {
  const [username, setUsername] = useState('hikaru');
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlayerData = async (userToFetch: string) => {
    if (!userToFetch.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const cleanUser = userToFetch.trim().toLowerCase();
      const [profileRes, statsRes] = await Promise.all([
        fetch(`https://api.chess.com/pub/player/${cleanUser}`),
        fetch(`https://api.chess.com/pub/player/${cleanUser}/stats`),
      ]);

      if (!profileRes.ok) {
        throw new Error(`Player "${userToFetch}" not found on Chess.com.`);
      }

      const profileData = await profileRes.json();
      const statsData = statsRes.ok ? await statsRes.json() : null;

      setProfile(profileData);
      setStats(statsData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch player data.';
      setError(msg);
      setProfile(null);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayerData('hikaru');
  }, []);

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4 select-none">
      {/* Header */}
      <div className="p-4 bg-[#21201d] rounded-xl border border-[#302e2b] flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#81b64c]/20 border border-[#81b64c]/30 flex items-center justify-center text-[#81b64c]">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Chess.com PubAPI Explorer
              <span className="text-[10px] bg-[#81b64c] text-white px-2 py-0.5 rounded-full font-black uppercase">
                Live Data
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              Query real grandmaster ratings, leaderboards, and statistics via the official Chess.com REST API.
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
          <div className="relative flex-1 md:w-56">
            <input
              type="text"
              placeholder="Enter Chess.com username..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#161512] border border-[#302e2b] rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#81b64c]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-[#81b64c] hover:bg-[#72a342] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>Fetch</span>
          </button>
        </form>
      </div>

      {/* Grandmaster Presets */}
      <div className="flex items-center gap-2 mt-3 text-xs text-zinc-400">
        <span>Suggested:</span>
        {['hikaru', 'magnuscarlsen', 'gothamchess', 'danielnaroditsky', 'firouzja2003'].map((u) => (
          <button
            key={u}
            onClick={() => {
              setUsername(u);
              fetchPlayerData(u);
            }}
            className="text-zinc-300 hover:text-white bg-[#272522] hover:bg-[#33302b] px-2 py-0.5 rounded cursor-pointer transition-colors"
          >
            @{u}
          </button>
        ))}
      </div>

      {/* Error Notice */}
      {error && (
        <div className="mt-4 p-4 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Player Profile & Stats Card */}
      {profile && (
        <div className="mt-6 flex flex-col gap-6">
          {/* Profile Overview Banner */}
          <div className="p-6 bg-[#21201d] rounded-2xl border border-[#302e2b] flex flex-col md:flex-row items-center gap-6 shadow-xl">
            <div className="relative">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.username}
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-[#81b64c] shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-[#2b2926] border border-[#3f3b35] flex items-center justify-center text-4xl shadow">
                  👤
                </div>
              )}
              {profile.title && (
                <span className="absolute -top-2 -right-2 bg-amber-500 text-black font-black text-xs px-2 py-0.5 rounded-md shadow-md">
                  {profile.title}
                </span>
              )}
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <h3 className="text-2xl font-black text-white">{profile.username}</h3>
                {profile.name && (
                  <span className="text-sm font-semibold text-zinc-400">({profile.name})</span>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-2 text-xs text-zinc-400">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Blitz */}
              <div className="p-4 bg-[#262421] rounded-xl border border-[#383530] flex flex-col">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="font-bold uppercase tracking-wider text-amber-400">⚡ Blitz</span>
                  <Award className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-black text-white font-mono mt-2">
                  {stats.chess_blitz?.last?.rating || 'Unrated'}
                </div>
                <div className="text-[11px] text-zinc-400 mt-1 flex justify-between">
                  <span>Peak: {stats.chess_blitz?.best?.rating || 'N/A'}</span>
                  {stats.chess_blitz?.record && (
                    <span className="text-emerald-400 font-mono font-bold">
                      {stats.chess_blitz.record.win}W / {stats.chess_blitz.record.loss}L
                    </span>
                  )}
                </div>
              </div>

              {/* Rapid */}
              <div className="p-4 bg-[#262421] rounded-xl border border-[#383530] flex flex-col">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="font-bold uppercase tracking-wider text-[#81b64c]">⏱️ Rapid</span>
                  <Award className="w-4 h-4 text-[#81b64c]" />
                </div>
                <div className="text-3xl font-black text-white font-mono mt-2">
                  {stats.chess_rapid?.last?.rating || 'Unrated'}
                </div>
                <div className="text-[11px] text-zinc-400 mt-1 flex justify-between">
                  <span>Peak: {stats.chess_rapid?.best?.rating || 'N/A'}</span>
                  {stats.chess_rapid?.record && (
                    <span className="text-emerald-400 font-mono font-bold">
                      {stats.chess_rapid.record.win}W / {stats.chess_rapid.record.loss}L
                    </span>
                  )}
                </div>
              </div>

              {/* Bullet */}
              <div className="p-4 bg-[#262421] rounded-xl border border-[#383530] flex flex-col">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="font-bold uppercase tracking-wider text-rose-400">🔥 Bullet</span>
                  <Award className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-3xl font-black text-white font-mono mt-2">
                  {stats.chess_bullet?.last?.rating || 'Unrated'}
                </div>
                <div className="text-[11px] text-zinc-400 mt-1 flex justify-between">
                  <span>Peak: {stats.chess_bullet?.best?.rating || 'N/A'}</span>
                  {stats.chess_bullet?.record && (
                    <span className="text-emerald-400 font-mono font-bold">
                      {stats.chess_bullet.record.win}W / {stats.chess_bullet.record.loss}L
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
