import {
  GameReviewReport,
  GameAdvancedStats,
  PlayerAdvancedStats,
  AdvancedStatDetail,
  MoveClassification,
  MoveRecord,
} from '@/types/chess';

/**
 * Maps a calculated performance score (0 - 100) to an authentic Chess.com move classification badge
 */
export function scoreToClassification(
  score: number,
  category: 'opening' | 'tactics' | 'strategy' | 'endgame',
  options?: { hasBrilliant?: boolean; hasBook?: boolean }
): MoveClassification {
  if (score >= 75) return 'excellent';
  if (score >= 58) return 'good';
  if (score >= 42) return 'inaccuracy';
  if (score >= 25) return 'mistake';
  return 'blunder';
}

function getMoveAccuracy(m: MoveRecord): number {
  if (m.accuracy !== undefined && typeof m.accuracy === 'number') {
    return m.accuracy;
  }
  switch (m.classification) {
    case 'brilliant':
    case 'best':
    case 'book':
      return 100;
    case 'great':
      return 94;
    case 'excellent':
      return 85;
    case 'good':
      return 72;
    case 'inaccuracy':
      return 52;
    case 'mistake':
      return 30;
    case 'miss':
      return 18;
    case 'blunder':
      return 8;
    default:
      return 75;
  }
}

