import type { PieceSymbol } from 'chess.js';
export type { PieceSymbol };

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

export type BoardTheme = 'green' | 'wood' | 'glass' | 'neon' | 'marble' | 'arcade' | 'high_contrast' | 'low_vision_amber';
export type PieceTheme = 'neo' | 'staunton' | '8bit' | 'alpha';
export type SoundTheme = 'classic' | 'wood' | 'marble' | 'arcade' | 'silman' | 'duolingo';
export type LowTimeRegister = 'tick' | 'shrill' | 'beep' | 'voice';
export type SoundPreset = 'focus' | 'casual' | 'commentary';

export interface AudioSettings {
  masterVolume: number;
  sfxVolume: number;
  lowTimeVolume: number;
  voiceVolume: number;
  lowTimeRegister: LowTimeRegister;
  lowTimeThresholdSeconds: number;
  neverBelowFloorVolume: boolean;
  preset: SoundPreset;
}

export type AnimationSpeed = 'instant' | 'fast' | 'normal';
export type MoveInputMode = 'both' | 'drag' | 'click';

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
  accuracy?: number;
  winProbLoss?: number;
  motif?: {
    type: string;
    description: string;
  };
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
  league?: string;
  trophiesDelta?: number;
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
  variation?: string;
  keyIdeas?: string[];
}

export interface EndgameStudy {
  id: string;
  title: string;
  category: 'king_pawn' | 'rook_endgame' | 'queen_endgame' | 'minor_piece' | 'grandmaster_study';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Master';
  rating: number;
  fen: string;
  turn: PieceColor;
  objective: 'Win' | 'Draw';
  keyTechnique: string;
  moves: string[]; // Solution line (e.g. ['g1f2', 'd7d6'])
  tablebaseEvaluation?: string; // e.g. "Tablebase: Mate in 14"
  description: string;
}

export interface LearningPathNode {
  id: string;
  title: string;
  type: 'puzzle' | 'opening' | 'endgame' | 'chest';
  targetId: string;
  xpReward: number;
  iconName?: string;
  description?: string;
}

