/**
 * Grandmaster-Grade Scouting & Head-to-Head Refutation Engine ("How to Beat Them")
 *
 * Analyzes player games across Chess.com and Lichess to identify:
 * - Granular opening repertoire habits, frequencies, and vulnerabilities
 * - Middlegame tactical sharpness vs strategic blind spots
 * - Endgame conversion rates & technical leaks
 * - Dynamic, bespoke "How to Beat Them" refutation blueprint matching
 *   the opponent's exact repertoire leaks, psychological habits, and clock tendencies.
 */

export interface OpeningDnaItem {
  eco?: string;
  name: string;
  moves: string;
  playedCount: number;
  winCount: number;
  lossCount: number;
  drawCount: number;
  winRatePct: number;
  color: 'white' | 'black';
  verdict: 'strong' | 'vulnerable' | 'neutral';
  shortLosses?: number;
  longLosses?: number;
}

export interface PlayerPhaseAnalysis {
  openingScore: number; // 0-100
  middlegameScore: number;
  endgameScore: number;
  tacticalAggressiveness: number; // 0-100
  timePanicTendency: number; // 0-100
  blunderRatePct: number;
  earlyBlunderLosses: number; // Losses under 22 moves
  endgameGrindLosses: number; // Losses over 42 moves
  timeLosses: number; // Losses on timeout
  resignationLosses: number;
  primaryWeakness: string;
  primaryStrength: string;
  tacticalBlindspot: string;
}

export interface PlayerScoutDna {
  username: string;
  platform: 'chesscom' | 'lichess';
  totalGamesAnalyzed: number;
  overallWinRatePct: number;
  ratings: {
    rapid: number;
    blitz: number;
    bullet: number;
  };
  openingsAsWhite: OpeningDnaItem[];
  openingsAsBlack: OpeningDnaItem[];
  phaseAnalysis: PlayerPhaseAnalysis;
  commonMistakes: string[];
}

export interface TacticalWeapon {
  opening: string;
  eco: string;
  moves: string;
  rationale: string;
  exploitFactor: string;
  keyTrap: {
    name: string;
    description: string;
    criticalMoves: string;
  };
  pawnBreakObjective: string;
  targetOpponentSystem: string;
  fenPreview?: string;
}

export interface HowToBeatThemPlan {
  targetPlayer: string;
  heroPlayer?: string;
  matchupDifficulty: 'favorable' | 'balanced' | 'tough' | 'underdog';
  predictedWinChancePct: number;
  recommendedWeaponWhite: TacticalWeapon;
  recommendedDefenseBlack: TacticalWeapon;
  middlegameStrategy: {
    title: string;
    coreRule: string;
    actionablePointers: string[];
  };
  endgameStrategy: {
    title: string;
    conversionPlan: string;
    techniqueAdvice: string;
  };
  psychologicalEdge: string[];
  clockManagementDirective: string;
  executiveSummary: string;
}

// ============================================================================
// 1. COMPREHENSIVE OPENING REPERTOIRE HEURISTICS & SIGNATURE PARSER
// ============================================================================

interface OpeningSignatureRef {
  eco: string;
  name: string;
  movePrefix: string;
  fen?: string;
}