function calculatePlayerStats(
  playerMoves: MoveRecord[],
  overallAccuracy: number,
  isWhite: boolean,
  isWinner: boolean
): PlayerAdvancedStats {
  if (!playerMoves || playerMoves.length === 0) {
    const fallback: AdvancedStatDetail = {
      score: overallAccuracy || 75,
      classification: scoreToClassification(overallAccuracy || 75, 'strategy'),
      summary: 'Solid play throughout the match.',
    };
    return {
      opening: fallback,
      tactics: fallback,
      strategy: fallback,
      endgame: fallback,
    };
  }

  // 1. OPENING PHASE (First 5-7 player moves / up to move 8-10)
  const openingMoves = playerMoves.slice(0, Math.min(6, playerMoves.length));
  const openingAccs = openingMoves.map(getMoveAccuracy);
  const avgOpeningAcc =
    openingAccs.length > 0 ? openingAccs.reduce((a, b) => a + b, 0) / openingAccs.length : overallAccuracy;

  const openingBook = openingMoves.filter((m) => m.classification === 'book').length;
  const openingBest = openingMoves.filter((m) => m.classification === 'best' || m.classification === 'great').length;
  const openingBlunders = openingMoves.filter((m) => m.classification === 'blunder' || m.classification === 'miss').length;
  const openingMistakes = openingMoves.filter((m) => m.classification === 'mistake').length;
  const openingInaccuracies = openingMoves.filter((m) => m.classification === 'inaccuracy').length;

  let openingScore =
    avgOpeningAcc * 0.82 +
    (openingBook / Math.max(1, openingMoves.length)) * 18 +
    (openingBest / Math.max(1, openingMoves.length)) * 10 -
    Math.min(20, openingBlunders * 12 + openingMistakes * 5 + openingInaccuracies * 2);

  openingScore = Math.min(100, Math.max(10, Math.round(openingScore)));
  const openingClass = scoreToClassification(openingScore, 'opening', {
    hasBook: openingBook >= 2 && openingBlunders === 0,
  });
  const openingSummary =
    openingScore >= 85
      ? 'Flawless book and theoretical development.'
      : openingScore >= 60
      ? 'Sound opening structure and development.'
      : 'Early positional inaccuracies or conceded center control.';

  // 2. TACTICS (Captures, checks, high evaluation swings, brilliant/great moves, misses, blunders)
  const tacticalMoves = playerMoves.filter((m) => {
    const isCapture = Boolean(m.captured || m.san?.includes('x'));
    const isCheck = Boolean(m.isCheck || m.san?.includes('+') || m.san?.includes('#'));
    const isSharp =
      m.classification === 'brilliant' ||
      m.classification === 'great' ||
      m.classification === 'miss' ||
      m.classification === 'blunder';
    const evalSwing = Math.abs((m.evalBefore || 0) - (m.evalAfter || 0)) >= 90;
    return isCapture || isCheck || isSharp || evalSwing;
  });

  const activeTactical = tacticalMoves.length > 0 ? tacticalMoves : playerMoves;
  const tacticalAccs = activeTactical.map(getMoveAccuracy);
  const avgTacticalAcc = tacticalAccs.reduce((a, b) => a + b, 0) / tacticalAccs.length;

  const brilliantCount = activeTactical.filter((m) => m.classification === 'brilliant').length;
  const greatCount = activeTactical.filter((m) => m.classification === 'great').length;
  const bestTactical = activeTactical.filter((m) => m.classification === 'best').length;
  const tacticalBlunders = activeTactical.filter((m) => m.classification === 'blunder').length;
  const tacticalMisses = activeTactical.filter((m) => m.classification === 'miss').length;
  const tacticalMistakes = activeTactical.filter((m) => m.classification === 'mistake').length;

  let tacticsScore: number;
  if (isWinner && playerMoves.some((m) => m.san?.includes('#'))) {
    // Winner delivered checkmate!
    tacticsScore = Math.max(92, Math.round(avgTacticalAcc * 0.9 + 10));
  } else {
    const tacticalBonus = Math.min(22, brilliantCount * 14 + greatCount * 9 + bestTactical * 3);
    const tacticalPenalties = Math.min(25, tacticalBlunders * 10 + tacticalMisses * 3 + tacticalMistakes * 2);
    tacticsScore = Math.round(avgTacticalAcc * 0.85 + tacticalBonus - tacticalPenalties + (isWinner ? 8 : 0));
  }

  tacticsScore = Math.min(100, Math.max(10, Math.round(tacticsScore)));
  const tacticsClass = scoreToClassification(tacticsScore, 'tactics', {
    hasBrilliant: brilliantCount > 0,
  });
  const tacticsSummary =
    brilliantCount > 0
      ? 'Spectacular piece sacrifice and decisive calculation.'
      : (isWinner && playerMoves.some((m) => m.san?.includes('#')))
      ? 'Lethal tactical execution delivering checkmate.'
      : tacticsScore >= 85
      ? 'Sharp tactical awareness with no tactical slips.'
      : tacticsScore >= 60
      ? 'Solid tactical defense and opportunism.'
      : 'Overlooked tactical combinations or hanging material.';

  // 3. STRATEGY (Quiet, non-capturing, non-checking moves; positional consistency)
  const strategicMoves = playerMoves.filter((m) => {
    const isCapture = Boolean(m.captured || m.san?.includes('x'));
    const isCheck = Boolean(m.isCheck || m.san?.includes('+') || m.san?.includes('#'));
    const isBook = m.classification === 'book';
    const isTacticalError = m.classification === 'miss' || m.classification === 'blunder';
    const isEvalSwing = Math.abs((m.evalBefore || 0) - (m.evalAfter || 0)) >= 120;
    return !isCapture && !isCheck && !isBook && !isTacticalError && !isEvalSwing;
  });

  const activeStrategic = strategicMoves.length > 0 ? strategicMoves : playerMoves;
  const strategicAccs = activeStrategic.map(getMoveAccuracy);
  const avgStrategicAcc = strategicAccs.reduce((a, b) => a + b, 0) / strategicAccs.length;

  const strategicBest = activeStrategic.filter((m) => m.classification === 'best' || m.classification === 'great').length;
  const strategicInaccuracies = activeStrategic.filter((m) => m.classification === 'inaccuracy').length;
  const strategicMistakes = activeStrategic.filter((m) => m.classification === 'mistake').length;
  const strategicBlunders = activeStrategic.filter((m) => m.classification === 'blunder').length;

  const strategicBonus = Math.min(22, (strategicBest / Math.max(1, activeStrategic.length)) * 18 + (isWinner ? 10 : 0));
  const strategicPenalties = Math.min(20, strategicBlunders * 10 + strategicMistakes * 4 + strategicInaccuracies * 2);
  let strategyScore = Math.round(avgStrategicAcc * 0.88 + strategicBonus - strategicPenalties);

  strategyScore = Math.min(100, Math.max(10, Math.round(strategyScore)));
  const strategyClass = scoreToClassification(strategyScore, 'strategy');
  const strategySummary =
    strategyScore >= 85
      ? 'Exceptional positional mastery and harmonious piece coordination.'
      : strategyScore >= 75
      ? 'Constructive plans and good piece placement.'
      : 'Aimless maneuvers or damaged pawn structure.';

  // 4. ENDGAME / CONVERSION (Late game moves, or clean game-ending conversion)
  const isShortGame = playerMoves.length < 12;
  const endgameMoves = playerMoves.slice(Math.max(0, playerMoves.length - (isShortGame ? 4 : 8)));
  const endgameAccs = endgameMoves.map(getMoveAccuracy);
  const avgEndgameAcc = endgameAccs.length > 0 ? endgameAccs.reduce((a, b) => a + b, 0) / endgameAccs.length : overallAccuracy;

  const endgameBlunders = endgameMoves.filter((m) => m.classification === 'blunder' || m.classification === 'miss').length;
  const endgameMistakes = endgameMoves.filter((m) => m.classification === 'mistake').length;
  const endgameBest = endgameMoves.filter((m) => m.classification === 'best' || m.classification === 'great').length;

  let endgameScore: number;
  let endgameSummary: string;
  if (isShortGame && isWinner) {
    endgameScore = Math.max(90, Math.round(overallAccuracy));
    endgameSummary = 'Lethal early conversion and tactical knockout.';
  } else if (isShortGame && !isWinner) {
    endgameScore = Math.min(30, Math.round(overallAccuracy * 0.4));
    endgameSummary = 'Overwhelmed in the early phases before reaching an endgame.';
  } else {
    // When a game terminates early (<= 35 moves) by resignation in the transition to endgame,
    // Chess.com awards a solid 'Good' (✔, 65-72) for sound technique, reserving Excellent for extended endgames
    const isEarlyEndgameTermination = playerMoves.length <= 35;
    const rawEndgame = Math.round(
      avgEndgameAcc * 0.80 +
      (endgameBest / Math.max(1, endgameMoves.length)) * 10 +
      (isWinner ? 6 : 0) -
      Math.min(25, endgameBlunders * 12 + endgameMistakes * 5)
    );

    endgameScore = isEarlyEndgameTermination && isWinner
      ? Math.min(72, Math.max(62, rawEndgame))
      : rawEndgame;

    endgameScore = Math.min(100, Math.max(10, Math.round(endgameScore)));
    endgameSummary =
      endgameScore >= 75
        ? isWinner
          ? 'Clinical conversion and technique.'
          : 'Tenacious and resilient defense.'
        : endgameScore >= 58
        ? 'Sound fundamental technique.'
        : 'Imprecise endgame technique or missed drawing resources.';
  }

  endgameScore = Math.min(100, Math.max(10, Math.round(endgameScore)));
  const endgameClass = scoreToClassification(endgameScore, 'endgame');

  return {
    opening: {
      score: openingScore,
      classification: openingClass,
      summary: openingSummary,
    },
    tactics: {
      score: tacticsScore,
      classification: tacticsClass,
      summary: tacticsSummary,
    },
    strategy: {
      score: strategyScore,
      classification: strategyClass,
      summary: strategySummary,
    },
    endgame: {
      score: endgameScore,
      classification: endgameClass,
      summary: endgameSummary,
    },
  };
}

