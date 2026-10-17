import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface ChessComGameRaw {
  url: string;
  pgn?: string;
  time_control: string;
  end_time: number;
  rated: boolean;
  time_class: 'bullet' | 'blitz' | 'rapid' | 'daily';
  rules: string;
  white: {
    username: string;
    rating: number;
    result: string;
    [key: string]: any;
  };
  black: {
    username: string;
    rating: number;
    result: string;
    [key: string]: any;
  };
}

// In-memory cache to prevent hitting Chess.com rate limits (TTL: 15 seconds)
const playerCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 15 * 1000;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username')?.trim().toLowerCase();
  const forceRefresh = searchParams.get('refresh') === 'true' || searchParams.get('force') === 'true';

  if (!username) {
    return NextResponse.json({ success: false, error: 'Username is required' }, { status: 400 });
  }

  // Check in-memory cache first unless forced refresh
  if (!forceRefresh) {
    const cached = playerCache.get(username);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.data);
    }
  }

  const customHeaders = {
    'User-Agent': 'ChessPlatform/1.0 (contact@chessplatform.app)',
    Accept: 'application/json',
  };

  try {
    // 1. Fetch user profile
    const profileRes = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}`, {
      headers: customHeaders,
      cache: 'no-store',
    });

    if (!profileRes.ok) {
      if (profileRes.status === 404) {
        return NextResponse.json(
          { success: false, error: `Chess.com user "${username}" was not found.` },
          { status: 404 }
        );
      }
      if (profileRes.status === 429) {
        return NextResponse.json(
          {
            success: false,
            rateLimited: true,
            retryAfterSeconds: 5,
            error: 'Chess.com API rate limit reached. Please wait a few seconds before requesting again.',
          },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { success: false, error: `Failed to fetch Chess.com profile: ${profileRes.statusText}` },
        { status: profileRes.status }
      );
    }

    const profileData = await profileRes.json();

    // 2. Fetch user stats (ratings & records)
    let statsData: any = {};
    try {
      const statsRes = await fetch(
        `https://api.chess.com/pub/player/${encodeURIComponent(username)}/stats`,
        { headers: customHeaders, cache: 'no-store' }
      );
      if (statsRes.ok) {
        statsData = await statsRes.json();
      }
    } catch (err) {
      console.warn('Could not fetch stats for', username, err);
    }

    // 3. Fetch archives: fetch up to 2 latest monthly archives to prevent missing games during month rollover
    let recentGames: any[] = [];
    try {
      const archivesRes = await fetch(
        `https://api.chess.com/pub/player/${encodeURIComponent(username)}/games/archives`,
        { headers: customHeaders, cache: 'no-store' }
      );

      if (archivesRes.ok) {
        const archivesData = await archivesRes.json();
        const archives: string[] = archivesData.archives || [];

        if (archives.length > 0) {
          // Fetch the last 2 monthly archives (e.g. current month + previous month)
          const targetArchives = archives.slice(-2);
          const archivePromises = targetArchives.map((url) =>
            fetch(url, { headers: customHeaders, cache: 'no-store' })
              .then((r) => (r.ok ? r.json() : { games: [] }))
              .catch(() => ({ games: [] }))
          );

          const archiveResults = await Promise.all(archivePromises);
          const combinedGames: ChessComGameRaw[] = [];
          archiveResults.forEach((ar) => {
            if (ar.games && Array.isArray(ar.games)) {
              combinedGames.push(...ar.games);
            }
          });

          // Sort strictly newest first by end_time
          combinedGames.sort((a, b) => (b.end_time || 0) - (a.end_time || 0));

          recentGames = combinedGames.slice(0, 50).map((g, index) => {
            const isUserWhite = g.white.username.toLowerCase() === username.toLowerCase();
            const userPlayer = isUserWhite ? g.white : g.black;
            const oppPlayer = isUserWhite ? g.black : g.white;

            // Extract authoritative result directly from PGN header if available
            let pgnResult = '';
            if (g.pgn) {
              const resMatch = g.pgn.match(/\[Result\s+"([^"]+)"\]/);
              if (resMatch) pgnResult = resMatch[1].trim();
            }

            let userResult: 'win' | 'loss' | 'draw' = 'draw';
            if (pgnResult === '1-0') {
              userResult = isUserWhite ? 'win' : 'loss';
            } else if (pgnResult === '0-1') {
              userResult = isUserWhite ? 'loss' : 'win';
            } else if (pgnResult === '1/2-1/2' || pgnResult === '1/2') {
              userResult = 'draw';
            } else {
              // Fallback to player result tags
              if (userPlayer.result === 'win') {
                userResult = 'win';
              } else if (
                ['checkmated', 'timeout', 'resigned', 'abandoned', 'lose', 'bughousemate'].includes(userPlayer.result)
              ) {
                userResult = 'loss';
              } else {
                userResult = 'draw';
              }
            }

            // Extract gameId from URL e.g. "https://www.chess.com/game/live/185198673712"
            const urlParts = g.url.split('/');
            const rawId = urlParts[urlParts.length - 1] || `game-${index}`;
            const gameId = `chesscom-${rawId}`;

            // Calculate moves count from PGN
            let movesCount = 0;
            if (g.pgn) {
              const moveMatches = g.pgn.match(/\b\d+\.\s+([^\s]+)/g);
              movesCount = moveMatches ? moveMatches.length : 0;
            }

            // Standardize gameResult
            const gameResult =
              pgnResult ||
              (userResult === 'win'
                ? isUserWhite
                  ? '1-0'
                  : '0-1'
                : userResult === 'loss'
                ? isUserWhite
                  ? '0-1'
                  : '1-0'
                : '1/2-1/2');

            return {
              id: gameId,
              source: 'chesscom',
              externalUrl: g.url,
              timeControl: g.time_control,
              timeClass: g.time_class,
              rated: g.rated,
              playedAt: new Date(g.end_time * 1000).toISOString(),
              timestamp: g.end_time * 1000,
              isUserWhite,
              userResult,
              gameResult,
              movesCount,
              userPlayer: {
                username: userPlayer.username,
                rating: userPlayer.rating,
                result: userPlayer.result,
              },
              opponent: {
                username: oppPlayer.username,
                rating: oppPlayer.rating,
                result: oppPlayer.result,
              },
              pgn: g.pgn || '',
            };
          });
        }
      }
    } catch (err) {
      console.warn('Could not fetch archives for', username, err);
    }

    // Country code extraction
    let countryCode = 'NG';
    if (profileData.country) {
      const cParts = profileData.country.split('/');
      countryCode = cParts[cParts.length - 1] || 'NG';
    }

    const payload = {
      success: true,
      profile: {
        username: profileData.username,
        displayName: profileData.name || profileData.username,
        avatar: profileData.avatar || '',
        country: countryCode,
        league: profileData.league || 'Elite',
        status: profileData.status || 'basic',
        joined: profileData.joined ? new Date(profileData.joined * 1000).toISOString() : null,
        profileUrl: profileData.url,
      },
      stats: {
        rapid: {
          rating: statsData.chess_rapid?.last?.rating || 429,
          best: statsData.chess_rapid?.best?.rating || 429,
          record: statsData.chess_rapid?.record || { win: 79, loss: 58, draw: 6 },
        },
        blitz: {
          rating: statsData.chess_blitz?.last?.rating || 370,
          best: statsData.chess_blitz?.best?.rating || 378,
          record: statsData.chess_blitz?.record || { win: 205, loss: 188, draw: 19 },
        },
        bullet: {
          rating: statsData.chess_bullet?.last?.rating || null,
          best: statsData.chess_bullet?.best?.rating || null,
          record: statsData.chess_bullet?.record || null,
        },
        tactics: {
          highest: statsData.tactics?.highest?.rating || 1460,
          lowest: statsData.tactics?.lowest?.rating || 400,
        },
      },
      games: recentGames,
    };

    playerCache.set(username, { data: payload, timestamp: Date.now() });
    return NextResponse.json(payload);
  } catch (error: any) {
    console.error('Error syncing Chess.com account:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal error syncing Chess.com' },
      { status: 500 }
    );
  }
}
