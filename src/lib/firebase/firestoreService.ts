import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { db } from './config';
import { FirebaseGameRecord, UserProfile } from './types';

export class FirestoreService {
  /**
   * Save a completed game to Firestore (games collection and updates user stats).
   */
  public static async saveGame(game: FirebaseGameRecord): Promise<void> {
    try {
      // 1. Write the game record
      const gameRef = doc(db, 'games', game.id);
      await setDoc(gameRef, game);

      // 2. Update white player stats if registered user
      if (game.white.uid && !game.white.uid.startsWith('guest-')) {
        const whiteWin = game.result === '1-0';
        const isDraw = game.result === '1/2-1/2';
        await updateDoc(doc(db, 'users', game.white.uid), {
          'stats.gamesPlayed': increment(1),
          'stats.wins': whiteWin ? increment(1) : increment(0),
          'stats.losses': !whiteWin && !isDraw ? increment(1) : increment(0),
          'stats.draws': isDraw ? increment(1) : increment(0),
        }).catch(() => {});
      }

      // 3. Update black player stats if registered user
      if (game.black.uid && !game.black.uid.startsWith('guest-')) {
        const blackWin = game.result === '0-1';
        const isDraw = game.result === '1/2-1/2';
        await updateDoc(doc(db, 'users', game.black.uid), {
          'stats.gamesPlayed': increment(1),
          'stats.wins': blackWin ? increment(1) : increment(0),
          'stats.losses': !blackWin && !isDraw ? increment(1) : increment(0),
          'stats.draws': isDraw ? increment(1) : increment(0),
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Error saving game to Firestore:', e);
    }
  }

  /**
   * Fetch a user's recent match history.
   */
  public static async getUserGames(uid: string, limitCount: number = 20): Promise<FirebaseGameRecord[]> {
    try {
      const gamesRef = collection(db, 'games');
      const q = query(
        gamesRef,
        where('white.uid', '==', uid),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const snap = await getDocs(q);
      const games: FirebaseGameRecord[] = [];
      snap.forEach((doc) => {
        games.push(doc.data() as FirebaseGameRecord);
      });
      return games;
    } catch {
      return [];
    }
  }

  /**
   * Save completed lesson step progress.
   */
  public static async saveLessonProgress(
    uid: string,
    lessonId: string,
    stepId: number
  ): Promise<void> {
    try {
      const lessonRef = doc(db, 'users', uid, 'lessons', lessonId);
      await setDoc(
        lessonRef,
        {
          lessonId,
          lastStepCompleted: stepId,
          completedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Error recording lesson progress:', e);
    }
  }

  /**
   * Save puzzle attempt result.
   */
  public static async savePuzzleAttempt(
    uid: string,
    puzzleId: string,
    solved: boolean,
    newTacticalRating: number
  ): Promise<void> {
    try {
      const puzzleRef = doc(db, 'users', uid, 'puzzles', puzzleId);
      await setDoc(puzzleRef, {
        puzzleId,
        solved,
        ratingAtAttempt: newTacticalRating,
        timestamp: new Date().toISOString(),
      });

      // Update user tactical rating
      await updateDoc(doc(db, 'users', uid), {
        'ratings.puzzles': newTacticalRating,
      }).catch(() => {});
    } catch (e) {
      console.warn('Error saving puzzle attempt:', e);
    }
  }

  /**
   * Update player Glicko-2 rating for a specific time control.
   */
  public static async updateUserRating(
    uid: string,
    timeClass: 'rapid' | 'blitz' | 'bullet' | 'daily',
    newRating: number
  ): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', uid), {
        [`ratings.${timeClass}`]: Math.round(newRating),
      });
    } catch (e) {
      console.warn('Error updating rating:', e);
    }
  }
}
