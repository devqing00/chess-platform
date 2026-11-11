import { MoveRecord } from '@/types/chess';

/**
 * Extracts move duration in seconds for each ply from PGN clock comments ([%clk h:mm:ss] or [%clk mm:ss]).
 * Accurately parses standard Chess.com and Lichess clock tags.
 */
export function extractMoveTimesFromPgn(pgn: string): Record<number, number> {
  const times: Record<number, number> = {};
  if (!pgn || typeof pgn !== 'string') return times;

  // Find all clock annotations: e.g. {[%clk 0:09:58.2]} or {[%clk 0:05:00]}
  const regex = /\[%clk\s+([0-9:.]+)\s*\]/gi;
  const matches = Array.from(pgn.matchAll(regex));
  if (matches.length === 0) return times;

  const parseClock = (str: string): number => {
    const parts = str.split(':').map(Number);
    if (parts.length === 3) {
      return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
    }
    if (parts.length === 2) {
      return (parts[0] || 0) * 60 + (parts[1] || 0);
    }
    return Number(str) || 0;
  };

  // Determine initial time control if specified: e.g. [TimeControl "600+0"] or [TimeControl "180"]
  const tcMatch = pgn.match(/\[TimeControl\s+"([^"]+)"\]/i);
  let initialSec = 600;
  let incSec = 0;
  if (tcMatch) {
    const tcParts = tcMatch[1].split('+');
    initialSec = parseInt(tcParts[0], 10) || 600;
    incSec = parseInt(tcParts[1], 10) || 0;
  }

  let lastWhiteClk = initialSec;
  let lastBlackClk = initialSec;

  matches.forEach((m, ply) => {
    const clkSec = parseClock(m[1]);
    const isWhite = ply % 2 === 0;
    const prevClk = isWhite ? lastWhiteClk : lastBlackClk;
    // Time spent is previous remaining clock minus current remaining clock, plus increment
    const diff = Math.max(0.1, prevClk - clkSec + incSec);
    times[ply] = Number(diff.toFixed(1));

    if (isWhite) lastWhiteClk = clkSec;
    else lastBlackClk = clkSec;
  });

  return times;
}

/**
 * Format move duration cleanly into human-readable compact string.
 * e.g. 2.1s, 11.3s, 1m 15s
 */
export function formatMoveDuration(seconds?: number): string {
  if (seconds === undefined || seconds <= 0) return '';
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s`;
}

/**
 * Safely merges move time data into an array of MoveRecords.
 */
export function mergeMoveTimesIntoReport(
  reportMoves: MoveRecord[],
  sourceMoves?: Array<{ timeSpentSeconds?: number }>,
  pgn?: string
): void {
  if (!reportMoves || reportMoves.length === 0) return;

  // 1. First priority: sourceMoves (recorded directly from live or bot gameplay)
  if (sourceMoves && sourceMoves.length > 0) {
    reportMoves.forEach((rm, idx) => {
      if (rm.timeSpentSeconds === undefined && sourceMoves[idx]?.timeSpentSeconds !== undefined) {
        rm.timeSpentSeconds = sourceMoves[idx].timeSpentSeconds;
      }
    });
  }

  // 2. Second priority: PGN clock comments (Chess.com / Lichess imported games)
  if (pgn) {
    const pgnTimes = extractMoveTimesFromPgn(pgn);
    reportMoves.forEach((rm, idx) => {
      if (rm.timeSpentSeconds === undefined && pgnTimes[idx] !== undefined) {
        rm.timeSpentSeconds = pgnTimes[idx];
      }
    });
  }
}