export interface LearningUnit {
  id: string;
  unitNumber: number;
  title: string;
  subtitle: string;
  category: 'tactics' | 'openings' | 'endgames';
  themeColor: string;
  guidebook: {
    title: string;
    summary: string;
    keyPoints: string[];
    exampleFen?: string;
  };
  nodes: LearningPathNode[];
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

export interface EngineThreat {
  threatMoveSan: string;
  threatMoveUci: string;
  from: Square;
  to: Square;
  description: string;
  severity: 'critical' | 'moderate' | 'mild';
  defensiveMoveSan?: string;
  defensiveExplanation?: string;
}

export interface GamePhaseScore {
  whiteAccuracy: number;
  blackAccuracy: number;
  plies: number;
}

export interface PhaseAccuracyBreakdown {
  opening: { whiteAccuracy: number; blackAccuracy: number };
  middlegame: { whiteAccuracy: number; blackAccuracy: number };
  endgame: { whiteAccuracy: number; blackAccuracy: number };
}

export interface AdvancedStatDetail {
  score: number; // 0 - 100
  classification: MoveClassification;
  summary: string;
}

export interface PlayerAdvancedStats {
  opening: AdvancedStatDetail;
  tactics: AdvancedStatDetail;
  strategy: AdvancedStatDetail;
  endgame: AdvancedStatDetail;
}

export interface GameAdvancedStats {
  white: PlayerAdvancedStats;
  black: PlayerAdvancedStats;
}

export interface ParsedPgn {
  headers: Record<string, string>;
  moves: string[];
  result: string;
  white?: string;
  black?: string;
  date?: string;
  eco?: string;
  opening?: string;
}

export type AnalysisEngineMode = 'torch_human' | 'stockfish';

export interface GameReviewReport {
  id: string;
  gameId: string;
  whitePlayer: GamePlayer;
  blackPlayer: GamePlayer;
  whiteAccuracy: number;
  blackAccuracy: number;
  stockfishWhiteAccuracy?: number;
  stockfishBlackAccuracy?: number;
  whiteEstimatedElo?: number;
  blackEstimatedElo?: number;
  whiteAcpl?: number;
  blackAcpl?: number;
  engineMode?: AnalysisEngineMode;
  engineDescription?: string;
  opening?: OpeningInfo;
  phaseBreakdown?: {
    opening: GamePhaseScore;
    middlegame: GamePhaseScore;
    endgame: GamePhaseScore;
  };
  blunderRetryPuzzle?: {
    ply: number;
    fen: string;
    blunderedMoveSan: string;
    solutionSan: string;
    explanation: string;
  };
  tallies: {
    white: ClassificationTallies;
    black: ClassificationTallies;
  };
  evalTimeline: EvalTimelinePoint[];
  keyMoments: KeyMoment[];
  moves: MoveRecord[];
  summaryComment: string;
  advancedStats?: GameAdvancedStats;
  isDeepReview?: boolean;
  reviewVersion?: string;
}

export interface GameSession {
  id: string;
  source?: 'checkmate' | 'chesscom';
  pgn?: string;
  movesCount?: number;
  engineMode?: AnalysisEngineMode;
  whitePlayer: GamePlayer;
  blackPlayer: GamePlayer;
  timeControl: number;
  incrementSeconds?: number;
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

export type AuthoritativeGameStatus =
  | 'active'
  | 'checkmate'
  | 'stalemate'
  | 'timeout'
  | 'resigned'
  | 'draw_agreement'
  | 'threefold_repetition'
  | 'fifty_move_rule'
  | 'insufficient_material';

export interface AuthoritativeMoveLog {
  san: string;
  from: Square;
  to: Square;
  promotion?: PieceSymbol;
  timestamp: number;
  durationMs: number;
  fenAfter: string;
}

export interface AuthoritativeGameState {
  id: string;
  fen: string;
  turn: PieceColor;
  whitePlayer: GamePlayer;
  blackPlayer: GamePlayer;
  whiteTimeRemainingMs: number;
  blackTimeRemainingMs: number;
  baseTimeSec: number;
  incrementSec: number;
  status: AuthoritativeGameStatus;
  winner: PieceColor | 'draw' | null;
  endReason?: string;
  moves: AuthoritativeMoveLog[];
  sanHistory: string[];
  drawOffer: PieceColor | null;
  lastMoveTimestamp: number | null;
  whiteCumulativeLagRefundMs?: number;
  blackCumulativeLagRefundMs?: number;
  createdAt: number;
  updatedAt: number;
}

export type GameActionType =
  | 'resign'
  | 'offer_draw'
  | 'accept_draw'
  | 'decline_draw'
  | 'claim_draw'
  | 'claim_timeout';

export interface AntiCheatMoveAnomaly {
  ply: number;
  san: string;
  durationMs: number;
  isEngineRank1: boolean;
  engineRank: number;
  centipawnLoss: number;
  description: string;
}

export interface AntiCheatReport {
  gameId: string;
  evaluatedColor: PieceColor;
  nominalRating: number;
  cheatLikelihoodScore: number; // 0 - 100
  verdict: 'CLEAN' | 'NORMAL_VARIANCE' | 'SUSPICIOUS' | 'FLAGGED_HIGH_CORRELATION';
  metrics: {
    engineCorrelationPct: number;
    rank1MoveCount: number;
    totalEvaluatedMoves: number;
    acpl: number;
    expectedAcplForRating: number;
    moveTimeMeanMs: number;
    moveTimeStdDevMs: number;
    timingCoefficientOfVariation: number;
    zScore?: number;
    informativeDecisions?: number;
  };
  flags: string[];
  moveAnomalies: AntiCheatMoveAnomaly[];
  summary: string;
}



