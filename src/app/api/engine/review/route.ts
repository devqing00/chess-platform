import { NextRequest, NextResponse } from 'next/server';
import { Chess, PieceSymbol } from 'chess.js';
import { ChessEvaluator } from '@/lib/chessEngine';
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
  centipawnsToWinProbability,
} from '@/lib/server/capsCalculator';
import { selectKeyMoments, PlyRow } from '@/lib/server/keyMomentsEngine';
import { getTakeawayForMove } from '@/lib/mentorsData';
import { generateCoachExplanation, detectTacticalMotifs } from '@/lib/server/coachGenerator';
import { calculateGameAdvancedStats } from '@/lib/advancedStatsCalculator';
import {
  GameReviewReport,
  MoveRecord,
  GamePlayer,
  ClassificationTallies,
  EvalTimelinePoint,
  KeyMoment,
  MoveClassification,
  EngineStrengthTier,
  ENGINE_STRENGTH_CONFIGS,
  MembershipTier,
} from '@/types/chess';
import { OPENINGS_DATABASE, matchOpeningFromMoves } from '@/lib/openingsData';
import { EntitlementGuard } from '@/lib/server/entitlementGuard';
import {
  detectTacticalMotif,
  detectTacticalMotifs as detectDeepTacticalMotifs,
  buildRefutations,
} from '@/lib/tacticalMotifDetector';

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
      depth,
      strengthTier = 'standard' as EngineStrengthTier,
      engineMode = 'torch_human',
      gameResult,
      resultDetails,
      termination,
    } = body;

    const strengthConfig = ENGINE_STRENGTH_CONFIGS[strengthTier as EngineStrengthTier] || ENGINE_STRENGTH_CONFIGS.standard;
    const requestedDepth = depth || strengthConfig.depth;

    // Enforce server-side entitlement quota & depth ceiling
    const quotaCheck = EntitlementGuard.consumeReviewQuota(userId, tier, requestedDepth);
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        { error: quotaCheck.reason, code: 'TIER_QUOTA_EXCEEDED' },
        { status: 403 }
      );
    }
    const targetDepth = Math.min(requestedDepth, quotaCheck.effectiveDepth || requestedDepth);
    const multiPv = strengthConfig.multiPv || 2;
    const timeBudgetMs = strengthConfig.timeBudgetMs || 3500;

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
    const plyRows: PlyRow[] = [];

    // Fast starting position evaluation (standard +0.20 centipawns for starting position)
    let prevEval: any = {
      fen: runner.fen(),
      depth: targetDepth,
      seldepth: targetDepth,
      nodes: 1000,
      nps: 1000000,
      scoreCp: 20,
      scoreFormatted: '+0.20',
      bestMoveSan: 'e4',
      bestMoveUci: 'e2e4',
      pvSan: ['e4', 'e5', 'Nf3'],
      pvUci: ['e2e4', 'e7e5', 'g1f3'],
      lines: [
        {
          rank: 1,
          scoreCp: 20,
          scoreFormatted: '+0.20',
          bestMoveSan: 'e4',
          bestMoveUci: 'e2e4',
          pvSan: ['e4', 'e5'],
          pvUci: ['e2e4', 'e7e5'],
        },
      ],
    };

    const whiteCpLosses: number[] = [];
    const blackCpLosses: number[] = [];
    const whiteClassifications: MoveClassification[] = [];
    const blackClassifications: MoveClassification[] = [];

    let inBook = true;
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

      // Authentically check opening theory against master opening database
      let isBookMove = false;
      if (inBook && ply <= 16) {
        const currentPrefix = sanMoves.slice(0, ply + 1);
        const matchesBook = OPENINGS_DATABASE.some((op) => {
          const tokens = op.moves.replace(/\d+\./g, '').trim().split(/\s+/).filter(Boolean);
          if (tokens.length < currentPrefix.length) return false;
          return currentPrefix.every((t, i) => t === tokens[i]);
        });
        if (matchesBook) {
          isBookMove = true;
        } else {
          inBook = false;
        }
      } else {
        inBook = false;
      }

      // Evaluate position with Stockfish configured for current strength tier without compromising engine quality
      const currentEval = await evaluatePositionStockfish(fenAfter, targetDepth, multiPv, timeBudgetMs);

      // Check tablebase for endgame only when 7 or fewer pieces remain on board
      const pieceCount = (fenAfter.split(' ')[0].match(/[pnbrqkPNBRQK]/g) || []).length;
      const tbAfter = pieceCount <= 7 ? await queryTablebase(fenAfter) : null;

      const evalBeforeCp = prevEval.scoreCp;
      const evalAfterCp = currentEval.scoreCp;
      const mateBefore = prevEval.mateIn;
      const mateAfter = currentEval.mateIn;
      let bestMoveSan = prevEval.bestMoveSan;
      let bestMoveUci = prevEval.bestMoveUci || '';
      if (!bestMoveSan || bestMoveSan === 'Checkmate' || bestMoveSan === 'Draw') {
        try {
          const cBefore = new Chess(fenBefore);
          if (!cBefore.isGameOver()) {
            const fallback = ChessEvaluator.findBestMoveAndScore(cBefore);
            bestMoveSan = fallback.bestMoveSan || san;
            bestMoveUci = fallback.bestMoveUci || '';
          } else {
            bestMoveSan = san;
          }
        } catch {
          bestMoveSan = san;
        }
      }

      const secondBestLoss =
        prevEval.lines && prevEval.lines.length > 1
          ? Math.abs(prevEval.lines[0].scoreCp - prevEval.lines[1].scoreCp) / 100
          : 0;

      const pieceType = (playedMove?.piece || 'p') as PieceSymbol;
      const isCapture = Boolean(playedMove?.captured);
      const isCheck = runner.inCheck();

      const cpLoss = Math.max(0, isWhite ? evalBeforeCp - evalAfterCp : evalAfterCp - evalBeforeCp);
      if (isWhite) whiteCpLosses.push(cpLoss);
      else blackCpLosses.push(cpLoss);

      const prevPlayedMove =
        ply > 0
          ? {
              from: analyzedMoves[ply - 1].from,
              to: analyzedMoves[ply - 1].to,
              captured: analyzedMoves[ply - 1].captured,
              san: analyzedMoves[ply - 1].san,
            }
          : undefined;
      const prevMoveLoss = ply > 0 ? (analyzedMoves[ply - 1].winProbLoss || 0) / 100 : 0;
      const playerRating = isWhite ? whitePlayer?.rating || 1500 : blackPlayer?.rating || 1500;

      // Run CAPS 2.0 classification with Expected Points Lost ladder and rating leniency
      const classificationResult = classifyMoveEngine({
        moveSan: san,
        bestMoveSan,
        secondBestMoveSan: prevEval.lines[1]?.bestMoveSan,
        secondBestCp: prevEval.lines[1]?.scoreCp,
        secondBestMate: prevEval.lines[1]?.mateIn,
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
        engineMode: engineMode as any,
        fenBefore,
        fenAfter,
        playerRating,
        prevMoveLoss,
        prevMove: prevPlayedMove,
      });

      if (isWhite) {
        whiteClassifications.push(classificationResult.classification);
      } else {
        blackClassifications.push(classificationResult.classification);
      }

      const isUserWhite =
        whitePlayer?.id === 'user-local' ||
        (whitePlayer?.isBot === false && blackPlayer?.isBot === true) ||
        (whitePlayer?.name || '').toLowerCase().includes('qing') ||
        (whitePlayer?.name || '').toLowerCase().includes('you') ||
        !(blackPlayer?.name || '').toLowerCase().includes('qing');
      const isUserMove = isWhite ? isUserWhite : !isUserWhite;
      const playerName = isWhite ? whitePlayer?.name : blackPlayer?.name;

      // Extract 2-ply concrete refutation branches directly from MultiPV search
      const refutationResult = buildRefutations({
        fenAfter,
        targetSquare: playedMove?.to as any,
        moverColor: isWhite ? 'w' : 'b',
        lines: currentEval.lines,
      });

      // Deep tactical motif detection with Duties, Deflections, Overload, Zwischenzug, and Poisoned Pieces
      const deepMotifs = detectDeepTacticalMotifs({
        fenBefore,
        moveSan: san,
        fenAfter,
        prevMove: prevPlayedMove,
        bestMoveSan,
        evalBeforeCp,
        evalAfterCp,
        isCheck,
      });

      const baseMotifs = detectTacticalMotifs({
        chessAfter: runner,
        playedMoveSan: san,
        from: playedMove?.from,
        to: playedMove?.to,
        turnColor: isWhite ? 'w' : 'b',
        fenBefore,
        classification: classificationResult.classification,
      });

      const activeMotif = deepMotifs[0]
        ? { type: deepMotifs[0].type, name: deepMotifs[0].name, description: deepMotifs[0].description }
        : baseMotifs[0]
        ? { type: baseMotifs[0].type, name: baseMotifs[0].type, description: baseMotifs[0].description }
        : undefined;

      // Generate Coach Danny natural-language advice with exact motif explanations and refutations
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
        playerName,
        isUser: isUserMove,
        motif: activeMotif ? { type: activeMotif.type as any, description: activeMotif.description } : undefined,
        fenBefore,
        refutations: refutationResult,
      });

      console.log(`[REVIEW_API] Ply ${ply} ${san}: class=${classificationResult.classification}, acc=${classificationResult.accuracy}, bestMove=${bestMoveSan}, evalB=${evalBeforeCp}, evalA=${evalAfterCp}`);

      const takeaway = getTakeawayForMove(activeMotif?.type, classificationResult.classification);

      const moveRecord: MoveRecord = {
        san,
        from: (playedMove?.from || 'a1') as any,
        to: (playedMove?.to || 'a1') as any,
        captured: playedMove?.captured as any,
        promotion: playedMove?.promotion as any,
        fenBefore,
        fenAfter,
        evalBefore: evalBeforeCp,
        evalAfter: evalAfterCp,
        bestMoveSan,
        bestMoveUci,
        classification: classificationResult.classification,
        coachComment: coachExplanation,
        accuracy: classificationResult.accuracy,
        winProbLoss: classificationResult.winProbLoss,
        isCheck,
        motif: activeMotif
          ? {
              type: activeMotif.name || activeMotif.type,
              description: activeMotif.description,
              name: activeMotif.name,
            }
          : undefined,
        refutations: refutationResult.accepted || refutationResult.declined ? refutationResult : undefined,
        takeaway,
        structuredCommentary: {
          positionContext: isCheck ? `${san} delivers check against the enemy king.` : undefined,
          moveExecution: activeMotif?.description || `${san} played on the board.`,
          consequences: {
            accepted: refutationResult.accepted ? `If ${refutationResult.accepted.replySan}, then ${refutationResult.accepted.lineSan}` : undefined,
            declined: refutationResult.declined ? `If ${refutationResult.declined.replySan}, then ${refutationResult.declined.lineSan}` : undefined,
            summary: refutationResult.acceptIsBest === false ? 'Accepting the piece leads to a decisive tactical loss.' : undefined,
          },
          takeaway,
        },
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

      const eBeforeW = centipawnsToWinProbability(evalBeforeCp, mateBefore) / 100;
      const eAfterW = centipawnsToWinProbability(evalAfterCp, mateAfter) / 100;
      const missedMate =
        (isWhite && mateBefore !== undefined && mateBefore > 0 && (mateAfter === undefined || mateAfter <= 0)) ||
        (!isWhite && mateBefore !== undefined && mateBefore < 0 && (mateAfter === undefined || mateAfter >= 0));

      plyRows.push({
        ply,
        moveNumber,
        san,
        color: isWhite ? 'w' : 'b',
        isUser: isUserMove,
        label: classificationResult.classification,
        eBeforeW,
        eAfterW,
        evalBefore: evalBeforeCp,
        evalAfter: evalAfterCp,
        bestMoveSan,
        coachComment: coachExplanation,
        inBook: isBookMove,
        missedMate,
      });

      prevEval = currentEval;
    }

    const keyMoments = selectKeyMoments(plyRows);

    const whiteAccuracy = calculateGameCaps(whiteAccuracies, whiteClassifications);
    const blackAccuracy = calculateGameCaps(blackAccuracies, blackClassifications);
    const whiteAcpl = calculateAcpl(whiteCpLosses);
    const blackAcpl = calculateAcpl(blackCpLosses);

    const whiteEstimatedElo = calculateEstimatedPerformanceRating({
      capsAccuracy: whiteAccuracy,
      acpl: whiteAcpl,
      baselineElo: whitePlayer.rating || 1500,
      opponentElo: blackPlayer.rating || 1500,
      engineMode: engineMode as any,
      moveCount: Math.ceil(sanMoves.length / 2),
    });

    const blackEstimatedElo = calculateEstimatedPerformanceRating({
      capsAccuracy: blackAccuracy,
      acpl: blackAcpl,
      baselineElo: blackPlayer.rating || 1500,
      opponentElo: whitePlayer.rating || 1500,
      engineMode: engineMode as any,
      moveCount: Math.ceil(sanMoves.length / 2),
    });

    const lastMove = sanMoves[sanMoves.length - 1];
    const isCheckmateLast = Boolean(lastMove?.includes('#'));
    const whiteWonByMate = isCheckmateLast && sanMoves.length % 2 === 1;
    const blackWonByMate = isCheckmateLast && sanMoves.length % 2 === 0;

    let summaryComment: string;
    if (whiteWonByMate) {
      summaryComment = `White won decisively by checkmate with ${whiteAccuracy}% accuracy (perf est. ${whiteEstimatedElo}), executing a clean tactical attack!`;
    } else if (blackWonByMate) {
      summaryComment = `Black won decisively by checkmate with ${blackAccuracy}% accuracy (perf est. ${blackEstimatedElo}), delivering a clinical finishing blow!`;
    } else if (whiteAccuracy > blackAccuracy) {
      summaryComment = `White dominated with ${whiteAccuracy}% accuracy (perf est. ${whiteEstimatedElo}), seizing the tactical initiative. Black put up resistance but faltered in the critical moments.`;
    } else {
      summaryComment = `Black outplayed White with ${blackAccuracy}% accuracy (perf est. ${blackEstimatedElo}), punishing opening and tactical inaccuracies to secure victory!`;
    }

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
    const isReviewUserWhite =
      whitePlayer?.id === 'user-local' ||
      whitePlayer?.id === 'user-synced' ||
      whitePlayer?.id === 'player-1' ||
      whitePlayer?.id === 'player-you' ||
      (!whitePlayer?.isBot && blackPlayer?.isBot) ||
      (whitePlayer?.name && (whitePlayer.name.toLowerCase().includes('you') || whitePlayer.name.toLowerCase().includes('qing')));

    let worstBlunderMove: MoveRecord | null = null;
    let worstLoss = 0;
    let worstPly = 0;

    // 1. Prioritize user's own blunder/miss/mistake so retry puzzle coaches the player
    analyzedMoves.forEach((m, idx) => {
      const isUserMove = (idx % 2 === 0) === isReviewUserWhite;
      if (isUserMove && (m.classification === 'blunder' || m.classification === 'miss' || m.classification === 'mistake')) {
        const loss = Math.abs((m.evalBefore || 0) - (m.evalAfter || 0));
        if (loss > worstLoss) {
          worstLoss = loss;
          worstBlunderMove = m;
          worstPly = idx + 1;
        }
      }
    });

    // 2. Fall back to any blunder in the game if user played without blunders
    if (!worstBlunderMove) {
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
    }

    const blunderRetryPuzzle = worstBlunderMove
      ? {
          ply: worstPly,
          fen: (worstBlunderMove as MoveRecord).fenBefore,
          blunderedMoveSan: (worstBlunderMove as MoveRecord).san,
          solutionSan: (worstBlunderMove as MoveRecord).bestMoveSan || '',
          explanation:
            engineMode === 'torch_human'
              ? `In this position, you played ${(worstBlunderMove as MoveRecord).san}. Torch Human recommends ${(worstBlunderMove as MoveRecord).bestMoveSan} as the most natural, practical path.`
              : `In this position, you played ${(worstBlunderMove as MoveRecord).san}. Stockfish's top continuation was ${(worstBlunderMove as MoveRecord).bestMoveSan}.`,
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
      engineMode: engineMode as any,
      strengthTier,
      engineDescription:
        engineMode === 'torch_human'
          ? `Human Style (Maia NNUE, ${strengthConfig.label} Tier)`
          : `Stockfish 18 (${strengthConfig.label} Tier, Depth ${targetDepth})`,
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
      isDeepReview: true,
      reviewVersion: 'v3.0',
      gameResult: gameResult || (isCheckmateLast ? (whiteWonByMate ? '1-0' : '0-1') : undefined),
      resultDetails: resultDetails || {
        winner: isCheckmateLast ? (whiteWonByMate ? 'w' : 'b') : 'draw',
        reason: isCheckmateLast ? 'checkmate' : 'normal',
      },
      termination: termination || (isCheckmateLast ? 'Checkmate' : undefined),
    };

    report.advancedStats = calculateGameAdvancedStats(report);

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
