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
      // If it's a pending challenge, do not auto-join; the guest must review settings and approve
      if (data.status === 'pending_challenge') {
        return data;
      }
      // If black slot is open and user isn't white (or explicitly joining via challenge link as=black)
      const isSameUser = data.whitePlayer.uid === user.uid;
      const isExplicitBlackJoin = typeof window !== 'undefined' && window.location.search.includes('as=black');
      if (!data.blackPlayer && (!isSameUser || isExplicitBlackJoin)) {
        const blackUid = (isSameUser && isExplicitBlackJoin) ? `${user.uid}-guest` : user.uid;
        const blackName = (isSameUser && isExplicitBlackJoin) ? `${user.displayName || 'Player'} (Guest)` : user.displayName;
        const updated: Partial<LiveSyncGame> = {
          blackPlayer: {
            uid: blackUid,
            name: blackName,
            rating: user.ratings.blitz || 1200,
            online: true,
            avatar: user.avatar || '♟️',
          },
          status: 'active',
          startedAt: Date.now(),
          firstMoveDeadline: Date.now() + 30000,
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
   * Create a challenge room awaiting opponent approval
   */
  public static async createFriendChallenge(
    gameId: string,
    host: UserProfile,
    timeControlSec: number = 600,
    incrementSec: number = 0,
    variant: string = 'standard',
    hostColorChoice: 'w' | 'b' | 'random' = 'random',
    rated: boolean = true
  ): Promise<LiveSyncGame> {
    const gameDocRef = doc(db, 'live_games', gameId);

    const challengeRoom: LiveSyncGame = {
      id: gameId,
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      turn: 'w',
      moves: [],
      whiteTime: timeControlSec,
      blackTime: timeControlSec,
      timeControlSec,
      incrementSec,
      variant,
      status: 'pending_challenge',
      hostUid: host.uid,
      hostName: host.displayName,
      hostRating: host.ratings.blitz || 1200,
      hostAvatar: host.avatar,
      hostColorChoice,
      rated,
      whitePlayer: {
        uid: host.uid,
        name: host.displayName,
        rating: host.ratings.blitz || 1200,
        online: true,
        avatar: host.avatar,
      },
      updatedAt: Date.now(),
    };

    await setDoc(gameDocRef, challengeRoom);
    return challengeRoom;
  }

  /**
   * Helper to create friend challenge and return the new gameId
   */
  public static async createFriendChallengeWithAutoId(
    host: UserProfile,
    timeControlSec: number = 600,
    incrementSec: number = 0,
    variant: string = 'standard',
    hostColorChoice: 'w' | 'b' | 'random' = 'random',
    rated: boolean = true
  ): Promise<string> {
    const gameId = `challenge-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await this.createFriendChallenge(
      gameId,
      host,
      timeControlSec,
      incrementSec,
      variant,
      hostColorChoice,
      rated
    );
    return gameId;
  }

  /**
   * Guest approves and accepts challenge; assigns colors & starts game immediately
   */
  public static async acceptFriendChallenge(
    gameId: string,
    guest: UserProfile
  ): Promise<void> {
    const gameDocRef = doc(db, 'live_games', gameId);
    const snap = await getDoc(gameDocRef);
    if (!snap.exists()) return;

    const data = snap.data() as LiveSyncGame;
    const choice = data.hostColorChoice || 'random';
    const isHostWhite =
      choice === 'w' ? true : choice === 'b' ? false : Math.random() < 0.5;

    const hostPlayerData = {
      uid: data.hostUid || data.whitePlayer.uid,
      name: data.hostName || data.whitePlayer.name,
      rating: data.hostRating || data.whitePlayer.rating,
      online: true,
      avatar: data.hostAvatar || data.whitePlayer.avatar,
    };

    const guestPlayerData = {
      uid: guest.uid,
      name: guest.displayName,
      rating: guest.ratings.blitz || 1200,
      online: true,
      avatar: guest.avatar,
    };

    const whitePlayer = isHostWhite ? hostPlayerData : guestPlayerData;
    const blackPlayer = isHostWhite ? guestPlayerData : hostPlayerData;

    await updateDoc(gameDocRef, {
      status: 'active',
      whitePlayer,
      blackPlayer,
      whiteTime: data.timeControlSec,
      blackTime: data.timeControlSec,
      turn: 'w',
      startedAt: Date.now(),
      firstMoveDeadline: Date.now() + 30000, // 30s first-move clock
      updatedAt: Date.now(),
    });
  }

  /**
   * Guest declines friend challenge
   */
  public static async declineFriendChallenge(gameId: string): Promise<void> {
    const gameDocRef = doc(db, 'live_games', gameId);
    await updateDoc(gameDocRef, {
      status: 'completed',
      winReason: 'Challenge was declined by opponent.',
      updatedAt: Date.now(),
    });
  }

  /**
   * Abort a game (e.g. failure to make move 1 within 30s, or mutual early abort with 0 rating impact)
   */
  public static async abortGame(gameId: string, reason: string): Promise<void> {
    try {
      const gameDocRef = doc(db, 'live_games', gameId);
      await updateDoc(gameDocRef, {
        status: 'aborted',
        winner: null,
        winReason: reason,
        updatedAt: Date.now(),
      });
    } catch (e) {
      console.warn('Failed to abort game:', e);
    }
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
        ...(timeTakenMs !== undefined ? { timeTakenMs } : {}),
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
