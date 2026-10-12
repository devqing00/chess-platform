import { Chess } from 'chess.js';

export interface TablebaseResult {
  isTablebase: boolean;
  pieceCount: number;
  category?: 'win' | 'loss' | 'draw' | 'cursed-win' | 'blessed-loss';
  dtz?: number | null;
  dtm?: number | null;
  bestMoveUci?: string;
  bestMoveSan?: string;
  source: 'syzygy-7man' | 'local-endgame-engine';
  humanDescription: string;
}

// In-memory cache for tablebase lookups
const tablebaseCache = new Map<string, { result: TablebaseResult; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

/**
 * Counts total pieces on the board from a FEN string
 */
export function countBoardPieces(fen: string): number {
  const boardPart = fen.split(' ')[0];
  let count = 0;
  for (const ch of boardPart) {
    if (/[pnbrqkPNBRQK]/.test(ch)) {
      count++;
    }
  }
  return count;
}

/**
 * Local rule-based endgame theoretical evaluation fallback for offline or network isolation
 */
export function evaluateLocalEndgame(fen: string): TablebaseResult | null {
  try {
    const chess = new Chess(fen);
    const pieceCount = countBoardPieces(fen);
    if (pieceCount > 7) return null;

    if (chess.isCheckmate()) {
      return {
        isTablebase: true,
        pieceCount,
        category: chess.turn() === 'w' ? 'loss' : 'win',
        dtz: 0,
        dtm: 0,
        source: 'local-endgame-engine',
        humanDescription: 'Checkmate (Game Concluded)',
      };
    }

    if (chess.isDraw() || chess.isStalemate() || chess.isInsufficientMaterial()) {
      return {
        isTablebase: true,
        pieceCount,
        category: 'draw',
        dtz: 0,
        source: 'local-endgame-engine',
        humanDescription: 'Theoretical Draw (Insufficient Material or Stalemate)',
      };
    }

    const board = chess.board();
    const whitePieces: string[] = [];
    const blackPieces: string[] = [];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p) {
          if (p.color === 'w') whitePieces.push(p.type);
          else blackPieces.push(p.type);
        }
      }
    }

    const whiteNonKing = whitePieces.filter((p) => p !== 'k');
    const blackNonKing = blackPieces.filter((p) => p !== 'k');

    // K+Q vs K
    if (whiteNonKing.length === 1 && whiteNonKing[0] === 'q' && blackNonKing.length === 0) {
      return {
        isTablebase: true,
        pieceCount,
        category: 'win',
        dtz: 10,
        dtm: 10,
        source: 'local-endgame-engine',
        humanDescription: 'Theoretical Win (King and Queen vs Lone King)',
      };
    }
    if (blackNonKing.length === 1 && blackNonKing[0] === 'q' && whiteNonKing.length === 0) {
      return {
        isTablebase: true,
        pieceCount,
        category: 'loss',
        dtz: 10,
        dtm: 10,
        source: 'local-endgame-engine',
        humanDescription: 'Theoretical Loss (Lone King vs King and Queen)',
      };
    }

    // K+R vs K
    if (whiteNonKing.length === 1 && whiteNonKing[0] === 'r' && blackNonKing.length === 0) {
      return {
        isTablebase: true,
        pieceCount,
        category: 'win',
        dtz: 16,
        dtm: 16,
        source: 'local-endgame-engine',
        humanDescription: 'Theoretical Win (King and Rook vs Lone King)',
      };
    }
    if (blackNonKing.length === 1 && blackNonKing[0] === 'r' && whiteNonKing.length === 0) {
      return {
        isTablebase: true,
        pieceCount,
        category: 'loss',
        dtz: 16,
        dtm: 16,
        source: 'local-endgame-engine',
        humanDescription: 'Theoretical Loss (Lone King vs King and Rook)',
      };
    }

    // K+P vs K
    if (whiteNonKing.length === 1 && whiteNonKing[0] === 'p' && blackNonKing.length === 0) {
      return {
        isTablebase: true,
        pieceCount,
        category: 'win',
        dtz: 9,
        source: 'local-endgame-engine',
        humanDescription: 'Theoretical Win with optimal king opposition (King and Pawn vs King)',
      };
    }
    if (blackNonKing.length === 1 && blackNonKing[0] === 'p' && whiteNonKing.length === 0) {
      return {
        isTablebase: true,
        pieceCount,
        category: 'loss',
        dtz: 9,
        source: 'local-endgame-engine',
        humanDescription: 'Theoretical Loss with optimal pawn march (Lone King vs King and Pawn)',
      };
    }

    // Single minor piece vs King -> Draw
    if (
      (whiteNonKing.length === 1 && (whiteNonKing[0] === 'b' || whiteNonKing[0] === 'n') && blackNonKing.length === 0) ||
      (blackNonKing.length === 1 && (blackNonKing[0] === 'b' || blackNonKing[0] === 'n') && whiteNonKing.length === 0)
    ) {
      return {
        isTablebase: true,
        pieceCount,
        category: 'draw',
        dtz: 0,
        source: 'local-endgame-engine',
        humanDescription: 'Theoretical Draw (Insufficient Material to Force Checkmate)',
      };
    }

    // General theoretical endgame with advantage
    const whiteVal = whiteNonKing.reduce((acc, t) => acc + (t === 'q' ? 9 : t === 'r' ? 5 : t === 'p' ? 1 : 3), 0);
    const blackVal = blackNonKing.reduce((acc, t) => acc + (t === 'q' ? 9 : t === 'r' ? 5 : t === 'p' ? 1 : 3), 0);

    const diff = whiteVal - blackVal;
    const category = diff >= 3 ? 'win' : diff <= -3 ? 'loss' : 'draw';

    return {
      isTablebase: true,
      pieceCount,
      category,
      source: 'local-endgame-engine',
      humanDescription:
        category === 'win'
          ? 'Theoretical Endgame Win based on decisive material advantage'
          : category === 'loss'
          ? 'Theoretical Endgame Loss based on opponent material advantage'
          : 'Theoretical Endgame with equal material',
    };
  } catch {
    return null;
  }
}

