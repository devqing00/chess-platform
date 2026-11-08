import { NextRequest } from 'next/server';
import { Chess, PieceSymbol } from 'chess.js';
import { evaluatePositionStockfish } from '@/lib/server/stockfishPool';
import { evaluateLocalEndgame } from '@/lib/server/tablebaseService';
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
  ClassificationTallies,
  EvalTimelinePoint,
  KeyMoment,
  MoveClassification,
  EngineStrengthTier,
  ENGINE_STRENGTH_CONFIGS,
} from '@/types/chess';
import { OPENINGS_DATABASE } from '@/lib/openingsData';
import {
  detectTacticalMotifs as detectDeepTacticalMotifs,
  buildRefutations,
} from '@/lib/tacticalMotifDetector';

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

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  const body = await req.json();

  const {
    gameId = `stream-game-${Date.now()}`,
    moves: inputMoves,
    pgn,
    whitePlayer = { id: 'white', name: 'White Player', rating: 1500, color: 'w' },
    blackPlayer = { id: 'black', name: 'Black Player', rating: 1500, color: 'b' },
    depth,
    strengthTier = 'fast' as EngineStrengthTier,
    engineMode = 'stockfish',
    gameResult,
    resultDetails,
  } = body;

  const strengthConfig = ENGINE_STRENGTH_CONFIGS[strengthTier as EngineStrengthTier] || ENGINE_STRENGTH_CONFIGS.fast;
  const targetDepth = depth || strengthConfig.depth || 10;
  const multiPv = strengthConfig.multiPv || 2;
  const timeBudgetMs = strengthConfig.timeBudgetMs || 100;

  const runner = new Chess();
  if (pgn) {
    try {
      runner.loadPgn(pgn);
    } catch {
      // ignore
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
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          // stream already closed
        }
      };

      try {
        sendEvent('start', { gameId, totalPlies: sanMoves.length });

        const simChess = new Chess();
        const analyzedMoves: MoveRecord[] = [];
        const whiteAccuracies: number[] = [];
        const blackAccuracies: number[] = [];
        const whiteCpLosses: number[] = [];
        const blackCpLosses: number[] = [];
        const whiteClassifications: MoveClassification[] = [];
        const blackClassifications: MoveClassification[] = [];
        const whiteTallies = createEmptyTallies();
        const blackTallies = createEmptyTallies();
        const evalTimeline: EvalTimelinePoint[] = [];
        const plyRows: PlyRow[] = [];

        // Starting position baseline
        let prevEval: any = {
          fen: simChess.fen(),
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

        let inBook = true;

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

          // Check opening book
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

          let currentEval: any;
          if (isBookMove) {
            const bookScore = isWhite ? 20 : -20;
            currentEval = {
              fen: fenAfter,
              depth: targetDepth,
              seldepth: targetDepth,
              nodes: 100,
              nps: 100000,
              scoreCp: bookScore,
              scoreFormatted: isWhite ? '+0.20' : '-0.20',
              bestMoveSan: san,
              bestMoveUci: playedMove ? `${playedMove.from}${playedMove.to}` : '',
              pvSan: [san],
              pvUci: [],
              lines: [
                {
                  rank: 1,
                  scoreCp: bookScore,
                  scoreFormatted: isWhite ? '+0.20' : '-0.20',
                  bestMoveSan: san,
                  bestMoveUci: playedMove ? `${playedMove.from}${playedMove.to}` : '',
                  pvSan: [san],
                  pvUci: [],
                },
              ],
            };
          } else {
            currentEval = await evaluatePositionStockfish(fenAfter, targetDepth, multiPv, timeBudgetMs);
          }

          // Tablebase endgame for <= 7 pieces
          const pieceCount = (fenAfter.split(' ')[0].match(/[pnbrqkPNBRQK]/g) || []).length;
          if (pieceCount <= 7) {
            const localTb = evaluateLocalEndgame(fenAfter);
            if (localTb) {
              currentEval.tablebase = {
                category: localTb.category || 'draw',
                dtz: localTb.dtz ?? null,
                bestMoveUci: localTb.bestMoveUci,
                bestMoveSan: localTb.bestMoveSan,
              };
            }
          }

          const evalBeforeCp = prevEval.scoreCp;
          const evalAfterCp = currentEval.scoreCp;
          const mateBefore = prevEval.mateIn;
          const mateAfter = currentEval.mateIn;
          let bestMoveSan = prevEval.bestMoveSan;
          let bestMoveUci = prevEval.bestMoveUci || '';

          if (ply === 0 && (san === 'e4' || san === 'd4' || san === 'Nf3' || san === 'c4')) {
            bestMoveSan = san;
          }

          const secondBestLoss =
            prevEval.lines && prevEval.lines.length > 1
              ? Math.abs(prevEval.lines[0].scoreCp - prevEval.lines[1].scoreCp) / 100
              : 0;

          const pieceType = (playedMove?.piece || 'p') as PieceSymbol;
          const isCapture = Boolean(playedMove?.captured);
          const isCheck = simChess.inCheck();

          const playedLineInBefore = prevEval.lines?.find(
            (l: any) => l.bestMoveSan === san || (playedMove && l.bestMoveUci === `${playedMove.from}${playedMove.to}`)
          );

          const rawCpLoss = Math.max(0, isWhite ? evalBeforeCp - evalAfterCp : evalAfterCp - evalBeforeCp);
          const cpLoss =
            playedLineInBefore && prevEval.lines && prevEval.lines[0]
              ? Math.abs(prevEval.lines[0].scoreCp - playedLineInBefore.scoreCp)
              : rawCpLoss;

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
            (whitePlayer?.name || '').toLowerCase().includes('qing') ||
            (whitePlayer?.name || '').toLowerCase().includes('you');
          const isUserMove = isWhite ? isUserWhite : !isUserWhite;
          const playerName = isWhite ? whitePlayer?.name : blackPlayer?.name;

          // Build deep 3-ply refutations
          const refutationResult = buildRefutations({
            fenAfter,
            targetSquare: playedMove?.to as any,
            moverColor: isWhite ? 'w' : 'b',
            lines: currentEval.lines,
          });

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
            chessAfter: simChess,
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

          // Rating-calibrated Coach Danny explanation
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

          const timelinePoint: EvalTimelinePoint = {
            ply,
            moveNumber,
            isWhite,
            score: evalAfterCp,
            classification: classificationResult.classification,
          };
          evalTimeline.push(timelinePoint);

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

          // Stream progress event for this ply
          sendEvent('progress', {
            ply: ply + 1,
            totalPlies: sanMoves.length,
            pct: Math.round(((ply + 1) / sanMoves.length) * 100),
            move: moveRecord,
            timelinePoint,
            currentAccuracy: {
              white: calculateGameCaps(whiteAccuracies, whiteClassifications),
              black: calculateGameCaps(blackAccuracies, blackClassifications),
            },
          });
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
          tallies: {
            white: whiteTallies,
            black: blackTallies,
          },
          evalTimeline,
          keyMoments,
          moves: analyzedMoves,
          summaryComment: `Game analyzed with Stockfish 19 (${whiteAccuracy}% vs ${blackAccuracy}%).`,
          isDeepReview: true,
          gameResult,
          resultDetails,
        };

        report.advancedStats = calculateGameAdvancedStats(report);

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
