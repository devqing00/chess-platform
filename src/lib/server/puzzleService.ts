import { Chess } from 'chess.js';
import { calculateGlicko2Update, Glicko2Rating } from './glicko2Calculator';
import { evaluatePositionStockfish } from './stockfishPool';

export interface ServerTacticalPuzzle {
  id: string;
  fen: string;
  solutionMoves: string[]; // Solution SAN sequence
  rating: number;
  themes: string[];
  description: string;
  authorOrGame?: string;
  plays?: number;
  ratingDeviation?: number;
}

export const SERVER_PUZZLES_DATABASE: ServerTacticalPuzzle[] = [
  // --- TIER 1: FUNDAMENTALS & MATES IN 1 (600 - 1000) ---
  {
    id: 'puzzle-1',
    fen: 'r1bqkb1r/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 2 4',
    solutionMoves: ['Qxf7#'],
    rating: 600,
    themes: ['mate_in_1', 'scholars_mate'],
    description: 'Qxf7# attacks the weakest square on the board before Black has castled, delivering immediate checkmate protected by the bishop on c4.',
    authorOrGame: 'Scholar’s Mate Finish',
  },
  {
    id: 'puzzle-2',
    fen: '6k1/5ppp/8/8/8/8/5PPP/1R4K1 w - - 0 1',
    solutionMoves: ['Rb8#'],
    rating: 650,
    themes: ['back_rank', 'mate_in_1'],
    description: 'Rb8# delivers a classic back-rank checkmate because Black’s king is trapped behind its own un-moved pawns on f7, g7, and h7.',
    authorOrGame: 'Back Rank Tactical Drill',
  },
  {
    id: 'puzzle-3',
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2',
    solutionMoves: ['Qh4#'],
    rating: 620,
    themes: ['mate_in_1', 'fools_mate'],
    description: 'Qh4# exploits the fatally opened e1-h4 diagonal created by White pushing f3 and g4 prematurely, delivering checkmate.',
    authorOrGame: 'Fool’s Mate Trap',
  },
  {
    id: 'puzzle-4',
    fen: 'r1b1k2r/pppp1ppp/2n5/4p1q1/2B1P3/3P1N2/PPP2PPP/RN1QK2R w KQkq - 0 7',
    solutionMoves: ['Nxg5'],
    rating: 750,
    themes: ['hanging_piece'],
    description: 'Nxg5 captures Black’s queen for free after Black brought the queen out into the open without tactical defense.',
    authorOrGame: 'Beginner Tactics Drill',
  },
  {
    id: 'puzzle-5',
    fen: 'r3k3/8/8/3N4/8/8/8/4K3 w q - 0 1',
    solutionMoves: ['Nc7+', 'Kd8', 'Nxa8'],
    rating: 800,
    themes: ['fork', 'royal_fork'],
    description: 'Nc7+ delivers check to the King on e8 while attacking the undefended Rook on a8, winning a full rook.',
    authorOrGame: 'Knight Fork Fundamentals',
  },
  {
    id: 'puzzle-6',
    fen: '6k1/5Npp/8/8/8/8/8/4Q1K1 w - - 0 1',
    solutionMoves: ['Qe8#'],
    rating: 850,
    themes: ['smothered_mate', 'mate_in_1'],
    description: 'Qe8# corners Black’s king. The knight on f7 guards the escape squares and seals the victory.',
    authorOrGame: 'Club Player Sharp Tactic',
  },
  {
    id: 'puzzle-7',
    fen: '4k3/8/8/8/8/8/4r3/3R1K2 b - - 0 1',
    solutionMoves: ['Ra2'],
    rating: 900,
    themes: ['endgame_basic', 'rook_retreat'],
    description: 'Ra2 preserves rook activity along the 2nd rank while cutting off the White king from crossing the center.',
    authorOrGame: 'Rook Endgame Essentials',
  },
  {
    id: 'puzzle-8',
    fen: 'r1bqk2r/pppp1ppp/2n5/2b1p3/2B1P1n1/3P1N2/PPP2PPP/RNBQK2R w KQkq - 1 5',
    solutionMoves: ['Bxf7+', 'Kxf7', 'Ng5+'],
    rating: 950,
    themes: ['fork', 'discovered_attack'],
    description: 'Bxf7+ strips the Black King of castling rights, followed by Ng5+ regaining the minor piece with a shattered defense.',
    authorOrGame: 'Fried Liver Tactical Echo',
  },

  // --- TIER 2: CLUB TACTICS, PINS & SKEWERS (1000 - 1500) ---
  {
    id: 'puzzle-9',
    fen: 'r3kb1r/pppq1ppp/2n1p3/8/3P4/2B2B2/PPP2PPP/R2Q1RK1 w kq - 0 1',
    solutionMoves: ['Bxc6', 'Qxc6', 'd5'],
    rating: 1150,
    themes: ['pin', 'deflection'],
    description: 'Bxc6 pins and deflects the Queen from the defense of central squares, allowing a crushing d4-d5 central pawn thrust.',
    authorOrGame: 'Classical Queen Pin',
  },
  {
    id: 'puzzle-10',
    fen: '4q3/8/8/4k3/8/8/8/R5K1 w - - 0 1',
    solutionMoves: ['Re1+', 'Kd6', 'Rxe8'],
    rating: 1200,
    themes: ['skewer', 'absolute_pin'],
    description: 'Re1+ skewers the Black King along the open e-file, forcing the King to move and winning the Queen on e8.',
    authorOrGame: 'King & Queen Skewer',
  },
  {
    id: 'puzzle-11',
    fen: 'r1b2rk1/pp3ppp/8/8/8/2B2Q2/PPP2PPP/R4RK1 w - - 0 1',
    solutionMoves: ['Qg3', 'g6', 'Qe5'],
    rating: 1250,
    themes: ['battery', 'mating_net'],
    description: 'Qg3 creates an immediate threat on g7. After Black plays g6, Qe5 threatens unstoppable checkmate on g7 or h8.',
    authorOrGame: 'Queen & Bishop Battery Drill',
  },
  {
    id: 'puzzle-12',
    fen: 'r1b1k2r/pppp1ppp/8/4N3/1bB1n3/2N5/PPPP1PPP/R1BQK2R w KQkq - 0 6',
    solutionMoves: ['Bxf7+', 'Ke7', 'Nd5+'],
    rating: 1300,
    themes: ['discovered_attack', 'double_attack'],
    description: 'Bxf7+! exposes Black’s uncastled King to discovered tactics, followed by Nd5+ picking up the loose bishop on b4.',
    authorOrGame: 'Open Game Tactics',
  },
  {
    id: 'puzzle-13',
    fen: 'r1b1k2r/pp1p1ppp/2n1p3/q7/2PP4/2N2N2/PP3PPP/R2QKB1R w KQkq - 0 9',
    solutionMoves: ['a3', 'Qb6', 'c5'],
    rating: 1350,
    themes: ['trapped_piece'],
    description: 'a3 and c5 restrict all retreat squares for the Black Queen, suffocating it on the queenside.',
    authorOrGame: 'Early Queen Trap',
  },
  {
    id: 'puzzle-14',
    fen: 'r1b1kb1r/pppp1ppp/2n5/4P3/1qB1n3/5N2/PPP2PPP/RNBQ1RK1 w kq - 1 7',
    solutionMoves: ['Qd5', 'Qe7', 'Qxe4'],
    rating: 1400,
    themes: ['double_attack', 'central_dominance'],
    description: 'Qd5 double-attacks the hanging knight on e4 while threatening instant checkmate with Qxf7#.',
    authorOrGame: 'Scotch Gambit Precision',
  },
  {
    id: 'puzzle-15',
    fen: 'r2q1rk1/1pp2ppp/p1np1n2/4p3/B3P1b1/2PP1N2/PP1N1PPP/R2Q1RK1 w - - 0 10',
    solutionMoves: ['h3', 'Bh5', 'g4', 'Bg6'],
    rating: 1450,
    themes: ['pin_break', 'kingside_expansion'],
    description: 'h3 and g4 break the pin on the f3-knight, freeing White’s pieces to coordinate toward the center.',
    authorOrGame: 'Italian Game Pin Defense',
  },

  // --- TIER 3: ADVANCED & MASTER TACTICAL THEMES (1500 - 2000) ---
  {
    id: 'puzzle-16',
    fen: 'r1bq1rk1/pppn1ppp/4p3/3pP3/8/3BPN2/PPP2PPP/R1BQK2R w KQ - 0 1',
    solutionMoves: ['Bxh7+', 'Kxh7', 'Ng5+'],
    rating: 1550,
    themes: ['greek_gift', 'sacrifice'],
    description: 'Bxh7+! The thematic Greek Gift sacrifice strips away Black’s defensive pawn cover and opens up devastating attack lines for Ng5+ and Qh5.',
    authorOrGame: 'Classical Greek Gift',
  },
  {
    id: 'puzzle-17',
    fen: '2r3k1/5ppp/p1q5/1p1p4/3Q4/1P3P2/P1P3PP/4R1K1 w - - 0 1',
    solutionMoves: ['Qxd5', 'Qxd5', 'Re8#'],
    rating: 1600,
    themes: ['deflection', 'queen_sacrifice'],
    description: 'Qxd5! deflects the defending Black Queen away from the 8th rank. If 1...Qxd5, 2.Re8# is an immediate back-rank mate!',
    authorOrGame: 'Grandmaster Deflection Net',
  },
  {
    id: 'puzzle-18',
    fen: '5rk1/1p3pp1/8/8/8/5N2/1r4PK/R6R w - - 0 1',
    solutionMoves: ['Kg3', 'Rb6', 'Ra8'],
    rating: 1650,
    themes: ['anastasia_mate', 'mating_net'],
    description: 'Kg3 frees the rook along the h-file while the Knight on f3 controls the vital escape squares g8 and e7, netting the king.',
    authorOrGame: 'Anastasia’s Mate Net',
  },
  {
    id: 'puzzle-19',
    fen: '4kb1r/p2rqppp/5n2/1B2p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 14',
    solutionMoves: ['Bxd7+', 'Nxd7', 'Qb8+', 'Nxb8', 'Rd8#'],
    rating: 1700,
    themes: ['queen_sacrifice', 'opera_game'],
    description: 'Paul Morphy’s legendary finish: 1.Bxd7+ Nxd7 2.Qb8+!! sacrifices the queen to deflect the knight, allowing 3.Rd8# checkmate!',
    authorOrGame: 'Paul Morphy - Opera Game (1858)',
  },
  {
    id: 'puzzle-20',
    fen: 'r2q1rk1/pp1b1ppp/2n1p3/3pP3/3P1P2/3B1N2/PP1Q2PP/R4RK1 w - - 0 1',
    solutionMoves: ['Bxh7+', 'Kxh7', 'Ng5+'],
    rating: 1750,
    themes: ['clearance', 'kingside_assault'],
    description: 'Bxh7+ clears the f3-g5 square for the knight while shattering Black’s king sanctuary.',
    authorOrGame: 'Modern French Defense Tactic',
  },
  {
    id: 'puzzle-21',
    fen: '2kr3r/ppp2ppp/2n5/8/1b6/2N5/PPP2PPP/R1B1R1K1 w - - 0 1',
    solutionMoves: ['Bg5', 'f6', 'Bf4'],
    rating: 1800,
    themes: ['bodens_mate', 'bishop_pair'],
    description: 'Crossing bishop diagonals slice through Black’s castled king, cutting off all flight squares along the a6-f1 and h2-b8 axes.',
    authorOrGame: 'Samuel Boden Classic (1853)',
  },
  {
    id: 'puzzle-22',
    fen: 'r1bq1rk1/pp3ppp/2n1p3/8/8/2B2N2/PPB2PPP/R2Q1RK1 w - - 0 1',
    solutionMoves: ['Bxh7+', 'Kxh7', 'Ng5+', 'Kg8', 'Qh5'],
    rating: 1900,
    themes: ['double_bishop_sacrifice', 'lasker_attack'],
    description: 'Emanuel Lasker’s legendary double-bishop demolition: sacrifice both bishops to completely unmask the opposing king.',
    authorOrGame: 'Emanuel Lasker - Bauer (1889)',
  },
  {
    id: 'puzzle-23',
    fen: 'r1b2rk1/2q1bppp/p2pp3/1p6/4PP2/1BN5/PPP1Q1PP/R4RK1 w - - 0 1',
    solutionMoves: ['f5', 'exf5', 'Nd5'],
    rating: 1950,
    themes: ['pawn_break', 'outpost_seizure'],
    description: 'f5! breaks Black’s defensive pawn chain and secures the supreme d5 outpost for the white knight.',
    authorOrGame: 'Sicilian Scheveningen Assault',
  },

  // --- TIER 4: GRANDMASTER ENDGAME & COMBINATIONAL PUZZLES (2000 - 2500+) ---
  {
    id: 'puzzle-24',
    fen: '8/5P1k/8/8/8/8/8/6K1 w - - 0 1',
    solutionMoves: ['f8=N+'],
    rating: 2050,
    themes: ['underpromotion', 'endgame_tactic'],
    description: '1.f8=N+! Underpromoting to a Knight delivers check with tempo and prevents stalemate or rook-queen counterplay.',
    authorOrGame: 'Endgame Underpromotion Study',
  },
  {
    id: 'puzzle-25',
    fen: 'r4rk1/ppp2ppp/2n5/3q4/3P4/2N2N2/PPP2PPP/R2Q1RK1 w - - 0 1',
    solutionMoves: ['Nxd5', 'Rfd8', 'Nc7'],
    rating: 2150,
    themes: ['zwischenzug', 'intermezzo'],
    description: 'Before addressing Black’s counter-threat, White injects an in-between move with devastating tactical impact.',
    authorOrGame: 'Grandmaster Intermezzo Masterpiece',
  },
  {
    id: 'puzzle-26',
    fen: '8/1k6/8/8/8/8/1K6/1R6 w - - 0 1',
    solutionMoves: ['Kc2+'],
    rating: 2200,
    themes: ['discovered_check', 'king_charge'],
    description: 'Kc2+ steps out of the discovered line of fire, unveiling an attack on Black’s monarch and winning with tempo.',
    authorOrGame: 'King Discovery Principle',
  },
  {
    id: 'puzzle-27',
    fen: '8/2k5/8/8/8/8/1K1R4/8 w - - 0 1',
    solutionMoves: ['Rd4'],
    rating: 2250,
    themes: ['lucena_building_bridge', 'rook_endgame'],
    description: 'Rd4! initiates the Lucena bridge-building technique, shielding the king on the 4th rank to force pawn promotion.',
    authorOrGame: 'Lucena Position Technique (1497)',
  },
  {
    id: 'puzzle-28',
    fen: '8/8/8/8/4k3/8/4K3/8 w - - 0 1',
    solutionMoves: ['Kd2', 'Kd4', 'Ke2'],
    rating: 2300,
    themes: ['opposition', 'triangulation', 'endgame'],
    description: 'Seizing the horizontal and distant opposition forces the enemy king to cede key infiltration squares.',
    authorOrGame: 'Distant Opposition Masterclass',
  },
  {
    id: 'puzzle-29',
    fen: '8/p7/1p6/8/8/1P6/P7/k1K5 w - - 0 1',
    solutionMoves: ['a4', 'a5', 'b4'],
    rating: 2400,
    themes: ['zugzwang', 'pawn_breakthrough'],
    description: 'a4! locks Black in pure Zugzwang: any legal pawn push irrevocably collapses the queenside pawn barricade.',
    authorOrGame: 'Reti Endgame Study',
  },
  {
    id: 'puzzle-30',
    fen: 'r1b1k2r/ppppqppp/2n5/4n3/1bP2B2/5N2/PP1NPPPP/R2QKB1R w KQkq - 0 7',
    solutionMoves: ['Nxe5', 'Bxd2+', 'Qxd2', 'Nxe5'],
    rating: 1520,
    themes: ['exchange_tactic', 'central_tension'],
    description: 'Nxe5 resolves the tactical tension in the center and defuses Black’s pinned bishop trap on b4.',
    authorOrGame: 'Budapest Gambit Refutation',
  },
];

