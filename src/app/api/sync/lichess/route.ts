import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// In-memory cache to prevent hitting Lichess rate limits (TTL: 15s)
const lichessCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 15 * 1000;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username')?.trim().toLowerCase();
  const forceRefresh = searchParams.get('refresh') === 'true';

  if (!username) {
    return NextResponse.json({ success: false, error: 'Username is required' }, { status: 400 });
  }

  if (!forceRefresh) {
    const cached = lichessCache.get(username);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.data);
    }
  }

  const customHeaders = {
    'User-Agent': 'CheckmateChessApp/1.0 (contact@checkmate.app)',
    Accept: 'application/json',
  };

  try {
    // 1. Fetch Lichess Public Profile
    const profileRes = await fetch(`https://lichess.org/api/user/${encodeURIComponent(username)}`, {
      headers: customHeaders,
      cache: 'no-store',
    });

    if (!profileRes.ok) {
      if (profileRes.status === 404) {
        return NextResponse.json(
          { success: false, error: `Lichess account "${username}" was not found.` },
          { status: 404 }
        );
      }
      if (profileRes.status === 429) {
        return NextResponse.json(
          {
            success: false,
            rateLimited: true,
            error: 'Lichess API rate limit reached. Please wait a moment and try again.',
          },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { success: false, error: `Lichess API returned status: ${profileRes.status}` },
        { status: profileRes.status }
      );
    }

    const rawData = await profileRes.json();

    const profile = {
      username: rawData.username || username,
      avatar: rawData.profile?.avatar || null,
      country: rawData.profile?.country || null,
      title: rawData.title || null,
      perfs: rawData.perfs || {},
      count: rawData.count || {},
      url: `https://lichess.org/@/${rawData.username || username}`,
    };

    const getLichessPerf = (perf?: any) => {
      if (!perf || typeof perf.rating !== 'number') return null;
      return {
        rating: perf.rating,
        games: perf.games || 0,
        provisional: !!perf.prov,
      };
    };

    const stats = {
      rapid: getLichessPerf(rawData.perfs?.rapid),
      blitz: getLichessPerf(rawData.perfs?.blitz),
      bullet: getLichessPerf(rawData.perfs?.bullet),
      daily: getLichessPerf(rawData.perfs?.correspondence),
      puzzles: getLichessPerf(rawData.perfs?.puzzle),
    };

    // 2. Fetch up to 35 recent games from Lichess for deep scouting analysis
    let games: any[] = [];
    try {
      const gamesRes = await fetch(
        `https://lichess.org/api/games/user/${encodeURIComponent(username)}?max=35&pgnInJson=true&clocks=false&evals=false`,
        {
          headers: {
            ...customHeaders,
            Accept: 'application/x-ndjson',
          },
          cache: 'no-store',
        }
      );

      if (gamesRes.ok) {
        const text = await gamesRes.text();
        const lines = text.trim().split('\n').filter(Boolean);
        games = lines.map((line, idx) => {
          try {
            const g = JSON.parse(line);
            const isWhite = g.players?.white?.user?.name?.toLowerCase() === username.toLowerCase();
            const userPlayer = isWhite ? g.players?.white : g.players?.black;
            const oppPlayer = isWhite ? g.players?.black : g.players?.white;
            const won = g.winner === (isWhite ? 'white' : 'black');
            const draw = g.status === 'draw' || g.status === 'stalemate';

            return {
              id: `lichess_${g.id || idx}`,
              source: 'lichess',
              url: `https://lichess.org/${g.id}`,
              timeControl: g.clock?.initial ? `${g.clock.initial}` : '600',
              timeClass: g.speed || 'rapid',
              isUserWhite: isWhite,
              userResult: won ? 'win' : draw ? 'draw' : 'loss',
              userPlayer: {
                username: userPlayer?.user?.name || username,
                rating: userPlayer?.rating || 1500,
              },
              opponent: {
                username: oppPlayer?.user?.name || 'Opponent',
                rating: oppPlayer?.rating || 1500,
              },
              pgn: g.pgn || '',
              movesCount: g.moves ? g.moves.split(' ').length : 0,
              endTime: g.createdAt ? Math.floor(g.createdAt / 1000) : Date.now(),
            };
          } catch {
            return null;
          }
        }).filter(Boolean);
      }
    } catch (gamesErr) {
      console.warn('Could not fetch Lichess games:', gamesErr);
    }

    const responsePayload = {
      success: true,
      platform: 'lichess',
      profile,
      stats,
      games,
    };

    lichessCache.set(username, { data: responsePayload, timestamp: Date.now() });

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to sync Lichess account' },
      { status: 500 }
    );
  }
}
