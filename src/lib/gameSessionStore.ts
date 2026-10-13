import {
  GameSession,
  GameReviewReport,
  MoveRecord,
  GamePlayer,
  ClassificationTallies,
  EvalTimelinePoint,
  KeyMoment,
  ChessVariant,
  GameResultDetails,
} from '@/types/chess';
import { ChessEvaluator } from './chessEngine';
import { CHESS_BOTS } from './botsData';

const STORAGE_KEY = 'chess_platform_sessions_v1';

// Initial demonstration finished game for instant testing of Game Review
const DEMO_FINISHED_GAME_ID = 'demo-game-masterpiece';

function createEmptyTallies(): ClassificationTallies {
  return {
    brilliant: 0,
    great: 0,
    best: 0,
    excellent: 0,
    good: 0,
    book: 0,
    inaccuracy: 0,
    mistake: 0,
    miss: 0,
    blunder: 0,
  };
}

/**
 * Computes a full GameReviewReport from move history
 */
export function generateGameReviewReport(
  gameId: string,
  whitePlayer: GamePlayer,
  blackPlayer: GamePlayer,
  moves: MoveRecord[]
): GameReviewReport {
  // If moves were imported without classification or eval, automatically run ChessEvaluator.analyzeGameHistory!
  let analyzedMoves = moves;
  const needsAnalysis =
    moves.length > 0 &&
    moves.some((m) => !m.classification || (m.evalBefore === 0 && m.evalAfter === 0));

  if (needsAnalysis) {
    analyzedMoves = ChessEvaluator.analyzeGameHistory(moves);
  }

  const whiteLosses: number[] = [];
  const blackLosses: number[] = [];
  const whiteTallies = createEmptyTallies();
  const blackTallies = createEmptyTallies();
  const evalTimeline: EvalTimelinePoint[] = [];
  const keyMoments: KeyMoment[] = [];

  let blunderPuzzle: GameReviewReport['blunderRetryPuzzle'] | undefined = undefined;

  analyzedMoves.forEach((m, idx) => {
    const isWhite = idx % 2 === 0;
    const moveNumber = Math.floor(idx / 2) + 1;

    const wpBeforeWhite = ChessEvaluator.centipawnsToWinProbability(m.evalBefore);
    const wpAfterWhite = ChessEvaluator.centipawnsToWinProbability(m.evalAfter);
    const wpBefore = isWhite ? wpBeforeWhite : 100 - wpBeforeWhite;
    const wpAfter = isWhite ? wpAfterWhite : 100 - wpAfterWhite;
    const winProbLoss = Math.max(0, wpBefore - wpAfter);

    if (isWhite) {
      whiteLosses.push(winProbLoss);
      if (m.classification && m.classification in whiteTallies) {
        whiteTallies[m.classification as keyof ClassificationTallies]++;
      }
    } else {
      blackLosses.push(winProbLoss);
      if (m.classification && m.classification in blackTallies) {
        blackTallies[m.classification as keyof ClassificationTallies]++;
      }
    }

    evalTimeline.push({
      ply: idx,
      moveNumber,
      isWhite,
      score: m.evalAfter,
      classification: m.classification,
    });

    if (
      m.classification === 'brilliant' ||
      m.classification === 'great' ||
      m.classification === 'blunder' ||
      m.classification === 'mistake' ||
      m.classification === 'miss'
    ) {
      keyMoments.push({
        moveIndex: idx,
        turnNumber: moveNumber,
        turnColor: isWhite ? 'w' : 'b',
        moveSan: m.san,
        bestMoveSan: m.bestMoveSan || m.san,
        classification: m.classification,
        evalBefore: m.evalBefore,
        evalAfter: m.evalAfter,
        coachComment: m.coachComment || '',
        isMistake: m.classification === 'blunder' || m.classification === 'mistake',
      });
    }

    // Set first critical blunder/mistake for interactive retry puzzle
    if (!blunderPuzzle && (m.classification === 'blunder' || m.classification === 'mistake') && m.bestMoveSan) {
      blunderPuzzle = {
        ply: idx,
        fen: m.fenBefore,
        blunderedMoveSan: m.san,
        solutionSan: m.bestMoveSan,
        explanation: m.coachComment || `Instead of ${m.san}, ${m.bestMoveSan} was Stockfish's top recommendation.`,
      };
    }
  });

  const whiteAccuracy = ChessEvaluator.calculateCapsAccuracy(whiteLosses);
  const blackAccuracy = ChessEvaluator.calculateCapsAccuracy(blackLosses);

  const summaryComment =
    whiteAccuracy > blackAccuracy
      ? `You played with ${whiteAccuracy}% accuracy! You controlled key imbalances and capitalized on decisive moments.`
      : `Competitive contest (${whiteAccuracy}% vs ${blackAccuracy}%). Review the key tactical moments to explore sharper alternatives!`;

  return {
    id: `review-${gameId}`,
    gameId,
    whitePlayer,
    blackPlayer,
    whiteAccuracy,
    blackAccuracy,
    blunderRetryPuzzle: blunderPuzzle,
    tallies: {
      white: whiteTallies,
      black: blackTallies,
    },
    evalTimeline,
    keyMoments,
    moves: analyzedMoves,
    summaryComment,
  };
}

