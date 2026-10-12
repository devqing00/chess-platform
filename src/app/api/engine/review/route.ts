import { NextRequest, NextResponse } from 'next/server';
import { Chess, PieceSymbol } from 'chess.js';
import {
  evaluatePositionStockfish,
  formatEngineScore,
} from '@/lib/server/stockfishPool';
import { queryTablebase } from '@/lib/server/tablebaseService';
import {
  classifyMoveEngine,
  calculateGameCaps,
  calculateAcpl,
  calculateEstimatedPerformanceRating,
} from '@/lib/server/capsCalculator';
import { generateCoachExplanation } from '@/lib/server/coachGenerator';
import {
  GameReviewReport,
  MoveRecord,
  GamePlayer,
  ClassificationTallies,
  EvalTimelinePoint,
  KeyMoment,
} from '@/types/chess';
import { OPENINGS_DATABASE, matchOpeningFromMoves } from '@/lib/openingsData';
import { EntitlementGuard } from '@/lib/server/entitlementGuard';
import { MembershipTier } from '@/types/chess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    message: 'Game Review Engine API ready. POST with { moves: [...], pgn?: string, whitePlayer?: {...}, blackPlayer?: {...} }',
  });
}

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

const COMMON_BOOK_MOVES = new Set([
  'e4', 'd4', 'c4', 'Nf3', 'g3', 'f4', 'b3', 'Nc3',
  'e5', 'c5', 'e6', 'c6', 'd5', 'Nf6', 'g6', 'd6',
  'd4', 'exd5', 'Qxd5', 'Nc3', 'Qd8', 'Qd6', 'Qd7', 'Qa5',
  'Nf3', 'Nc6', 'Bb5', 'Bc4', 'd3', 'd4', 'c3', 'a6', 'Nf6', 'd6', 'Be7',
  'cxd4', 'Nxd4', 'e6', 'a6', 'Nc6', 'g6', 'Bg7', 'O-O',
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      gameId = `game-${Date.now()}`,
      userId = 'guest-player',
      tier = 'free' as MembershipTier,
      moves: inputMoves,
      pgn,
      whitePlayer = { id: 'white', name: 'White Player', rating: 1500, color: 'w' },
      blackPlayer = { id: 'black', name: 'Black Player', rating: 1500, color: 'b' },
      depth = 11,
    } = body;

    // Enforce server-side entitlement quota & depth ceiling
    const quotaCheck = EntitlementGuard.consumeReviewQuota(userId, tier, depth);
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        { error: quotaCheck.reason, code: 'TIER_QUOTA_EXCEEDED' },
        { status: 403 }
      );
    }
    const targetDepth = quotaCheck.effectiveDepth;

    const chess = new Chess();
    if (pgn) {
      chess.loadPgn(pgn);
    }

    // Determine move list
    let sanMoves: string[] = [];
    if (Array.isArray(inputMoves)) {
      if (typeof inputMoves[0] === 'string') {
        sanMoves = inputMoves as string[];
      } else if (inputMoves[0] && typeof inputMoves[0] === 'object' && inputMoves[0].san) {
        sanMoves = (inputMoves as MoveRecord[]).map((m) => m.san);
      }
    } else if (pgn) {
      sanMoves = chess.history();
    }

    if (sanMoves.length === 0) {
      return NextResponse.json({ error: 'No moves provided for game review' }, { status: 400 });
    }

    const runner = new Chess();
    const analyzedMoves: MoveRecord[] = [];
    const whiteAccuracies: number[] = [];
    const blackAccuracies: number[] = [];
    const whiteTallies = createEmptyTallies();
    const blackTallies = createEmptyTallies();
    const evalTimeline: EvalTimelinePoint[] = [];
    const keyMoments: KeyMoment[] = [];

    // Evaluate starting position
    let prevEval = await evaluatePositionStockfish(runner.fen(), targetDepth, 2);

    const whiteCpLosses: number[] = [];
    const blackCpLosses: number[] = [];

    for (let ply = 0; ply < sanMoves.length; ply++) {
      const san = sanMoves[ply];
      const isWhite = ply % 2 === 0;
      const moveNumber = Math.floor(ply / 2) + 1;
      const fenBefore = runner.fen();

      // Find move details in chess.js
      const verboseMoves = runner.moves({ verbose: true });
      const playedMove = verboseMoves.find((m) => m.san === san);

      if (!playedMove) {
        try {
          runner.move(san);
        } catch {
          break;
        }
      } else {
        runner.move(playedMove);
      }

      const fenAfter = runner.fen();

      // Evaluate position after move with Stockfish 18 NNUE
      const currentEval = await evaluatePositionStockfish(fenAfter, targetDepth, 2);

      // Check tablebase for endgame
      const tbAfter = await queryTablebase(fenAfter);

      const evalBeforeCp = prevEval.scoreCp;
      const evalAfterCp = currentEval.scoreCp;
      const mateBefore = prevEval.mateIn;
      const mateAfter = currentEval.mateIn;
      const bestMoveSan = prevEval.bestMoveSan || san;
      const bestMoveUci = prevEval.bestMoveUci || '';

      const secondBestLoss =
        prevEval.lines.length > 1
          ? Math.abs(prevEval.lines[0].scoreCp - prevEval.lines[1].scoreCp) / 100
          : 0;

      const isBookMove = ply <= 12 && COMMON_BOOK_MOVES.has(san);
      const pieceType = (playedMove?.piece || 'p') as PieceSymbol;
      const isCapture = Boolean(playedMove?.captured);
      const isCheck = runner.inCheck();

      const cpLoss = Math.max(0, isWhite ? evalBeforeCp - evalAfterCp : evalAfterCp - evalBeforeCp);
      if (isWhite) whiteCpLosses.push(cpLoss);
      else blackCpLosses.push(cpLoss);

      // Run CAPS 2.0 classification
      const classificationResult = classifyMoveEngine({
        moveSan: san,
        bestMoveSan,
        secondBestMoveSan: prevEval.lines[1]?.bestMoveSan,
        evalBeforeCp,
        evalAfterCp,
        mateBefore,
        mateAfter,
        turn: isWhite ? 'w' : 'b',
        plyIndex: ply,
        pieceType,
        isCapture,
        isCheck,
        isBookMove,
        secondBestLoss,
      });

      // Generate Coach Danny natural-language advice
      const coachExplanation = generateCoachExplanation({
        classification: classificationResult.classification,
        moveSan: san,
        bestMoveSan,
        pieceType,
        evalBeforeCp,
        evalAfterCp,
        mateIn: mateAfter,
        isCapture,
        isCheck,
        turnColor: isWhite ? 'w' : 'b',
        playerAccuracy: classificationResult.accuracy,
      });

      const moveRecord: MoveRecord = {
        san,
        from: (playedMove?.from || 'a1') as any,
        to: (playedMove?.to || 'a1') as any,
        fenBefore,
        fenAfter,
        evalBefore: evalBeforeCp,
        evalAfter: evalAfterCp,
        bestMoveSan,
        bestMoveUci,
        classification: classificationResult.classification,
        coachComment: coachExplanation,
        isCheck,
      };

      analyzedMoves.push(moveRecord);

      if (isWhite) {
        whiteAccuracies.push(classificationResult.accuracy);
        whiteTallies[classificationResult.classification]++;
      } else {
        blackAccuracies.push(classificationResult.accuracy);
        blackTallies[classificationResult.classification]++;
      }

      evalTimeline.push({
        ply,
        moveNumber,
        isWhite,
        score: evalAfterCp,
        classification: classificationResult.classification,
      });

      if (
        classificationResult.classification === 'brilliant' ||
        classificationResult.classification === 'great' ||
        classificationResult.classification === 'blunder' ||
        classificationResult.classification === 'mistake' ||
        classificationResult.classification === 'miss'
      ) {
        keyMoments.push({
          moveIndex: ply,
          turnNumber: moveNumber,
          turnColor: isWhite ? 'w' : 'b',
          moveSan: san,
          bestMoveSan,
          classification: classificationResult.classification,
          evalBefore: evalBeforeCp,
          evalAfter: evalAfterCp,
          coachComment: coachExplanation,
          isMistake:
            classificationResult.classification === 'blunder' ||
            classificationResult.classification === 'mistake' ||
            classificationResult.classification === 'miss',
        });
      }

      prevEval = currentEval;
    }

    const whiteAccuracy = calculateGameCaps(whiteAccuracies);
    const blackAccuracy = calculateGameCaps(blackAccuracies);
    const whiteAcpl = calculateAcpl(whiteCpLosses);
    const blackAcpl = calculateAcpl(blackCpLosses);

    const whiteEstimatedElo = calculateEstimatedPerformanceRating({
      capsAccuracy: whiteAccuracy,
      acpl: whiteAcpl,
      baselineElo: whitePlayer.rating || 1500,
      opponentElo: blackPlayer.rating || 1500,
    });

    const blackEstimatedElo = calculateEstimatedPerformanceRating({
      capsAccuracy: blackAccuracy,
      acpl: blackAcpl,
      baselineElo: blackPlayer.rating || 1500,
      opponentElo: whitePlayer.rating || 1500,
    });

    const summaryComment =
      whiteAccuracy > blackAccuracy
        ? `White dominated with ${whiteAccuracy}% CAPS accuracy (perf est. ${whiteEstimatedElo}), seizing the tactical initiative. Black put up resistance but faltered in the critical moments.`
        : `Black outplayed White with ${blackAccuracy}% CAPS accuracy (perf est. ${blackEstimatedElo}), punishing opening and tactical inaccuracies to secure victory!`;

    const opening = matchOpeningFromMoves(sanMoves);

    // Dynamic Chess Phase Segmentation (Grandmaster Material & Development Heuristic)
    // 1. Opening: Plies 0 to 20 while queens remain and material is intact
    // 2. Middlegame: Dynamic tactical and strategic combat between opening and endgame
    // 3. Endgame: Triggered when both queens are traded or total non-pawn piece material <= 16
    const openingMoves: { move: MoveRecord; acc: number; isWhite: boolean }[] = [];
    const middlegameMoves: { move: MoveRecord; acc: number; isWhite: boolean }[] = [];
    const endgameMoves: { move: MoveRecord; acc: number; isWhite: boolean }[] = [];

    analyzedMoves.forEach((m, idx) => {
      const isWhite = idx % 2 === 0;
      const moveIdx = Math.floor(idx / 2);
      const acc = isWhite
        ? whiteAccuracies[moveIdx] ?? 85
        : blackAccuracies[moveIdx] ?? 85;

      const fenPlacement = m.fenAfter.split(' ')[0];
      const hasWhiteQueen = fenPlacement.includes('Q');
      const hasBlackQueen = fenPlacement.includes('q');
      const queensCount = (hasWhiteQueen ? 1 : 0) + (hasBlackQueen ? 1 : 0);

      let npm = 0;
      for (const char of fenPlacement) {
        if (char === 'R' || char === 'r') npm += 5;
        else if (char === 'B' || char === 'b' || char === 'N' || char === 'n') npm += 3;
      }

      const isEndgame = queensCount === 0 || npm <= 16;
      const isOpening = idx < 20 && !isEndgame && queensCount === 2;

      if (isOpening) {
        openingMoves.push({ move: m, acc, isWhite });
      } else if (isEndgame) {
        endgameMoves.push({ move: m, acc, isWhite });
      } else {
        middlegameMoves.push({ move: m, acc, isWhite });
      }
    });

    const calcDynamicPhase = (bucket: typeof openingMoves) => {
      const w = bucket.filter((b) => b.isWhite).map((b) => b.acc);
      const b = bucket.filter((b) => !b.isWhite).map((b) => b.acc);
      return {
        whiteAccuracy: w.length > 0 ? calculateGameCaps(w) : 100,
        blackAccuracy: b.length > 0 ? calculateGameCaps(b) : 100,
        plies: bucket.length,
      };
    };

    const phaseBreakdown = {
      opening: calcDynamicPhase(openingMoves),
      middlegame: calcDynamicPhase(middlegameMoves),
      endgame: calcDynamicPhase(endgameMoves),
    };

    // Find critical blunder for instant Retry-Your-Mistakes puzzle
    let worstBlunderMove: MoveRecord | null = null;
    let worstLoss = 0;
    let worstPly = 0;

    analyzedMoves.forEach((m, idx) => {
      if (m.classification === 'blunder' || m.classification === 'miss') {
        const loss = Math.abs((m.evalBefore || 0) - (m.evalAfter || 0));
        if (loss > worstLoss) {
          worstLoss = loss;
          worstBlunderMove = m;
          worstPly = idx + 1;
        }
      }
    });

    const blunderRetryPuzzle = worstBlunderMove
      ? {
          ply: worstPly,
          fen: (worstBlunderMove as MoveRecord).fenBefore,
          blunderedMoveSan: (worstBlunderMove as MoveRecord).san,
          solutionSan: (worstBlunderMove as MoveRecord).bestMoveSan || '',
          explanation: `In this position, you played ${(worstBlunderMove as MoveRecord).san}. Stockfish's top continuation was ${(worstBlunderMove as MoveRecord).bestMoveSan}.`,
        }
      : undefined;

    const report: GameReviewReport = {
      id: `review-${gameId}`,
      gameId,
      whitePlayer,
      blackPlayer,
      whiteAccuracy,
      blackAccuracy,
      whiteEstimatedElo,
      blackEstimatedElo,
      whiteAcpl,
      blackAcpl,
      opening,
      phaseBreakdown,
      blunderRetryPuzzle,
      tallies: {
        white: whiteTallies,
        black: blackTallies,
      },
      evalTimeline,
      keyMoments,
      moves: analyzedMoves,
      summaryComment,
    };

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (err: any) {
    console.error('Error in /api/engine/review:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to complete game review' },
      { status: 500 }
    );
  }
}
