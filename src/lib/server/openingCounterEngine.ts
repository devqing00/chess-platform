/**
 * OpeningCounterEngine - Dedicated Counter-Opening & Interactive Continuation Masterclass
 * Teaches:
 * 1. How every major opening is played (philosophy, pawn structure, piece coordination).
 * 2. The BEST counter-opening against it (why it works, key pawn breaks, winning plan).
 * 3. Master Continuation Trees: interactive continuation lines with grandmaster annotations for each response.
 * 4. Common pitfalls, traps, and tactical warning signs.
 */

import { OpeningInfo, CounterOpeningStrategy, OpeningContinuationBranch } from '@/types/chess';
import { OPENINGS_DATABASE } from '@/lib/openingsData';

export interface FullOpeningMasteryDossier extends OpeningInfo {
  bestCounterOpening: CounterOpeningStrategy;
  alternativeCounters: CounterOpeningStrategy[];
  continuationTree: OpeningContinuationBranch[];
  winningRoadmap: string[];
  grandmasterQuote: string;
}

export const COUNTER_OPENINGS_CATALOG: FullOpeningMasteryDossier[] = [
  {
    eco: 'C60',
    name: 'Ruy Lopez (Spanish Opening)',
    variation: 'Classical Main Line',
    moves: '1. e4 e5 2. Nf3 Nc6 3. Bb5',
    whiteWinPct: 39,
    drawPct: 34,
    blackWinPct: 27,
    totalGames: 1420500,
    description: 'White pressures Black’s c6 knight defending the central e5 pawn, planning long-term positional squeeze via c3 and d4.',
    keyIdeas: ['Indirect pressure on e5', 'C3 followed by d4 center control', 'Kingside attacking potential'],
    grandmasterQuote: '“The Ruy Lopez is the true benchmark of a player’s classical chess maturity.” — Garry Kasparov',
    winningPlan: 'Control the d4 square, preserve the light-squared bishop, and coordinate knights toward f5.',
    commonTraps: ['Noah’s Ark Trap: Black traps White’s light-squared bishop on b3 with a6, b5, and c4.'],
    bestCounterOpening: {
      id: 'counter-ruy-berlin',
      counterName: 'Berlin Defense (Berlin Wall)',
      counterMoves: '3... Nf6 4. O-O Nxe4 5. d4 Nd6',
      whyItWorks: 'Neutralizes White’s tactical initiative immediately by provoking early queen trades into an ironclad endgame fortress with the bishop pair.',
      recommendedPlan: 'Trade queens on d8, accept doubled c-pawns in exchange for active bishop diagonals and unbreachable king defense.',
      difficulty: 'Intermediate',
      winRateAdvantage: '48% Draw / 22% Black Win vs Elite GMs',
      keyPawnBreaks: ['c6-c5', 'd7-d5', 'f7-f6'],
    },
    alternativeCounters: [
      {
        id: 'counter-ruy-marshall',
        counterName: 'Marshall Attack Gambit',
        counterMoves: '3... a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 O-O 8. c3 d5!',
        whyItWorks: 'Sacrifices the d5 pawn for blistering, unstoppable piece coordination against White’s kingside.',
        recommendedPlan: 'Crash through on the h2 and g2 squares using Bd6, Qh4, and Ng4.',
        difficulty: 'Master',
        winRateAdvantage: '54% Black Win/Draw in modern master praxis',
        keyPawnBreaks: ['d7-d5! (Gambit strike)'],
      },
    ],
    continuationTree: [
      {
        id: 'ruy-cont-1',
        moveSan: 'Nf6',
        responseSan: 'O-O',
        coachNote: '3...Nf6 initiates the Berlin Defense, attacking the undefended e4 pawn.',
        evaluation: 'Equal (=)',
        pitfallWarning: 'Do not play 4...Bc5 prematurely before securing the e5 pawn.',
      },
      {
        id: 'ruy-cont-2',
        moveSan: 'Nxe4',
        responseSan: 'd4',
        coachNote: 'Accepting the center pawn tempo: Black forces White to define the center immediately.',
        evaluation: 'Equal (=)',
      },
      {
        id: 'ruy-cont-3',
        moveSan: 'Nd6',
        responseSan: 'Bxc6',
        coachNote: 'The key retreating maneuver! The knight attacks White’s bishop on b5 while returning to safety.',
        evaluation: 'Equal (=)',
      },
      {
        id: 'ruy-cont-4',
        moveSan: 'dxc6',
        responseSan: 'dxe5',
        coachNote: 'Recapture toward the center. Black secures the open d-file for queens and prepares the queen trade.',
        evaluation: 'Equal (=)',
      },
    ],
    winningRoadmap: [
      'Step 1: Steer into queenless endgame by move 8 to strip White of mating attacks.',
      'Step 2: Position the king safely on c8 or e7.',
      'Step 3: Leverage the dark-squared bishop pair to dominate open files.',
    ],
  },
  {
    eco: 'C50',
    name: 'Italian Game (Giuoco Piano)',
    variation: 'Classical Center Attack',
    moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4',
    whiteWinPct: 38,
    drawPct: 35,
    blackWinPct: 27,
    totalGames: 1120000,
    description: 'White develops rapidly, aiming directly at the vulnerable f7 square before Black has castled.',
    keyIdeas: ['f7 square pressure', 'Rapid queenside development', 'Center strike with c3 and d4'],
    grandmasterQuote: '“In the Italian, every tempo counts. The player who controls d4 controls the destiny of the match.”',
    winningPlan: 'Erect an unshakeable pawn pair on c3 and d4, locking Black’s minor pieces into passive defense.',
    commonTraps: ['Fried Liver Attack: 4.Ng5 d5 5.exd5 Nxd5? 6.Nxf7! sacrificing the knight for devastating royal hunt.'],
    bestCounterOpening: {
      id: 'counter-italian-twoknights',
      counterName: 'Two Knights Defense: Polerio Counter-Strike',
      counterMoves: '3... Nf6 4. Ng5 d5 5. exd5 Na5!',
      whyItWorks: 'Refuses passive defense! After 5...Na5!, Black counter-attacks White’s bishop, seizes the initiative, and traps White in an overextended kingside attack.',
      recommendedPlan: 'Sacrifice the d5 pawn, kick White’s bishop, push c6 and e4, and dominate the open center files.',
      difficulty: 'Intermediate',
      winRateAdvantage: '34% Black Win / 33% Draw across master games',
      keyPawnBreaks: ['d7-d5!', 'c7-c6', 'e5-e4'],
    },
    alternativeCounters: [
      {
        id: 'counter-italian-hungarian',
        counterName: 'Hungarian Defense',
        counterMoves: '3... Be7',
        whyItWorks: 'An ultra-solid preventative defense that neutralizes all f7 tactics and denies White any attacking diagonals.',
        recommendedPlan: 'Play d6, Nf6, and O-O safely before expanding on the queenside.',
        difficulty: 'Beginner',
        winRateAdvantage: 'Solid 42% Draw rate',
        keyPawnBreaks: ['d7-d6', 'c7-c6'],
      },
    ],
    continuationTree: [
      {
        id: 'it-cont-1',
        moveSan: 'Nf6',
        responseSan: 'Ng5',
        coachNote: '3...Nf6 challenges e4 immediately, daring White to jump into the Fried Liver attack.',
        evaluation: 'Sharp (+=)',
      },
      {
        id: 'it-cont-2',
        moveSan: 'd5',
        responseSan: 'exd5',
        coachNote: 'The only correct central counter-strike to shut down the c4 bishop diagonal.',
        evaluation: 'Sharp (+=)',
      },
      {
        id: 'it-cont-3',
        moveSan: 'Na5',
        responseSan: 'Bb5+',
        coachNote: 'CRITICAL MOVE: 5...Na5! Never play 5...Nxd5? which allows the deadly 6.Nxf7! fork.',
        evaluation: 'Equal (=)',
        pitfallWarning: '5...Nxd5? loses to the Fried Liver Attack!',
      },
      {
        id: 'it-cont-4',
        moveSan: 'c6',
        responseSan: 'dxc6',
        coachNote: 'Solidifying the queenside pawn shield and driving White’s bishop back.',
        evaluation: 'Equal (=)',
      },
    ],
    winningRoadmap: [
      'Step 1: Never fall into 5...Nxd5? — play 5...Na5! with confidence.',
      'Step 2: Regain the pawn tempo with 6...c6 and 7...bxc6.',
      'Step 3: Launch e5-e4 pawn fork to suffocate White’s g5 knight.',
    ],
  },
  {
    eco: 'B20',
    name: 'Sicilian Defense',
    variation: 'Open Sicilian Battlefield',
    moves: '1. e4 c5',
    whiteWinPct: 37,
    drawPct: 31,
    blackWinPct: 32,
    totalGames: 2650000,
    description: 'The most popular and aggressive response to 1.e4 in history. Black fights for asymmetrical central control on the c-file.',
    keyIdeas: ['Asymmetrical pawn structure', 'Open c-file counterplay', 'Central pawn majority (d- and e-pawns)'],
    grandmasterQuote: '“1...c5 says: I am not playing for a draw. I am playing to conquer the board.” — Bobby Fischer',
    winningPlan: 'Exchange the c-pawn for White’s d-pawn, establish queenside rook pressure, and break in the center with d6-d5.',
    commonTraps: ['Siberian Trap in the Morra Gambit: 1.e4 c5 2.d4 cxd4 3.c3 dxc3 4.Nxc3 Nc6 5.Nf3 e6 6.Bc4 Qc7 7.O-O Nf6 8.Qe2 Ng4! threatening Nd4 and Nxf2.'],
    bestCounterOpening: {
      id: 'counter-sicilian-alapin',
      counterName: 'Alapin Variation (2. c3 Anti-Sicilian)',
      counterMoves: '2. c3 d5 3. exd5 Qxd5 4. d4',
      whyItWorks: 'Completely defuses Black’s complex tactical Najdorf and Dragon lines by forcing a classical, symmetrical center with c3/d4.',
      recommendedPlan: 'Maintain solid central control with d4, develop knights naturally to f3 and a3/d2, and deny Black the open c-file.',
      difficulty: 'Beginner',
      winRateAdvantage: '41% White Win / 33% Draw',
      keyPawnBreaks: ['d2-d4', 'c3-c4'],
    },
    alternativeCounters: [
      {
        id: 'counter-sicilian-grandprix',
        counterName: 'Grand Prix Attack',
        counterMoves: '2. Nc3 Nc6 3. f4',
        whyItWorks: 'Bypasses central theory completely to launch an early f4-f5 kingside pawn storm.',
        recommendedPlan: 'Develop Bc4, Qe1, and Qh4 to deliver rapid kingside checkmate.',
        difficulty: 'Intermediate',
        winRateAdvantage: '38% White Win / 30% Draw',
        keyPawnBreaks: ['f4-f5'],
      },
    ],
    continuationTree: [
      {
        id: 'sic-cont-1',
        moveSan: 'c3',
        responseSan: 'd5',
        coachNote: '2.c3 prepares an unassailable d4 pawn center. Black counters with 2...d5.',
        evaluation: 'Slight White (+0.2)',
      },
      {
        id: 'sic-cont-2',
        moveSan: 'exd5',
        responseSan: 'Qxd5',
        coachNote: 'Exchanging the center pawn: Black’s queen is drawn to d5 without White’s Nc3 able to harass it.',
        evaluation: 'Equal (=)',
      },
      {
        id: 'sic-cont-3',
        moveSan: 'd4',
        responseSan: 'Nf6',
        coachNote: 'White establishes the full d4 stake, controlling e5 and c5.',
        evaluation: 'Slight White (+0.3)',
      },
      {
        id: 'sic-cont-4',
        moveSan: 'Nf3',
        responseSan: 'e6',
        coachNote: 'Harmonious development. White holds central advantage without sharp tactical risks.',
        evaluation: 'Slight White (+0.3)',
      },
    ],
    winningRoadmap: [
      'Step 1: Avoid memorizing 20 moves of Najdorf theory by playing 2.c3.',
      'Step 2: Build a rock-solid d4 pawn center.',
      'Step 3: Restrict Black’s light-squared bishop and control the c-file.',
    ],
  },
  {
    eco: 'D06',
    name: 'Queen’s Gambit',
    variation: 'Classical Center Clash',
    moves: '1. d4 d5 2. c4',
    whiteWinPct: 40,
    drawPct: 36,
    blackWinPct: 24,
    totalGames: 1850000,
    description: 'White offers the c4 flank pawn to divert Black’s d5 pawn from the center and seize total control with e4.',
    keyIdeas: ['Central pawn tension', 'Early e4 expansion', 'c-file pressure against Black’s c7 pawn'],
    grandmasterQuote: '“The Queen’s Gambit is not a true gambit because White can always regain the c4 pawn with advantage.”',
    winningPlan: 'Dominate the center with pawns on d4 and e4, establish a minority attack on the queenside, and restrict Black’s c8 bishop.',
    commonTraps: ['Elephant Trap: In the QGD, White tries to win Black’s d5 pawn with 6.Nxd5? falling into 6...Nxd5! 7.Bxd8 Bb4+ winning the queen back with an extra piece.'],
    bestCounterOpening: {
      id: 'counter-qg-slav',
      counterName: 'Slav Defense: The Granite Wall',
      counterMoves: '2... c6 3. Nf3 Nf6 4. Nc3 dxc4!',
      whyItWorks: 'Supports d5 with the c-pawn without trapping Black’s light-squared bishop behind an e6 pawn chain.',
      recommendedPlan: 'Develop the light-squared bishop to f5 or g4, take on c4 when White develops, and establish an uncrackable fortress.',
      difficulty: 'Intermediate',
      winRateAdvantage: '44% Draw / 24% Black Win',
      keyPawnBreaks: ['e7-e5', 'c6-c5'],
    },
    alternativeCounters: [
      {
        id: 'counter-qg-albin',
        counterName: 'Albin Counter-Gambit',
        counterMoves: '2... e5 3. dxe5 d4!',
        whyItWorks: 'A vicious surprise counter-gambit! The d4 advanced pawn wedges into White’s queenside development.',
        recommendedPlan: 'Trap White with the famous Lasker Trap (underpromoting to a Knight on f1 with check!).',
        difficulty: 'Advanced',
        winRateAdvantage: 'Surprise weapon: 48% Black Win in rapid/blitz',
        keyPawnBreaks: ['d4-d3'],
      },
    ],
    continuationTree: [
      {
        id: 'qg-cont-1',
        moveSan: 'c6',
        responseSan: 'Nf3',
        coachNote: 'The Slav Defense: 2...c6 reinforces d5 while leaving the c8-h3 diagonal wide open for the bishop.',
        evaluation: 'Equal (=)',
      },
      {
        id: 'qg-cont-2',
        moveSan: 'Nf6',
        responseSan: 'Nc3',
        coachNote: 'Developing naturally toward the center.',
        evaluation: 'Equal (=)',
      },
      {
        id: 'qg-cont-3',
        moveSan: 'dxc4',
        responseSan: 'a4',
        coachNote: 'Black accepts the pawn temporarily to force White to commit pawns on the flank.',
        evaluation: 'Equal (=)',
      },
      {
        id: 'qg-cont-4',
        moveSan: 'Bf5',
        responseSan: 'e3',
        coachNote: 'The ultimate triumph of the Slav: Black’s bishop is developed actively outside the pawn chain before e6.',
        evaluation: 'Equal (=)',
      },
    ],
    winningRoadmap: [
      'Step 1: Defend the center with 2...c6 (Slav Defense).',
      'Step 2: Develop the c8-bishop to f5 BEFORE playing e7-e6.',
      'Step 3: Execute c6-c5 or e6-e5 break to equalise and fight for the win.',
    ],
  },
  {
    eco: 'E60',
    name: 'King’s Indian Defense (KID)',
    variation: 'Mar del Plata Counter-Assault',
    moves: '1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6',
    whiteWinPct: 41,
    drawPct: 29,
    blackWinPct: 30,
    totalGames: 950000,
    description: 'Black intentionally cedes the center to White, fianchettoes the dark-squared bishop, and prepares a ferocious kingside pawn avalanche with f7-f5.',
    keyIdeas: ['Kingside pawn storm (f5-f4)', 'Fianchetto dark-square diagonal control', 'Asymmetrical kingside vs queenside race'],
    grandmasterQuote: '“In the King’s Indian, White plays for positional victory on the queenside, but Black plays for checkmate on the kingside.” — Garry Kasparov',
    winningPlan: 'Lock the center with d4-d5, then unleash f7-f5, g6-g5, and f5-f4 to storm White’s king.',
    commonTraps: ['Over-pressing on the queenside while Black delivers checkmate with ...g3 and ...Qh4.'],
    bestCounterOpening: {
      id: 'counter-kid-fianchetto',
      counterName: 'Fianchetto System (White Anti-KID)',
      counterMoves: '3. g3 Bg7 4. Bg2 O-O 5. Nf3 d6 6. O-O',
      whyItWorks: 'Completely suffocates Black’s attacking ideas by opposing Black’s dark-squared bishop with White’s own g2 bishop, denying all f5 sacrificial attacks.',
      recommendedPlan: 'Maintain solid central control without locking the center, rendering Black’s f5 pawn thrust harmless.',
      difficulty: 'Intermediate',
      winRateAdvantage: '44% White Win / 35% Draw',
      keyPawnBreaks: ['d4-d5', 'b2-b4'],
    },
    alternativeCounters: [
      {
        id: 'counter-kid-samisch',
        counterName: 'Sämisch Variation (3. f3)',
        counterMoves: '3. f3 O-O 4. e4 d6 5. Be3',
        whyItWorks: 'Erects an unbreakable wall on f3, preventing any Black knight jumps to g4 and preparing a ruthless queenside castling attack.',
        recommendedPlan: 'Castle queenside (O-O-O) and launch g4/h4 pawn storm directly into Black’s king.',
        difficulty: 'Master',
        winRateAdvantage: '42% White Win',
        keyPawnBreaks: ['g2-g4', 'h2-h4'],
      },
    ],
    continuationTree: [
      {
        id: 'kid-cont-1',
        moveSan: 'g3',
        responseSan: 'Bg7',
        coachNote: 'White neutralizes the King’s Indian by mirroring Black’s fianchetto setup.',
        evaluation: 'Slight White (+0.3)',
      },
      {
        id: 'kid-cont-2',
        moveSan: 'Bg2',
        responseSan: 'O-O',
        coachNote: 'Both sides secure their kings behind unbreakable fianchetto barriers.',
        evaluation: 'Slight White (+0.3)',
      },
      {
        id: 'kid-cont-3',
        moveSan: 'Nf3',
        responseSan: 'd6',
        coachNote: 'Solid development. White’s king is immune to standard tactical breakthroughs.',
        evaluation: 'Slight White (+0.3)',
      },
      {
        id: 'kid-cont-4',
        moveSan: 'O-O',
        responseSan: 'Nbd7',
        coachNote: 'The position is balanced, with White enjoying effortless positional pressure on the queenside.',
        evaluation: 'Slight White (+0.3)',
      },
    ],
    winningRoadmap: [
      'Step 1: Do not lock the center prematurely against the King’s Indian.',
      'Step 2: Deploy the Fianchetto System (g3 + Bg2) to neutralize Black’s dark-squared bishop.',
      'Step 3: Win on the queenside while Black’s kingside pawn storm runs out of steam.',
    ],
  },
];

export class OpeningCounterEngine {
  /**
   * Retrieve all curated counter-opening dossiers
   */
  public static listAllDossiers(): FullOpeningMasteryDossier[] {
    return COUNTER_OPENINGS_CATALOG;
  }

  /**
   * Find opening dossier by ECO code or partial name
   */
  public static getDossierByEco(ecoOrQuery: string): FullOpeningMasteryDossier | undefined {
    const query = ecoOrQuery.toLowerCase().trim();
    return COUNTER_OPENINGS_CATALOG.find(
      (d) =>
        d.eco.toLowerCase() === query ||
        d.name.toLowerCase().includes(query) ||
        d.variation?.toLowerCase().includes(query)
    );
  }

  /**
   * Find the recommended counter-opening for any initial opening
   */
  public static getBestCounterForOpening(eco: string): CounterOpeningStrategy | undefined {
    const dossier = this.getDossierByEco(eco);
    return dossier?.bestCounterOpening;
  }
}
