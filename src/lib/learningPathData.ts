import { LearningUnit, LearningPathNode } from '@/types/chess';
import { XpSystem } from '@/lib/xpSystem';
export type { LearningUnit, LearningPathNode };

export const LEARNING_UNITS: LearningUnit[] = [
  // ==========================================
  // TACTICS TRACK
  // ==========================================
  {
    id: 'unit-tactics-1',
    unitNumber: 1,
    title: 'Tactical Foundations',
    subtitle: 'Pins, Forks, and Back-Rank Checkmates',
    category: 'tactics',
    themeColor: '#58cc02', // Duolingo Green
    guidebook: {
      title: 'Unit 1 Guidebook: The Building Blocks of Tactics',
      summary: 'Before complex combinations, every master relies on basic geometric patterns. The pin paralyzes, the fork attacks two targets at once, and back-rank checkmates punish un-castled or trapped kings.',
      keyPoints: [
        'An absolute pin against the King cannot legally move.',
        'Knights are the ultimate forking pieces because their jumps cannot be blocked.',
        'Keep an "air hole" (luft) like h3 or g3 so your king cannot be back-ranked.',
        'Hanging pieces (undefended pieces) are the root cause of 90% of tactical blunders.',
      ],
      exampleFen: 'r1bqkb1r/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 2 4',
    },
    nodes: [
      { id: 'node-t1-1', title: 'Scholar’s Punish', type: 'puzzle', targetId: 'puzzle-1', xpReward: 15, iconName: 'target', description: 'Punish premature queen developments.' },
      { id: 'node-t1-2', title: 'Back-Rank Decimation', type: 'puzzle', targetId: 'puzzle-2', xpReward: 20, iconName: 'shield-alert', description: 'Exploit the trapped king on the 8th rank.' },
      { id: 'node-t1-3', title: 'The Royal Fork', type: 'puzzle', targetId: 'puzzle-5', xpReward: 25, iconName: 'zap', description: 'Attack king and rook simultaneously with the knight.' },
      { id: 'node-t1-4', title: 'Corner Rook Net', type: 'puzzle', targetId: 'puzzle-6', xpReward: 25, iconName: 'crosshair', description: 'Restricting the king against the border of the board.' },
      { id: 'node-t1-chest', title: 'Foundations Chest', type: 'chest', targetId: 'chest-t1', xpReward: 100, iconName: 'gift', description: 'Claim 100 XP and the Tactical Apprentice Badge!' },
    ],
  },
  {
    id: 'unit-tactics-2',
    unitNumber: 2,
    title: 'Attacking Combinations',
    subtitle: 'Skewers, Batteries & Smothered Mates',
    category: 'tactics',
    themeColor: '#1cb0f6', // Duolingo Blue
    guidebook: {
      title: 'Unit 2 Guidebook: Coordinated Piece Batteries',
      summary: 'When multiple pieces align on open files or diagonals, their attacking force multiplies. A skewer hits through the most valuable piece, while a smothered mate suffocates a king blocked by its own army.',
      keyPoints: [
        'A skewer attacks a high-value piece first; when it flees, the piece behind is captured.',
        'Queen + Bishop batteries aimed at h7 or g7 create unstoppable mating threats.',
        'Smothered mates occur when a knight corners the king against its own defending pawns.',
        'Deflection pulls an essential defender away from its guard square.',
      ],
      exampleFen: '6k1/5Npp/8/8/8/8/8/4Q1K1 w - - 0 1',
    },
    nodes: [
      { id: 'node-t2-1', title: 'The Absolute Pin', type: 'puzzle', targetId: 'puzzle-8', xpReward: 20, iconName: 'lock', description: 'Pinning the enemy queen to seize central initiative.' },
      { id: 'node-t2-2', title: 'King & Queen Skewer', type: 'puzzle', targetId: 'puzzle-9', xpReward: 25, iconName: 'arrow-right-circle', description: 'Skewering the monarch down the open e-file.' },
      { id: 'node-t2-3', title: 'Battery Escalation', type: 'puzzle', targetId: 'puzzle-10', xpReward: 30, iconName: 'flame', description: 'Stacking Queen and Bishop along the long diagonal.' },
      { id: 'node-t2-4', title: 'Smothered Decapitation', type: 'puzzle', targetId: 'puzzle-7', xpReward: 35, iconName: 'skull', description: 'Using the knight to smother the cornered king.' },
      { id: 'node-t2-chest', title: 'Attacking Arsenal Chest', type: 'chest', targetId: 'chest-t2', xpReward: 150, iconName: 'gift', description: 'Claim 150 XP and the Battery Master Badge!' },
    ],
  },
  {
    id: 'unit-tactics-3',
    unitNumber: 3,
    title: 'Master Demolitions',
    subtitle: 'Greek Gift, Windmills & Double Bishop Sacrifices',
    category: 'tactics',
    themeColor: '#ff9600', // Duolingo Orange
    guidebook: {
      title: 'Unit 3 Guidebook: Classical Grandmaster Sacrifices',
      summary: 'True tactical mastery requires giving up material to blow open the enemy castle. Emanuel Lasker and Paul Morphy immortalized these attacking blueprints.',
      keyPoints: [
        'The Greek Gift (Bxh7+) requires an active knight reaching g5 and a queen reaching h5.',
        'A Windmill is a repeating cycle of alternating normal and discovered checks.',
        'Double Bishop sacrifices (Bxh7+ followed by Bxg7+) rip away the entire pawn shield.',
        'An intermezzo (Zwischenzug) interrupts the opponent’s expected sequence with a forcing intermediate blow.',
      ],
      exampleFen: 'r1bq1rk1/ppp2ppp/2n1pn2/3p4/3P4/2NBPN2/PPP2PPP/R2QK2R w KQ - 0 1',
    },
    nodes: [
      { id: 'node-t3-1', title: 'The Greek Gift', type: 'puzzle', targetId: 'puzzle-26', xpReward: 35, iconName: 'sparkles', description: 'The timeless classical Bxh7+ demolition.' },
      { id: 'node-t3-2', title: 'The Opera House Mate', type: 'puzzle', targetId: 'puzzle-16', xpReward: 40, iconName: 'crown', description: 'Morphy’s legendary queen sacrifice in Paris.' },
      { id: 'node-t3-3', title: 'The Windmill Harvest', type: 'puzzle', targetId: 'puzzle-22', xpReward: 45, iconName: 'rotate-cw', description: 'Infinite discovered checks cleaning out pieces.' },
      { id: 'node-t3-4', title: 'Double Bishop Demolition', type: 'puzzle', targetId: 'puzzle-18', xpReward: 50, iconName: 'swords', description: 'Lasker’s immortal sacrifice of both bishops.' },
      { id: 'node-t3-chest', title: 'Grandmaster Chest', type: 'chest', targetId: 'chest-t3', xpReward: 200, iconName: 'gift', description: 'Claim 200 XP and the Tactical Grandmaster Trophy!' },
    ],
  },
  {
    id: 'unit-tactics-4',
    unitNumber: 4,
    title: 'Deflections & Decoys',
    subtitle: 'Overloading Defenders and Forcing Square Evacuation',
    category: 'tactics',
    themeColor: '#a855f7', // Duolingo Purple
    guidebook: {
      title: 'Unit 4 Guidebook: Geometric Overload',
      summary: 'When a defending piece is assigned to two critical tasks, one must be abandoned. Deflections forcibly divert defenders away from checkmate or material loss.',
      keyPoints: [
        'Identify all pieces performing double duty (guarding two squares simultaneously).',
        'Decoys draw an enemy piece to a poisoned square where it is captured or pinned.',
        'Clearance sacrifices discard a friendly piece to free a crucial transit square or line.',
      ],
      exampleFen: '3r2k1/p4ppp/1p6/8/8/8/5PPP/3R2K1 w - - 0 1',
    },
    nodes: [
      { id: 'node-t4-1', title: 'Overloaded Defender', type: 'puzzle', targetId: 'puzzle-29', xpReward: 30, iconName: 'crosshair', description: 'Exploiting the piece that has too much work to do.' },
      { id: 'node-t4-2', title: 'The Queen Decoy Trap', type: 'puzzle', targetId: 'puzzle-34', xpReward: 35, iconName: 'zap', description: 'Luring the enemy queen into a fatal fork.' },
      { id: 'node-t4-3', title: 'File Clearance Blast', type: 'puzzle', targetId: 'puzzle-38', xpReward: 40, iconName: 'flame', description: 'Sacrificing a minor piece to open an unstoppable file.' },
      { id: 'node-t4-4', title: 'The Intermezzo Counter', type: 'puzzle', targetId: 'puzzle-42', xpReward: 45, iconName: 'sparkles', description: 'A devastating intermediate in-between check.' },
      { id: 'node-t4-chest', title: 'Tactical Virtuoso Chest', type: 'chest', targetId: 'chest-t4', xpReward: 220, iconName: 'gift', description: 'Claim 220 XP and the Master Deflector Crest!' },
    ],
  },
  {
    id: 'unit-tactics-5',
    unitNumber: 5,
    title: 'Immortal Combinations',
    subtitle: 'Queen Sacrifices, Mating Nets & Turret Domination',
    category: 'tactics',
    themeColor: '#ef4444', // Duolingo Crimson
    guidebook: {
      title: 'Unit 5 Guidebook: Pure Artistic Calculation',
      summary: 'The highest echelon of tactical calculation: mating nets where kings are hunted across the entire board with quiet moves and sacrificial thunderbolts.',
      keyPoints: [
        'A quiet move (Stille Zug) with no check or capture can be the most forcing move in chess.',
        'Mating nets weave an invisible perimeter the king cannot escape.',
        'Queen sacrifices are calculated down to guaranteed checkmate or massive promotion.',
      ],
      exampleFen: 'r1b1k2r/pppp1ppp/8/8/8/8/PPPP1PPP/R1B1K2R w KQkq - 0 1',
    },
    nodes: [
      { id: 'node-t5-1', title: 'Morphy’s Knight Hunt', type: 'puzzle', targetId: 'puzzle-52', xpReward: 40, iconName: 'swords', description: 'A relentless sacrificial knight hunt.' },
      { id: 'node-t5-2', title: 'Kasparov’s Turret Breach', type: 'puzzle', targetId: 'puzzle-61', xpReward: 45, iconName: 'crown', description: 'Rook sacrifices cracking open the center.' },
      { id: 'node-t5-3', title: 'Tal’s Magician Net', type: 'puzzle', targetId: 'puzzle-68', xpReward: 50, iconName: 'sparkles', description: 'Mikhail Tal’s intuitive kingside tempest.' },
      { id: 'node-t5-4', title: 'Immortal Queen Sacrifice', type: 'puzzle', targetId: 'puzzle-74', xpReward: 55, iconName: 'zap', description: 'The absolute pinnacle: Queen sacrifice for mate in 3.' },
      { id: 'node-t5-chest', title: 'Grandmaster Immortal Chest', type: 'chest', targetId: 'chest-t5', xpReward: 250, iconName: 'gift', description: 'Claim 250 XP and the Immortal Tactician Laurel!' },
    ],
  },

  // ==========================================
  // ENDGAMES TRACK
  // ==========================================
  {
    id: 'unit-endgame-1',
    unitNumber: 1,
    title: 'King & Pawn Fundamentals',
    subtitle: 'Direct Opposition & The Rule of the Square',
    category: 'endgames',
    themeColor: '#ce82ff', // Duolingo Purple
    guidebook: {
      title: 'Endgame Unit 1: The Soul of Pawn Play',
      summary: 'In pawn endgames, every tempo is life or death. Learning direct opposition and the rule of the square guarantees you never miscalculate whether a passed pawn can be caught.',
      keyPoints: [
        'Direct opposition means kings face each other with an odd number of squares between them.',
        'When you have the opposition, your opponent must give way and concede infiltration squares.',
        'The Rule of the Square allows instant visual calculation without move-by-move counting.',
        'Keep your King in front of your passed pawn to pave its road to promotion.',
      ],
      exampleFen: '4k3/8/4P3/4K3/8/8/8/8 w - - 0 1',
    },
    nodes: [
      { id: 'node-e1-1', title: 'The Direct Opposition', type: 'endgame', targetId: 'endgame-1', xpReward: 20, iconName: 'shield', description: 'Taking the opposition to escort your passed pawn.' },
      { id: 'node-e1-2', title: 'The Defensive Draw Wall', type: 'endgame', targetId: 'endgame-2', xpReward: 25, iconName: 'anchor', description: 'Holding a dead draw with passive vertical opposition.' },
      { id: 'node-e1-3', title: 'The Rule of the Square', type: 'endgame', targetId: 'endgame-3', xpReward: 25, iconName: 'maximize', description: 'Catching or racing passed pawns without counting.' },
      { id: 'node-e1-4', title: 'Triangulation Mastery', type: 'endgame', targetId: 'endgame-4', xpReward: 35, iconName: 'triangle', description: 'Losing a tempo on purpose to force zugzwang.' },
      { id: 'node-e1-chest', title: 'Pawn Specialist Chest', type: 'chest', targetId: 'chest-e1', xpReward: 120, iconName: 'gift', description: 'Claim 120 XP and the Pawn Endgame Shield!' },
    ],
  },
  {
    id: 'unit-endgame-2',
    unitNumber: 2,
    title: 'Rook Endgames: The Citadel',
    subtitle: 'Lucena Bridge & The Philidor 3rd-Rank Defense',
    category: 'endgames',
    themeColor: '#ff4b4b', // Duolingo Coral Red
    guidebook: {
      title: 'Endgame Unit 2: Essential Rook Mechanics',
      summary: 'Rook endgames make up over 50% of all chess endings! If you know the Lucena Bridge and Philidor Defense, you will convert winning positions and save lost games routinely.',
      keyPoints: [
        'The Lucena Position (Re4! bridge) is the single most important winning endgame in chess.',
        'Philidor Defense: Hold the 3rd rank, and drop back for checks only when the pawn pushes.',
        'Rooks belong behind passed pawns (Tarrasch Rule)—both your own and your opponent’s.',
        'Active rooks compensate for lost pawns; passive rooks lose games.',
      ],
      exampleFen: '1K1k4/1P1r4/8/8/8/8/4R3/8 w - - 0 1',
    },
    nodes: [
      { id: 'node-e2-1', title: 'The Lucena Bridge', type: 'endgame', targetId: 'endgame-6', xpReward: 35, iconName: 'bridge', description: 'Building the 4th-rank bridge to promote safely.' },
      { id: 'node-e2-2', title: 'The Philidor 3rd-Rank', type: 'endgame', targetId: 'endgame-7', xpReward: 35, iconName: 'shield-check', description: 'The ultimate drawing fortress in rook endings.' },
      { id: 'node-e2-3', title: 'Vancura Side Checks', type: 'endgame', targetId: 'endgame-8', xpReward: 40, iconName: 'arrow-left-right', description: 'Harassing the enemy king from distant flank files.' },
      { id: 'node-e2-4', title: 'Saavedra Underpromotion', type: 'endgame', targetId: 'endgame-11', xpReward: 50, iconName: 'sparkles', description: 'The immortal underpromotion to Rook against stalemate.' },
      { id: 'node-e2-chest', title: 'Rook Master Chest', type: 'chest', targetId: 'chest-e2', xpReward: 180, iconName: 'gift', description: 'Claim 180 XP and the Fortress Defender Badge!' },
    ],
  },
  {
    id: 'unit-endgame-3',
    unitNumber: 3,
    title: 'Queen vs Pawn & Races',
    subtitle: '7th-Rank Bishop/Rook Pawns & Réti Dual Diagonals',
    category: 'endgames',
    themeColor: '#06b6d4', // Cyan
    guidebook: {
      title: 'Endgame Unit 3: Theoretical Stalemate Traps',
      summary: 'Queen vs Pawn looks simple, but bishop and rook pawns on the 7th rank contain notorious stalemate traps that draw unless the King is close enough.',
      keyPoints: [
        'A pawn on c7/f7 (bishop pawn) or a7/h7 (rook pawn) draws against a queen if the king is trapped in the corner.',
        'Knight and central pawns (b, d, e, g) lose easily because the Queen forces the King in front.',
        'Richard Réti’s 1921 study proves a king can chase two distant targets along one diagonal.',
      ],
      exampleFen: '7K/8/k1P5/7p/8/8/8/8 w - - 0 1',
    },
    nodes: [
      { id: 'node-e3-1', title: 'Queen vs Bishop Pawn', type: 'endgame', targetId: 'endgame-13', xpReward: 35, iconName: 'crown', description: 'Avoiding stalemate traps on the 7th rank.' },
      { id: 'node-e3-2', title: 'Réti’s Dual Diagonal', type: 'endgame', targetId: 'endgame-14', xpReward: 40, iconName: 'sparkles', description: 'The immortal king calculation that saves an impossible game.' },
      { id: 'node-e3-3', title: 'Trebuchet Mutual Zugzwang', type: 'endgame', targetId: 'endgame-17', xpReward: 45, iconName: 'crosshair', description: 'Whoever has the move loses instantly.' },
      { id: 'node-e3-4', title: 'Centurini’s Bishop Barrier', type: 'endgame', targetId: 'endgame-19', xpReward: 45, iconName: 'shield', description: 'Cutting off the enemy king with bishop geometry.' },
      { id: 'node-e3-chest', title: 'Pawn Race Specialist Chest', type: 'chest', targetId: 'chest-e3', xpReward: 220, iconName: 'gift', description: 'Claim 220 XP and the Tablebase Calculation Shield!' },
    ],
  },
  {
    id: 'unit-endgame-4',
    unitNumber: 4,
    title: 'Grandmaster Fortress Studies',
    subtitle: 'Troitsky Knights, Cochrane Defense & Dvoretsky Shouldering',
    category: 'endgames',
    themeColor: '#10b981', // Emerald
    guidebook: {
      title: 'Endgame Unit 4: The Deepest 7-Piece Tablebase Truths',
      summary: 'Studies from Troitsky, Dvoretsky, and Philidor that show how a single tempo or a lone cornered knight can hold an impenetrable drawing fortress against superior material.',
      keyPoints: [
        'Two knights cannot checkmate a lone king, but CAN checkmate if the opponent has a pawn to prevent stalemate!',
        'Shouldering (Dvoretsky) uses your king’s body to box out the opponent’s king.',
        'The Cochrane Defense holds Rook + Bishop vs Rook by pinning the bishop on the center file.',
      ],
      exampleFen: '8/8/8/8/8/5K2/4N3/4k1N1 w - - 0 1',
    },
    nodes: [
      { id: 'node-e4-1', title: 'Troitsky Two Knights', type: 'endgame', targetId: 'endgame-22', xpReward: 45, iconName: 'swords', description: 'Using the opponent’s own pawn to break stalemate.' },
      { id: 'node-e4-2', title: 'Cochrane Drawing Defense', type: 'endgame', targetId: 'endgame-25', xpReward: 50, iconName: 'shield-check', description: 'Holding the draw against Rook and Bishop.' },
      { id: 'node-e4-3', title: 'Dvoretsky Shoulder Box', type: 'endgame', targetId: 'endgame-28', xpReward: 50, iconName: 'zap', description: 'Physically boxing the enemy monarch from the key square.' },
      { id: 'node-e4-4', title: 'Tarrasch Behind Passed Pawns', type: 'endgame', targetId: 'endgame-30', xpReward: 55, iconName: 'crown', description: 'The absolute law of rook placement in long endings.' },
      { id: 'node-e4-chest', title: 'Grandmaster Sage Chest', type: 'chest', targetId: 'chest-e4', xpReward: 260, iconName: 'gift', description: 'Claim 260 XP and the Tablebase Grandmaster Crest!' },
    ],
  },

  // ==========================================
  // OPENINGS TRACK
  // ==========================================
  {
    id: 'unit-opening-1',
    unitNumber: 1,
    title: 'Classical King’s Pawn',
    subtitle: 'Ruy Lopez, Italian Game & Romantic Gambits',
    category: 'openings',
    themeColor: '#eab308', // Gold
    guidebook: {
      title: 'Opening Unit 1: The Open Games (1.e4 e5)',
      summary: 'The battle for the center starts on move one. The Open Games teach piece activity, rapid development, and tactical pressure against f7 and e5.',
      keyPoints: [
        'Control the center with e4/d4 before launching flank attacks.',
        'Develop Knights before Bishops.',
        'Castle early to safeguard your monarch and activate the rook.',
        'Do not move the same piece twice in the opening without tactical justification.',
      ],
      exampleFen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
    },
    nodes: [
      { id: 'node-o1-1', title: 'The Italian Game', type: 'opening', targetId: 'C50', xpReward: 25, iconName: 'compass', description: 'Giuoco Piano: Rapid classical development directly targeting f7.' },
      { id: 'node-o1-2', title: 'The Ruy Lopez', type: 'opening', targetId: 'C60', xpReward: 30, iconName: 'castle', description: 'The Spanish Opening: Long-term strategic pressure on the c6 knight.' },
      { id: 'node-o1-3', title: 'The Evans Gambit', type: 'opening', targetId: 'C51', xpReward: 35, iconName: 'flame', description: 'Captain Evans’ swashbuckling b4 sacrifice for central conquest.' },
      { id: 'node-o1-4', title: 'The Scotch Game', type: 'opening', targetId: 'C44', xpReward: 30, iconName: 'crosshair', description: 'Immediate 3.d4 strike busting open the center.' },
      { id: 'node-o1-chest', title: 'Open Games Repertoire Chest', type: 'chest', targetId: 'chest-o1', xpReward: 150, iconName: 'gift', description: 'Claim 150 XP and the Repertoire Scholar Medal!' },
    ],
  },
  {
    id: 'unit-opening-2',
    unitNumber: 2,
    title: 'Semi-Open Warfare',
    subtitle: 'The Sicilian Defense & French Fortress',
    category: 'openings',
    themeColor: '#f97316', // Orange
    guidebook: {
      title: 'Opening Unit 2: Asymmetric Counter-Attacks',
      summary: 'When Black responds to 1.e4 with 1...c5 or 1...e6, the game immediately diverges from symmetry into sharp imbalanced battlegrounds.',
      keyPoints: [
        'The Sicilian trades a flank c-pawn for White’s central d-pawn, creating a half-open c-file.',
        'The Najdorf variation is the weapon of choice for world champions Fischer and Kasparov.',
        'The French Defense builds a granite pawn chain on d5 and e6, attacking White’s base on d4.',
      ],
      exampleFen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
    },
    nodes: [
      { id: 'node-o2-1', title: 'Sicilian Defense Open', type: 'opening', targetId: 'B20', xpReward: 30, iconName: 'swords', description: 'The most popular fighting defense at grandmaster level.' },
      { id: 'node-o2-2', title: 'The Sicilian Najdorf', type: 'opening', targetId: 'B90', xpReward: 35, iconName: 'flame', description: 'Kasparov and Fischer’s legendary 5...a6 weapon.' },
      { id: 'node-o2-3', title: 'French Defense Classical', type: 'opening', targetId: 'C00', xpReward: 30, iconName: 'shield', description: 'The resilient 1.e4 e6 structure countering with ...c5.' },
      { id: 'node-o2-4', title: 'Caro-Kann Defense', type: 'opening', targetId: 'B10', xpReward: 35, iconName: 'lock', description: 'Karpov’s ultra-solid 1...c6 defense.' },
      { id: 'node-o2-chest', title: 'Asymmetric Repertoire Chest', type: 'chest', targetId: 'chest-o2', xpReward: 180, iconName: 'gift', description: 'Claim 180 XP and the Sicilian Master Blade!' },
    ],
  },
  {
    id: 'unit-opening-3',
    unitNumber: 3,
    title: 'Queen’s Pawn & Hypermodernism',
    subtitle: 'Queen’s Gambit, King’s Indian & The English',
    category: 'openings',
    themeColor: '#3b82f6', // Duolingo Modern Blue
    guidebook: {
      title: 'Opening Unit 3: Strategic Depth and Flank Strikes',
      summary: '1.d4 leads to rich, positional maneuvers. Black either fights symmetrically in the Queen’s Gambit or invites White to occupy the center in the King’s Indian before launching a flank hurricane.',
      keyPoints: [
        'The Queen’s Gambit (1.d4 d5 2.c4) is not a true gambit; White can regain the pawn easily.',
        'The King’s Indian Defense unleashes furious pawn storms (f5-f4) directly against White’s king.',
        'Hypermodern principles control the center with pieces from afar rather than immediate pawns.',
      ],
      exampleFen: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2',
    },
    nodes: [
      { id: 'node-o3-1', title: 'Queen’s Gambit Declined', type: 'opening', targetId: 'D30', xpReward: 35, iconName: 'castle', description: 'The bedrock of classical world championship matches.' },
      { id: 'node-o3-2', title: 'King’s Indian Defense', type: 'opening', targetId: 'E60', xpReward: 40, iconName: 'flame', description: 'The ferocious hypermodern counter-attacking system.' },
      { id: 'node-o3-3', title: 'English Opening', type: 'opening', targetId: 'A10', xpReward: 35, iconName: 'compass', description: 'Botvinnik’s favorite 1.c4 flank strategy.' },
      { id: 'node-o3-4', title: 'The Catalan System', type: 'opening', targetId: 'E00', xpReward: 45, iconName: 'crown', description: 'Kramnik and Carlsen’s premier positional masterpiece.' },
      { id: 'node-o3-chest', title: 'Repertoire Grandmaster Chest', type: 'chest', targetId: 'chest-o3', xpReward: 220, iconName: 'gift', description: 'Claim 220 XP and the Grandmaster Theory Crest!' },
    ],
  },
];

