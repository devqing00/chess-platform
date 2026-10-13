import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './config';
import { LiveSyncGame, LiveMoveRecord, UserProfile } from './types';
import { Square } from 'chess.js';

export class GameSyncService {
  /**
   * Listen to live 1v1 game room updates in real time.
   */
  public static subscribeToGame(
    gameId: string,
    onUpdate: (game: LiveSyncGame) => void
  ): Unsubscribe {
    const gameDocRef = doc(db, 'live_games', gameId);
    return onSnapshot(gameDocRef, (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as LiveSyncGame);
      }
    });
  }

  /**
   * Initialize a new live 1v1 game room or join an existing one.
   */
  public static async createOrJoinGame(
    gameId: string,
    user: UserProfile,
    initialTimeControlSec: number = 600,
    incrementSec: number = 0,
    variant: string = 'standard'
  ): Promise<LiveSyncGame> {
    const gameDocRef = doc(db, 'live_games', gameId);
    const snap = await getDoc(gameDocRef);

    if (snap.exists()) {
      const data = snap.data() as LiveSyncGame;
      // If black slot is open and user isn't white, join as black
      if (!data.blackPlayer && data.whitePlayer.uid !== user.uid) {
        const updated: Partial<LiveSyncGame> = {
          blackPlayer: {
            uid: user.uid,
            name: user.displayName,
            rating: user.ratings.blitz,
            online: true,
            avatar: user.avatar,
          },
          status: 'active',
          updatedAt: Date.now(),
        };
        await updateDoc(gameDocRef, updated);
        return { ...data, ...updated } as LiveSyncGame;
      }
      return data;
    }

    // Otherwise, create new room as White
    const newGame: LiveSyncGame = {
      id: gameId,
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      turn: 'w',
      moves: [],
      whiteTime: initialTimeControlSec,
      blackTime: initialTimeControlSec,
      timeControlSec: initialTimeControlSec,
      incrementSec,
      variant,
      status: 'waiting',
      whitePlayer: {
        uid: user.uid,
        name: user.displayName,
        rating: user.ratings.blitz,
        online: true,
        avatar: user.avatar,
      },
      updatedAt: Date.now(),
    };

    await setDoc(gameDocRef, newGame);
    return newGame;
  }

  /**
   * Broadcast a move made by the active player to the opponent.
   */
  public static async broadcastMove(
    gameId: string,
    from: Square,
    to: Square,
    san: string,
    newFen: string,
    nextTurn: 'w' | 'b',
    whiteTime: number,
    blackTime: number,
    timeTakenMs?: number
  ): Promise<void> {
    try {
      const gameDocRef = doc(db, 'live_games', gameId);
      const moveRecord: LiveMoveRecord = {
        from,
        to,
        san,
        fen: newFen,
        timeTakenMs,
        timestamp: Date.now(),
      };

      await updateDoc(gameDocRef, {
        fen: newFen,
        turn: nextTurn,
        lastMove: { from, to, san },
        moves: arrayUnion(moveRecord),
        whiteTime,
        blackTime,
        drawOfferFrom: null, // Any move automatically clears pending draw offers
        updatedAt: Date.now(),
      });
    } catch (e) {
      console.warn('Failed to broadcast move to live room:', e);
    }
  }

  /**
   * Offer a draw to the opponent.
   */
  public static async offerDraw(gameId: string, fromSide: 'w' | 'b'): Promise<void> {
    try {
      const gameDocRef = doc(db, 'live_games', gameId);
      await updateDoc(gameDocRef, {
        drawOfferFrom: fromSide,
        updatedAt: Date.now(),
      });
    } catch (e) {
      console.warn('Failed to offer draw:', e);
    }
  }

  /**
   * Respond to a draw offer (accept or decline).
   */
  public static async respondToDrawOffer(gameId: string, accept: boolean): Promise<void> {
    try {
      const gameDocRef = doc(db, 'live_games', gameId);
      if (accept) {
        await updateDoc(gameDocRef, {
          status: 'completed',
          winner: 'draw',
          winReason: 'Draw agreed by mutual agreement',
          drawOfferFrom: null,
          updatedAt: Date.now(),
        });
      } else {
        await updateDoc(gameDocRef, {
          drawOfferFrom: null,
          updatedAt: Date.now(),
        });
      }
    } catch (e) {
      console.warn('Failed to respond to draw offer:', e);
    }
  }

  /**
   * Resign a live game.
   */
  public static async resignGame(
    gameId: string,
    resigningSide: 'w' | 'b',
    resigningName: string
  ): Promise<void> {
    try {
      const winner = resigningSide === 'w' ? 'b' : 'w';
      const gameDocRef = doc(db, 'live_games', gameId);
      await updateDoc(gameDocRef, {
        status: 'completed',
        winner,
        winReason: `${resigningName} resigned`,
        updatedAt: Date.now(),
      });
    } catch (e) {
      console.warn('Failed to resign live game:', e);
    }
  }

  /**
   * Update player connection status and start/clear disconnect grace timer (60s).
   */
  public static async setPlayerConnection(
    gameId: string,
    side: 'w' | 'b',
    online: boolean,
    gracePeriodSec: number = 60
  ): Promise<void> {
    try {
      const gameDocRef = doc(db, 'live_games', gameId);
      const playerField = side === 'w' ? 'whitePlayer.online' : 'blackPlayer.online';

      if (!online) {
        // Player disconnected -> initiate 60s forfeit countdown
        await updateDoc(gameDocRef, {
          [playerField]: false,
          disconnectedPlayer: side,
          disconnectTimeoutAt: Date.now() + gracePeriodSec * 1000,
          updatedAt: Date.now(),
        });
      } else {
        // Player reconnected -> clear forfeit clock
        await updateDoc(gameDocRef, {
          [playerField]: true,
          disconnectedPlayer: null,
          disconnectTimeoutAt: null,
          updatedAt: Date.now(),
        });
      }
    } catch (e) {
      console.warn('Failed to update player connection:', e);
    }
  }

  /**
   * Claim victory if opponent fails to reconnect within grace period.
   */
  public static async claimAbandonmentWin(
    gameId: string,
    claimedBySide: 'w' | 'b'
  ): Promise<void> {
    try {
      const gameDocRef = doc(db, 'live_games', gameId);
      await updateDoc(gameDocRef, {
        status: 'completed',
        winner: claimedBySide,
        winReason: 'Opponent disconnected (abandonment)',
        updatedAt: Date.now(),
      });
    } catch (e) {
      console.warn('Failed to claim abandonment win:', e);
    }
  }

  /**
   * Request or accept a rematch.
   */
  public static async requestRematch(gameId: string, side: 'w' | 'b'): Promise<void> {
    try {
      const gameDocRef = doc(db, 'live_games', gameId);
      await updateDoc(gameDocRef, {
        rematchRequestedBy: side,
        updatedAt: Date.now(),
      });
    } catch (e) {
      console.warn('Failed to request rematch:', e);
    }
  }

  /**
   * Conclude a live match (checkmate, timeout, repetition, etc.).
   */
  public static async finishGame(
    gameId: string,
    winner: 'w' | 'b' | 'draw',
    winReason: string
  ): Promise<void> {
    try {
      const gameDocRef = doc(db, 'live_games', gameId);
      await updateDoc(gameDocRef, {
        status: 'completed',
        winner,
        winReason,
        updatedAt: Date.now(),
      });
    } catch (e) {
      console.warn('Failed to finish live room:', e);
    }
  }
}
