import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './config';
import { LiveSyncGame, UserProfile } from './types';
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
    initialTimeControlSec: number = 600
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
      whiteTime: initialTimeControlSec,
      blackTime: initialTimeControlSec,
      status: 'waiting',
      whitePlayer: {
        uid: user.uid,
        name: user.displayName,
        rating: user.ratings.blitz,
        online: true,
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
    blackTime: number
  ): Promise<void> {
    try {
      const gameDocRef = doc(db, 'live_games', gameId);
      await updateDoc(gameDocRef, {
        fen: newFen,
        turn: nextTurn,
        lastMove: { from, to, san },
        whiteTime,
        blackTime,
        updatedAt: Date.now(),
      });
    } catch (e) {
      console.warn('Failed to broadcast move to live room:', e);
    }
  }

  /**
   * Conclude a live match (checkmate, resignation, timeout).
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