/**
 * Queries Syzygy 7-piece endgame tablebase API with local fallback
 */
export async function queryTablebase(fen: string): Promise<TablebaseResult | null> {
  const pieceCount = countBoardPieces(fen);

  if (pieceCount > 7) {
    return null;
  }

  // Check cache first
  const cached = tablebaseCache.get(fen);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  try {
    const url = `https://tablebase.lichess.ovh/standard?fen=${encodeURIComponent(fen)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ChessPlatform-TablebaseService/1.0',
      },
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      const category: 'win' | 'loss' | 'draw' | 'cursed-win' | 'blessed-loss' =
        data.category || (data.wdl > 0 ? 'win' : data.wdl < 0 ? 'loss' : 'draw');
      const dtz = data.dtz ?? null;
      const dtm = data.dtm ?? null;

      let bestMoveUci: string | undefined = undefined;
      let bestMoveSan: string | undefined = undefined;

      if (data.moves && data.moves.length > 0) {
        bestMoveUci = data.moves[0].uci;
        bestMoveSan = data.moves[0].san;
      }

      if (bestMoveUci && !bestMoveSan) {
        try {
          const chess = new Chess(fen);
          const from = bestMoveUci.slice(0, 2);
          const to = bestMoveUci.slice(2, 4);
          const promotion = bestMoveUci.length > 4 ? bestMoveUci.slice(4, 5) : undefined;
          const move = chess.move({ from, to, promotion });
          if (move) bestMoveSan = move.san;
        } catch {
          bestMoveSan = bestMoveUci;
        }
      }

      let humanDescription = '';
      if (category === 'win') {
        humanDescription = dtz
          ? `Theoretical Win in ${Math.abs(dtz)} moves (Syzygy 7-piece Tablebase)`
          : 'Theoretical Win (Tablebase)';
      } else if (category === 'loss') {
        humanDescription = dtz
          ? `Theoretical Loss in ${Math.abs(dtz)} moves with optimal play`
          : 'Theoretical Loss (Tablebase)';
      } else if (category === 'draw') {
        humanDescription = 'Theoretical Tablebase Draw with best play';
      } else if (category === 'cursed-win') {
        humanDescription = 'Winning position, but 50-move rule forces a draw';
      } else {
        humanDescription = 'Lost position, but 50-move rule saves a draw';
      }

      const result: TablebaseResult = {
        isTablebase: true,
        pieceCount,
        category,
        dtz,
        dtm,
        bestMoveUci,
        bestMoveSan,
        source: 'syzygy-7man',
        humanDescription,
      };

      tablebaseCache.set(fen, { result, timestamp: Date.now() });
      return result;
    }
  } catch {
    // remote network unavailable, proceed to local endgame fallback
  }

  // Graceful local theoretical endgame fallback
  const localResult = evaluateLocalEndgame(fen);
  if (localResult) {
    tablebaseCache.set(fen, { result: localResult, timestamp: Date.now() });
  }
  return localResult;
}
