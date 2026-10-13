import { MembershipTier, ChessVariant, MoveRecord } from '@/types/chess';
import { Square } from 'chess.js';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string;
  avatar: string;
  tier: MembershipTier;
  title?: 'GM' | 'IM' | 'FM' | 'CM' | 'WGM' | 'WIM' | 'NM' | null;
  country?: string;
  bio?: string;
  createdAt: string;
  lastLoginAt: string;
  isAnonymous: boolean;
  ratings: {
    rapid: number;
    blitz: number;
    bullet: number;
    daily: number;
    puzzles: number;
    puzzleRush: number;
  };
  stats: {
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    winStreak: number;
  };
}

export interface FirebaseGameRecord {
  id: string;
  white: {
    uid: string;
    name: string;
    rating: number;
    avatar?: string;
    title?: string;
  };
  black: {
    uid: string;
    name: string;
    rating: number;
    avatar?: string;
    title?: string;
  };
  timeControl: number; // in seconds
  timeClass: 'rapid' | 'blitz' | 'bullet' | 'daily';
  variant: ChessVariant;
  pgn: string;
  finalFen: string;
  moves: MoveRecord[];
  result: '1-0' | '0-1' | '1/2-1/2' | '*';
  winReason?: string;
  accuracies?: {
    white: number;
    black: number;
  };
  acpl?: {
    white: number;
    black: number;
  };
  eco?: string;
  openingName?: string;
  createdAt: string;
}

export interface LiveMoveRecord {
  from: Square;
  to: Square;
  san: string;
  fen: string;
  timeTakenMs?: number;
  timestamp: number;
}

export interface LiveSyncGame {
  id: string;
  fen: string;
  turn: 'w' | 'b';
  lastMove?: {
    from: Square;
    to: Square;
    san: string;
  };
  moves: LiveMoveRecord[];
  whiteTime: number;
  blackTime: number;
  timeControlSec: number;
  incrementSec?: number;
  variant?: string;
  status: 'waiting' | 'active' | 'completed' | 'abandoned';
  whitePlayer: {
    uid: string;
    name: string;
    rating: number;
    online: boolean;
    avatar?: string;
  };
  blackPlayer?: {
    uid: string;
    name: string;
    rating: number;
    online: boolean;
    avatar?: string;
  };
  drawOfferFrom?: 'w' | 'b' | null;
  rematchRequestedBy?: 'w' | 'b' | null;
  disconnectTimeoutAt?: number | null;
  disconnectedPlayer?: 'w' | 'b' | null;
  winner?: 'w' | 'b' | 'draw' | null;
  winReason?: string;
  updatedAt: number;
}