/**
 * Computes full Advanced Stats for both White and Black across Opening, Tactics, Strategy, and Endgame
 */
export function calculateGameAdvancedStats(report: GameReviewReport): GameAdvancedStats {
  const moves = report.moves || [];
  const whiteMoves = moves.filter((_, idx) => idx % 2 === 0);
  const blackMoves = moves.filter((_, idx) => idx % 2 === 1);

  const whiteAcc = report.whiteAccuracy ?? 75;
  const blackAcc = report.blackAccuracy ?? 75;

  const lastMove = moves[moves.length - 1];
  const isCheckmateLast = Boolean(lastMove?.san?.includes('#'));
  const whiteWonByMate = isCheckmateLast && moves.length % 2 === 1;
  const blackWonByMate = isCheckmateLast && moves.length % 2 === 0;

  const whiteWon =
    whiteWonByMate ||
    (report as any).resultDetails?.winner === 'w' ||
    (report as any).result === '1-0' ||
    (!blackWonByMate && (report.whiteAccuracy ?? 0) >= (report.blackAccuracy ?? 0));

  const blackWon =
    blackWonByMate ||
    (report as any).resultDetails?.winner === 'b' ||
    (report as any).result === '0-1' ||
    (!whiteWonByMate && (report.blackAccuracy ?? 0) > (report.whiteAccuracy ?? 0));

  return {
    white: calculatePlayerStats(whiteMoves, whiteAcc, true, whiteWon),
    black: calculatePlayerStats(blackMoves, blackAcc, false, blackWon),
  };
}
