export type PieceColor = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface ChessPiece {
  type: PieceType;
  color: PieceColor;
}

export type Square = 
  | 'a8' | 'b8' | 'c8' | 'd8' | 'e8' | 'f8' | 'g8' | 'h8'
  | 'a7' | 'b7' | 'c7' | 'd7' | 'e7' | 'f7' | 'g7' | 'h7'
  | 'a6' | 'b6' | 'c6' | 'd6' | 'e6' | 'f6' | 'g6' | 'h6'
  | 'a5' | 'b5' | 'c5' | 'd5' | 'e5' | 'f5' | 'g5' | 'h5'
  | 'a4' | 'b4' | 'c4' | 'd4' | 'e4' | 'f4' | 'g4' | 'h4'
  | 'a3' | 'b3' | 'c3' | 'd3' | 'e3' | 'f3' | 'g3' | 'h3'
  | 'a2' | 'b2' | 'c2' | 'd2' | 'e2' | 'f2' | 'g2' | 'h2'
  | 'a1' | 'b1' | 'c1' | 'd1' | 'e1' | 'f1' | 'g1' | 'h1';

export type BoardTheme = 'green' | 'wood' | 'glass' | 'neon' | 'marble' | 'arcade';
export type PieceTheme = 'neo' | 'staunton' | '8bit' | 'alpha';
export type SoundTheme = 'classic' | 'wood' | 'marble' | 'arcade' | 'silman';
export type AnimationSpeed = 'instant' | 'fast' | 'normal';

export type ChessVariant = 'standard' | 'chess960' | '3check' | 'kingofthehill' | 'crazyhouse' | 'solochess';

export type MoveClassification = 
  | 'brilliant' 
  | 'great' 
  | 'best' 
  | 'excellent' 
  | 'good' 
  | 'inaccuracy' 
  | 'mistake' 
  | 'blunder' 
  | 'miss' 
  | 'book';

export interface ArrowAnnotation {
  from: Square;
  to: Square;
  color?: string; // e.g. '#81b64c' for best move, '#06b6d4' for brilliant/coach, '#ef4444' for blunder
}

export interface Premove {
  from: Square;
  to: Square;
  promotion?: PieceType;
}

export interface MoveRecord {
  san: string;
  from: Square;
  to: Square;
  captured?: PieceType;
  promotion?: PieceType;
  fenBefore: string;
  fenAfter: string;
  evalBefore: number;
  evalAfter: number;
  classification?: MoveClassification;
  coachComment?: string;
  timeSpentMs?: number;
  bestMoveSan?: string;
  bestMoveUci?: string;
  isCheck?: boolean;
}

export interface GamePlayer {
  id: string;
  name: string;
  rating: number;
  avatar: string;
  title?: 'GM' | 'IM' | 'FM' | 'CM' | 'BOT' | 'VIP';
  country?: string;
  flair?: string;
  isBot?: boolean;
}

export type TimeControl = {
  initialSeconds: number;
  incrementSeconds: number;
  label: string;
  category: 'bullet' | 'blitz' | 'rapid' | 'daily';
};

export type GameStatus = 'waiting' | 'in_progress' | 'checkmate' | 'draw' | 'resigned' | 'timeout' | 'stalemate';

export interface GameResultDetails {
  winner: 'w' | 'b' | 'draw';
  reason: 'resignation' | 'checkmate' | 'timeout' | 'stalemate' | 'insufficient' | 'agreement';
  ratingDelta: number;
  newRating: number;
  league: string;
  trophiesDelta: number;
  achievementToast?: {
    title: string;
    subtitle: string;
    icon: string;
  };
}

export interface KeyMoment {
  moveIndex: number;
  turnNumber: number;
  turnColor: PieceColor;
  moveSan: string;
  bestMoveSan: string;
  classification: MoveClassification;
  evalBefore: number;
  evalAfter: number;
  coachComment: string;
  isMistake: boolean;
}

export interface BotPersonality {
  id: string;
  name: string;
  rating: number;
  category: 'beginner' | 'intermediate' | 'advanced' | 'master' | 'grandmaster';
  avatar: string;
  bio: string;
  playStyle: string;
  quotes: {
    gameStart: string[];
    goodMove: string[];
    blunder: string[];
    check: string[];
    win: string[];
    loss: string[];
  };
}

export interface TacticalPuzzle {
  id: string;
  title: string;
  rating: number;
  theme: string;
  fen: string;
  moves: string[]; // UCI or SAN sequence
  solutionDescription: string;
}

export interface OpeningInfo {
  eco: string;
  name: string;
  moves: string;
  whiteWinPct: number;
  drawPct: number;
  blackWinPct: number;
  totalGames: number;
  description: string;
}

export type MembershipTier = 'free' | 'gold' | 'platinum' | 'diamond';

export interface ClassificationTallies {
  brilliant: number;
  great: number;
  best: number;
  excellent: number;
  good: number;
  book: number;
  inaccuracy: number;
  mistake: number;
  miss: number;
  blunder: number;
}

export interface EvalTimelinePoint {
  ply: number;
  moveNumber: number;
  isWhite: boolean;
  score: number; // in centipawns
  classification?: MoveClassification;
}

export interface GameReviewReport {
  id: string;
  gameId: string;
  whitePlayer: GamePlayer;
  blackPlayer: GamePlayer;
  whiteAccuracy: number;
  blackAccuracy: number;
  tallies: {
    white: ClassificationTallies;
    black: ClassificationTallies;
  };
  evalTimeline: EvalTimelinePoint[];
  keyMoments: KeyMoment[];
  moves: MoveRecord[];
  summaryComment: string;
}

export interface GameSession {
  id: string;
  whitePlayer: GamePlayer;
  blackPlayer: GamePlayer;
  timeControl: number;
  variant: ChessVariant;
  moves: MoveRecord[];
  fen: string;
  isGameOver: boolean;
  gameResult: string | null;
  resultDetails: GameResultDetails | null;
  reviewReport: GameReviewReport | null;
  createdAt: number;
  updatedAt: number;
}

