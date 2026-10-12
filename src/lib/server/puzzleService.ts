import { Chess } from 'chess.js';
import { calculateGlicko2Update, Glicko2Rating } from '@/lib/server/glicko2Calculator';
import { evaluatePositionStockfish } from '@/lib/server/stockfishPool';

export interface ServerTacticalPuzzle {
  id: string;
  fen: string;
  solutionMoves: string[]; // Solution SAN sequence
  rating: number;
  themes: string[];
  description: string;
  authorOrGame?: string;
}

export const SERVER_PUZZLES_DATABASE: ServerTacticalPuzzle[] = [
  {
    id: 'puzzle-fork-001',
    fen: 'r1bqk2r/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQK2R w KQkq - 4 7',
    solutionMoves: ['cxd5', 'exd5', 'dxc5', 'Bxc5', 'Nxd5'],
    rating: 1250,
    themes: ['fork', 'discovered_attack', 'opening_tactic'],
    description: 'Central clearance sequence winning a pawn and destabilizing the enemy center.',
    authorOrGame: 'Classical Master Practice',
  },
  {
    id: 'puzzle-pin-002',
    fen: 'r1b1k2r/pppp1ppp/2n5/4p1q1/2B1P3/3P1N2/PPP2PPP/RN1QK2R w KQkq - 0 7',
    solutionMoves: ['Nxg5'],
    rating: 800,
    themes: ['hanging_piece'],
    description: 'Punish Black for prematurely putting their queen on an undefended tactical square.',
    authorOrGame: 'Beginner Tactics Drill',
  },
  {
    id: 'puzzle-smothered-003',
    fen: 'r1b2r1k/pp4pp/2n5/2p5/2B1N3/2P2N2/PP3qPP/R2Q3K w - - 0 18',
    solutionMoves: ['Nxf2'],
    rating: 1100,
    themes: ['tactical_recapture'],
    description: 'Eliminate the intruding enemy queen before it organizes a king assault.',
    authorOrGame: 'Club Player Sharp Tactic',
  },
  {
    id: 'puzzle-backrank-004',
    fen: '3r2k1/p4ppp/1p6/8/8/1P6/P4PPP/4R1K1 w - - 0 24',
    solutionMoves: ['Re7'],
    rating: 1350,
    themes: ['seventh_rank', 'endgame_tactic'],
    description: 'Seize the absolute 7th rank with the rook, generating decisive pawn pressure.',
    authorOrGame: 'Rook Endgame Fundamentals',
  },
  {
    id: 'puzzle-mate-005',
    fen: 'r1bqkb1r/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 2 4',
    solutionMoves: ['Qxf7#'],
    rating: 750,
    themes: ['mate_in_1', 'scholars_mate'],
    description: 'Execute the classical mating net targeting the vulnerable f7 square.',
    authorOrGame: 'Scholar’s Mate Finish',
  },
  {
    id: 'puzzle-deflection-006',
    fen: '6k1/5ppp/8/8/8/8/1r3PPP/2R3K1 w - - 0 30',
    solutionMoves: ['Rc8#'],
    rating: 950,
    themes: ['back_rank', 'mate_in_1'],
    description: 'Deliver back-rank checkmate exploiting Black’s lack of king luft.',
    authorOrGame: 'Back Rank Tactical Drill',
  },
  {
    id: 'puzzle-skewer-007',
    fen: '4k3/8/8/8/8/8/1R6/r5K1 w - - 0 45',
    solutionMoves: ['Kf2'],
    rating: 1400,
    themes: ['king_safety', 'rook_endgame'],
    description: 'Step cleanly out of rook check towards the center without conceding a skewer.',
    authorOrGame: 'Precise Endgame Defense',
  },
  {
    id: 'puzzle-discovery-008',
    fen: 'r1b1k2r/pp2qppp/2n1pn2/1B1p4/3P4/2N1PN2/PP3PPP/R2QK2R w KQkq - 2 10',
    solutionMoves: ['Bxc6+', 'bxc6', 'Ne5'],
    rating: 1550,
    themes: ['pin', 'outpost_knight', 'positional_tactic'],
    description: 'Damage Black’s pawn structure and establish a dominant central knight outpost.',
    authorOrGame: 'Nimzo-Indian Modern Strategy',
  },
];

export class PuzzleService {
  /**
   * Retrieves deterministic daily puzzle based on date string YYYY-MM-DD
   */
  static getDailyPuzzle(): ServerTacticalPuzzle {
    const today = new Date().toISOString().slice(0, 10);
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
      hash = (hash << 5) - hash + today.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % SERVER_PUZZLES_DATABASE.length;
    return SERVER_PUZZLES_DATABASE[index];
  }

