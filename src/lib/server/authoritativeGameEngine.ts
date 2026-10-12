import { Chess, Square, PieceSymbol } from 'chess.js';
import {
  AuthoritativeGameState,
  AuthoritativeGameStatus,
  AuthoritativeMoveLog,
  GamePlayer,
  PieceColor,
  GameActionType,
} from '@/types/chess';

// In-memory server-authoritative game store
// In production scale, this interfaces with Redis or durable key-value store.
const authoritativeGames = new Map<string, AuthoritativeGameState>();

// Clean up games inactive for > 24 hours to prevent memory leaks
const EXPIRATION_MS = 24 * 60 * 60 * 1000;

function cleanupOldGames() {
  const now = Date.now();
  for (const [id, game] of authoritativeGames.entries()) {
    if (now - game.updatedAt > EXPIRATION_MS) {
      authoritativeGames.delete(id);
    }
  }
}

/**
 * Normalizes FEN for repetition checking (disregarding halfmove clock & fullmove number)
 */
function getRepetitionKey(fen: string): string {
  const parts = fen.split(' ');
  return `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]}`;
}

/**
 * Verifies if current position has occurred 3 times in the game
 */
function isThreefoldRepetition(sanMoves: string[]): boolean {
  const sim = new Chess();
  const occurrences = new Map<string, number>();
  occurrences.set(getRepetitionKey(sim.fen()), 1);

  for (const move of sanMoves) {
    try {
      sim.move(move);
      const key = getRepetitionKey(sim.fen());
      const count = (occurrences.get(key) || 0) + 1;
      if (count >= 3) return true;
      occurrences.set(key, count);
    } catch {
      break;
    }
  }
  return false;
}

export class AuthoritativeGameEngine {
  /**
   * Creates a new authoritative game session
   */
  static createGame(params: {
    gameId: string;
    whitePlayer: GamePlayer;
    blackPlayer: GamePlayer;
    baseTimeSec?: number;
    incrementSec?: number;
    initialFen?: string;
  }): AuthoritativeGameState {
    cleanupOldGames();

    const {
      gameId,
      whitePlayer,
      blackPlayer,
      baseTimeSec = 600, // 10 minutes default
      incrementSec = 0,
      initialFen,
    } = params;

    const chess = initialFen ? new Chess(initialFen) : new Chess();
    const now = Date.now();

    const gameState: AuthoritativeGameState = {
      id: gameId,
      fen: chess.fen(),
      turn: chess.turn() as PieceColor,
      whitePlayer,
      blackPlayer,
      whiteTimeRemainingMs: baseTimeSec * 1000,
      blackTimeRemainingMs: baseTimeSec * 1000,
      baseTimeSec,
      incrementSec,
      status: 'active',
      winner: null,
      moves: [],
      sanHistory: [],
      drawOffer: null,
      lastMoveTimestamp: null,
      whiteCumulativeLagRefundMs: 0,
      blackCumulativeLagRefundMs: 0,
      createdAt: now,
      updatedAt: now,
    };

    authoritativeGames.set(gameId, gameState);
    return gameState;
  }

  /**
   * Retrieves an authoritative game, updating clocks on-the-fly and checking flag fall
   */
  static getGame(gameId: string): AuthoritativeGameState | null {
    const game = authoritativeGames.get(gameId);
    if (!game) return null;

    // Check on-the-fly clock timeout if active
    if (game.status === 'active' && game.lastMoveTimestamp) {
      const now = Date.now();
      const elapsed = now - game.lastMoveTimestamp;

      if (game.turn === 'w') {
        const liveWhiteTime = game.whiteTimeRemainingMs - elapsed;
        if (liveWhiteTime <= 0) {
          game.whiteTimeRemainingMs = 0;
          game.status = 'timeout';
          game.winner = 'b';
          game.endReason = 'White ran out of time (Flag Fall)';
          game.updatedAt = now;
        }
      } else {
        const liveBlackTime = game.blackTimeRemainingMs - elapsed;
        if (liveBlackTime <= 0) {
          game.blackTimeRemainingMs = 0;
          game.status = 'timeout';
          game.winner = 'w';
          game.endReason = 'Black ran out of time (Flag Fall)';
          game.updatedAt = now;
        }
      }
    }

    return game;
  }

