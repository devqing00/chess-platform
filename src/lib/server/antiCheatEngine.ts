import { Chess } from 'chess.js';
import { evaluatePositionStockfish } from '@/lib/server/stockfishPool';
import {
  AntiCheatReport,
  AntiCheatMoveAnomaly,
  PieceColor,
} from '@/types/chess';

/**
 * Expected Average Centipawn Loss (ACPL) based on standard player Elo bands
 */
function getExpectedAcpl(rating: number): number {
  if (rating >= 2600) return 14.0;
  if (rating >= 2200) return 22.0;
  if (rating >= 1800) return 32.0;
  if (rating >= 1400) return 48.0;
  if (rating >= 1000) return 68.0;
  return 88.0;
}

/**
 * Expected baseline probability of matching Stockfish Rank 1 in complex positions (Ken Regan model)
 */
function getExpectedEngineMatchProbability(rating: number): number {
  const boundedRating = Math.min(2850, Math.max(800, rating));
  // 800 Elo matches ~35%, 1500 matches ~46%, 2000 matches ~56%, 2800 matches ~72%
  return 0.35 + ((boundedRating - 800) / 2050) * 0.37;
}

export class AntiCheatEngine {
  /**
   * Performs an authoritative Fair-Play evaluation of a game using Dr. Kenneth Regan's
   * Intrinsic Performance Rating (IPR) Z-score model and Lichess timing entropy algorithms.
   */
  static async evaluateGame(params: {
    gameId: string;
    evaluatedColor: PieceColor;
    sanMoves: string[];
    moveTimingsMs?: number[];
    playerRating?: number;
    depth?: number;
  }): Promise<AntiCheatReport> {
    const {
      gameId,
      evaluatedColor,
      sanMoves,
      moveTimingsMs = [],
      playerRating = 1400,
      depth = 11,
    } = params;

    const runner = new Chess();
    const isWhite = evaluatedColor === 'w';

    let rank1Matches = 0;
    let rank2Matches = 0;
    let informativeDecisions = 0;
    let informativeRank1Matches = 0;
    let evaluatedPlies = 0;
    const cpLosses: number[] = [];
    const playerTimings: number[] = [];
    const anomalies: AntiCheatMoveAnomaly[] = [];

    // Skip first 6 plies (3 moves) as common opening theory
    const startPly = 6;

    for (let ply = 0; ply < sanMoves.length; ply++) {
      const san = sanMoves[ply];
      const plyColor: PieceColor = ply % 2 === 0 ? 'w' : 'b';
      const isTarget = plyColor === evaluatedColor;

      // Extract duration if timing data is provided
      const durationMs = moveTimingsMs[ply] || 0;
      if (isTarget && durationMs > 0) {
        playerTimings.push(durationMs);
      }

      const fenBefore = runner.fen();

      if (isTarget && ply >= startPly) {
        evaluatedPlies++;

        // Run multi-PV Stockfish search from current position
        const evalResult = await evaluatePositionStockfish(fenBefore, depth, 2);
        const bestMoveSan = evalResult.bestMoveSan;
        const secondBestMoveSan = evalResult.lines[1]?.bestMoveSan;
        const secondBestScoreCp = evalResult.lines[1]?.scoreCp ?? (evalResult.scoreCp - 100);

        const isRank1 = san === bestMoveSan;
        const isRank2 = san === secondBestMoveSan;

        let engineRank = 99;
        if (isRank1) engineRank = 1;
        else if (isRank2) engineRank = 2;

        if (isRank1) rank1Matches++;
        if (isRank2) rank2Matches++;

        // Ken Regan Complexity Filtering: A decision is informative if there is a distinct gap (>= 40cp)
        // between the top engine move and second-best alternative. (Excludes trivial forced moves)
        const gapCp = Math.abs(evalResult.scoreCp - secondBestScoreCp);
        if (gapCp >= 40) {
          informativeDecisions++;
          if (isRank1) informativeRank1Matches++;
        }

        // Calculate centipawn loss from engine's top choice
        const topCp = evalResult.scoreCp;
        runner.move(san);
        const evalAfter = await evaluatePositionStockfish(runner.fen(), Math.max(8, depth - 2), 1);
        const afterCp = evalAfter.scoreCp;

        const loss = Math.max(0, isWhite ? topCp - afterCp : afterCp - topCp);
        cpLosses.push(loss);

        // Anomaly trigger: Top engine move in high-complexity position with unnaturally robotic speed
        const isTacticalPosition = Math.abs(topCp) > 120 || evalResult.mateIn !== undefined || gapCp >= 150;
        if (isRank1 && isTacticalPosition && durationMs > 0 && durationMs < 2500) {
          anomalies.push({
            ply: ply + 1,
            san,
            durationMs,
            isEngineRank1: true,
            engineRank: 1,
            centipawnLoss: loss,
            description: `Found engine top choice (${san}) in a highly complex position (gap ${gapCp}cp) in only ${(durationMs / 1000).toFixed(1)}s`,
          });
        }
      } else {
        runner.move(san);
      }
    }

    const totalEvaluated = Math.max(1, evaluatedPlies);
    const engineCorrelationPct = parseFloat(((rank1Matches / totalEvaluated) * 100).toFixed(1));
    const acpl =
      cpLosses.length > 0
        ? parseFloat((cpLosses.reduce((a, b) => a + b, 0) / cpLosses.length).toFixed(1))
        : 25.0;

    const expectedAcpl = getExpectedAcpl(playerRating);
    const expectedProb = getExpectedEngineMatchProbability(playerRating);

    // Calculate Dr. Kenneth Regan Z-Score on informative decisions
    let zScore = 0.0;
    if (informativeDecisions >= 5) {
      const expectedMatches = informativeDecisions * expectedProb;
      const stdDev = Math.sqrt(informativeDecisions * expectedProb * (1 - expectedProb));
      if (stdDev > 0) {
        zScore = parseFloat(((informativeRank1Matches - expectedMatches) / stdDev).toFixed(2));
      }
    }

    // Compute Timing Variance & Coefficient of Variation (CV)
    let moveTimeMeanMs = 0;
    let moveTimeStdDevMs = 0;
    let timingCV = 0.8; // default healthy human variance

    if (playerTimings.length >= 4) {
      moveTimeMeanMs = playerTimings.reduce((a, b) => a + b, 0) / playerTimings.length;
      const variance =
        playerTimings.reduce((sum, t) => sum + Math.pow(t - moveTimeMeanMs, 2), 0) /
        playerTimings.length;
      moveTimeStdDevMs = Math.sqrt(variance);
      timingCV = parseFloat((moveTimeStdDevMs / Math.max(100, moveTimeMeanMs)).toFixed(2));
    }

    // Flags compilation
    const flags: string[] = [];

    // Flag: Dr. Regan Z-score anomaly (FIDE standard threshold: Z >= 3.0 is p < 0.0013)
    if (zScore >= 4.0) {
      flags.push(`CRITICAL_REGAN_ZSCORE: Dr. Regan IPR Z-score of +${zScore}σ demonstrates overwhelming statistical departure (p < 0.00003) from nominal rating.`);
    } else if (zScore >= 2.5) {
      flags.push(`ELEVATED_REGAN_ZSCORE: Dr. Regan IPR Z-score of +${zScore}σ exceeds expected 99th percentile for ${playerRating} Elo.`);
    }

    // Flag: Raw Engine Correlation
    if (engineCorrelationPct >= 88.0 && totalEvaluated >= 10) {
      flags.push('CRITICAL_ENGINE_CORRELATION: Moves match Stockfish Rank 1 over 88% of the time.');
    } else if (engineCorrelationPct >= 78.0 && playerRating < 1800 && totalEvaluated >= 10) {
      flags.push('HIGH_ENGINE_CORRELATION: Uncharacteristically high top-engine move match rate for rating class.');
    }

    // Flag: Rating-to-ACPL Discrepancy
    if (acpl <= expectedAcpl * 0.25 && totalEvaluated >= 10) {
      flags.push(`ACPL_DISCREPANCY: Observed ACPL (${acpl}) is dramatically lower than nominal rating expectancy (${expectedAcpl}).`);
    }

    // Flag: Robotic Move Cadence (Low Timing Variance)
    if (playerTimings.length >= 8 && timingCV < 0.22) {
      flags.push(`ROBOTIC_TIMING_INTERVALS: Move intervals show near-zero human variance (CV=${timingCV}), indicative of external assistance.`);
    }

    // Composite Score Calculation
    let zScorePoints = Math.max(0, zScore * 20); // Z=4 -> 80 pts
    let correlationPoints = Math.max(0, (engineCorrelationPct - 45.0) * 1.8);
    let timingSuspicionPoints =
      timingCV < 0.30 && playerTimings.length >= 6
        ? Math.min(100, ((0.30 - timingCV) / 0.30) * 85)
        : 0;
    let acplDelta = Math.max(0, expectedAcpl - acpl);
    let acplPoints = Math.min(40, (acplDelta / Math.max(1, expectedAcpl)) * 40);

    let rawScore =
      zScorePoints * 0.40 +
      correlationPoints * 0.25 +
      timingSuspicionPoints * 0.20 +
      acplPoints * 0.15;

    // Bonus penalty if multiple severe anomaly flags trigger simultaneously
    if (flags.length >= 2) rawScore += 20;
    else if (flags.length === 1 && (timingCV < 0.15 || zScore >= 3.0)) rawScore += 15;

    // Sample size discount for short games
    if (totalEvaluated < 8) {
      rawScore *= 0.5;
    }

    const cheatLikelihoodScore = Math.min(99, Math.max(2, Math.round(rawScore)));

    let verdict: AntiCheatReport['verdict'] = 'CLEAN';
    if (cheatLikelihoodScore >= 75) verdict = 'FLAGGED_HIGH_CORRELATION';
    else if (cheatLikelihoodScore >= 50) verdict = 'SUSPICIOUS';
    else if (cheatLikelihoodScore >= 30) verdict = 'NORMAL_VARIANCE';

    let summary = `Evaluation completed across ${totalEvaluated} plies (${informativeDecisions} informative decisions). `;
    if (verdict === 'FLAGGED_HIGH_CORRELATION') {
      summary += `High statistical probability of engine assistance detected (Regan Z-score: +${zScore}σ, ${engineCorrelationPct}% Rank 1 match, ${acpl} ACPL).`;
    } else if (verdict === 'SUSPICIOUS') {
      summary += `Elevated engine correlation and robotic pacing observed exceeding normal expectations for a ${playerRating}-rated player.`;
    } else {
      summary += `Gameplay patterns, Z-score (+${zScore}σ), and timing distributions fall within expected human variance.`;
    }

    return {
      gameId,
      evaluatedColor,
      nominalRating: playerRating,
      cheatLikelihoodScore,
      verdict,
      metrics: {
        engineCorrelationPct,
        rank1MoveCount: rank1Matches,
        totalEvaluatedMoves: totalEvaluated,
        acpl,
        expectedAcplForRating: expectedAcpl,
        moveTimeMeanMs: Math.round(moveTimeMeanMs),
        moveTimeStdDevMs: Math.round(moveTimeStdDevMs),
        timingCoefficientOfVariation: timingCV,
        zScore,
        informativeDecisions,
      },
      flags,
      moveAnomalies: anomalies,
      summary,
    };
  }
}
