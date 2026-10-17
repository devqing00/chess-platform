import { NextRequest } from 'next/server';
import { Chess, PieceSymbol } from 'chess.js';
import { evaluatePositionStockfish } from '@/lib/server/stockfishPool';
import { queryTablebase } from '@/lib/server/tablebaseService';
import {
  classifyMoveEngine,
  calculateGameCaps,
  calculateAcpl,
  calculateEstimatedPerformanceRating,
} from '@/lib/server/capsCalculator';
import { generateCoachExplanation, detectTacticalMotifs } from '@/lib/server/coachGenerator';
import {
  GameReviewReport,
  MoveRecord,
  ClassificationTallies,
  EvalTimelinePoint,
  KeyMoment,
} from '@/types/chess';
import { matchOpeningFromMoves } from '@/lib/openingsData';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  'e4', 'e5', 'd4', 'd5', 'c4', 'c5', 'Nf3', 'Nf6', 'Nc3', 'Nc6',
  'Bb5', 'Bc4', 'd3', 'e6', 'c6', 'g6', 'Bg7', 'O-O', 'Be7', 'a6',
]);

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  const body = await req.json();

  const {
    gameId = `stream-game-${Date.now()}`,
    moves: inputMoves,
    pgn,
    whitePlayer = { id: 'white', name: 'White Player', rating: 1500, color: 'w' },
    blackPlayer = { id: 'black', name: 'Black Player', rating: 1500, color: 'b' },
    depth = 10,
  } = body;

  const runner = new Chess();
  if (pgn) {
    try {
      runner.loadPgn(pgn);
    } catch {
      //
    }
  }

  let sanMoves: string[] = [];
  if (Array.isArray(inputMoves)) {
    if (typeof inputMoves[0] === 'string') {
      sanMoves = inputMoves as string[];
    } else if (inputMoves[0] && typeof inputMoves[0] === 'object' && inputMoves[0].san) {
      sanMoves = (inputMoves as MoveRecord[]).map((m) => m.san);
    }
  } else if (pgn) {
    sanMoves = runner.history();
  }

  const customStream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        sendEvent('start', { gameId, totalPlies: sanMoves.length });

        const simChess = new Chess();
        const analyzedMoves: MoveRecord[] = [];
        const whiteAccuracies: number[] = [];
        const blackAccuracies: number[] = [];
        const whiteCpLosses: number[] = [];
        const blackCpLosses: number[] = [];
        const whiteTallies = createEmptyTallies();
        const blackTallies = createEmptyTallies();
        const evalTimeline: EvalTimelinePoint[] = [];
        const keyMoments: KeyMoment[] = [];

        let prevEval = await evaluatePositionStockfish(simChess.fen(), depth, 2);

        for (let ply = 0; ply < sanMoves.length; ply++) {
          const san = sanMoves[ply];
          const isWhite = ply % 2 === 0;
          const moveNumber = Math.floor(ply / 2) + 1;
          const fenBefore = simChess.fen();

          const verboseMoves = simChess.moves({ verbose: true });
          const playedMove = verboseMoves.find((m) => m.san === san);

          if (!playedMove) {
            try {
              simChess.move(san);
            } catch {
              break;
            }
          } else {
            simChess.move(playedMove);
          }

          const fenAfter = simChess.fen();
          const currentEval = await evaluatePositionStockfish(fenAfter, depth, 2);

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
          const isCheck = simChess.inCheck();

          const cpLoss = Math.max(0, isWhite ? evalBeforeCp - evalAfterCp : evalAfterCp - evalBeforeCp);
          if (isWhite) whiteCpLosses.push(cpLoss);
          else blackCpLosses.push(cpLoss);

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
            fenBefore,
            fenAfter,
          });

          const motifs = detectTacticalMotifs({
            chessAfter: simChess,
            playedMoveSan: san,
            from: playedMove?.from,
            to: playedMove?.to,
            turnColor: isWhite ? 'w' : 'b',
            fenBefore,
            classification: classificationResult.classification,
          });

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
            motif: motifs[0],
            fenBefore,
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
            motif: motifs[0],
          };

          analyzedMoves.push(moveRecord);

          if (isWhite) {
            whiteAccuracies.push(classificationResult.accuracy);
            whiteTallies[classificationResult.classification]++;
          } else {
            blackAccuracies.push(classificationResult.accuracy);
            blackTallies[classificationResult.classification]++;
          }

          const timelinePoint: EvalTimelinePoint = {
            ply,
            moveNumber,
            isWhite,
            score: evalAfterCp,
            classification: classificationResult.classification,
          };
          evalTimeline.push(timelinePoint);

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

          // Stream progress event for this ply
          sendEvent('progress', {
            ply: ply + 1,
            totalPlies: sanMoves.length,
            pct: Math.round(((ply + 1) / sanMoves.length) * 100),
            move: moveRecord,
            timelinePoint,
            currentAccuracy: {
              white: calculateGameCaps(whiteAccuracies),
              black: calculateGameCaps(blackAccuracies),
            },
          });
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

        const lastMove = sanMoves[sanMoves.length - 1];
        const isCheckmateLast = Boolean(lastMove?.includes('#'));
        const whiteWonByMate = isCheckmateLast && sanMoves.length % 2 === 1;
        const blackWonByMate = isCheckmateLast && sanMoves.length % 2 === 0;

        let summaryComment: string;
        if (whiteWonByMate) {
          summaryComment = `White won decisively by checkmate with ${whiteAccuracy}% CAPS accuracy (perf est. ${whiteEstimatedElo}), executing a clean tactical attack!`;
        } else if (blackWonByMate) {
          summaryComment = `Black won decisively by checkmate with ${blackAccuracy}% CAPS accuracy (perf est. ${blackEstimatedElo}), delivering a clinical finishing blow!`;
        } else if (whiteAccuracy > blackAccuracy) {
          summaryComment = `White played brilliantly with ${whiteAccuracy}% CAPS accuracy (perf est. ${whiteEstimatedElo}), dominating the center.`;
        } else {
          summaryComment = `Black outplayed White with ${blackAccuracy}% CAPS accuracy (perf est. ${blackEstimatedElo}), exploiting critical inaccuracies!`;
        }

        const opening = matchOpeningFromMoves(sanMoves);

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
          tallies: {
            white: whiteTallies,
            black: blackTallies,
          },
          evalTimeline,
          keyMoments,
          moves: analyzedMoves,
          summaryComment,
          isDeepReview: true,
        };

        sendEvent('complete', { report });
        controller.close();
      } catch (err: any) {
        sendEvent('error', { message: err?.message || 'Streaming review failed' });
        controller.close();
      }
    },
  });

  return new Response(customStream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
