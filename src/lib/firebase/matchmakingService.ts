import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './config';
import { UserProfile } from './types';
import { GameSyncService } from './gameSyncService';

export interface MatchmakingTicket {
  id: string;
  userId: string;
  userName: string;
  userRating: number;
  avatar?: string;
  timeControlSec: number;
  incrementSec: number;
  variant: string;
  createdAt: number;
  matchedGameId?: string;
}

export class MatchmakingService {
  /**
   * Enter the live matchmaking pool
   */
  public static async enterQueue(
    user: UserProfile,
    timeControlSec: number,
    incrementSec: number = 0,
    variant: string = 'standard',
    onMatched: (gameId: string) => void
  ): Promise<{ ticketId: string; unsubscribe: () => void }> {
    const queueRef = collection(db, 'matchmaking_queue');
    const ticketId = `ticket-${user.uid}-${Date.now()}`;
    const userRating = user.ratings.blitz || 1200;

    // 1. Search existing tickets in queue within rating delta (+- 150 points)
    const existingTicketsQuery = query(
      queueRef,
      where('timeControlSec', '==', timeControlSec),
      where('variant', '==', variant),
      orderBy('createdAt', 'asc'),
      limit(10)
    );

    const snapshot = await getDocs(existingTicketsQuery);
    let matchedTicket: MatchmakingTicket | null = null;

    for (const d of snapshot.docs) {
      const ticket = d.data() as MatchmakingTicket;
      // Skip self
      if (ticket.userId === user.uid) continue;

      // Allow match if within rating window or ticket has been waiting > 6 seconds
      const ratingDiff = Math.abs(ticket.userRating - userRating);
      const waitTimeSec = (Date.now() - ticket.createdAt) / 1000;
      const allowedDelta = Math.min(400, 75 + waitTimeSec * 15);

      if (ratingDiff <= allowedDelta) {
        matchedTicket = ticket;
        break;
      }
    }

    if (matchedTicket) {
      // Create live game pairing both players
      const gameId = `live-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      // Randomize color assignment
      const isUserWhite = Math.random() > 0.5;

      const whitePlayer = isUserWhite
        ? { uid: user.uid, name: user.displayName, rating: userRating, online: true }
        : {
            uid: matchedTicket.userId,
            name: matchedTicket.userName,
            rating: matchedTicket.userRating,
            online: true,
          };

      const blackPlayer = isUserWhite
        ? {
            uid: matchedTicket.userId,
            name: matchedTicket.userName,
            rating: matchedTicket.userRating,
            online: true,
          }
        : { uid: user.uid, name: user.displayName, rating: userRating, online: true };

      // Initialize the live game doc
      await setDoc(doc(db, 'live_games', gameId), {
        id: gameId,
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        turn: 'w',
        whiteTime: timeControlSec,
        blackTime: timeControlSec,
        timeControlSec,
        incrementSec,
        variant,
        status: 'active',
        whitePlayer,
        blackPlayer,
        moves: [],
        firstMoveDeadline: Date.now() + 30000,
        startedAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Update opponent's ticket with the created game ID
      await setDoc(
        doc(db, 'matchmaking_queue', matchedTicket.id),
        { matchedGameId: gameId },
        { merge: true }
      );

      onMatched(gameId);
      return {
        ticketId,
        unsubscribe: () => {},
      };
    }

    // 2. If no immediate match found, create ticket and listen for another player pairing us
    const myTicket: MatchmakingTicket = {
      id: ticketId,
      userId: user.uid,
      userName: user.displayName,
      userRating,
      avatar: user.avatar,
      timeControlSec,
      incrementSec,
      variant,
      createdAt: Date.now(),
    };

    const myTicketRef = doc(db, 'matchmaking_queue', ticketId);
    await setDoc(myTicketRef, myTicket);

    // Listen for match
    const unsubscribeListener = onSnapshot(myTicketRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as MatchmakingTicket;
        if (data.matchedGameId) {
          onMatched(data.matchedGameId);
          // Cleanup ticket
          deleteDoc(myTicketRef).catch(() => {});
        }
      }
    });

    const cleanup = () => {
      unsubscribeListener();
      deleteDoc(myTicketRef).catch(() => {});
    };

    return { ticketId, unsubscribe: cleanup };
  }

  /**
   * Leave matchmaking queue
   */
  public static async cancelQueue(ticketId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'matchmaking_queue', ticketId));
    } catch {
      // Ignored
    }
  }
}
