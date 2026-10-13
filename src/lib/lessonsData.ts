export type LessonDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface LessonStep {
  stepId: number;
  title: string;
  instruction: string;
  fen: string;
  solutionMoves: string[]; // Player's expected SAN moves
  opponentReplies?: string[]; // Opponent's automatic SAN responses
  hint: string;
  explanation: string;
  arrowHint?: { from: string; to: string };
}

export interface ChessLesson {
  id: string;
  trackId: string;
  title: string;
  subtitle: string;
  difficulty: LessonDifficulty;
  durationMinutes: number;
  coachIntro: string;
  steps: LessonStep[];
}

export interface LessonTrack {
  id: string;
  title: string;
  description: string;
  difficulty: LessonDifficulty;
  lessons: ChessLesson[];
}

export const LESSON_TRACKS: LessonTrack[] = [
  {
    id: 'track-beginner',
    title: 'Beginner: Fundamental Principles',
    description: 'Master central control, piece development, king safety, and elementary checkmates.',
    difficulty: 'beginner',
    lessons: [
      {
        id: 'lesson-golden-rules',
        trackId: 'track-beginner',
        title: 'The Golden Rules of the Opening',
        subtitle: 'Control the Center, Develop Minor Pieces, and Castle Early',
        difficulty: 'beginner',
        durationMinutes: 8,
        coachIntro:
          "Welcome! In the opening, every move must count. Never push random flank pawns when you could stake a claim in the center or mobilize your knights and bishops!",
        steps: [
          {
            stepId: 1,
            title: 'Claim the Center',
            instruction: 'Stake your claim in the center of the board with your King’s Pawn.',
            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            solutionMoves: ['e4'],
            hint: 'Move your e-pawn forward two squares to control d5 and f5.',
            explanation:
              '1. e4 immediately controls critical central squares (d5, f5) and frees diagonals for both your queen and light-squared bishop.',
            arrowHint: { from: 'e2', to: 'e4' },
          },
          {
            stepId: 2,
            title: 'Develop With Threat',
            instruction: 'Black responded with 1... e5. Mobilize your King’s Knight to pressure Black’s e5 pawn.',
            fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
            solutionMoves: ['Nf3'],
            hint: 'Develop the knight towards the center to attack e5.',
            explanation:
              '2. Nf3 develops a minor piece towards the center while simultaneously attacking the unprotected e5 pawn!',
            arrowHint: { from: 'g1', to: 'f3' },
          },
          {
            stepId: 3,
            title: 'Eye the Weak f7 Square',
            instruction: 'Black defended with 2... Nc6. Bring your light-squared bishop to active duty targeting f7.',
            fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 1 3',
            solutionMoves: ['Bc4'],
            hint: 'Place your bishop on c4 where it directly aims at Black’s vulnerable f7 pawn.',
            explanation:
              '3. Bc4 (The Italian Game) develops your bishop along the crucial a2-g8 diagonal, putting direct pressure on f7.',
            arrowHint: { from: 'f1', to: 'c4' },
          },
          {
            stepId: 4,
            title: 'Tuck Your King to Safety',
            instruction: 'Both sides have developed minor pieces. Castle kingside to secure your king and activate your rook.',
            fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 4',
            solutionMoves: ['O-O'],
            hint: 'Castle kingside by moving your king two squares to g1.',
            explanation:
              'Castling accomplishes two vital goals at once: it tucks your king into a safe fortress behind pawns and brings the rook closer to central open files.',
            arrowHint: { from: 'e1', to: 'g1' },
          },
        ],
      },
      {
        id: 'lesson-back-rank',
        trackId: 'track-beginner',
        title: 'The Lethal Back-Rank Mate',
        subtitle: 'Exploiting Trapped Kings Behind Unmoved Pawns',
        difficulty: 'beginner',
        durationMinutes: 6,
        coachIntro:
          "The back-rank mate is the most common tactical blowout in club chess. When a king is trapped behind its own shield of unmoved pawns without 'luft' (escape air), a single rook or queen can end the game instantly!",
        steps: [
          {
            stepId: 1,
            title: 'Infiltrate the 8th Rank',
            instruction: 'Black’s king has no escape squares on the 7th rank. Deliver checkmate with your rook!',
            fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
            solutionMoves: ['Re8#'],
            hint: 'Slide your rook all the way to the 8th rank.',
            explanation:
              'Checkmate! The black pawns on f7, g7, and h7 act as a prison wall preventing the king from stepping forward.',
            arrowHint: { from: 'e1', to: 'e8' },
          },
          {
            stepId: 2,
            title: 'Clear the Defending Guard',
            instruction: 'Black’s rook on d8 guards the back rank. Deflect or eliminate the defender to checkmate!',
            fen: '3r2k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
            solutionMoves: ['Rxd8#'],
            hint: 'Capture the defending black rook on d8 with your own rook.',
            explanation:
              'Rxd8# removes the defender and simultaneously delivers back-rank checkmate because Black has no piece left to block!',
            arrowHint: { from: 'd1', to: 'd8' },
          },
        ],
      },
      {
        id: 'lesson-scholar-mate',
        trackId: 'track-beginner',
        title: "Countering the Scholar's Mate Trap",
        subtitle: 'Punishing Premature Queen Attacks with Solid Development',
        difficulty: 'beginner',
        durationMinutes: 7,
        coachIntro:
          "Beginners face the 4-move Scholar's Mate constantly. When White brings their Queen out early with 2. Qh5, don't panic! Defend your e-pawn, kick the Queen with tempo, and gain a massive lead in development.",
        steps: [
          {
            stepId: 1,
            title: 'Defend the Central Pawn',
            instruction: 'White played 2. Qh5 attacking e5. Develop your knight to defend e5 solidly.',
            fen: 'rnbqkbnr/pppp1ppp/8/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2',
            solutionMoves: ['Nc6'],
            hint: 'Develop your b8 knight to c6 to protect the e5 pawn.',
            explanation:
              '2... Nc6 defends e5 and develops a piece. Never play 2... g6 immediately because White wins the e5 pawn and your h8 rook with 3. Qxe5+!',
            arrowHint: { from: 'b8', to: 'c6' },
          },
          {
            stepId: 2,
            title: 'Kick the Queen with Tempo',
            instruction: 'White played 3. Bc4 aiming for checkmate on f7. Repel the threat by blocking the diagonal!',
            fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3',
            solutionMoves: ['g6'],
            hint: 'Push your g-pawn to g6 to shut down the f7 diagonal.',
            explanation:
              '3... g6! blunts the attack on f7 and kicks White’s queen. Since e5 is already guarded by the knight, White gets no tricks!',
            arrowHint: { from: 'g7', to: 'g6' },
          },
        ],
      },
    ],
  },
  {
    id: 'track-intermediate',
    title: 'Intermediate: Tactical Weapons & Calculation',
    description: 'Master tactical motifs including forks, absolute pins, discovered attacks, and deflection.',
    difficulty: 'intermediate',
    lessons: [
      {
        id: 'lesson-knight-forks',
        trackId: 'track-intermediate',
        title: 'The Royal Knight Fork',
        subtitle: 'Geometric Jumping Attacks on High-Value Targets',
        difficulty: 'intermediate',
        durationMinutes: 10,
        coachIntro:
          "The knight is the only piece that can jump over others, making its double attacks uniquely terrifying. Look for geometric patterns where the enemy King and Queen share the same knight radius!",
        steps: [
          {
            stepId: 1,
            title: 'The Royal Fork',
            instruction: 'Black’s King and Queen are aligned on e8 and d8. Find the crushing knight fork on d6!',
            fen: 'r1bqk2r/pp2bppp/2n1p3/2pp4/4N3/3P1N2/PPP1BPPP/R1BQK2R w KQkq - 0 8',
            solutionMoves: ['Nd6+'],
            hint: 'Check the king while simultaneously targeting the queen or bishop.',
            explanation:
              'Nd6+ forks the king and light-squared bishop with check, forcing Black to give up their bishop pair or lose king castling rights.',
            arrowHint: { from: 'e4', to: 'd6' },
          },
          {
            stepId: 2,
            title: 'King & Rook Fork on c7',
            instruction: 'Black left c7 unguarded. Jump your knight to c7 to fork the King and Rook!',
            fen: 'r1b1k2r/pp1p1ppp/2n1pn2/8/1b1NP3/2N1B3/PPP2PPP/R2QKB1R w KQkq - 4 8',
            solutionMoves: ['Ndb5'],
            hint: 'Threaten the devastating Nc7+ fork on the next move.',
            explanation:
              'Ndb5 creates an irresistible threat of Nc7+, which will fork Black’s King on e8 and Rook on a8!',
            arrowHint: { from: 'd4', to: 'b5' },
          },
        ],
      },
      {
        id: 'lesson-discovered-attack',
        trackId: 'track-intermediate',
        title: 'The Devastating Discovered Check',
        subtitle: 'Unmasking Hidden Artillery With Inescapable Double Threats',
        difficulty: 'intermediate',
        durationMinutes: 9,
        coachIntro:
          "A discovered check happens when one piece moves out of the way, unleashing check from a rook or bishop behind it. Because the king must respond to the check, the moving piece can wreak total havoc!",
        steps: [
          {
            stepId: 1,
            title: 'Unmask the Bishop',
            instruction: 'White’s bishop on b2 aligns with Black’s king on g7. Unleash discovered check to win Black’s queen!',
            fen: 'r4rk1/pb3ppp/1p2p3/3q4/3N4/8/PB3PPP/R2Q1RK1 w - - 0 16',
            solutionMoves: ['Nf3'],
            hint: 'Retreat the knight to f3 to discover a mate threat or bishop fire on the king.',
            explanation:
              'By uncovering the battery towards g7, White threatens mate on g7 while defending against Queen infiltration!',
            arrowHint: { from: 'd4', to: 'f3' },
          },
        ],
      },
      {
        id: 'lesson-absolute-pin',
        trackId: 'track-intermediate',
        title: 'The Power of the Absolute Pin',
        subtitle: 'Paralyzing Enemy Pieces Against the King',
        difficulty: 'intermediate',
        durationMinutes: 8,
        coachIntro:
          "An absolute pin freezes an enemy piece because moving it would expose their king to illegal check. A pinned piece is not a real defender!",
        steps: [
          {
            stepId: 1,
            title: 'Pin the Defending Knight',
            instruction: 'Black’s knight on c6 defends e5. Pin it to the King with your light-squared bishop!',
            fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
            solutionMoves: ['Bb5'],
            hint: 'Play the foundational move of the Ruy Lopez to pin the knight.',
            explanation:
              '3. Bb5 pins the c6 knight. Although not an absolute pin until Black castles, it puts intense indirect pressure on e5!',
            arrowHint: { from: 'f1', to: 'b5' },
          },
          {
            stepId: 2,
            title: 'Pile Up on the Pinned Piece',
            instruction: 'Black’s knight on f6 is absolutely pinned to the Queen. Attack the pinned piece with your pawn!',
            fen: 'r1b1k2r/pp3ppp/2p1pn2/8/1b1qP3/2NB1Q2/PPP2PPP/R1B1K2R w KQkq - 0 9',
            solutionMoves: ['e5'],
            hint: 'Advance your pawn to attack the pinned knight on f6.',
            explanation:
              'The golden rule of pins: "Attack the pinned piece!" Black cannot move the f6 knight without exposing their queen, winning material.',
            arrowHint: { from: 'e4', to: 'e5' },
          },
        ],
      },
    ],
  },
  {
    id: 'track-advanced',
    title: 'Advanced: Master Endgames & Prophylaxis',
    description: 'Technical conversion in theoretical rook endgames and grandmaster prophylaxis.',
    difficulty: 'advanced',
    lessons: [
      {
        id: 'lesson-lucena-bridge',
        trackId: 'track-advanced',
        title: 'The Lucena Position: Building the Bridge',
        subtitle: 'The Most Important Theoretical Rook Endgame Technique',
        difficulty: 'advanced',
        durationMinutes: 12,
        coachIntro:
          "Discovered in 1497, the Lucena Position is the foundational winning technique in rook and pawn endgames. White has an advanced pawn on the 7th rank with the king in front. The secret to winning is 'Building a Bridge' with your rook on the 4th rank!",
        steps: [
          {
            stepId: 1,
            title: 'Step 1: The 4th Rank Rook Elevator',
            instruction: 'Move your rook to the 4th rank to prepare the bridge that will shelter your king from checks.',
            fen: '1K1R4/3P1k2/8/8/8/8/8/5r2 w - - 0 1',
            solutionMoves: ['Rd4'],
            hint: 'Place your rook on the 4th rank (d4).',
            explanation:
              '1. Rd4! (or Rf4+) is the cornerstone of the Lucena technique. The rook on the 4th rank will later intercept Black’s vertical checks!',
            arrowHint: { from: 'd8', to: 'd4' },
          },
          {
            stepId: 2,
            title: 'Step 2: Evacuate the King',
            instruction: 'Black played 1... Ke7. Step your king out to c7 to pave the way for promotion!',
            fen: '1K6/3Pk3/8/8/3R4/8/8/5r2 w - - 1 2',
            solutionMoves: ['Kc7'],
            hint: 'Step the king out to c7.',
            explanation:
              '2. Kc7 unmasks the pawn and directly threatens promotion to Queen on d8.',
            arrowHint: { from: 'b8', to: 'c7' },
          },
        ],
      },
      {
        id: 'lesson-opposition',
        trackId: 'track-advanced',
        title: 'King Opposition & Outflanking',
        subtitle: 'Direct Opposition in Critical King & Pawn Endgames',
        difficulty: 'advanced',
        durationMinutes: 10,
        coachIntro:
          "The Opposition is a duel between two kings separated by one square. Whoever does NOT have to move holds the opposition and can force the enemy king to give way!",
        steps: [
          {
            stepId: 1,
            title: 'Seize the Direct Opposition',
            instruction: 'Step your king to e5 directly opposite Black’s king with an odd number of squares between you.',
            fen: '8/4k3/8/8/4K3/8/8/8 w - - 0 1',
            solutionMoves: ['Ke5'],
            hint: 'Advance your king to e5 directly in front of Black’s king.',
            explanation:
              'Ke5 seizes the opposition! Black must now step aside to either d7 or f7, granting White access to key forward squares.',
            arrowHint: { from: 'e4', to: 'e5' },
          },
        ],
      },
    ],
  },
];
