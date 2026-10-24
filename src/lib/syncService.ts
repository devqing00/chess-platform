import { GameSessionStore, parsePgnToMoveRecords } from '@/lib/gameSessionStore';

export interface SyncResult {
  success: boolean;
  count: number;
  error?: string;
}

/**
 * Robustly synchronizes external account games (Chess.com or Lichess)
 * and stores them into the local GameSessionStore for live review and training.
 */
export async function syncExternalAccountGames(
  platform: 'chesscom' | 'lichess',
  username: string,
  force: boolean = false
): Promise<SyncResult> {
  const cleanUsername = username?.trim();
  if (!cleanUsername) return { success: false, count: 0, error: 'Username is required' };

  try {
    const cacheBuster = `&_t=${Date.now()}`;
    const apiEndpoint =
      platform === 'chesscom'
        ? `/api/sync/chesscom?username=${encodeURIComponent(cleanUsername)}${force ? '&force=true' : ''}${cacheBuster}`
        : `/api/sync/lichess?username=${encodeURIComponent(cleanUsername)}${force ? '&force=true' : ''}${cacheBuster}`;

    const res = await fetch(apiEndpoint, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });
    const json = await res.json();

    if (!res.ok || !json.success) {
      return {
        success: false,
        count: 0,
        error: json.error || `Failed to sync ${platform} account.`,
      };
    }

    if (json.games && Array.isArray(json.games) && json.games.length > 0) {
      // Save raw games to localStorage for offline match review
      if (typeof window !== 'undefined' && platform === 'chesscom') {
        try {
          localStorage.setItem('chess_com_imported_games', JSON.stringify(json.games));
        } catch {}
      }

      const sessionsToSave = json.games.map((g: any) => {
        const parsedMoves = g.pgn ? parsePgnToMoveRecords(g.pgn) : [];
        const isUserWhite = g.isUserWhite;
        const opponentName = g.opponent?.username || (isUserWhite ? g.blackPlayer?.name : g.whitePlayer?.name) || 'Opponent';
        const opponentRating = g.opponent?.rating || 1200;
        const userRating = g.userPlayer?.rating || 1200;

        return {
          id: g.id,
          source: platform,
          whitePlayer: {
            id: isUserWhite ? 'user-synced' : 'opp',
            name: isUserWhite ? cleanUsername : opponentName,
            rating: isUserWhite ? userRating : opponentRating,
            avatar: isUserWhite ? (json.profile?.avatar || '') : '',
            country: isUserWhite ? (json.profile?.country || '') : '',
          },
          blackPlayer: {
            id: !isUserWhite ? 'user-synced' : 'opp',
            name: !isUserWhite ? cleanUsername : opponentName,
            rating: !isUserWhite ? userRating : opponentRating,
            avatar: !isUserWhite ? (json.profile?.avatar || '') : '',
            country: !isUserWhite ? (json.profile?.country || '') : '',
          },
          timeControl: parseInt(g.timeControl) || (g.timeClass === 'blitz' ? 300 : g.timeClass === 'bullet' ? 60 : 600),
          variant: 'standard' as const,
          moves: parsedMoves,
          movesCount: parsedMoves.length > 0 ? Math.ceil(parsedMoves.length / 2) : (g.movesCount || 0),
          pgn: g.pgn || '',
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          isGameOver: true,
          gameResult:
            g.gameResult ||
            (g.userResult === 'win'
              ? isUserWhite
                ? '1-0'
                : '0-1'
              : g.userResult === 'loss'
              ? isUserWhite
                ? '0-1'
                : '1-0'
              : '1/2-1/2'),
          resultDetails: {
            winner:
              g.userResult === 'win'
                ? isUserWhite
                  ? 'w' as const
                  : 'b' as const
                : g.userResult === 'loss'
                ? isUserWhite
                  ? 'b' as const
                  : 'w' as const
                : 'draw' as const,
            reason:
              g.reason ||
              (g.userResult === 'win'
                ? 'resignation'
                : g.userResult === 'loss'
                ? 'resignation'
                : 'agreement'),
            ratingDelta: g.userResult === 'win' ? 10 : g.userResult === 'loss' ? -10 : 0,
            newRating: userRating,
            league: 'External Sync',
            trophiesDelta: g.userResult === 'win' ? 15 : 0,
          },
          reviewReport: null,
          createdAt: g.playedAt ? new Date(g.playedAt).getTime() : Date.now(),
          updatedAt: Date.now(),
        };
      });

      GameSessionStore.saveSessionsBatch(sessionsToSave);
    }

    // Refresh cached profile and stats in localStorage
    if (typeof window !== 'undefined') {
      try {
        if (platform === 'chesscom' && json.profile) {
          localStorage.setItem('chess_com_profile', JSON.stringify(json.profile));
          if (json.stats) localStorage.setItem('chess_com_stats', JSON.stringify(json.stats));
        } else if (platform === 'lichess' && json.profile) {
          localStorage.setItem('lichess_profile', JSON.stringify(json.profile));
        }
      } catch {}
    }

    return {
      success: true,
      count: json.games ? json.games.length : 0,
    };
  } catch (err: any) {
    console.warn(`Error during ${platform} sync:`, err);
    return {
      success: false,
      count: 0,
      error: err.message || `Network error syncing ${platform}.`,
    };
  }
}