export interface LearningProgress {
  completedNodeIds: string[];
  unlockedNodeIds: string[];
  claimedChests: string[];
  xp: number;
  streak: number;
  lastActiveDate: string; // YYYY-MM-DD
}

const STORAGE_KEY = 'chess_learning_progress';

export const LearningProgressStore = {
  getProgress(): LearningProgress {
    if (typeof window === 'undefined') {
      return {
        completedNodeIds: [],
        unlockedNodeIds: ['node-t1-1', 'node-e1-1', 'node-o1-1'],
        claimedChests: [],
        xp: 180,
        streak: 1,
        lastActiveDate: new Date().toISOString().split('T')[0],
      };
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}

    const initial: LearningProgress = {
      completedNodeIds: [],
      unlockedNodeIds: ['node-t1-1', 'node-e1-1', 'node-o1-1'],
      claimedChests: [],
      xp: 180,
      streak: 1,
      lastActiveDate: new Date().toISOString().split('T')[0],
    };
    return initial;
  },

  saveProgress(p: LearningProgress) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch {}
  },

  completeNode(nodeId: string, xpReward: number = 25): { progress: LearningProgress; nextUnlockedId: string | null } {
    const p = this.getProgress();
    if (!p.completedNodeIds.includes(nodeId)) {
      p.completedNodeIds.push(nodeId);
      p.xp += xpReward;
    }

    // Award XP through central XP system
    try {
      XpSystem.awardXp(xpReward, 'Milestone Completed');
    } catch {}

    // Find what unit this node belongs to and unlock the next node in line
    let nextUnlockedId: string | null = null;
    for (const unit of LEARNING_UNITS) {
      const idx = unit.nodes.findIndex((n) => n.id === nodeId);
      if (idx !== -1) {
        // Unlock next node in this unit
        if (idx < unit.nodes.length - 1) {
          const nextNode = unit.nodes[idx + 1];
          if (!p.unlockedNodeIds.includes(nextNode.id)) {
            p.unlockedNodeIds.push(nextNode.id);
            nextUnlockedId = nextNode.id;
          }
        } else {
          // If this was the last node in unit, unlock first node of next unit in same track!
          const currentUnitIdx = LEARNING_UNITS.findIndex((u) => u.id === unit.id);
          const nextUnit = LEARNING_UNITS.find(
            (u, uIdx) => uIdx > currentUnitIdx && u.category === unit.category
          );
          if (nextUnit && nextUnit.nodes.length > 0) {
            const firstNextNode = nextUnit.nodes[0];
            if (!p.unlockedNodeIds.includes(firstNextNode.id)) {
              p.unlockedNodeIds.push(firstNextNode.id);
              nextUnlockedId = firstNextNode.id;
            }
          }
        }
      }
    }

    // Update streak
    const today = new Date().toISOString().split('T')[0];
    if (p.lastActiveDate !== today) {
      p.streak += 1;
      p.lastActiveDate = today;
    }

    this.saveProgress(p);
    return { progress: p, nextUnlockedId };
  },

  claimChest(chestId: string, xpReward: number = 100): LearningProgress {
    const p = this.getProgress();
    if (!p.claimedChests.includes(chestId)) {
      p.claimedChests.push(chestId);
      p.xp += xpReward;
      this.saveProgress(p);

      try {
        XpSystem.awardXp(xpReward, 'Unit Chest Claimed');
      } catch {}
    }
    return p;
  },
};
