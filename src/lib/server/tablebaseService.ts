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

    const turn = chess.turn(); // 'w' | 'b'

    if (chess.isCheckmate()) {
      return {
        isTablebase: true,
        pieceCount,
        category: 'loss', // The side whose turn it is is checkmated!
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
        dtm: 0,
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

    // 1. Lone King Endgames (K+X vs K)
    // K+Q vs K: Forced win for Queen side
    if (whiteNonKing.length === 1 && whiteNonKing[0] === 'q' && blackNonKing.length === 0) {
      const category = turn === 'w' ? 'win' : 'loss';
      return {
        isTablebase: true,
        pieceCount,
        category,
        dtz: 10,
        dtm: 10,
        source: 'local-endgame-engine',
        humanDescription: category === 'win'
          ? 'Theoretical Win (King and Queen vs Lone King)'
          : 'Theoretical Loss (Lone King vs King and Queen)',
      };
    }
    if (blackNonKing.length === 1 && blackNonKing[0] === 'q' && whiteNonKing.length === 0) {
      const category = turn === 'b' ? 'win' : 'loss';
      return {
        isTablebase: true,
        pieceCount,
        category,
        dtz: 10,
        dtm: 10,
        source: 'local-endgame-engine',
        humanDescription: category === 'win'
          ? 'Theoretical Win (King and Queen vs Lone King)'
          : 'Theoretical Loss (Lone King vs King and Queen)',
      };
    }

    // K+R vs K: Forced win for Rook side
    if (whiteNonKing.length === 1 && whiteNonKing[0] === 'r' && blackNonKing.length === 0) {
      const category = turn === 'w' ? 'win' : 'loss';
      return {
        isTablebase: true,
        pieceCount,
        category,
        dtz: 16,
        dtm: 16,
        source: 'local-endgame-engine',
        humanDescription: category === 'win'
          ? 'Theoretical Win (King and Rook vs Lone King)'
          : 'Theoretical Loss (Lone King vs King and Rook)',
      };
    }
    if (blackNonKing.length === 1 && blackNonKing[0] === 'r' && whiteNonKing.length === 0) {
      const category = turn === 'b' ? 'win' : 'loss';
      return {
        isTablebase: true,
        pieceCount,
        category,
        dtz: 16,
        dtm: 16,
        source: 'local-endgame-engine',
        humanDescription: category === 'win'
          ? 'Theoretical Win (King and Rook vs Lone King)'
          : 'Theoretical Loss (Lone King vs King and Rook)',
      };
    }

    // K+N+N vs K: Two Knights CANNOT force mate against a lone king -> THEORETICAL DRAW!
    if (
      (whiteNonKing.length === 2 && whiteNonKing[0] === 'n' && whiteNonKing[1] === 'n' && blackNonKing.length === 0) ||
      (blackNonKing.length === 2 && blackNonKing[0] === 'n' && blackNonKing[1] === 'n' && whiteNonKing.length === 0)
    ) {
      return {
        isTablebase: true,
        pieceCount,
        category: 'draw',
        dtz: 0,
        dtm: 0,
        source: 'local-endgame-engine',
        humanDescription: 'Theoretical Draw (Two Knights cannot force checkmate against a lone King)',
      };
    }

    // K+B+B vs K: Two Bishops force mate
    if (
      (whiteNonKing.length === 2 && whiteNonKing[0] === 'b' && whiteNonKing[1] === 'b' && blackNonKing.length === 0) ||
      (blackNonKing.length === 2 && blackNonKing[0] === 'b' && blackNonKing[1] === 'b' && whiteNonKing.length === 0)
    ) {
      const sideWithPieces = whiteNonKing.length === 2 ? 'w' : 'b';
      const category = turn === sideWithPieces ? 'win' : 'loss';
      return {
        isTablebase: true,
        pieceCount,
        category,
        dtz: 19,
        dtm: 19,
        source: 'local-endgame-engine',
        humanDescription: category === 'win'
          ? 'Theoretical Win (King and Two Bishops vs Lone King)'
          : 'Theoretical Loss (Lone King vs King and Two Bishops)',
      };
    }

    // K+B+N vs K: Bishop + Knight forces mate (W-maneuver)
    const hasWhiteBN = whiteNonKing.length === 2 && whiteNonKing.includes('b') && whiteNonKing.includes('n');
    const hasBlackBN = blackNonKing.length === 2 && blackNonKing.includes('b') && blackNonKing.includes('n');
    if ((hasWhiteBN && blackNonKing.length === 0) || (hasBlackBN && whiteNonKing.length === 0)) {
      const sideWithPieces = hasWhiteBN ? 'w' : 'b';
      const category = turn === sideWithPieces ? 'win' : 'loss';
      return {
        isTablebase: true,
        pieceCount,
        category,
        dtz: 33,
        dtm: 33,
        source: 'local-endgame-engine',
        humanDescription: category === 'win'
          ? 'Theoretical Win (King, Bishop, and Knight vs Lone King - W Maneuver)'
          : 'Theoretical Loss (Lone King vs King, Bishop, and Knight)',
      };
    }

    // K+P vs K
    if (whiteNonKing.length === 1 && whiteNonKing[0] === 'p' && blackNonKing.length === 0) {
      const category = turn === 'w' ? 'win' : 'loss';
      return {
        isTablebase: true,
        pieceCount,
        category,
        dtz: 9,
        source: 'local-endgame-engine',
        humanDescription: 'Theoretical Endgame (King and Pawn vs King)',
      };
    }
    if (blackNonKing.length === 1 && blackNonKing[0] === 'p' && whiteNonKing.length === 0) {
      const category = turn === 'b' ? 'win' : 'loss';
      return {
        isTablebase: true,
        pieceCount,
        category,
        dtz: 9,
        source: 'local-endgame-engine',
        humanDescription: 'Theoretical Endgame (Lone King vs King and Pawn)',
      };
    }

    // Single minor piece vs King -> Draw (FIDE Rule 5.2.2)
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

    // 2. Symmetric Endgames without pawns:
    // K+R vs K+R: Theoretical Draw
    if (whiteNonKing.length === 1 && whiteNonKing[0] === 'r' && blackNonKing.length === 1 && blackNonKing[0] === 'r') {
      return {
        isTablebase: true,
        pieceCount,
        category: 'draw',
        dtz: 0,
        source: 'local-endgame-engine',
        humanDescription: 'Theoretical Draw (King and Rook vs King and Rook)',
      };
    }

    // K+Q vs K+Q: Theoretical Draw
    if (whiteNonKing.length === 1 && whiteNonKing[0] === 'q' && blackNonKing.length === 1 && blackNonKing[0] === 'q') {
      return {
        isTablebase: true,
        pieceCount,
        category: 'draw',
        dtz: 0,
        source: 'local-endgame-engine',
        humanDescription: 'Theoretical Draw (King and Queen vs King and Queen)',
      };
    }

    // K+R+B vs K+R: Known theoretical draw (Cochrane Defense)
    const whiteKRB = whiteNonKing.length === 2 && whiteNonKing.includes('r') && whiteNonKing.includes('b');
    const blackKRB = blackNonKing.length === 2 && blackNonKing.includes('r') && blackNonKing.includes('b');
    const whiteKR = whiteNonKing.length === 1 && whiteNonKing[0] === 'r';
    const blackKR = blackNonKing.length === 1 && blackNonKing[0] === 'r';
    if ((whiteKRB && blackKR) || (blackKRB && whiteKR)) {
      return {
        isTablebase: true,
        pieceCount,
        category: 'draw',
        dtz: 0,
        source: 'local-endgame-engine',
        humanDescription: 'Theoretical Draw (King, Rook & Bishop vs King & Rook - Cochrane Defense)',
      };
    }

    // Minor vs Minor: K+B vs K+B, K+N vs K+N, K+B vs K+N -> Draw
    if (
      whiteNonKing.length === 1 &&
      (whiteNonKing[0] === 'b' || whiteNonKing[0] === 'n') &&
      blackNonKing.length === 1 &&
      (blackNonKing[0] === 'b' || blackNonKing[0] === 'n')
    ) {
      return {
        isTablebase: true,
        pieceCount,
        category: 'draw',
        dtz: 0,
        source: 'local-endgame-engine',
        humanDescription: 'Theoretical Draw (Minor Piece vs Minor Piece)',
      };
    }

    // General theoretical endgame with decisive piece advantage
    const whiteVal = whiteNonKing.reduce((acc, t) => acc + (t === 'q' ? 9 : t === 'r' ? 5 : t === 'p' ? 1 : 3), 0);
    const blackVal = blackNonKing.reduce((acc, t) => acc + (t === 'q' ? 9 : t === 'r' ? 5 : t === 'p' ? 1 : 3), 0);

    const diff = whiteVal - blackVal;
    // Evaluation from perspective of side to move
    const relativeDiff = turn === 'w' ? diff : -diff;
    const category = relativeDiff >= 4 ? 'win' : relativeDiff <= -4 ? 'loss' : 'draw';

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
          : 'Theoretical Endgame with dynamic equality',
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

  // Primary: Query the Syzygy 7-piece live API
  try {
    const url = `https://tablebase.lichess.ovh/standard?fen=${encodeURIComponent(fen)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ChessPlatform-TablebaseService/1.0 (Syzygy-7Piece)',
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
        if (dtm !== null && dtm !== undefined && dtm !== 0) {
          humanDescription = `Theoretical Win (Checkmate in ${Math.ceil(Math.abs(dtm) / 2)} moves)`;
        } else if (dtz !== null && dtz !== undefined) {
          humanDescription = `Theoretical Win in ${Math.abs(dtz)} moves (Syzygy 7-piece Tablebase)`;
        } else {
          humanDescription = 'Theoretical Win (Syzygy 7-piece Tablebase)';
        }
      } else if (category === 'loss') {
        if (dtm !== null && dtm !== undefined && dtm !== 0) {
          humanDescription = `Theoretical Loss (Opponent checkmates in ${Math.ceil(Math.abs(dtm) / 2)} moves)`;
        } else if (dtz !== null && dtz !== undefined) {
          humanDescription = `Theoretical Loss in ${Math.abs(dtz)} moves with optimal play`;
        } else {
          humanDescription = 'Theoretical Loss (Syzygy 7-piece Tablebase)';
        }
      } else if (category === 'draw') {
        humanDescription = 'Theoretical Tablebase Draw with best play';
      } else if (category === 'cursed-win') {
        humanDescription = 'Winning position, but 50-move rule forces a draw (Cursed Win)';
      } else {
        humanDescription = 'Lost position, but 50-move rule saves a draw (Blessed Loss)';
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
    // remote network unavailable or timed out, proceed to local endgame fallback
  }

  // Graceful local theoretical endgame fallback for offline or network issues
  const localResult = evaluateLocalEndgame(fen);
  if (localResult) {
    tablebaseCache.set(fen, { result: localResult, timestamp: Date.now() });
  }
  return localResult;
}