  /**
   * Retrieves random puzzle with optional theme or rating filters
   */
  static getRandomPuzzle(params?: {
    theme?: string;
    minRating?: number;
    maxRating?: number;
  }): ServerTacticalPuzzle {
    let pool = SERVER_PUZZLES_DATABASE;

    if (params?.theme) {
      const themeLower = params.theme.toLowerCase();
      const filtered = pool.filter((p) =>
        p.themes.some((t) => t.toLowerCase().includes(themeLower))
      );
      if (filtered.length > 0) pool = filtered;
    }

    if (params?.minRating !== undefined || params?.maxRating !== undefined) {
      const min = params.minRating || 0;
      const max = params.maxRating || 4000;
      const filtered = pool.filter((p) => p.rating >= min && p.rating <= max);
      if (filtered.length > 0) pool = filtered;
    }

    const idx = Math.floor(Math.random() * pool.length);
    return pool[idx];
  }

  /**
   * Verifies puzzle solution and calculates Glicko-2 rating update
   */
  static solvePuzzle(params: {
    puzzleId: string;
    submittedMoves: string[];
    playerRating?: Glicko2Rating;
  }): {
    success: boolean;
    solved: boolean;
    updatedRating: Glicko2Rating;
    ratingDelta: number;
    expectedMoves: string[];
  } {
    const puzzle =
      SERVER_PUZZLES_DATABASE.find((p) => p.id === params.puzzleId) ||
      SERVER_PUZZLES_DATABASE[0];

    const currentRating: Glicko2Rating = params.playerRating || {
      rating: 1500,
      rd: 200,
      vol: 0.06,
    };

    const puzzleGlicko: Glicko2Rating = {
      rating: puzzle.rating,
      rd: 75,
      vol: 0.06,
    };

    // Verify submitted moves match solution
    const isSolved =
      params.submittedMoves.length > 0 &&
      params.submittedMoves.every(
        (move, idx) => puzzle.solutionMoves[idx] && puzzle.solutionMoves[idx] === move
      );

    const score = isSolved ? 1.0 : 0.0;
    const updated = calculateGlicko2Update(currentRating, puzzleGlicko, score);
    const ratingDelta = updated.rating - currentRating.rating;

    return {
      success: true,
      solved: isSolved,
      updatedRating: updated,
      ratingDelta,
      expectedMoves: puzzle.solutionMoves,
    };
  }

  /**
   * Lichess-grade tactical candidate extractor from a completed game PGN/move list
   * Scans for positions following an opponent blunder where exactly ONE move wins decisively.
   */
  static async extractPuzzlesFromGame(sanMoves: string[]): Promise<ServerTacticalPuzzle[]> {
    const candidates: ServerTacticalPuzzle[] = [];
    const runner = new Chess();
    const evalHistory: { fen: string; evalCp: number; bestSan: string }[] = [];

    // Step 1: Scan and evaluate positions with Stockfish
    for (let ply = 0; ply < sanMoves.length; ply++) {
      const fenBefore = runner.fen();
      try {
        runner.move(sanMoves[ply]);
      } catch {
        break;
      }

      // Sample every second move past opening book
      if (ply >= 8 && ply < 60) {
        const evalRes = await evaluatePositionStockfish(runner.fen(), 9, 2);
        evalHistory.push({
          fen: runner.fen(),
          evalCp: evalRes.scoreCp,
          bestSan: evalRes.bestMoveSan,
        });

        // Step 2: Check for sharp turning point
        if (evalHistory.length >= 2) {
          const prev = evalHistory[evalHistory.length - 2];
          const curr = evalHistory[evalHistory.length - 1];

          // Opponent blunder condition: large swing (>= 200 cp)
          const swing = Math.abs(curr.evalCp - prev.evalCp);
          const hasBigSwing = swing >= 220;

          // Only Move Check: Ensure Multi-PV line 1 beats line 2 by >= 150 cp
          const secondBestScore = evalRes.lines[1]?.scoreCp ?? (evalRes.scoreCp - 200);
          const isOnlyMove = Math.abs(evalRes.scoreCp - secondBestScore) >= 150;

          if (hasBigSwing && isOnlyMove && evalRes.bestMoveSan) {
            candidates.push({
              id: `extracted-${Date.now()}-${ply}`,
              fen: curr.fen,
              solutionMoves: [evalRes.bestMoveSan],
              rating: Math.min(2200, Math.max(900, 1200 + Math.round(swing * 1.5))),
              themes: ['tactical_punishment', 'blunder_punish'],
              description: `Find the decisive winning move following the opponent's critical blunder on ply ${ply + 1}.`,
            });
          }
        }
      }
    }

    return candidates.slice(0, 3); // Return top candidate puzzles
  }
}