export class PuzzleService {
  private static livePuzzleCache: Map<string, ServerTacticalPuzzle> = new Map();
  private static lastLichessDailyFetch: number = 0;
  private static cachedDailyPuzzle: ServerTacticalPuzzle | null = null;

  /**
   * Fetches the official daily puzzle from Lichess Open API
   * Endpoint: https://lichess.org/api/puzzle/daily
   */
  static async fetchLiveLichessDailyPuzzle(): Promise<ServerTacticalPuzzle | null> {
    const now = Date.now();
    // Cache daily puzzle in memory for 1 hour
    if (this.cachedDailyPuzzle && now - this.lastLichessDailyFetch < 3600000) {
      return this.cachedDailyPuzzle;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch('https://lichess.org/api/puzzle/daily', {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) return null;
      const data = await res.json();
      if (!data?.puzzle || !data?.game) return null;

      // Parse game moves up to the initial puzzle ply using chess.js
      const pgn = data.game.pgn;
      const initialPly = data.puzzle.initialPly || 0;
      const sim = new Chess();

      if (pgn) {
        try {
          sim.loadPgn(pgn);
          // Rewind back to initial puzzle ply
          const history = sim.history({ verbose: true });
          const setupChess = new Chess();
          for (let i = 0; i < Math.min(initialPly, history.length); i++) {
            setupChess.move(history[i]);
          }

          // Translate UCI solution moves into SAN
          const solutionSan: string[] = [];
          for (const uci of data.puzzle.solution || []) {
            if (uci.length >= 4) {
              const from = uci.slice(0, 2);
              const to = uci.slice(2, 4);
              const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined;
              const m = setupChess.move({ from, to, promotion });
              if (m) solutionSan.push(m.san);
            }
          }

          if (solutionSan.length > 0) {
            const dailyPuzzle: ServerTacticalPuzzle = {
              id: `lichess-daily-${data.puzzle.id}`,
              fen: setupChess.fen(),
              solutionMoves: solutionSan,
              rating: data.puzzle.rating || 1500,
              themes: data.puzzle.themes || ['tactics'],
              description: `Find the best tactical sequence! Official community-rated puzzle #${data.puzzle.id}.`,
              authorOrGame: `Lichess Master Puzzle #${data.puzzle.id}`,
              plays: data.puzzle.plays,
            };

            this.cachedDailyPuzzle = dailyPuzzle;
            this.lastLichessDailyFetch = now;
            this.livePuzzleCache.set(dailyPuzzle.id, dailyPuzzle);
            return dailyPuzzle;
          }
        } catch (err) {
          console.warn('[PuzzleService] Error parsing Lichess daily puzzle PGN:', err);
        }
      }
    } catch {
      // Network failure or rate limit — gracefully fallback to local bank
    }

    return null;
  }

  /**
   * Retrieves deterministic daily puzzle based on date string YYYY-MM-DD
   */
  static getDailyPuzzle(): ServerTacticalPuzzle {
    if (this.cachedDailyPuzzle) return this.cachedDailyPuzzle;

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
   * Retrieves multiple randomized tactical puzzles matching criteria
   */
  static getRandomPuzzles(params?: {
    count?: number;
    theme?: string;
    minRating?: number;
    maxRating?: number;
  }): ServerTacticalPuzzle[] {
    let pool = [...SERVER_PUZZLES_DATABASE, ...Array.from(this.livePuzzleCache.values())];

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

    const count = Math.min(50, Math.max(1, params?.count || 10));
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, count);
  }

  /**
   * Retrieves random puzzle with optional theme or rating filters
   */
  static getRandomPuzzle(params?: {
    theme?: string;
    minRating?: number;
    maxRating?: number;
  }): ServerTacticalPuzzle {
    const list = this.getRandomPuzzles({ ...params, count: 1 });
    return list[0] || SERVER_PUZZLES_DATABASE[0];
  }

  /**
   * Validates submitted puzzle moves and computes official Glicko-2 rating adjustment
   */
  static solvePuzzle(params: {
    puzzleId: string;
    submittedMoves: string[];
    playerRating?: Glicko2Rating;
    userRating?: Glicko2Rating;
  }) {
    return this.verifyPuzzleSolution({
      puzzleId: params.puzzleId,
      submittedMoves: params.submittedMoves,
      userRating: params.playerRating || params.userRating,
    });
  }

  static verifyPuzzleSolution(params: {
    puzzleId: string;
    submittedMoves: string[];
    userRating?: Glicko2Rating;
  }): {
    success: boolean;
    solved: boolean;
    updatedRating: Glicko2Rating;
    ratingDelta: number;
    expectedMoves: string[];
  } {
    const allPuzzles = [...SERVER_PUZZLES_DATABASE, ...Array.from(this.livePuzzleCache.values())];
    const puzzle = allPuzzles.find((p) => p.id === params.puzzleId);

    if (!puzzle) {
      const fallbackRating: Glicko2Rating = params.userRating || {
        rating: 1500,
        rd: 200,
        vol: 0.06,
      };
      return {
        success: false,
        solved: false,
        updatedRating: fallbackRating,
        ratingDelta: 0,
        expectedMoves: [],
      };
    }

    const currentRating: Glicko2Rating = params.userRating || {
      rating: 1500,
      rd: 200,
      vol: 0.06,
    };

    const puzzleGlicko: Glicko2Rating = {
      rating: puzzle.rating,
      rd: puzzle.ratingDeviation || 75,
      vol: 0.06,
    };

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
   */
  static async extractPuzzlesFromGame(sanMoves: string[]): Promise<ServerTacticalPuzzle[]> {
    const candidates: ServerTacticalPuzzle[] = [];
    const runner = new Chess();
    const evalHistory: { fen: string; evalCp: number; bestSan: string }[] = [];

    for (let ply = 0; ply < sanMoves.length; ply++) {
      try {
        runner.move(sanMoves[ply]);
      } catch {
        break;
      }

      if (ply >= 8 && ply < 60) {
        const evalRes = await evaluatePositionStockfish(runner.fen(), 9, 2);
        evalHistory.push({
          fen: runner.fen(),
          evalCp: evalRes.scoreCp,
          bestSan: evalRes.bestMoveSan,
        });

        if (evalHistory.length >= 2) {
          const prev = evalHistory[evalHistory.length - 2];
          const curr = evalHistory[evalHistory.length - 1];

          const swing = Math.abs(curr.evalCp - prev.evalCp);
          const hasBigSwing = swing >= 220;

          const secondBestScore = evalRes.lines[1]?.scoreCp ?? (evalRes.scoreCp - 200);
          const isOnlyMove = Math.abs(evalRes.scoreCp - secondBestScore) >= 150;

          if (hasBigSwing && isOnlyMove && evalRes.bestMoveSan) {
            candidates.push({
              id: `extracted-${Date.now()}-${ply}`,
              fen: curr.fen,
              solutionMoves: [evalRes.bestMoveSan],
              rating: Math.min(2200, Math.max(900, 1200 + Math.round(swing * 1.5))),
              themes: ['tactical_punishment', 'blunder_punish'],
              description: `Find the decisive winning move following the critical blunder on ply ${ply + 1}.`,
            });
          }
        }
      }
    }

    return candidates.slice(0, 3);
  }
}