export class GameSessionStore {
  private static getStoredSessions(): Record<string, GameSession> {
    if (typeof window === 'undefined') return {};
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  private static saveSessions(sessions: Record<string, GameSession>) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch {
      // Storage full or unavailable
    }
  }

  public static getSession(id: string): GameSession | null {
    const sessions = this.getStoredSessions();
    if (sessions[id]) return sessions[id];

    // Return demo game if requested or fallback
    if (id === DEMO_FINISHED_GAME_ID) {
      return this.createDemoGameSession();
    }
    return null;
  }

  public static saveSession(session: GameSession): void {
    const sessions = this.getStoredSessions();
    sessions[session.id] = { ...session, updatedAt: Date.now() };
    this.saveSessions(sessions);
  }

  public static createSession(
    whitePlayer: GamePlayer,
    blackPlayer: GamePlayer,
    timeControl: number,
    variant: ChessVariant = 'standard',
    startingFen?: string
  ): GameSession {
    const id = `game-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const session: GameSession = {
      id,
      whitePlayer,
      blackPlayer,
      timeControl,
      variant,
      moves: [],
      fen: startingFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      isGameOver: false,
      gameResult: null,
      resultDetails: null,
      reviewReport: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.saveSession(session);
    return session;
  }

  public static completeGame(
    id: string,
    moves: MoveRecord[],
    gameResult: string,
    resultDetails: GameResultDetails
  ): GameReviewReport {
    let session = this.getSession(id);
    if (!session) {
      const defaultWhite: GamePlayer = { id: 'p1', name: 'You', rating: 1250, avatar: '🧑‍💻' };
      const defaultBlack: GamePlayer = { id: 'p2', name: 'Martin (Bot)', rating: 250, avatar: '🤖', isBot: true };
      session = this.createSession(defaultWhite, defaultBlack, 600);
    }

    const report = generateGameReviewReport(id, session.whitePlayer, session.blackPlayer, moves);

    session.moves = moves;
    session.isGameOver = true;
    session.gameResult = gameResult;
    session.resultDetails = resultDetails;
    session.reviewReport = report;
    session.updatedAt = Date.now();

    this.saveSession(session);
    return report;
  }

  public static listRecentSessions(): GameSession[] {
    const sessions = Object.values(this.getStoredSessions());
    if (sessions.length === 0) {
      const demo = this.createDemoGameSession();
      return [demo];
    }
    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Demo Game that matches Screenshot 1, 2, 3, 4, 5 with Brilliant moves and checkmate
   */
  public static createDemoGameSession(): GameSession {
    const whitePlayer: GamePlayer = {
      id: 'lmnk_06',
      name: 'lmnk_06',
      rating: 1996,
      avatar: '🧑‍💻',
      country: 'CH',
    };

    const blackPlayer: GamePlayer = {
      id: 'arkadon',
      name: 'arkadon...',
      rating: 1725,
      avatar: '♟️',
      country: 'ES',
    };

    // Pre-calculated moves sequence featuring brilliant moves matching Image 2 & 5
    const demoMoves: MoveRecord[] = [
      { san: 'e4', from: 'e2', to: 'e4', fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', evalBefore: 20, evalAfter: 25, classification: 'book' },
      { san: 'd5', from: 'd7', to: 'd5', fenBefore: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', fenAfter: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', evalBefore: -25, evalAfter: -20, classification: 'book' },
      { san: 'exd5', from: 'e4', to: 'd5', captured: 'p', fenBefore: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', fenAfter: 'rnbqkbnr/ppp1pppp/8/3P4/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2', evalBefore: 20, evalAfter: 35, classification: 'best' },
      { san: 'Qxd5', from: 'd8', to: 'd5', captured: 'p', fenBefore: 'rnbqkbnr/ppp1pppp/8/3P4/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2', fenAfter: 'rnb1kbnr/ppp1pppp/8/3q4/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3', evalBefore: -35, evalAfter: -40, classification: 'good' },
      { san: 'Nc3', from: 'b1', to: 'c3', fenBefore: 'rnb1kbnr/ppp1pppp/8/3q4/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3', fenAfter: 'rnb1kbnr/ppp1pppp/8/3q4/8/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 3', evalBefore: 40, evalAfter: 65, classification: 'best' },
      { san: 'Qd7', from: 'd5', to: 'd7', fenBefore: 'rnb1kbnr/ppp1pppp/8/3q4/8/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 3', fenAfter: 'rnb1kbnr/pppqpppp/8/8/8/2N5/PPPP1PPP/R1BQKBNR w KQkq - 2 4', evalBefore: -65, evalAfter: -95, classification: 'inaccuracy' },
      { san: 'Bb5', from: 'f1', to: 'b5', fenBefore: 'rnb1kbnr/pppqpppp/8/8/8/2N5/PPPP1PPP/R1BQKBNR w KQkq - 2 4', fenAfter: 'rnb1kbnr/pppqpppp/8/1B6/8/2N5/PPPP1PPP/R1BQK1NR b KQkq - 3 4', evalBefore: 95, evalAfter: 120, classification: 'best' },
      { san: 'c6', from: 'c7', to: 'c6', fenBefore: 'rnb1kbnr/pppqpppp/8/1B6/8/2N5/PPPP1PPP/R1BQK1NR b KQkq - 3 4', fenAfter: 'rnb1kbnr/pp1qpppp/2p5/1B6/8/2N5/PPPP1PPP/R1BQK1NR w KQkq - 0 5', evalBefore: -120, evalAfter: -110, classification: 'good' },
      { san: 'Bc4', from: 'b5', to: 'c4', fenBefore: 'rnb1kbnr/pp1qpppp/2p5/1B6/8/2N5/PPPP1PPP/R1BQK1NR w KQkq - 0 5', fenAfter: 'rnb1kbnr/pp1qpppp/2p5/8/2B5/2N5/PPPP1PPP/R1BQK1NR b KQkq - 1 5', evalBefore: 110, evalAfter: 115, classification: 'best' },
      { san: 'e6', from: 'e7', to: 'e6', fenBefore: 'rnb1kbnr/pp1qpppp/2p5/8/2B5/2N5/PPPP1PPP/R1BQK1NR b KQkq - 1 5', fenAfter: 'rnb1kbnr/pp1q1ppp/2p1p3/8/2B5/2N5/PPPP1PPP/R1BQK1NR w KQkq - 0 6', evalBefore: -115, evalAfter: -120, classification: 'good' },
      { san: 'Qf3', from: 'd1', to: 'f3', fenBefore: 'rnb1kbnr/pp1q1ppp/2p1p3/8/2B5/2N5/PPPP1PPP/R1BQK1NR w KQkq - 0 6', fenAfter: 'rnb1kbnr/pp1q1ppp/2p1p3/8/2B5/2N2Q2/PPPP1PPP/R1B1K1NR b KQkq - 1 6', evalBefore: 120, evalAfter: 130, classification: 'excellent' },
      { san: 'a5', from: 'a7', to: 'a5', fenBefore: 'rnb1kbnr/pp1q1ppp/2p1p3/8/2B5/2N2Q2/PPPP1PPP/R1B1K1NR b KQkq - 1 6', fenAfter: 'rnb1kbnr/1p1q1ppp/2p1p3/p7/2B5/2N2Q2/PPPP1PPP/R1B1K1NR w KQkq - 0 7', evalBefore: -130, evalAfter: -160, classification: 'inaccuracy' },
      { san: 'd3', from: 'd2', to: 'd3', fenBefore: 'rnb1kbnr/1p1q1ppp/2p1p3/p7/2B5/2N2Q2/PPPP1PPP/R1B1K1NR w KQkq - 0 7', fenAfter: 'rnb1kbnr/1p1q1ppp/2p1p3/p7/2B5/2NP1Q2/PPP2PPP/R1B1K1NR b KQkq - 0 7', evalBefore: 160, evalAfter: 165, classification: 'best' },
      { san: 'b5', from: 'b7', to: 'b5', fenBefore: 'rnb1kbnr/1p1q1ppp/2p1p3/p7/2B5/2NP1Q2/PPP2PPP/R1B1K1NR b KQkq - 0 7', fenAfter: 'rnb1kbnr/3q1ppp/2p1p3/pp6/2B5/2NP1Q2/PPP2PPP/R1B1K1NR w KQkq - 0 8', evalBefore: -165, evalAfter: -170, classification: 'good' },
      {
        san: 'Bxb5',
        from: 'c4',
        to: 'b5',
        captured: 'p',
        fenBefore: 'rnb1kbnr/3q1ppp/2p1p3/pp6/2B5/2NP1Q2/PPP2PPP/R1B1K1NR w KQkq - 0 8',
        fenAfter: 'rnb1kbnr/3q1ppp/2p1p3/pB6/8/2NP1Q2/PPP2PPP/R1B1K1NR b KQkq - 0 8',
        evalBefore: 170,
        evalAfter: 280,
        classification: 'brilliant',
        coachComment: 'Bxb5 is brilliant! You sacrificed the bishop to rip open the queenside and launch an unstoppable attack!',
        bestMoveSan: 'Bxb5',
      },
      {
        san: 'cxb5',
        from: 'c6',
        to: 'b5',
        captured: 'b',
        fenBefore: 'rnb1kbnr/3q1ppp/2p1p3/pB6/8/2NP1Q2/PPP2PPP/R1B1K1NR b KQkq - 0 8',
        fenAfter: 'rnb1kbnr/3q1ppp/4p3/pp6/8/2NP1Q2/PPP2PPP/R1B1K1NR w KQkq - 0 9',
        evalBefore: -280,
        evalAfter: -340,
        classification: 'good',
      },
      {
        san: 'Qxa8',
        from: 'f3',
        to: 'a8',
        captured: 'r',
        fenBefore: 'rnb1kbnr/3q1ppp/4p3/pp6/8/2NP1Q2/PPP2PPP/R1B1K1NR w KQkq - 0 9',
        fenAfter: 'Qnb1kbnr/3q1ppp/4p3/pp6/8/2NP4/PPP2PPP/R1B1K1NR b KQk - 0 9',
        evalBefore: 340,
        evalAfter: 350,
        classification: 'best',
      },
      {
        san: 'Qc7',
        from: 'd7',
        to: 'c7',
        fenBefore: 'Qnb1kbnr/3q1ppp/4p3/pp6/8/2NP4/PPP2PPP/R1B1K1NR b KQk - 0 9',
        fenAfter: 'Qnb1kbnr/2q2ppp/4p3/pp6/8/2NP4/PPP2PPP/R1B1K1NR w KQk - 1 10',
        evalBefore: -350,
        evalAfter: -360,
        classification: 'best',
      },
      {
        san: 'Nxb5',
        from: 'c3',
        to: 'b5',
        captured: 'p',
        fenBefore: 'Qnb1kbnr/2q2ppp/4p3/pp6/8/2NP4/PPP2PPP/R1B1K1NR w KQk - 1 10',
        fenAfter: 'Qnb1kbnr/2q2ppp/4p3/pN6/8/3P4/PPP2PPP/R1B1K1NR b KQk - 0 10',
        evalBefore: 360,
        evalAfter: 375,
        classification: 'best',
      },
      {
        san: 'Bb7',
        from: 'c8',
        to: 'b7',
        fenBefore: 'Qnb1kbnr/2q2ppp/4p3/pN6/8/3P4/PPP2PPP/R1B1K1NR b KQk - 0 10',
        fenAfter: 'Qn2kbnr/1bq2ppp/4p3/pN6/8/3P4/PPP2PPP/R1B1K1NR w KQk - 1 11',
        evalBefore: -375,
        evalAfter: -490,
        classification: 'mistake',
      },
      {
        san: 'Nxc7+',
        from: 'b5',
        to: 'c7',
        captured: 'q',
        fenBefore: 'Qn2kbnr/1bq2ppp/4p3/pN6/8/3P4/PPP2PPP/R1B1K1NR w KQk - 1 11',
        fenAfter: 'Qn2kbnr/1bN2ppp/4p3/8/8/3P4/PPP2PPP/R1B1K1NR b KQk - 0 11',
        evalBefore: 490,
        evalAfter: 550,
        classification: 'great',
        coachComment: 'Nxc7+ is great! You win the queen with check, shattering black resistance!',
        bestMoveSan: 'Nxc7+',
        isCheck: true,
      },
      {
        san: 'Kd7',
        from: 'e8',
        to: 'd7',
        fenBefore: 'Qn2kbnr/1bN2ppp/4p3/8/8/3P4/PPP2PPP/R1B1K1NR b KQk - 0 11',
        fenAfter: 'Qn3bnr/1bNk1ppp/4p3/8/8/3P4/PPP2PPP/R1B1K1NR w KQ - 1 12',
        evalBefore: -550,
        evalAfter: -570,
        classification: 'best',
      },
      {
        san: 'Qe8+',
        from: 'a8',
        to: 'e8',
        fenBefore: 'Qn3bnr/1bNk1ppp/4p3/8/8/3P4/PPP2PPP/R1B1K1NR w KQ - 1 12',
        fenAfter: '4Qbnr/1bNk1ppp/4p3/8/8/3P4/PPP2PPP/R1B1K1NR b KQ - 2 12',
        evalBefore: 570,
        evalAfter: 20000,
        classification: 'brilliant',
        coachComment: 'Qe8+ is brilliant! You left your queen on a square where it can be taken, but you will get a checkmate!',
        bestMoveSan: 'Qe8+',
        isCheck: true,
      },
    ];

    const resultDetails: GameResultDetails = {
      winner: 'w',
      reason: 'resignation',
      ratingDelta: 113,
      newRating: 1996,
      league: 'Wood League',
      trophiesDelta: 9,
      achievementToast: {
        title: 'New Achievement!',
        subtitle: 'Blitz 1',
        icon: 'zap',
      },
    };

    const session: GameSession = {
      id: DEMO_FINISHED_GAME_ID,
      whitePlayer,
      blackPlayer,
      timeControl: 300,
      variant: 'standard',
      moves: demoMoves,
      fen: demoMoves[demoMoves.length - 1].fenAfter,
      isGameOver: true,
      gameResult: 'White won by resignation (1-0)',
      resultDetails,
      reviewReport: null,
      createdAt: Date.now() - 3600000,
      updatedAt: Date.now(),
    };

    session.reviewReport = generateGameReviewReport(
      DEMO_FINISHED_GAME_ID,
      whitePlayer,
      blackPlayer,
      demoMoves
    );

    return session;
  }
}
