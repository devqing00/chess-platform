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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username')?.trim().toLowerCase() || 'rapid_qing';

  if (!username) {
    return NextResponse.json({ success: false, error: 'Username is required' }, { status: 400 });
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

    // 3. Fetch archives and latest month's games
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
          // Fetch the most recent archive (latest month)
          const latestArchiveUrl = archives[archives.length - 1];
          const gamesRes = await fetch(latestArchiveUrl, {
            headers: customHeaders,
            cache: 'no-store',
          });

          if (gamesRes.ok) {
            const monthData = await gamesRes.json();
            const rawGames: ChessComGameRaw[] = monthData.games || [];

            // Sort newest first
            const sorted = rawGames.slice().reverse();

            recentGames = sorted.slice(0, 30).map((g, index) => {
              const isUserWhite = g.white.username.toLowerCase() === username.toLowerCase();
              const userPlayer = isUserWhite ? g.white : g.black;
              const oppPlayer = isUserWhite ? g.black : g.white;

              let userResult: 'win' | 'loss' | 'draw' = 'draw';
              if (userPlayer.result === 'win') {
                userResult = 'win';
              } else if (
                ['checkmated', 'timeout', 'resigned', 'abandoned', 'lose'].includes(userPlayer.result)
              ) {
                userResult = 'loss';
              }

              // Extract gameId from URL e.g. "https://www.chess.com/game/live/185198673712"
              const urlParts = g.url.split('/');
              const gameId = urlParts[urlParts.length - 1] || `game-${index}`;

              return {
                id: `chesscom-${gameId}`,
                externalUrl: g.url,
                timeControl: g.time_control,
                timeClass: g.time_class,
                rated: g.rated,
                playedAt: new Date(g.end_time * 1000).toISOString(),
                isUserWhite,
                userResult,
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

    return NextResponse.json({
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
    });
  } catch (error: any) {
    console.error('Error syncing Chess.com account:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal error syncing Chess.com' },
      { status: 500 }
    );
  }
}