  /**
   * Submits an authoritative move with server-side validation and precise clock accounting
   */
  static submitMove(params: {
    gameId: string;
    playerColor: PieceColor;
    from: Square;
    to: Square;
    promotion?: PieceSymbol;
    clientPingMs?: number;
  }): { success: boolean; game?: AuthoritativeGameState; error?: string } {
    const game = this.getGame(params.gameId);
    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    if (game.status !== 'active') {
      return { success: false, error: `Game is concluded (${game.status})` };
    }

    if (game.turn !== params.playerColor) {
      return { success: false, error: `Not ${params.playerColor}'s turn` };
    }

    const now = Date.now();
    const chess = new Chess(game.fen);

    // Validate legality with chess.js
    let moveResult: any;
    try {
      moveResult = chess.move({
        from: params.from,
        to: params.to,
        promotion: params.promotion || 'q',
      });
      if (!moveResult) {
        return { success: false, error: 'Illegal move' };
      }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Illegal move' };
    }

    // Authoritative clock deduction with Lichess-style bounded cumulative lag compensation
    let durationMs = 0;
    if (game.lastMoveTimestamp) {
      const rawElapsed = now - game.lastMoveTimestamp;
      
      // Bounded cumulative lag allowance: capped per game at min(10s, 15% of base time)
      const maxGameLagRefund = Math.min(10000, game.baseTimeSec * 150);
      const currentRefund =
        params.playerColor === 'w'
          ? game.whiteCumulativeLagRefundMs || 0
          : game.blackCumulativeLagRefundMs || 0;
      const remainingAllowance = Math.max(0, maxGameLagRefund - currentRefund);
      const requestedRefund = Math.min(300, Math.max(0, (params.clientPingMs || 0) / 2));
      const effectiveRefund = Math.min(requestedRefund, remainingAllowance);

      if (params.playerColor === 'w') {
        game.whiteCumulativeLagRefundMs = currentRefund + effectiveRefund;
      } else {
        game.blackCumulativeLagRefundMs = currentRefund + effectiveRefund;
      }

      durationMs = Math.max(40, rawElapsed - effectiveRefund);

      if (params.playerColor === 'w') {
        game.whiteTimeRemainingMs = Math.max(0, game.whiteTimeRemainingMs - durationMs);
        game.whiteTimeRemainingMs += game.incrementSec * 1000;
        if (game.whiteTimeRemainingMs <= 0) {
          game.status = 'timeout';
          game.winner = 'b';
          game.endReason = 'White ran out of time';
          game.updatedAt = now;
          return { success: false, game, error: 'White flagged on time' };
        }
      } else {
        game.blackTimeRemainingMs = Math.max(0, game.blackTimeRemainingMs - durationMs);
        game.blackTimeRemainingMs += game.incrementSec * 1000;
        if (game.blackTimeRemainingMs <= 0) {
          game.status = 'timeout';
          game.winner = 'w';
          game.endReason = 'Black ran out of time';
          game.updatedAt = now;
          return { success: false, game, error: 'Black flagged on time' };
        }
      }
    }

    // Update game board and move sequence
    const updatedSanHistory = [...game.sanHistory, moveResult.san];
    const moveLog: AuthoritativeMoveLog = {
      san: moveResult.san,
      from: params.from,
      to: params.to,
      promotion: params.promotion,
      timestamp: now,
      durationMs,
      fenAfter: chess.fen(),
    };

    game.fen = chess.fen();
    game.turn = chess.turn() as PieceColor;
    game.moves.push(moveLog);
    game.sanHistory = updatedSanHistory;
    game.lastMoveTimestamp = now;
    game.drawOffer = null; // any move declines pending draw offer
    game.updatedAt = now;

    // Check game terminal conditions
    if (chess.isCheckmate()) {
      game.status = 'checkmate';
      game.winner = params.playerColor;
      game.endReason = `Checkmate! ${params.playerColor === 'w' ? 'White' : 'Black'} wins!`;
    } else if (chess.isStalemate()) {
      game.status = 'stalemate';
      game.winner = 'draw';
      game.endReason = 'Draw by Stalemate';
    } else if (chess.isInsufficientMaterial()) {
      game.status = 'insufficient_material';
      game.winner = 'draw';
      game.endReason = 'Draw by Insufficient Material';
    } else if (isThreefoldRepetition(updatedSanHistory)) {
      game.status = 'threefold_repetition';
      game.winner = 'draw';
      game.endReason = 'Draw by Threefold Repetition';
    }

    return { success: true, game };
  }

  /**
   * Handles player actions (resign, draw offers, timeout claims)
   */
  static handleAction(params: {
    gameId: string;
    playerColor: PieceColor;
    action: GameActionType;
  }): { success: boolean; game?: AuthoritativeGameState; error?: string } {
    const game = this.getGame(params.gameId);
    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    const now = Date.now();

    switch (params.action) {
      case 'resign': {
        if (game.status !== 'active') return { success: false, error: 'Game already concluded' };
        game.status = 'resigned';
        game.winner = params.playerColor === 'w' ? 'b' : 'w';
        game.endReason = `${params.playerColor === 'w' ? 'White' : 'Black'} resigned`;
        game.updatedAt = now;
        return { success: true, game };
      }

      case 'offer_draw': {
        if (game.status !== 'active') return { success: false, error: 'Game already concluded' };
        game.drawOffer = params.playerColor;
        game.updatedAt = now;
        return { success: true, game };
      }

      case 'accept_draw': {
        if (game.status !== 'active') return { success: false, error: 'Game already concluded' };
        if (!game.drawOffer || game.drawOffer === params.playerColor) {
          return { success: false, error: 'No active draw offer to accept' };
        }
        game.status = 'draw_agreement';
        game.winner = 'draw';
        game.endReason = 'Draw agreed by mutual consent';
        game.drawOffer = null;
        game.updatedAt = now;
        return { success: true, game };
      }

      case 'decline_draw': {
        game.drawOffer = null;
        game.updatedAt = now;
        return { success: true, game };
      }

      case 'claim_draw': {
        if (game.status !== 'active') return { success: false, error: 'Game already concluded' };
        if (isThreefoldRepetition(game.sanHistory)) {
          game.status = 'threefold_repetition';
          game.winner = 'draw';
          game.endReason = 'Draw claimed by Threefold Repetition';
          game.updatedAt = now;
          return { success: true, game };
        }
        const chess = new Chess(game.fen);
        if (chess.isDraw()) {
          game.status = 'fifty_move_rule';
          game.winner = 'draw';
          game.endReason = 'Draw claimed by Fifty-Move Rule';
          game.updatedAt = now;
          return { success: true, game };
        }
        return { success: false, error: 'Draw claim condition not satisfied' };
      }

      case 'claim_timeout': {
        // Automatically handled by getGame, but provides explicit claim
        this.getGame(params.gameId);
        return { success: true, game };
      }

      default:
        return { success: false, error: 'Unknown action' };
    }
  }
}