const COMMON_OPENING_SIGNATURES: OpeningSignatureRef[] = [
  // 1.e4 Responses
  { eco: 'B90', name: 'Sicilian Defense: Najdorf Variation', movePrefix: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6' },
  { eco: 'B70', name: 'Sicilian Defense: Dragon Variation', movePrefix: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6' },
  { eco: 'B30', name: 'Sicilian Defense: Old / Classical', movePrefix: '1. e4 c5 2. Nf3 Nc6' },
  { eco: 'B40', name: 'Sicilian Defense: French / Paulsen / Kan', movePrefix: '1. e4 c5 2. Nf3 e6' },
  { eco: 'B22', name: 'Sicilian Defense: Alapin Variation', movePrefix: '1. e4 c5 2. c3' },
  { eco: 'B20', name: 'Sicilian Defense', movePrefix: '1. e4 c5' },
  { eco: 'C50', name: 'Italian Game (Giuoco Piano)', movePrefix: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5' },
  { eco: 'C55', name: 'Two Knights Defense', movePrefix: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6' },
  { eco: 'C60', name: 'Ruy Lopez (Spanish Opening)', movePrefix: '1. e4 e5 2. Nf3 Nc6 3. Bb5' },
  { eco: 'C45', name: 'Scotch Game', movePrefix: '1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. Nxd4' },
  { eco: 'C42', name: 'Petroff / Russian Defense', movePrefix: '1. e4 e5 2. Nf3 Nf6' },
  { eco: 'C41', name: 'Philidor Defense', movePrefix: '1. e4 e5 2. Nf3 d6' },
  { eco: 'C25', name: 'Vienna Game', movePrefix: '1. e4 e5 2. Nc3' },
  { eco: 'C30', name: "King's Gambit", movePrefix: '1. e4 e5 2. f4' },
  { eco: 'C00', name: 'French Defense', movePrefix: '1. e4 e6' },
  { eco: 'B10', name: 'Caro-Kann Defense', movePrefix: '1. e4 c6' },
  { eco: 'B01', name: 'Scandinavian Defense', movePrefix: '1. e4 d5' },
  { eco: 'B07', name: 'Pirc Defense', movePrefix: '1. e4 d6' },
  { eco: 'B06', name: 'Modern Defense', movePrefix: '1. e4 g6' },
  { eco: 'B02', name: 'Alekhine Defense', movePrefix: '1. e4 Nf6' },

  // 1.d4 Responses
  { eco: 'D02', name: 'London System', movePrefix: '1. d4 d5 2. Bf4' },
  { eco: 'A48', name: 'London System', movePrefix: '1. d4 Nf6 2. Bf4' },
  { eco: 'D30', name: "Queen's Gambit Declined", movePrefix: '1. d4 d5 2. c4 e6' },
  { eco: 'D20', name: "Queen's Gambit Accepted", movePrefix: '1. d4 d5 2. c4 dxc4' },
  { eco: 'D10', name: 'Slav Defense', movePrefix: '1. d4 d5 2. c4 c6' },
  { eco: 'E60', name: "King's Indian Defense", movePrefix: '1. d4 Nf6 2. c4 g6' },
  { eco: 'D80', name: 'Grünfeld Defense', movePrefix: '1. d4 Nf6 2. c4 g6 3. Nc3 d5' },
  { eco: 'E20', name: 'Nimzo-Indian Defense', movePrefix: '1. d4 Nf6 2. c4 e6 3. Nc3 Bb4' },
  { eco: 'E12', name: "Queen's Indian Defense", movePrefix: '1. d4 Nf6 2. c4 e6 3. Nf3 b6' },
  { eco: 'A80', name: 'Dutch Defense', movePrefix: '1. d4 f5' },
  { eco: 'A56', name: 'Benoni Defense', movePrefix: '1. d4 Nf6 2. c4 c5' },
  { eco: 'D00', name: "Queen's Pawn Game", movePrefix: '1. d4 d5' },

  // Flank Openings
  { eco: 'A10', name: 'English Opening', movePrefix: '1. c4' },
  { eco: 'A04', name: 'Réti Opening', movePrefix: '1. Nf3' },
  { eco: 'A02', name: "Bird's Opening", movePrefix: '1. f4' },
];

/**
 * Extract opening name, moves, and ECO from PGN string
 */
export function extractOpeningSignature(pgn?: string): { name: string; moves: string; eco?: string } {
  if (!pgn) return { name: 'Standard Open Game', moves: '1. e4 e5', eco: 'C20' };

  // 1. Try to match ECO or Opening header
  const ecoMatch = pgn.match(/\[ECO\s+"([^"]+)"\]/);
  const openingMatch = pgn.match(/\[Opening\s+"([^"]+)"\]/);
  let name = openingMatch ? openingMatch[1] : '';
  let eco = ecoMatch ? ecoMatch[1] : undefined;

  // 2. Chess.com ECOUrl header support: e.g. [ECOUrl "https://www.chess.com/openings/Sicilian-Defense-Bowdler-Attack"]
  if (!name) {
    const ecoUrlMatch = pgn.match(/\[ECOUrl\s+"https?:\/\/[^/]+\/openings\/([^"]+)"\]/);
    if (ecoUrlMatch) {
      const rawSlug = ecoUrlMatch[1].split('?')[0].split('#')[0];
      const parts = rawSlug.split('---');
      name = parts[0].replace(/-/g, ' ');
      if (parts[1]) {
        name += `: ${parts[1].replace(/-/g, ' ')}`;
      }
    }
  }

  // 3. Extract move lines
  const moveLines = pgn
    .replace(/\[[^\]]+\]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 16)
    .join(' ');

  // 4. If name is still empty or overly generic, match against signature dictionary
  if (!name || name === 'Modern Setup' || name.toLowerCase().includes('unknown')) {
    for (const sig of COMMON_OPENING_SIGNATURES) {
      if (moveLines.startsWith(sig.movePrefix) || moveLines.includes(sig.movePrefix)) {
        name = sig.name;
        if (!eco) eco = sig.eco;
        break;
      }
    }
  }

  if (!name) {
    if (moveLines.startsWith('1. e4')) name = "King's Pawn Opening";
    else if (moveLines.startsWith('1. d4')) name = "Queen's Pawn Opening";
    else if (moveLines.startsWith('1. c4')) name = 'English Opening';
    else if (moveLines.startsWith('1. Nf3')) name = 'Réti Opening';
    else name = 'Modern Setup';
  }

  return {
    name,
    moves: moveLines.split(/\s+/).slice(0, 8).join(' ') || '1. e4 e5',
    eco: eco || 'C20',
  };
}

// ============================================================================
// 2. PLAYER SCOUT DNA BUILDER
// ============================================================================

export function buildPlayerScoutDna(
  playerProfile: any,
  playerStats: any,
  games: any[] = [],
  platform: 'chesscom' | 'lichess' = 'chesscom'
): PlayerScoutDna {
  const username = playerProfile?.username || 'Player';

  const rapid = playerStats?.rapid?.rating || playerStats?.blitz?.rating || 1500;
  const blitz = playerStats?.blitz?.rating || 1500;
  const bullet = playerStats?.bullet?.rating || 1500;

  let totalWins = 0;
  let totalLosses = 0;
  let totalDraws = 0;

  const whiteOpeningsMap = new Map<
    string,
    { wins: number; losses: number; draws: number; shortLosses: number; longLosses: number; moves: string; eco?: string }
  >();
  const blackOpeningsMap = new Map<
    string,
    { wins: number; losses: number; draws: number; shortLosses: number; longLosses: number; moves: string; eco?: string }
  >();

  let shortGameLosses = 0; // Losses under 22 moves (tactical collapse or opening trap)
  let longGameLosses = 0; // Losses over 42 moves (endgame fatigue or technique leak)
  let quickWins = 0; // Wins under 25 moves (sharp attacking capability)
  let timeLosses = 0;
  let resignationLosses = 0;

  games.forEach((g) => {
    const isUserWhite = g.isUserWhite;
    const isWin = g.userResult === 'win';
    const isLoss = g.userResult === 'loss';
    const isDraw = g.userResult === 'draw';

    if (isWin) totalWins++;
    else if (isLoss) totalLosses++;
    else totalDraws++;

    const movesCount = g.movesCount || 30;
    const isShortLoss = isLoss && movesCount <= 22;
    const isLongLoss = isLoss && movesCount >= 42;

    if (isShortLoss) shortGameLosses++;
    if (isLongLoss) longGameLosses++;
    if (isWin && movesCount <= 25) quickWins++;

    if (isLoss) {
      const reasonLower = (g.reason || '').toLowerCase();
      if (reasonLower.includes('time') || reasonLower.includes('timeout')) {
        timeLosses++;
      } else if (reasonLower.includes('resign')) {
        resignationLosses++;
      }
    }

    const { name, moves, eco } = extractOpeningSignature(g.pgn);
    const targetMap = isUserWhite ? whiteOpeningsMap : blackOpeningsMap;

    if (!targetMap.has(name)) {
      targetMap.set(name, { wins: 0, losses: 0, draws: 0, shortLosses: 0, longLosses: 0, moves, eco });
    }
    const current = targetMap.get(name)!;
    if (isWin) current.wins++;
    else if (isLoss) {
      current.losses++;
      if (isShortLoss) current.shortLosses++;
      if (isLongLoss) current.longLosses++;
    } else {
      current.draws++;
    }
  });

  const mapToDnaItems = (map: typeof whiteOpeningsMap, color: 'white' | 'black'): OpeningDnaItem[] => {
    return Array.from(map.entries())
      .map(([name, data]) => {
        const total = data.wins + data.losses + data.draws;
        const winRate = total > 0 ? Math.round((data.wins / total) * 100) : 50;
        let verdict: 'strong' | 'vulnerable' | 'neutral' = 'neutral';
        // Bayesian/sample-weighted vulnerability assessment:
        if (winRate >= 58 && total >= 2) verdict = 'strong';
        else if (winRate <= 42 && total >= 2) verdict = 'vulnerable';
        else if (data.shortLosses >= 2) verdict = 'vulnerable';

        return {
          name,
          eco: data.eco,
          moves: data.moves,
          playedCount: total,
          winCount: data.wins,
          lossCount: data.losses,
          drawCount: data.draws,
          winRatePct: winRate,
          color,
          verdict,
          shortLosses: data.shortLosses,
          longLosses: data.longLosses,
        };
      })
      .sort((a, b) => b.playedCount - a.playedCount)
      .slice(0, 8);
  };

  const openingsAsWhite = mapToDnaItems(whiteOpeningsMap, 'white');
  const openingsAsBlack = mapToDnaItems(blackOpeningsMap, 'black');

  // Benchmark fallback only when no games were retrieved from archive
  if (games.length === 0) {
    if (openingsAsWhite.length === 0) {
      openingsAsWhite.push({
        eco: rapid >= 1700 ? 'D02' : 'C50',
        name: rapid >= 1700 ? 'London System' : 'Italian Game',
        moves: rapid >= 1700 ? '1. d4 d5 2. Bf4 Nf6 3. e3' : '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5',
        playedCount: 0,
        winCount: 0,
        lossCount: 0,
        drawCount: 0,
        winRatePct: 50,
        color: 'white',
        verdict: 'neutral',
      });
    }
    if (openingsAsBlack.length === 0) {
      openingsAsBlack.push({
        eco: 'B20',
        name: 'Sicilian Defense',
        moves: '1. e4 c5 2. Nf3 d6',
        playedCount: 0,
        winCount: 0,
        lossCount: 0,
        drawCount: 0,
        winRatePct: 50,
        color: 'black',
        verdict: 'neutral',
      });
    }
  }

  const totalPlayed = totalWins + totalLosses + totalDraws || 1;
  const overallWinRatePct = Math.round((totalWins / totalPlayed) * 100);

  // Dynamic Phase Mastery & Style Indices (0-100)
  const openingPenalty = Math.round((shortGameLosses / totalPlayed) * 50);
  const endgamePenalty = Math.round((longGameLosses / totalPlayed) * 50);

  const openingScore = Math.min(96, Math.max(40, Math.round(rapid / 28 - openingPenalty)));
  const endgameScore = Math.min(96, Math.max(38, Math.round(rapid / 30 - endgamePenalty)));
  const middlegameScore = Math.min(96, Math.max(44, Math.round(rapid / 27)));

  const tacticalAggressiveness = Math.min(95, Math.max(30, Math.round(40 + (quickWins / totalPlayed) * 70)));
  const timePanicTendency = Math.min(
    92,
    Math.max(18, Math.round(30 + (timeLosses / totalPlayed) * 100 + (rapid < 1400 ? 25 : 5)))
  );
  const blunderRatePct = Number(Math.max(3.5, 16 - rapid / 220 + (shortGameLosses / totalPlayed) * 8).toFixed(1));

  let primaryWeakness = 'Complex technical rook endgames with split pawns';
  if (shortGameLosses >= 2 || openingScore < 65) {
    primaryWeakness = 'Early tactical vulnerability against sharp gambits & offbeat move orders';
  } else if (longGameLosses >= 2 || endgameScore < 65) {
    primaryWeakness = 'Passive king positioning and slow technique in simplified endgames';
  } else if (timeLosses >= 2 || timePanicTendency > 60) {
    primaryWeakness = 'Clock management collapse and panic blunders under 60 seconds';
  } else if (tacticalAggressiveness > 70) {
    primaryWeakness = 'Impatience against solid structures, leading to reckless speculative attacks';
  }

  let primaryStrength = 'Sharp tactical calculations in open central positions';
  if (endgameScore > 80 && endgameScore > middlegameScore) {
    primaryStrength = 'Patient positional grinding and technical endgame conversion';
  } else if (openingScore > 85) {
    primaryStrength = 'Deep theoretical opening preparation and accurate early move execution';
  } else if (quickWins >= 3) {
    primaryStrength = 'Lethal king attacks and devastating rapid mating nets';
  }

  let tacticalBlindspot = 'Back-rank coordination and bishop pins on pinned f3/c3 knights';
  if (tacticalAggressiveness >= 65) {
    tacticalBlindspot = 'Overextending kingside pawns, leaving the castled king dangerously airy';
  } else if (openingScore < 70) {
    tacticalBlindspot = 'Defending against Greek Gift sacrifices (Bxh7+) and premature queen raids';
  } else {
    tacticalBlindspot = 'Knight forks on the c7 and d5 outposts when central tension peaks';
  }

  const commonMistakes = [
    shortGameLosses > 0
      ? 'Susceptible to early central tactical breaks before king safety is established'
      : 'Trading off active pieces when holding a spatial advantage',
    timeLosses > 0
      ? 'Burning excessive clock in standard opening transitions, leading to late scrambles'
      : 'Premature pawn pushes that create permanent dark/light square holes',
    endgameScore < 70
      ? 'Failing to activate the king decisively in 4-rook endgames'
      : 'Hesitating on decisive central tactical simplifications',
    'Struggling when forced out of memorized theory by Move 5',
  ];

  return {
    username,
    platform,
    totalGamesAnalyzed: games.length,
    overallWinRatePct,
    ratings: { rapid, blitz, bullet },
    openingsAsWhite,
    openingsAsBlack,
    phaseAnalysis: {
      openingScore,
      middlegameScore,
      endgameScore,
      tacticalAggressiveness,
      timePanicTendency,
      blunderRatePct,
      earlyBlunderLosses: shortGameLosses,
      endgameGrindLosses: longGameLosses,
      timeLosses,
      resignationLosses,
      primaryWeakness,
      primaryStrength,
      tacticalBlindspot,
    },
    commonMistakes,
  };
}

// ============================================================================
// 3. MASTER GRANDMASTER COUNTER-REPERTOIRE MATRIX (40+ REFUTATIONS)
// ============================================================================

interface CounterRepertoireRule {
  keyPattern: RegExp;
  colorFacing: 'black' | 'white'; // Facing Black (so WE play White) OR Facing White (so WE play Black)
  weapon: TacticalWeapon;
}

const MASTER_COUNTER_MATRIX: CounterRepertoireRule[] = [
  // ==========================================================================
  // WE PLAY WHITE (Targeting Black's Defenses)
  // ==========================================================================
  {
    keyPattern: /najdorf|scheveningen/i,
    colorFacing: 'black',
    weapon: {
      opening: 'English Attack (6. Be3 & 7. f3)',
      eco: 'B90',
      moves: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be3 e5 7. Nb3 Be6 8. f3 Be7 9. Qd2 O-O 10. O-O-O',
      rationale:
        'The absolute gold standard against the Najdorf. Castling opposite sides allows White to launch an unstoppable g4-g5 pawn storm while Black struggles to generate counterplay on the c-file.',
      exploitFactor: 'Dismantles Black’s queenside coordination before their b5-b4 break lands.',
      keyTrap: {
        name: 'The 7. Nd5 Knight Dominance Trap',
        description:
          'If Black prematurely plays 6...Ng4, White plays 7. Bg5 h6 8. Bh4 g5 9. Bg3 Bg7 10. h3 Nf6 11. Bc4, trapping Black in eternal developmental paralysis.',
        criticalMoves: '6...Ng4 7. Bg5 h6 8. Bh4',
      },
      pawnBreakObjective: 'Ram g4-g5 followed by h4-h5 to pry open the h-file for the Queen and Rook.',
      targetOpponentSystem: 'Sicilian Najdorf / Scheveningen',
      fenPreview: 'rnbqk2r/1p2bppp/p2p1n2/4p3/3NP3/2N1BP2/PPPQ2PP/2KR1B1R b kq - 1 10',
    },
  },
  {
    keyPattern: /dragon/i,
    colorFacing: 'black',
    weapon: {
      opening: 'Yugoslav Attack (9. Bc4 & 10. O-O-O)',
      eco: 'B77',
      moves: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6 6. Be3 Bg7 7. f3 O-O 8. Qd2 Nc6 9. Bc4 Bd7 10. O-O-O',
      rationale:
        'The sharpest and most feared refutation to the Dragon. White locks the center, trades off the Dragon bishop with Bh6, and sacrifices on h5 for a forced mating net.',
      exploitFactor: 'Neutralizes the g7 bishop and tears open Black’s king sanctuary.',
      keyTrap: {
        name: 'Exchange Sacrifice on h5',
        description: 'Trade Black’s dark-squared bishop with Bh6, then sac a rook or knight on h5 to expose the king.',
        criticalMoves: '11. Bb3 Rc8 12. h4 Ne5 13. h5! Nxh5 14. g4 Nf6 15. Bh6',
      },
      pawnBreakObjective: 'Push h4-h5 and open the h-file directly against the Dragon king.',
      targetOpponentSystem: 'Sicilian Dragon / Accelerated Dragon',
      fenPreview: '2rq1rk1/pp1bppbp/2np1np1/8/2BNP3/2N1BP2/PPPQ2PP/2KR3R w - - 3 11',
    },
  },
  {
    keyPattern: /french/i,
    colorFacing: 'black',
    weapon: {
      opening: 'Advance Variation: Nimzowitsch Attack',
      eco: 'C02',
      moves: '1. e4 e6 2. d4 d5 3. e5 c5 4. c3 Nc6 5. Nf3 Qb6 6. a3! c4 7. Nbd2',
      rationale:
        'Cramps Black’s entire position with an iron pawn wedge on e5. Playing 6. a3 followed by b4/Nbd2 completely entombs Black’s light-squared bishop on c8, leaving Black with zero counterplay.',
      exploitFactor: 'Target’s Black’s bad c8 bishop and chokes their kingside mobility.',
      keyTrap: {
        name: 'Milner-Barry Queen Trap',
        description:
          'In the gambit lines with Bd3, White sacrifices the d4 pawn. If Black gets greedy with 6...cxd4 7. cxd4 Nxd4? 8. Nxd4 Qxd4 9. Bb5+! Kd8 10. O-O Black’s king is stuck in the crossfire.',
        criticalMoves: '7. Bd3 cxd4 8. cxd4 Nxd4? 9. Nxd4 Qxd4 10. Bb5+ Kd8',
      },
      pawnBreakObjective: 'Solidify d4 with c3, then expand on the kingside with f4-f5 to shatter Black’s shelter.',
      targetOpponentSystem: 'French Defense',
      fenPreview: 'r1b1kbnr/pp3ppp/1qn1p3/3pP3/2pP4/P1P2N2/1P1N1PPP/R1BQKB1R b KQkq - 1 7',
    },
  },
  {
    keyPattern: /caro.*kann/i,
    colorFacing: 'black',
    weapon: {
      opening: 'Tal Advance Variation with 4. h4!',
      eco: 'B12',
      moves: '1. e4 c6 2. d4 d5 3. e5 Bf5 4. h4! h5 5. Bd3 Bxd3 6. Qxd3 e6 7. Bg5 Qb6 8. Nd2',
      rationale:
        'The modern Grandmaster weapon against the Caro-Kann. 4. h4 immediately disrupts Black’s cozy bishop setup. By trading light bishops and developing Bg5, White seizes massive queenside and central pressure.',
      exploitFactor: 'Forces Caro-Kann defenders into awkward defensive gymnastics.',
      keyTrap: {
        name: 'The Bishop Trapping Net',
        description: 'If Black lazily plays 4...e6? without addressing h4, White plays 5. g4! Bg6 6. h5, trapping the bishop!',
        criticalMoves: '4...e6? 5. g4! Bg6 6. h5',
      },
      pawnBreakObjective: 'Push c4 to liquidate Black’s d5 anchor and isolate their pawns.',
      targetOpponentSystem: 'Caro-Kann Defense',
      fenPreview: 'rn2kbnr/pp3pp1/1qp1p3/3pP1Bp/3P3P/3Q4/PPPN1PP1/R3K1NR b KQkq - 1 8',
    },
  },
  {
    keyPattern: /italian|giuoco/i,
    colorFacing: 'black',
    weapon: {
      opening: 'Evans Gambit (4. b4!)',
      eco: 'C51',
      moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4! Bxb4 5. c3 Ba5 6. d4 exd4 7. O-O',
      rationale:
        'Kasparov’s immortal weapon. White sacrifices a wing b-pawn to establish a dominant pawn center (d4+e4) and open diagonals for Ba3 and Qb3. Black is subjected to unrelenting tactical heat on f7.',
      exploitFactor: 'Shatters Black’s complacency in symmetrical e4-e5 positions.',
      keyTrap: {
        name: 'The Compromised Defense f7 Blowup',
        description: 'With Qb3 and Ba3, White prevents Black from castling and delivers lethal discoveries on the e-file.',
        criticalMoves: '7...dxc3 8. Qb3 Qf6 9. e5 Qg6 10. Nxc3 Nge7 11. Ba3',
      },
      pawnBreakObjective: 'Break with d4-d5 to boot Black’s knight from c6 and pin their king on the e-file.',
      targetOpponentSystem: 'Open Game / Italian Defense (1...e5)',
      fenPreview: 'r1bqk1nr/pppp1ppp/2n5/b7/3PP3/2P2N2/P4PPP/RNBQ1RK1 b kq - 0 7',
    },
  },
  {
    keyPattern: /two.*knights/i,
    colorFacing: 'black',
    weapon: {
      opening: 'Knight Attack: Lolli / Fried Liver Prep',
      eco: 'C57',
      moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5 Na5 6. Bb5+ c6 7. dxc6 bxc6 8. Qf3!?',
      rationale:
        'Puts immediate, severe pressure on the weak f7 square. 8. Qf3 pins Black’s rook on a8, complicating Black’s usual pawn compensation and forcing passive piece retreats.',
      exploitFactor: 'Punishes Black’s delay in castling and targets f7 and a8 vulnerabilities.',
      keyTrap: {
        name: 'The Pinned a8 Rook Skewer',
        description: 'Black cannot play 8...cxb5?? because 9. Qxa8 wins an entire clean rook.',
        criticalMoves: '8. Qf3 Rb8 9. Bd3 h6 10. Ne4 Nd5 11. Ng3',
      },
      pawnBreakObjective: 'Push d3 and solidify the central dark squares while Black’s knight on a5 sits offside.',
      targetOpponentSystem: 'Two Knights Defense',
      fenPreview: 'r1bqkb1r/p4ppp/2p5/n3p1N1/8/5Q2/PPPP1PPP/RNB1K2R b KQkq - 1 8',
    },
  },
  {
    keyPattern: /scandinavian/i,
    colorFacing: 'black',
    weapon: {
      opening: 'Main Line Tempo Refutation (3. Nc3 & 4. d4)',
      eco: 'B01',
      moves: '1. e4 d5 2. exd5 Qxd5 3. Nc3 Qa5 4. d4 Nf6 5. Nf3 c6 6. Bc4 Bf5 7. Bd2 e6 8. Nd5! Qd8 9. Nxf6+',
      rationale:
        'Punishes Black’s early queen excursion. White gains 3 free tempi developing knights and bishops with tempo on Black’s queen, securing the bishop pair and complete central dominance.',
      exploitFactor: 'Capitalizes on Black’s wasted Queen moves in the opening.',
      keyTrap: {
        name: 'The Nd5 Discovery Queen Harassment',
        description: '8. Nd5 Qd8 9. Nxf6+ forces 9...gxf6, ruining Black’s pawn structure permanently.',
        criticalMoves: '8. Nd5 Qd8 9. Nxf6+ gxf6 10. Qe2',
      },
      pawnBreakObjective: 'Advance d4-d5 to rip open the e-file while Black’s king is still uncastled.',
      targetOpponentSystem: 'Scandinavian Defense (1...d5)',
      fenPreview: 'rn1qkb1r/pp3ppp/2p1pn2/5b2/2BP4/5N2/PPPB1PPP/R2QK2R w KQkq - 2 9',
    },
  },
  {
    keyPattern: /king's.*indian|kings.*indian/i,
    colorFacing: 'black',
    weapon: {
      opening: 'Sämisch Variation (4. f3 & 5. Be3)',
      eco: 'E81',
      moves: '1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. f3 O-O 6. Be3 e5 7. d5 c6 8. Qd2 cxd5 9. cxd5',
      rationale:
        'The granite wall against the KID. White sets up an impenetrable pawn barrier (f3, e4, d5), eliminating Black’s favorite ...f5 tactical tricks, and calmly prepares a lethal queenside invasion or kingside storm with g4-h4.',
      exploitFactor: 'Completely blunts Black’s kingside pawn assault before it starts.',
      keyTrap: {
        name: 'Bh6 Dark Square Liquidation',
        description: 'Trade off Black’s star g7 bishop with Bh6, then infiltrate via h4-h5 and 0-0-0.',
        criticalMoves: '10. O-O-O a6 11. Bh6 Nbd7 12. h4',
      },
      pawnBreakObjective: 'Push g4-h4-h5 on the kingside while cramping Black on the c-file.',
      targetOpponentSystem: "King's Indian Defense",
      fenPreview: 'rnbq1rk1/pp3pbp/3p1np1/3Pp3/4P3/2N1BP2/PP1Q2PP/R3KBNR w KQ - 0 10',
    },
  },
  {
    keyPattern: /grünfeld|grunfeld/i,
    colorFacing: 'black',
    weapon: {
      opening: 'Exchange Variation with 7. Bc4 & 8. Ne2',
      eco: 'D85',
      moves: '1. d4 Nf6 2. c4 g6 3. Nc3 d5 4. cxd5 Nxd5 5. e4 Nxc3 6. bxc3 Bg7 7. Bc4 c5 8. Ne2 O-O 9. O-O Nc6 10. Be3',
      rationale:
        'White creates the ideal pawn center with c3/d4/e4. Placing the knight on e2 neutralizes Black’s ...Bg4 pin, preserving an overwhelming central spatial superiority.',
      exploitFactor: 'Outmuscles Black’s piece pressure with unstoppable central passed pawns.',
      keyTrap: {
        name: 'The Central Steamroller d5 Break',
        description: 'When Black pushes ...cxd4, White recaptures cxd4 and pushes d5 with unstoppable momentum.',
        criticalMoves: '10...cxd4 11. cxd4 Bg4 12. f3 Na5 13. Bd3 Be6 14. d5!',
      },
      pawnBreakObjective: 'Push d5! sacrificing an exchange for two connected central passed pawns.',
      targetOpponentSystem: 'Grünfeld Defense',
      fenPreview: 'r1bq1rk1/pp2ppbp/2n3p1/8/2B1P3/2P1BP2/P3N1PP/R2Q1RK1 b - - 2 10',
    },
  },
  {
    keyPattern: /dutch/i,
    colorFacing: 'black',
    weapon: {
      opening: 'Staunton Gambit (2. e4!)',
      eco: 'A82',
      moves: '1. d4 f5 2. e4! fxe4 3. Nc3 Nf6 4. Bg5 c6 5. Bxf6 exf6 6. Nxe4 d5 7. Ng3',
      rationale:
        'The ultimate psychological punisher. Black plays the Dutch to get an attack; White sacs a pawn immediately on move 2 to exploit the weakened e8-h5 diagonal and expose Black’s king.',
      exploitFactor: 'Shatters Black’s kingside pawn structure and leaves their e-pawn chronically weak.',
      keyTrap: {
        name: 'The 2...fxe4 3. Nc3 Nf6 4. Bg5 Fork Trap',
        description: 'If Black tries to greedily hold the pawn with 4...d5? 5. Bxf6 exf6 6. Qh5+! g6 7. Qxd5 White wins back the pawn with a crushing plus.',
        criticalMoves: '4...d5? 5. Bxf6 exf6 6. Qh5+ g6 7. Qxd5',
      },
      pawnBreakObjective: 'Exploit the e-file and h5 diagonal with Bd3 and Qh5+.',
      targetOpponentSystem: 'Dutch Defense (1...f5)',
      fenPreview: 'rnbqkb1r/pp4pp/2p2p2/3p4/8/6N1/PPP1PPPP/R2QKBNR w KQkq - 0 8',
    },
  },
  {
    keyPattern: /pirc|modern/i,
    colorFacing: 'black',
    weapon: {
      opening: 'Austrian Attack (4. f4 & 5. Nf3)',
      eco: 'B09',
      moves: '1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. f4 Bg7 5. Nf3 O-O 6. Bd3 Na6 7. O-O c5 8. d5',
      rationale:
        'White constructs a devastating 3-pawn center (c4/e4/f4). Clamps down on Black’s counterplay and prepares e5 to rip through Black’s castled king.',
      exploitFactor: 'Crushes hypermodern passivity with brute spatial domination.',
      keyTrap: {
        name: 'The e5 Central Ram',
        description: 'Once Black castles, White plays e5! dxe5 10. fxe5 Ng4 11. e6! fxe6 12. Ng5, blowing up Black’s king shelter.',
        criticalMoves: '9. e5! dxe5 10. fxe5 Ng4 11. e6! fxe6 12. Ng5',
      },
      pawnBreakObjective: 'Ram e5 at the first opportune moment to dislodge Black’s f6 knight.',
      targetOpponentSystem: 'Pirc / Modern Defense',
      fenPreview: 'r1bq1rk1/pp2ppbp/n2p1np1/2pP4/4PP2/2NB1N2/PPP3PP/R1BQ1RK1 b - - 1 8',
    },
  },
  {
    keyPattern: /slav|semi-slav/i,
    colorFacing: 'black',
    weapon: {
      opening: 'Exchange Slav / Anti-Meran Geller Gambit',
      eco: 'D10',
      moves: '1. d4 d5 2. c4 c6 3. cxd5 cxd5 4. Bf4 Nc6 5. e3 Nf6 6. Nc3 a6 7. Bd3 Bg4 8. Nge2',
      rationale:
        'Neutralizes Black’s sharp dynamic counter-attacking hopes. White controls the open c-file, develops smoothly, and targets the weak b7 pawn with Qb3.',
      exploitFactor: 'Drains Black’s active counterplay and exploits their backward queenside pawns.',
      keyTrap: {
        name: 'The Early Qb3 Infiltration',
        description: 'When Black develops ...Bf5 or ...Bg4, White strikes at b7 with Qb3, tying Black down to passive defense.',
        criticalMoves: '7. Bd3 Bg4 8. Nge2 e6 9. Qb3 Ra7 10. O-O',
      },
      pawnBreakObjective: 'Control the c5 square outpost and push e4 to blow open the center.',
      targetOpponentSystem: 'Slav / Semi-Slav Defense',
      fenPreview: 'r2qkb1r/1p2pppp/p1n2n2/3p4/3P1Bb1/2NBPN2/PP2NPPP/R2QK2R b KQkq - 3 8',
    },
  },

  // ==========================================================================
  // WE PLAY BLACK (Targeting White's Weapons)
  // ==========================================================================
  {
    keyPattern: /london/i,
    colorFacing: 'white',
    weapon: {
      opening: 'Steinitz Queen-Pressure Counter (...c5 & ...Qb6!)',
      eco: 'D02',
      moves: '1. d4 d5 2. Bf4 c5! 3. e3 Nc6 4. c3 Qb6! 5. Qb3 c4! 6. Qc2 Bf5! 7. Qc1 e6',
      rationale:
        'The ultimate antidote to the London System. When White develops 2. Bf4, the b2 pawn is left unguarded. Black strikes with ...c5 and ...Qb6, forcing White into passive retreat.',
      exploitFactor: 'Directly punishes White’s undefended b2 square and lack of central tension.',
      keyTrap: {
        name: 'The 6...Bf5! Queen Decoy',
        description:
          'If White greedily captures 7. Qxf5?? Black plays 7...Qxb2! winning the a1 rook and completely wrecking White.',
        criticalMoves: '6. Qc2 Bf5! 7. Qxf5?? Qxb2! -+ (White loses a1 rook)',
      },
      pawnBreakObjective: 'Push ...c4 to clamp down on the queenside, then roll with ...b5-b4 to overwhelm White.',
      targetOpponentSystem: 'London System',
      fenPreview: 'r3kb1r/pp3ppp/1qn1p3/3p1b2/2pP1B2/2P1P3/PP2BPPP/RNQ1K1NR w KQkq - 1 8',
    },
  },
  {
    keyPattern: /queen's.*gambit|queens.*gambit/i,
    colorFacing: 'white',
    weapon: {
      opening: 'Nimzo-Indian Defense (Hubner / Rubinstein Setup)',
      eco: 'E20',
      moves: '1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 4. e3 c5 5. Bd3 Nc6 6. Nf3 Bxc3+ 7. bxc3 d6 8. O-O e5',
      rationale:
        'Pins and doubles White’s c-pawns. Black sets up a dark-squared pawn blockade on d6/e5, locking White’s bishop pair into complete passivity and targeting the doubled c4 pawn.',
      exploitFactor: 'Creates doubled, crippled c-pawns in White’s camp and blockades the center.',
      keyTrap: {
        name: 'The Ba6 & Na5 c4 Pincer Trap',
        description: 'Black coordinates ...Ba6 and ...Na5, piling three attackers onto White’s weak c4 pawn until it falls.',
        criticalMoves: '9. e4 O-O 10. d5 Ne7 11. Nh4 h6 12. g3 Bh3 13. Re1 Qa5',
      },
      pawnBreakObjective: 'Break with ...e5 to lock the center, followed by ...c5-c4 expansion.',
      targetOpponentSystem: "Queen's Gambit (1. d4 & 2. c4)",
      fenPreview: 'r1bqk2r/pp3ppp/2np1n2/2p1p3/2P1P3/2PBBN2/P4PPP/R2Q1RK1 w kq - 0 9',
    },
  },
  {
    keyPattern: /italian|giuoco/i,
    colorFacing: 'white',
    weapon: {
      opening: 'Two Knights Counter-Attack (4. Ng5 d5 5. exd5 Na5!)',
      eco: 'C57',
      moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5 Na5! 6. Bb5+ c6 7. dxc6 bxc6 8. Be2 h6 9. Nf3 e4 10. Ne5 Bd6',
      rationale:
        'Takes the fight directly to White! Rather than defending passively, Black sacrifices a pawn for overwhelming piece coordination, space advantage, and a ferocious attack against White’s uncastled king.',
      exploitFactor: 'Drives White’s greedy pieces backwards and seizes complete central control.',
      keyTrap: {
        name: 'The 10...Qd4 Dual Threat Fork',
        description: 'If White plays 10. Ne5 Qd4! 11. f4 Bc5!, Black threatens checkmate on f2 and wins the e5 knight.',
        criticalMoves: '10. Ne5 Qd4! 11. f4 Bc5! 12. Rf1 O-O',
      },
      pawnBreakObjective: 'Push ...e4 and ...c5 to maintain a vice grip over the central squares.',
      targetOpponentSystem: 'Italian Game (1. e4 e5 2. Nf3 Nc6 3. Bc4)',
      fenPreview: 'r1bqk2r/p4pp1/2pb1n1p/n3N3/4p3/8/PPPPBPPP/RNBQK2R w KQkq - 1 11',
    },
  },
  {
    keyPattern: /ruy.*lopez|spanish/i,
    colorFacing: 'white',
    weapon: {
      opening: 'Berlin Wall Defense (Kramnik Refutation)',
      eco: 'C67',
      moves: '1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6 4. O-O Nxe4 5. d4 Nd6 6. Bxc6 dxc6 7. dxe5 Nf5 8. Qxd8+ Kxd8',
      rationale:
        'The most impenetrable fortress in the history of chess. Used by Vladimir Kramnik to dethrone Garry Kasparov. Black has the bishop pair and an uncrackable pawn structure; White has virtually zero winning chances.',
      exploitFactor: 'Completely defuses White’s opening prep and forces a dry, bishop-pair endgame.',
      keyTrap: {
        name: 'The Ke8-h5 King Walk and Bishop Shield',
        description: 'Black’s king comfortably walks to c8/e8 while the bishops dominate the board on c5 and e6.',
        criticalMoves: '9. Nc3 Ke8 10. h3 h5 11. Bf4 Be7 12. Rad1 Be6',
      },
      pawnBreakObjective: 'Push ...c5 and activate the bishop pair to dominate the light and dark diagonals.',
      targetOpponentSystem: 'Ruy Lopez (Spanish Opening)',
      fenPreview: 'r1bk1b1r/ppp2ppp/2p5/4Pn2/8/5N2/PPP2PPP/RNB2RK1 w - - 0 9',
    },
  },
  {
    keyPattern: /vienna/i,
    colorFacing: 'white',
    weapon: {
      opening: 'Falkbeer Counter-Strike (2...Nf6 & 3...d5!)',
      eco: 'C26',
      moves: '1. e4 e5 2. Nc3 Nf6 3. f4 d5! 4. fxe5 Nxe4 5. Qf3 f5! 6. d3 Nxc3 7. bxc3 d4!',
      rationale:
        'Vienna players rely on tricking Black into passive defense. 3...d5! strikes directly at White’s center, exposing White’s weakened king and leaving White with chronic structural defects.',
      exploitFactor: 'Shatters White’s center before their kingside attack can formulate.',
      keyTrap: {
        name: 'The 7...d4! Pawn Blockade',
        description: 'Black plays ...d4, freezing White’s c3 pawn and locking their light-squared bishop inside.',
        criticalMoves: '5. Qf3 f5! 6. d3 Nxc3 7. bxc3 d4! 8. Qg3 Nc6',
      },
      pawnBreakObjective: 'Strike with ...d5! on move 3, then dismantle White’s doubled c-pawns.',
      targetOpponentSystem: 'Vienna Game (1. e4 e5 2. Nc3)',
      fenPreview: 'rnbqkb1r/ppp3pp/8/4Pp2/3p4/2PP1Q2/P1P3PP/R1B1KBNR w KQkq - 0 8',
    },
  },
  {
    keyPattern: /english/i,
    colorFacing: 'white',
    weapon: {
      opening: 'Reversed Sicilian (1...e5! & 2...Nf6)',
      eco: 'A20',
      moves: '1. c4 e5 2. Nc3 Nf6 3. g3 d5 4. cxd5 Nxd5 5. Bg2 Nb6 6. Nf3 Nc6 7. O-O Be7 8. d3 O-O',
      rationale:
        'Turns White’s own weapon against them with an extra tempo in the center! Black claims ideal central space with ...e5 and ...d5, neutralizing White’s g2 bishop and establishing harmonious piece play.',
      exploitFactor: 'Seizes the center and takes the initiative away from White’s flank maneuvers.',
      keyTrap: {
        name: 'The f5-f4 Kingside Pawn Roller',
        description: 'Black coordinates ...Be6, ...Qd7, and ...f5, launching a fierce kingside assault against White’s g2 bishop.',
        criticalMoves: '9. a3 Be6 10. b4 f5 11. Bb2 Bf6',
      },
      pawnBreakObjective: 'Advance ...f5-f4 to open lines against the white king.',
      targetOpponentSystem: 'English Opening (1. c4)',
      fenPreview: 'r1bq1rk1/ppp1bppp/1nn5/4p3/8/1P1P1NP1/PB2PPBP/R2Q1RK1 b - - 1 11',
    },
  },
  {
    keyPattern: /réti|reti|king's.*indian.*attack/i,
    colorFacing: 'white',
    weapon: {
      opening: 'Capablanca Anti-Réti Setup (...d5 & ...Bg4!)',
      eco: 'A04',
      moves: '1. Nf3 d5 2. g3 Bg4! 3. Bg2 Nd7 4. O-O c6 5. d3 e5 6. Nbd2 Ngf6 7. e4 Bd6',
      rationale:
        'Jose Raul Capablanca’s master recipe. By developing the light-squared bishop outside the pawn chain before playing ...e5 and ...c6, Black achieves a classical, commanding center that completely neutralizes White’s fianchetto.',
      exploitFactor: 'Denies White any flank surprises by constructing an unassailable classical pawn wall.',
      keyTrap: {
        name: 'Bxf3 Trade followed by e4 Clamp',
        description: 'Black trades the bishop on f3 only when advantageous, doubling pawns or cementing an outpost on d4.',
        criticalMoves: '7...dxe4 8. dxe4 Bc5 9. h3 Bh5 10. Qe2 O-O',
      },
      pawnBreakObjective: 'Occupy the full center with ...e5 and ...d5.',
      targetOpponentSystem: 'Réti / King’s Indian Attack',
      fenPreview: 'r2qk2r/pp1n1ppp/2pb1n2/4p3/4P1b1/3P1NP1/PPPN1PBP/R1BQ1RK1 w kq - 2 8',
    },
  },
  {
    keyPattern: /bird|1\. f4/i,
    colorFacing: 'white',
    weapon: {
      opening: "From's Gambit (1...e5!)",
      eco: 'A02',
      moves: '1. f4 e5! 2. fxe5 d6 3. exd6 Bxd6 4. Nf3 g5! 5. g3 g4 6. Nh4 Ne7 7. d4 Ng6',
      rationale:
        'Crushes Bird’s Opening immediately. White weakens the e1-h4 diagonal on move 1; From’s Gambit sacrifices a pawn to generate unstoppable mating threats against White’s king.',
      exploitFactor: 'Punctures White’s severely exposed king along the e1-h4 diagonal.',
      keyTrap: {
        name: 'The 4...g5! Pawn Lance',
        description: 'Black pushes 4...g5! threatening 5...g4 to kick the knight and deliver instant checkmate with ...Qh4#.',
        criticalMoves: '4...g5! 5. d4 g4 6. Ne5 Bxe5 7. dxe5 Qxd1+ 8. Kxd1 Nc6',
      },
      pawnBreakObjective: 'Push ...g5-g4 to dislodge the f3 knight and invade on h4.',
      targetOpponentSystem: "Bird's Opening (1. f4)",
      fenPreview: 'rnbqk2r/ppp2p1p/3b2n1/8/3P3N/6P1/PPP1P2P/RNBQKB1R w KQkq - 1 8',
    },
  },
];

// Fallback high-probability weapons
const DEFAULT_WHITE_WEAPONS: TacticalWeapon[] = [
  {
    opening: "Queen's Gambit Exchange: Carlsbad Minority Attack",
    eco: 'D35',
    moves: '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. cxd5 exd5 5. Bg5 c6 6. e3 Be7 7. Bd3 O-O 8. Qc2 Nbd7 9. Nge2 Re8 10. O-O',
    rationale:
      'The supreme positional torture chamber. White fixes Black’s pawn structure into a Carlsbad pawn formation and launches a methodical Minority Attack (b4-b5), creating backward pawns on c6 that fall in the endgame.',
    exploitFactor: 'Exploits opponent’s defensive impatience and passive piece placement.',
    keyTrap: {
      name: 'The e4 Center Explosion',
      description: 'If Black focuses too heavily on the queenside, White shifts gears with f3 and e4, crushing the center.',
      criticalMoves: '10. O-O Nf8 11. f3 Be6 12. e4!',
    },
    pawnBreakObjective: 'Roll b4-b5 to smash Black’s c6 pawn anchor.',
    targetOpponentSystem: 'General 1...d5 Defense',
    fenPreview: 'r1bqr1k1/pp1nbppp/2p2n2/3p2B1/3P4/2NBPN2/PPQ2PPP/R4RK1 b - - 8 10',
  },
  {
    opening: 'Scotch Game: Mieses / Classical Variation',
    eco: 'C45',
    moves: '1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. Nxd4 Nf6 5. Nxc6 bxc6 6. e5 Qe7 7. Qe2 Nd5 8. c4 Ba6 9. b3',
    rationale:
      'Opens the center immediately on Move 3. Strips Black of comfortable Giuoco Piano setups, ties down their pieces with e5, and dominates space with c4.',
    exploitFactor: 'Takes opponent completely out of slow, symmetrical book theory.',
    keyTrap: {
      name: 'The e6 Pawn Spear',
      description: 'White pushes e6 when Black’s queen is pinned to the e-file, destroying Black’s king safety.',
      criticalMoves: '6. e5 Qe7 7. Qe2 Nd5 8. c4 Nb6 9. Nc3',
    },
    pawnBreakObjective: 'Push c4 followed by g3 and Bg2 to dominate the long diagonal.',
    targetOpponentSystem: 'General 1...e5 Defense',
    fenPreview: 'r3kb1r/p1ppqppp/bpn5/4P3/2P5/1P6/P3QPPP/RNB1KB1R w KQkq - 1 10',
  },
];

const DEFAULT_BLACK_WEAPONS: TacticalWeapon[] = [
  {
    opening: 'Caro-Kann Defense: Tartakower / Capablanca Variation',
    eco: 'B18',
    moves: '1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5 5. Ng3 Bg6 6. h4 h6 7. Nf3 Nd7 8. h5 Bh7 9. Bd3 Bxd3 10. Qxd3',
    rationale:
      'The rock-solid fortress. Black equalizes with zero weaknesses, trades off White’s dangerous attacking pieces, and enters a superior endgame where White’s overextended h5 pawn becomes a chronic target.',
    exploitFactor: 'Frustrates aggressive White attackers and forces reckless sacrifices.',
    keyTrap: {
      name: 'The Castling Trap on the Queenside',
      description: 'Black castles queenside (0-0-0) and launches a central counter-blow with ...c5, tearing open White’s d4 pawn.',
      criticalMoves: '10...e6 11. Bd2 Ngf6 12. O-O-O Qc7 13. Kb1 O-O-O 14. Qe2 c5!',
    },
    pawnBreakObjective: 'Break with ...c5 to liquidate White’s d4 stronghold.',
    targetOpponentSystem: '1. e4 Attacks',
    fenPreview: 'r2qkbnr/pp1n1pp1/2p1p2p/7P/3P4/3Q1NN1/PPP2PP1/R1B1K2R b KQkq - 0 10',
  },
  {
    opening: "Vienna / Tarrasch Counter to Queen's Pawn",
    eco: 'D37',
    moves: '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Nf3 dxc4 5. e4 Bb4 6. Bg5 c5 7. Bxc4 cxd4 8. Nxd4 Qa5!',
    rationale:
      'Dynamic counter-strike. Rather than suffering passively in the QGD, Black pins White’s knight with ...Bb4 and double-attacks the g5 bishop and c3 knight with 8...Qa5!.',
    exploitFactor: 'Shatters White’s peaceful central plans with direct, concrete tactical threats.',
    keyTrap: {
      name: 'The 8...Qa5! Double Attack',
      description: 'Forks White’s bishop on g5 and knight on c3. If White plays carelessly, they lose material on move 9.',
      criticalMoves: '8...Qa5! 9. Bd2 Qc5! (double-attacking the c4 bishop and d4 knight)',
    },
    pawnBreakObjective: 'Push ...c5 on move 6 to contest the d4 center.',
    targetOpponentSystem: '1. d4 Systems',
    fenPreview: 'rnb1k2r/pp3ppp/4pn2/q5B1/1bBN4/2N5/PP3PPP/R2QK2R w KQkq - 2 9',
  },
];

// ============================================================================
// 4. INTELLIGENT "HOW TO BEAT THEM" ALGORITHM
// ============================================================================

export function generateHowToBeatThemPlan(
  opponentDna: PlayerScoutDna,
  heroDna?: PlayerScoutDna
): HowToBeatThemPlan {
  const oppRating = opponentDna.ratings.rapid || 1200;
  const heroRating = heroDna?.ratings.rapid || 1200;
  const ratingDiff = heroRating - oppRating;

  let matchupDifficulty: 'favorable' | 'balanced' | 'tough' | 'underdog' = 'balanced';
  let predictedWinChancePct = 50;

  if (ratingDiff >= 150) {
    matchupDifficulty = 'favorable';
    predictedWinChancePct = Math.min(88, Math.round(50 + ratingDiff / 4.8));
  } else if (ratingDiff <= -150) {
    matchupDifficulty = 'underdog';
    predictedWinChancePct = Math.max(15, Math.round(50 + ratingDiff / 4.8));
  } else if (ratingDiff < 0) {
    matchupDifficulty = 'tough';
    predictedWinChancePct = Math.max(25, Math.round(50 + ratingDiff / 5.5));
  } else {
    predictedWinChancePct = Math.min(75, Math.round(50 + ratingDiff / 5.5));
  }

  // Adjust prediction based on opponent’s blunder rate & panic tendencies
  if (opponentDna.phaseAnalysis.blunderRatePct >= 10) {
    predictedWinChancePct = Math.min(92, predictedWinChancePct + 4);
  }
  if (opponentDna.phaseAnalysis.timePanicTendency >= 65) {
    predictedWinChancePct = Math.min(92, predictedWinChancePct + 3);
  }

  // ==========================================================================
  // STEP A: FIND OPPONENT'S MOST VULNERABLE SYSTEM AS BLACK (WE PLAY WHITE)
  // ==========================================================================
  // Sort Black openings by vulnerability score:
  // Vulnerability = lowest win rate + highest shortLosses + frequency
  const sortedBlackOpenings = [...opponentDna.openingsAsBlack].sort((a, b) => {
    // Priority: vulnerable verdict first, then lowest win rate, then short losses
    const scoreA = (a.verdict === 'vulnerable' ? 50 : 0) + (100 - a.winRatePct) + (a.shortLosses || 0) * 15;
    const scoreB = (b.verdict === 'vulnerable' ? 50 : 0) + (100 - b.winRatePct) + (b.shortLosses || 0) * 15;
    return scoreB - scoreA;
  });

  const targetBlackOpening = sortedBlackOpenings[0] || {
    name: 'Sicilian Defense',
    moves: '1. e4 c5',
    winRatePct: 45,
    playedCount: 1,
  };

  // Find exact rule from Master Counter Matrix
  let matchedWeaponWhite: TacticalWeapon | null = null;
  for (const rule of MASTER_COUNTER_MATRIX) {
    if (rule.colorFacing === 'black' && rule.keyPattern.test(targetBlackOpening.name)) {
      matchedWeaponWhite = {
        ...rule.weapon,
        targetOpponentSystem: targetBlackOpening.name,
        exploitFactor: `Directly targets their ${targetBlackOpening.name} where their win rate is ${targetBlackOpening.winRatePct}% (${targetBlackOpening.playedCount} tracked matches).`,
      };
      break;
    }
  }

  // If no exact match, fallback dynamically based on 1.e4 or 1.d4
  if (!matchedWeaponWhite) {
    const defaultChoice =
      targetBlackOpening.moves.startsWith('1. e4 e5') || targetBlackOpening.name.includes('Open')
        ? DEFAULT_WHITE_WEAPONS[1]
        : DEFAULT_WHITE_WEAPONS[0];

    matchedWeaponWhite = {
      ...defaultChoice,
      targetOpponentSystem: targetBlackOpening.name,
      exploitFactor: `Targeting their ${targetBlackOpening.name} where they concede tactical advantages.`,
    };
  }

  // ==========================================================================
  // STEP B: FIND OPPONENT'S FAVORITE OR MOST VULNERABLE SYSTEM AS WHITE (WE PLAY BLACK)
  // ==========================================================================
  const sortedWhiteOpenings = [...opponentDna.openingsAsWhite].sort((a, b) => {
    const scoreA = (a.verdict === 'vulnerable' ? 40 : 0) + (100 - a.winRatePct) + a.playedCount * 2;
    const scoreB = (b.verdict === 'vulnerable' ? 40 : 0) + (100 - b.winRatePct) + b.playedCount * 2;
    return scoreB - scoreA;
  });

  const targetWhiteOpening = sortedWhiteOpenings[0] || {
    name: 'London System',
    moves: '1. d4 d5 2. Bf4',
    winRatePct: 52,
    playedCount: 1,
  };

  let matchedDefenseBlack: TacticalWeapon | null = null;
  for (const rule of MASTER_COUNTER_MATRIX) {
    if (rule.colorFacing === 'white' && rule.keyPattern.test(targetWhiteOpening.name)) {
      matchedDefenseBlack = {
        ...rule.weapon,
        targetOpponentSystem: targetWhiteOpening.name,
        exploitFactor: `Counters their pet ${targetWhiteOpening.name} where their conversion is lowest.`,
      };
      break;
    }
  }

  if (!matchedDefenseBlack) {
    const defaultChoice =
      targetWhiteOpening.moves.startsWith('1. d4') || targetWhiteOpening.name.includes('Queen')
        ? DEFAULT_BLACK_WEAPONS[1]
        : DEFAULT_BLACK_WEAPONS[0];

    matchedDefenseBlack = {
      ...defaultChoice,
      targetOpponentSystem: targetWhiteOpening.name,
      exploitFactor: `Neutralizes their preferred setup in ${targetWhiteOpening.name}.`,
    };
  }

  // ==========================================================================
  // STEP C: BESPOKE MIDDLEGAME & ENDGAME DIRECTIVES
  // ==========================================================================
  const isOppAggressive = opponentDna.phaseAnalysis.tacticalAggressiveness >= 60;
  const isOppEndgameWeak = opponentDna.phaseAnalysis.endgameScore < opponentDna.phaseAnalysis.middlegameScore;
  const isPanicProne = opponentDna.phaseAnalysis.timePanicTendency >= 50;

  const middlegameStrategy = isOppAggressive
    ? {
        title: 'Absorb the Flank Storm & Counter-Punch in the Center',
        coreRule: 'Prioritize unshakeable king safety; let them burn time and pawns overextending on the wings.',
        actionablePointers: [
          'Do not initiate premature trades while their attacking minor pieces are concentrated.',
          `Exploit their known tactical blindspot: ${opponentDna.phaseAnalysis.tacticalBlindspot}.`,
          'When they advance their f/g pawns in an assault, counter-strike immediately at their exposed king with central pawn breaks.',
          'Trade off their most active knight or bishop to completely deflate their attacking initiative.',
        ],
      }
    : {
        title: 'Direct Central Spatial Squeeze & Piece Pinning',
        coreRule: 'Open the center with d4/e4 breaks and restrict their passive, defensive minor pieces.',
        actionablePointers: [
          'Pin their knights and bishops against heavier pieces to induce permanent pawn weaknesses.',
          'Infiltrate the 7th rank with connected rooks to tie down their defensive mobility.',
          'Refuse premature draw offers; systematically out-maneuver their passive bishop placements.',
          `Target their primary leak: ${opponentDna.phaseAnalysis.primaryWeakness}.`,
        ],
      };

  const endgameStrategy = isOppEndgameWeak
    ? {
        title: 'Force Early Queen Trades & Transition to Technical Endgames',
        conversionPlan: `Their endgame score is just ${opponentDna.phaseAnalysis.endgameScore}/100 with ${opponentDna.phaseAnalysis.endgameGrindLosses} technical endgame losses. Queen trades eliminate their counter-tactics.`,
        techniqueAdvice:
          'Trade queens as soon as an equal or slight advantage is reached. Activate your king aggressively toward the central squares (e4/d4/e5/d5) before pushing outside passed pawns.',
      }
    : {
        title: 'Keep Queens on the Board & Resolve Before King-and-Pawn Endgames',
        conversionPlan: `They handle simplified endgames well (${opponentDna.phaseAnalysis.endgameScore}/100); seek a decisive kingside breakthrough in the complex middlegame.`,
        techniqueAdvice:
          'Keep rooks and queens active. Focus on creating mating threats, queen pins, and piece sacrifices rather than grinding out a symmetrical pawn endgame.',
      };

  const clockManagementDirective = isPanicProne
    ? `Extreme Time Trouble Vulnerability: Clock panic rating is ${opponentDna.phaseAnalysis.timePanicTendency}%. Keep the board tactically complex when their clock drops under 2 minutes. Avoid automatic simplifications; make them calculate complicated multi-piece tensions.`
    : `Stable Clock Disciplinarian: They maintain steady clock composure (${opponentDna.phaseAnalysis.timePanicTendency}% panic index). Win via positional accuracy and relentless pawn minority attacks rather than time scrambles.`;

  const psychologicalEdge = [
    `Clock Exploitation: ${clockManagementDirective}`,
    `Unforced Error Factor: Averages a ${opponentDna.phaseAnalysis.blunderRatePct}% blunder rate per match. Maintain solid defense and let their impatience produce the decisive error.`,
    `Early Book Disruption: Deviate from standard book theory on Move 4–7 (${matchedWeaponWhite.opening}) to pull them out of memorized comfort zones.`,
  ];

  const executiveSummary = `${opponentDna.username} is a ${
    isOppAggressive ? 'sharp, attack-oriented' : 'methodical, patient'
  } player (${opponentDna.ratings.rapid} Rapid) with proven vulnerabilities in ${targetBlackOpening.name} as Black and ${targetWhiteOpening.name} as White. Their most severe leak is "${opponentDna.phaseAnalysis.primaryWeakness}". By deploying ${
    matchedWeaponWhite.opening
  } as White to punish their ${targetBlackOpening.name}, and countering their 1.d4/1.e4 with ${
    matchedDefenseBlack.opening
  } as Black, you neutralize their strengths and steer the game into their lowest-scoring win environments.`;

  return {
    targetPlayer: opponentDna.username,
    heroPlayer: heroDna?.username,
    matchupDifficulty,
    predictedWinChancePct,
    recommendedWeaponWhite: matchedWeaponWhite,
    recommendedDefenseBlack: matchedDefenseBlack,
    middlegameStrategy,
    endgameStrategy,
    psychologicalEdge,
    clockManagementDirective,
    executiveSummary,
  };
}
