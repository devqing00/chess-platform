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
  // 1. RUY LOPEZ (SPANISH OPENING)
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

  // 2. ITALIAN GAME
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

  // 3. SICILIAN DEFENSE
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

  // 4. LONDON SYSTEM
  {
    eco: 'D02',
    name: 'London System',
    variation: 'Modern London Setup',
    moves: '1. d4 d5 2. Bf4 Nf6 3. e3',
    whiteWinPct: 38,
    drawPct: 36,
    blackWinPct: 26,
    totalGames: 1350000,
    description: 'The ultra-popular solid setup championed by Magnus Carlsen and Ding Liren. White develops the dark-squared bishop outside the pawn chain before locking the center with e3.',
    keyIdeas: ['Active dark-squared bishop on f4', 'Rock-solid c3/d4/e3 triangle', 'Ne5 outpost springboard for attack'],
    grandmasterQuote: '“The London is resilient, but developing Bf4 early leaves the b2 pawn fundamentally undefended.”',
    winningPlan: 'Erect an unbreakable central pyramid, drop the bishop to g3 if attacked, and occupy e5 with a knight.',
    commonTraps: ['Queen trap on b2: If White plays carelessly, Black strikes with ...c5 and ...Qb6 targeting b2.'],
    bestCounterOpening: {
      id: 'counter-london-steinitz',
      counterName: 'Steinitz Queen-Pressure Counter (...c5 & ...Qb6!)',
      counterMoves: '2... c5 3. e3 Nc6 4. c3 Qb6! 5. Qb3 c4! 6. Qc2 Bf5!',
      whyItWorks: 'Directly punishes the undefended b2 pawn caused by 2. Bf4. Black clamps down on the queenside and disorients White’s peaceful plans.',
      recommendedPlan: 'Strike with ...c5 and ...Qb6, freeze White’s queenside with ...c4, and infiltrate with ...Bf5.',
      difficulty: 'Intermediate',
      winRateAdvantage: '35% Black Win / 38% Draw',
      keyPawnBreaks: ['c7-c5', 'c5-c4', 'b7-b5'],
    },
    alternativeCounters: [
      {
        id: 'counter-london-kingsindian',
        counterName: 'KID-Style Setup (...g6 & ...Bg7)',
        counterMoves: '1... Nf6 2. Bf4 g6 3. e3 Bg7 4. Nf3 O-O',
        whyItWorks: 'Fianchettoes the bishop to contest the central dark squares while leaving White’s f4 bishop biting on granite.',
        recommendedPlan: 'Expand on the kingside with ...d6 and ...e5.',
        difficulty: 'Beginner',
        winRateAdvantage: '33% Black Win / 36% Draw',
        keyPawnBreaks: ['e7-e5', 'c7-c5'],
      },
    ],
    continuationTree: [
      {
        id: 'lon-cont-1',
        moveSan: 'c5',
        responseSan: 'e3',
        coachNote: '1...d5 2.Bf4 c5! challenges White’s central d4 anchor immediately.',
        evaluation: 'Equal (=)',
      },
      {
        id: 'lon-cont-2',
        moveSan: 'Nc6',
        responseSan: 'c3',
        coachNote: 'White builds the standard c3/d4 pyramid, while Black increases pressure on d4.',
        evaluation: 'Equal (=)',
      },
      {
        id: 'lon-cont-3',
        moveSan: 'Qb6',
        responseSan: 'Qb3',
        coachNote: '4...Qb6! strikes at the weakened b2 square. White is forced to defend with Qb3.',
        evaluation: 'Slight Black (-0.2)',
      },
      {
        id: 'lon-cont-4',
        moveSan: 'c4',
        responseSan: 'Qc2',
        coachNote: '5...c4! locks White’s queen into retreat and grabs immense queenside space.',
        evaluation: 'Slight Black (-0.3)',
      },
    ],
    winningRoadmap: [
      'Step 1: Challenge White’s center on move 2 with ...c5.',
      'Step 2: Exploit the missing b2 defender with ...Qb6!.',
      'Step 3: Play ...c4 followed by ...Bf5 to paralyze White’s queenside development.',
    ],
  },

  // 5. FRENCH DEFENSE
  {
    eco: 'C00',
    name: 'French Defense',
    variation: 'Classical / Advance Setup',
    moves: '1. e4 e6 2. d4 d5',
    whiteWinPct: 39,
    drawPct: 32,
    blackWinPct: 29,
    totalGames: 780000,
    description: 'A resilient counter-punching defense resulting in locked pawn chains where Black strikes back against White’s center with ...c5 and ...f6.',
    keyIdeas: ['Pawn wedge on e5/d4', 'Counter-strikes on c5 and f6', 'Bad light-squared bishop challenge'],
    grandmasterQuote: '“The French Defense is like a coiled cobra: patient in defense, deadly when the center opens.”',
    winningPlan: 'Cramp Black with e5, defend the d4 pawn base with c3, and attack the uncastled king.',
    commonTraps: ['Greek Gift Sacrifice: Bxh7+ against an uncastled or weakly defended Black king.'],
    bestCounterOpening: {
      id: 'counter-french-advance',
      counterName: 'Advance Variation: Nimzowitsch Space Attack',
      counterMoves: '3. e5 c5 4. c3 Nc6 5. Nf3 Qb6 6. a3! c4 7. Nbd2',
      whyItWorks: 'Locks Black’s light-squared bishop permanently behind pawns on c8 and denies Black any central counterplay.',
      recommendedPlan: 'Solidify d4 with c3, play a3/b4 to blockade the queenside, and push f4-f5 to shatter Black’s kingside.',
      difficulty: 'Intermediate',
      winRateAdvantage: '44% White Win / 31% Draw',
      keyPawnBreaks: ['f4-f5', 'b2-b4'],
    },
    alternativeCounters: [
      {
        id: 'counter-french-tarrasch',
        counterName: 'Tarrasch Variation (3. Nd2)',
        counterMoves: '3. Nd2 Nf6 4. e5 Nfd7 5. Bd3 c5 6. c3',
        whyItWorks: 'Avoids the pin 3...Bb4 and keeps White’s pawn structure completely intact.',
        recommendedPlan: 'Develop Ne2, O-O, and coordinate knights toward the kingside.',
        difficulty: 'Beginner',
        winRateAdvantage: '41% White Win / 34% Draw',
        keyPawnBreaks: ['f2-f4', 'c2-c3'],
      },
    ],
    continuationTree: [
      {
        id: 'fr-cont-1',
        moveSan: 'e5',
        responseSan: 'c5',
        coachNote: '3.e5 establishes the central cramp. Black strikes immediately at d4.',
        evaluation: 'Slight White (+0.3)',
      },
      {
        id: 'fr-cont-2',
        moveSan: 'c3',
        responseSan: 'Nc6',
        coachNote: 'White anchors d4 with c3; Black piles pressure on d4.',
        evaluation: 'Slight White (+0.3)',
      },
      {
        id: 'fr-cont-3',
        moveSan: 'Nf3',
        responseSan: 'Qb6',
        coachNote: 'Both sides reinforce the focal point d4.',
        evaluation: 'Slight White (+0.2)',
      },
      {
        id: 'fr-cont-4',
        moveSan: 'a3',
        responseSan: 'c4',
        coachNote: '6.a3! prepares b4. Black plays c4 to close the queenside.',
        evaluation: 'Slight White (+0.4)',
      },
    ],
    winningRoadmap: [
      'Step 1: Lock the center with 3.e5 to entomb Black’s c8 bishop.',
      'Step 2: Reinforce the d4 base with c3 and Nf3.',
      'Step 3: Launch f4-f5 on the kingside for a decisive mating assault.',
    ],
  },

  // 6. CARO-KANN DEFENSE
  {
    eco: 'B10',
    name: 'Caro-Kann Defense',
    variation: 'Classical & Advance',
    moves: '1. e4 c6 2. d4 d5',
    whiteWinPct: 37,
    drawPct: 37,
    blackWinPct: 26,
    totalGames: 890000,
    description: 'A fortress-like defense favored by Anatoly Karpov and Hikaru Nakamura. Black prepares ...d5 without trapping the light-squared bishop inside the pawn chain.',
    keyIdeas: ['Free light-squared bishop on f5', 'Rock-solid pawn structure on c6/e6', 'Endgame structural supremacy'],
    grandmasterQuote: '“The Caro-Kann is the choice of champions when they need an unbreakable fortress.”',
    winningPlan: 'Expand space with e5, harass the f5 bishop with h4/g4, and break down Black’s pawn wall.',
    commonTraps: ['Trapping the f5 bishop with 4.h4! h6? 5.g4! Bh7 6.e6! ruining Black’s king safety.'],
    bestCounterOpening: {
      id: 'counter-caro-tal',
      counterName: 'Tal Advance Variation with 4. h4!',
      counterMoves: '3. e5 Bf5 4. h4! h5 5. Bd3 Bxd3 6. Qxd3 e6 7. Bg5',
      whyItWorks: 'Directly disrupts Black’s comfortable bishop retreat. Puts maximum psychological and tactical stress on Black’s light squares.',
      recommendedPlan: 'Trade light bishops, clamp down on kingside dark squares, and prepare c4 to blow open the center.',
      difficulty: 'Intermediate',
      winRateAdvantage: '42% White Win / 33% Draw',
      keyPawnBreaks: ['c2-c4', 'g2-g4'],
    },
    alternativeCounters: [
      {
        id: 'counter-caro-panov',
        counterName: 'Panov-Botvinnik Attack (3. exd5 & 4. c4)',
        counterMoves: '3. exd5 cxd5 4. c4 Nf6 5. Nc3',
        whyItWorks: 'Transforms the game into an active isolated queen’s pawn (IQP) attack with rapid open lines.',
        recommendedPlan: 'Develop pieces rapidly, plant a knight on e5, and attack Black’s uncastled king.',
        difficulty: 'Advanced',
        winRateAdvantage: '40% White Win / 32% Draw',
        keyPawnBreaks: ['d4-d5'],
      },
    ],
    continuationTree: [
      {
        id: 'ck-cont-1',
        moveSan: 'e5',
        responseSan: 'Bf5',
        coachNote: '3.e5 grabs space. Black develops the bishop to f5 outside the pawn chain.',
        evaluation: 'Slight White (+0.2)',
      },
      {
        id: 'ck-cont-2',
        moveSan: 'h4',
        responseSan: 'h5',
        coachNote: '4.h4! threatens to trap the bishop with g4 and h5. Black must respond with 4...h5.',
        evaluation: 'Slight White (+0.3)',
      },
      {
        id: 'ck-cont-3',
        moveSan: 'Bd3',
        responseSan: 'Bxd3',
        coachNote: 'White challenges Black’s best piece. The bishop trade is forced.',
        evaluation: 'Slight White (+0.3)',
      },
      {
        id: 'ck-cont-4',
        moveSan: 'Qxd3',
        responseSan: 'e6',
        coachNote: 'White recaptures with the Queen, dominating the light-squared diagonals.',
        evaluation: 'Slight White (+0.3)',
      },
    ],
    winningRoadmap: [
      'Step 1: Push 4.h4! to force Black into defensive concessions.',
      'Step 2: Trade light-squared bishops on d3 to remove Black’s active guardian.',
      'Step 3: Play c4 to liquidate Black’s d5 anchor and dominate the endgame.',
    ],
  },

  // 7. QUEEN'S GAMBIT
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
      id: 'counter-qg-nimzo',
      counterName: 'Nimzo-Indian Defense: Rubinstein Setup',
      counterMoves: '1... Nf6 2. c4 e6 3. Nc3 Bb4! 4. e3 c5 5. Bd3 Nc6',
      whyItWorks: 'Pins White’s c3 knight, inflicts doubled c-pawns, and establishes an unbreakable dark-squared blockade on d6/e5.',
      recommendedPlan: 'Lock the center with ...e5 and ...d6, target White’s doubled c4 pawn with ...Ba6 and ...Na5.',
      difficulty: 'Intermediate',
      winRateAdvantage: '42% Draw / 26% Black Win vs Elite GMs',
      keyPawnBreaks: ['c7-c5', 'e7-e5'],
    },
    alternativeCounters: [
      {
        id: 'counter-qg-slav',
        counterName: 'Slav Defense: The Granite Wall',
        counterMoves: '2... c6 3. Nf3 Nf6 4. Nc3 dxc4!',
        whyItWorks: 'Supports d5 with the c-pawn without trapping Black’s light-squared bishop behind an e6 pawn chain.',
        recommendedPlan: 'Develop the light-squared bishop to f5 or g4, take on c4 when White develops, and establish an uncrackable fortress.',
        difficulty: 'Beginner',
        winRateAdvantage: '44% Draw / 24% Black Win',
        keyPawnBreaks: ['e7-e5', 'c6-c5'],
      },
    ],
    continuationTree: [
      {
        id: 'qg-cont-1',
        moveSan: 'e6',
        responseSan: 'Nc3',
        coachNote: 'The classical Queen’s Gambit Declined: Black secures the d5 central anchor.',
        evaluation: 'Equal (=)',
      },
      {
        id: 'qg-cont-2',
        moveSan: 'Nf6',
        responseSan: 'Nf3',
        coachNote: 'Both sides develop knights toward the center.',
        evaluation: 'Equal (=)',
      },
      {
        id: 'qg-cont-3',
        moveSan: 'Be7',
        responseSan: 'Bg5',
        coachNote: 'White pins Black’s f6 knight; Black prepares kingside castling.',
        evaluation: 'Slight White (+0.2)',
      },
      {
        id: 'qg-cont-4',
        moveSan: 'O-O',
        responseSan: 'e3',
        coachNote: 'Harmonious development. The stage is set for the Carlsbad pawn minority attack.',
        evaluation: 'Slight White (+0.2)',
      },
    ],
    winningRoadmap: [
      'Step 1: Neutralize White’s c-file pressure with ...c6 (Slav) or ...Bb4 (Nimzo).',
      'Step 2: Develop the c8-bishop before locking the center.',
      'Step 3: Execute the ...c5 central liquidation break.',
    ],
  },

  // 8. KING'S INDIAN DEFENSE
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
      id: 'counter-kid-samisch',
      counterName: 'Sämisch Variation (4. f3 & 5. Be3)',
      counterMoves: '4. e4 d6 5. f3 O-O 6. Be3 e5 7. d5 c6 8. Qd2',
      whyItWorks: 'Constructs an impenetrable central granite wall (f3, e4, d5). Completely stops Black’s ...f5 tactics and launches a lethal g4/h4 storm.',
      recommendedPlan: 'Castle queenside (O-O-O) and march g4/h4 directly into Black’s king.',
      difficulty: 'Master',
      winRateAdvantage: '44% White Win / 32% Draw',
      keyPawnBreaks: ['g2-g4', 'h2-h4', 'c4-c5'],
    },
    alternativeCounters: [
      {
        id: 'counter-kid-fianchetto',
        counterName: 'Fianchetto System (White Anti-KID)',
        counterMoves: '3. g3 Bg7 4. Bg2 O-O 5. Nf3 d6 6. O-O',
        whyItWorks: 'Suffocates Black’s attacking ideas by opposing Black’s dark-squared bishop with White’s own g2 bishop.',
        recommendedPlan: 'Maintain solid central control without locking the center, rendering Black’s f5 pawn thrust harmless.',
        difficulty: 'Intermediate',
        winRateAdvantage: '44% White Win / 35% Draw',
        keyPawnBreaks: ['d4-d5', 'b2-b4'],
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
      'Step 2: Deploy the Fianchetto System or Sämisch Wall to stop Black’s f5 sacrifice.',
      'Step 3: Win on the queenside while Black’s kingside pawn storm runs out of steam.',
    ],
  },

  // 9. SCANDINAVIAN DEFENSE
  {
    eco: 'B01',
    name: 'Scandinavian Defense',
    variation: 'Center-Counter Defense',
    moves: '1. e4 d5',
    whiteWinPct: 41,
    drawPct: 30,
    blackWinPct: 29,
    totalGames: 690000,
    description: 'Black strikes immediately at White’s e4 pawn on move 1, avoiding long theoretical lines in favor of rapid piece development.',
    keyIdeas: ['Early center challenge', 'Queen excursion to a5 or d6', 'Solid ...c6 and ...Bf5 pawn wall'],
    grandmasterQuote: '“The Scandinavian immediately simplifies the center, but gives White several free tempi developing against the queen.”',
    winningPlan: 'Capture 2.exd5, develop Nc3 with tempo on the queen, establish d4 center, and prepare Nd5 discoveries.',
    commonTraps: ['Discovered queen harassment with 8.Nd5! forcing Black to lose pawns or retreat passively.'],
    bestCounterOpening: {
      id: 'counter-scandi-tempo',
      counterName: 'Mainline Tempo Refutation (3. Nc3 & 4. d4)',
      counterMoves: '2. exd5 Qxd5 3. Nc3 Qa5 4. d4 Nf6 5. Nf3 c6 6. Bc4 Bf5 7. Bd2',
      whyItWorks: 'Gains 3 free developing moves with tempo against Black’s exposed queen, establishing total central control.',
      recommendedPlan: 'Develop Bc4 and Bd2, position Ne5 or Nd5, and blow open the center before Black castles.',
      difficulty: 'Beginner',
      winRateAdvantage: '45% White Win / 30% Draw',
      keyPawnBreaks: ['d4-d5'],
    },
    alternativeCounters: [
      {
        id: 'counter-scandi-modern',
        counterName: 'Modern 2...Nf6 Refutation',
        counterMoves: '2. exd5 Nf6 3. d4 Nxd5 4. c4 Nb6 5. Nf3',
        whyItWorks: 'Pushes c4 with tempo, building a massive pawn center while Black’s knight is kicked around.',
        recommendedPlan: 'Control the center with c4/d4, develop smoothly, and restrict Black’s knights.',
        difficulty: 'Intermediate',
        winRateAdvantage: '44% White Win',
        keyPawnBreaks: ['d4-d5'],
      },
    ],
    continuationTree: [
      {
        id: 'sca-cont-1',
        moveSan: 'exd5',
        responseSan: 'Qxd5',
        coachNote: '1.e4 d5 2.exd5 Qxd5: Black recaptures with the Queen, exposing it to attack.',
        evaluation: 'Slight White (+0.3)',
      },
      {
        id: 'sca-cont-2',
        moveSan: 'Nc3',
        responseSan: 'Qa5',
        coachNote: '3.Nc3 develops a piece with tempo on the Queen. Black retreats to a5.',
        evaluation: 'Slight White (+0.4)',
      },
      {
        id: 'sca-cont-3',
        moveSan: 'd4',
        responseSan: 'Nf6',
        coachNote: '4.d4 seizes the full center. Black develops the knight toward the center.',
        evaluation: 'Slight White (+0.4)',
      },
      {
        id: 'sca-cont-4',
        moveSan: 'Nf3',
        responseSan: 'c6',
        coachNote: 'Harmonious development. White holds an undisputed spatial and developmental lead.',
        evaluation: 'Slight White (+0.5)',
      },
    ],
    winningRoadmap: [
      'Step 1: Gain tempi on Black’s queen with 3.Nc3.',
      'Step 2: Occupy the full center with 4.d4 and 5.Nf3.',
      'Step 3: Execute the Nd5 discovered attack to shatter Black’s defense.',
    ],
  },

  // 10. ENGLISH OPENING
  {
    eco: 'A10',
    name: 'English Opening',
    variation: 'Flank Control System',
    moves: '1. c4',
    whiteWinPct: 38,
    drawPct: 37,
    blackWinPct: 25,
    totalGames: 850000,
    description: 'White controls the d5 central square from the wing with 1. c4, flexible enough to transpose into Catalan, Reversed Sicilian, or Queen’s Gambit systems.',
    keyIdeas: ['Flank control of d5', 'Kingside fianchetto with g3 and Bg2', 'Queenside expansion with b4'],
    grandmasterQuote: '“The English is the opening of subtle, positional chess players who prefer long-term advantages over early brawls.”',
    winningPlan: 'Fianchetto the bishop to g2, clamp down on d5, and roll queenside pawns with a3 and b4.',
    commonTraps: ['Kingside pawn avalanches when Black plays the Reversed Sicilian aggressively.'],
    bestCounterOpening: {
      id: 'counter-english-reversed-sicilian',
      counterName: 'Reversed Sicilian (1...e5! & 2...Nf6)',
      counterMoves: '1... e5 2. Nc3 Nf6 3. g3 d5 4. cxd5 Nxd5 5. Bg2 Nb6',
      whyItWorks: 'Turns White’s own weapon against them with an extra tempo in the center! Black establishes central pawns and free piece activity.',
      recommendedPlan: 'Seize central squares with ...e5 and ...d5, develop bishops smoothly, and launch ...f5 on the kingside.',
      difficulty: 'Intermediate',
      winRateAdvantage: '32% Black Win / 39% Draw',
      keyPawnBreaks: ['d7-d5', 'f7-f5'],
    },
    alternativeCounters: [
      {
        id: 'counter-english-angloslav',
        counterName: 'Anglo-Slav Defensive Setup',
        counterMoves: '1... c6 2. Nf3 d5 3. g3 Nf6 4. Bg2 Bf5',
        whyItWorks: 'A granite-like defensive setup that gives Black a solid classical center with zero structural weaknesses.',
        recommendedPlan: 'Develop the light bishop to f5 before playing ...e6, locking down the center.',
        difficulty: 'Beginner',
        winRateAdvantage: '44% Draw rate across master games',
        keyPawnBreaks: ['e7-e5', 'c6-c5'],
      },
    ],
    continuationTree: [
      {
        id: 'eng-cont-1',
        moveSan: 'e5',
        responseSan: 'Nc3',
        coachNote: '1...e5 claims the center directly. White develops Nc3 to contest d5.',
        evaluation: 'Equal (=)',
      },
      {
        id: 'eng-cont-2',
        moveSan: 'Nf6',
        responseSan: 'g3',
        coachNote: 'Both sides prepare their central and flank schemes.',
        evaluation: 'Equal (=)',
      },
      {
        id: 'eng-cont-3',
        moveSan: 'd5',
        responseSan: 'cxd5',
        coachNote: '3...d5! strikes the center immediately, exchanging pawns.',
        evaluation: 'Equal (=)',
      },
      {
        id: 'eng-cont-4',
        moveSan: 'Nxd5',
        responseSan: 'Bg2',
        coachNote: 'Black’s knight on d5 is centralized; White develops the bishop to g2.',
        evaluation: 'Equal (=)',
      },
    ],
    winningRoadmap: [
      'Step 1: Occupy the center with 1...e5! and strike with ...d5.',
      'Step 2: Relocate the knight to b6 and coordinate minor pieces harmoniously.',
      'Step 3: Advance ...f5-f4 to threaten White’s fianchettoed king.',
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
