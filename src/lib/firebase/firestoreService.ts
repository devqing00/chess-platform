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
import { FirebaseGameRecord, UserProfile, SyncedChessComAccount, SyncedLichessAccount } from './types';

/**
 * Recursively strips `undefined` values from an object before Firestore write.
 * Firestore rejects any document containing `undefined` fields.
 */
function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value !== undefined) {
        clean[key] = sanitizeForFirestore(value);
      }
    }
    return clean as T;
  }
  return obj;
}

export class FirestoreService {
  private static hasWarnedPermissions = false;

  /**
   * Save a completed game to Firestore (games collection and updates user stats).
   */
  public static async saveGame(game: FirebaseGameRecord): Promise<void> {
    try {
      // 1. Populate playerUids for bidirectional query support
      const playerUids = Array.from(new Set([game.white.uid, game.black.uid].filter(Boolean)));
      const recordWithUids: FirebaseGameRecord = {
        ...game,
        playerUids,
      };

      // 2. Sanitize all undefined values (Firestore rejects undefined fields)
      const sanitizedRecord = sanitizeForFirestore(recordWithUids);

      // 3. Write the game record
      const gameRef = doc(db, 'games', game.id);
      await setDoc(gameRef, sanitizedRecord);

      // 3. Update white player stats if registered user
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

      // 4. Update black player stats if registered user
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
    } catch (e: any) {
      if (e?.code === 'permission-denied') {
        if (!FirestoreService.hasWarnedPermissions) {
          console.warn('[Firestore] Permission denied: Firestore security rules currently deny write access. Please deploy or copy firestore.rules to Firebase Console (Cloud Firestore > Rules). Local storage will maintain game data.');
          FirestoreService.hasWarnedPermissions = true;
        }
      } else {
        console.warn('Error saving game to Firestore:', e);
      }
    }
  }

  /**
   * Fetch a user's recent match history (Both White and Black games).
   */
  public static async getUserGames(uid: string, limitCount: number = 20): Promise<FirebaseGameRecord[]> {
    try {
      const gamesRef = collection(db, 'games');
      const gameMap = new Map<string, FirebaseGameRecord>();

      // Primary query using array-contains
      try {
        const qArray = query(
          gamesRef,
          where('playerUids', 'array-contains', uid),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
        const snapArray = await getDocs(qArray);
        snapArray.forEach((d) => {
          gameMap.set(d.id, d.data() as FirebaseGameRecord);
        });
      } catch {
        // Fallback to separate queries if composite index is pending
      }

      // Fallback/Legacy: query white and black separately
      if (gameMap.size === 0) {
        const [whiteSnap, blackSnap] = await Promise.all([
          getDocs(query(gamesRef, where('white.uid', '==', uid), limit(limitCount))).catch(() => null),
          getDocs(query(gamesRef, where('black.uid', '==', uid), limit(limitCount))).catch(() => null),
        ]);

        if (whiteSnap) {
          whiteSnap.forEach((d) => gameMap.set(d.id, d.data() as FirebaseGameRecord));
        }
        if (blackSnap) {
          blackSnap.forEach((d) => gameMap.set(d.id, d.data() as FirebaseGameRecord));
        }
      }

      const list = Array.from(gameMap.values());
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list.slice(0, limitCount);
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

  /**
   * Fetch all saved lesson progress for a user from Firestore.
   */
  public static async getUserLessonProgress(uid: string): Promise<Record<string, number>> {
    try {
      const lessonsRef = collection(db, 'users', uid, 'lessons');
      const snap = await getDocs(lessonsRef);
      const progress: Record<string, number> = {};
      snap.forEach((d) => {
        const data = d.data();
        if (data && data.lessonId && typeof data.lastStepCompleted === 'number') {
          progress[data.lessonId] = data.lastStepCompleted;
        }
      });
      return progress;
    } catch (e) {
      console.warn('Error fetching user lesson progress:', e);
      return {};
    }
  }

  /**
   * Save bot match result, defeated status, and stars (1-3) to Firestore.
   */
  public static async saveBotResult(
    uid: string,
    botId: string,
    stars: number,
    undosUsed: number
  ): Promise<void> {
    try {
      const botDocRef = doc(db, 'users', uid, 'bots', botId);
      const existing = await getDoc(botDocRef);
      const existingStars = existing.exists() ? (existing.data().stars || 0) : 0;
      
      await setDoc(
        botDocRef,
        {
          botId,
          defeated: true,
          stars: Math.max(existingStars, stars),
          undosUsed,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Error saving bot defeat progress to Firestore:', e);
    }
  }

  /**
   * Fetch all defeated bots and star ratings for a user from Firestore.
   */
  public static async getUserBotsProgress(
    uid: string
  ): Promise<Record<string, { stars: number; defeated: boolean }>> {
    try {
      if (!uid || uid.startsWith('guest-')) return {};
      const botsRef = collection(db, 'users', uid, 'bots');
      const snap = await getDocs(botsRef);
      const records: Record<string, { stars: number; defeated: boolean }> = {};
      snap.forEach((d) => {
        const data = d.data();
        if (data && data.botId) {
          records[data.botId] = {
            stars: data.stars || 0,
            defeated: Boolean(data.defeated),
          };
        }
      });
      return records;
    } catch (e: any) {
      // Gracefully handle permission errors (unauthenticated / anonymous users)
      if (e?.code === 'permission-denied' || e?.message?.includes('permissions')) {
        return {};
      }
      console.warn('Error fetching bot progress from Firestore:', e);
      return {};
    }
  }

  /**
   * Fetch user puzzle tactical rating and streak from Firestore.
   */
  public static async getUserPuzzleStats(
    uid: string
  ): Promise<{ rating: number; streak: number } | null> {
    try {
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        return {
          rating: data.ratings?.puzzles || 1500,
          streak: data.puzzleStreak || 0,
        };
      }
      return null;
    } catch (e) {
      console.warn('Error fetching puzzle stats from Firestore:', e);
      return null;
    }
  }

  /**
   * Save user puzzle tactical rating and streak to Firestore.
   */
  public static async saveUserPuzzleStats(
    uid: string,
    rating: number,
    streak: number
  ): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        'ratings.puzzles': Math.round(rating),
        puzzleStreak: streak,
      });
    } catch (e) {
      console.warn('Error saving puzzle stats to Firestore:', e);
    }
  }

  /**
   * Update user avatar in Firestore
   */
  public static async updateUserAvatar(uid: string, avatarUrl: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', uid), {
        avatar: avatarUrl,
      });
    } catch (e) {
      console.warn('Error updating user avatar:', e);
    }
  }

  /**
   * Save a complete game session (including moves, review report, evaluations) to Firestore.
   */
  public static async saveGameSession(session: any, uid?: string): Promise<void> {
    try {
      if (!session || !session.id) return;
      const sanitized = sanitizeForFirestore({
        ...session,
        ownerUid: uid || null,
        savedAt: Date.now(),
      });
      const sessionRef = doc(db, 'game_sessions', session.id);
      await setDoc(sessionRef, sanitized, { merge: true });
    } catch (e: any) {
      if (e?.code === 'permission-denied') {
        if (!FirestoreService.hasWarnedPermissions) {
          console.warn('[Firestore] Permission denied: Firestore security rules currently deny write access. Please deploy or copy firestore.rules to Firebase Console (Cloud Firestore > Rules). Local storage will maintain game data.');
          FirestoreService.hasWarnedPermissions = true;
        }
      } else {
        console.warn('Error saving game session to Firestore:', e);
      }
    }
  }

  /**
   * Fetch a game session from Firestore by ID.
   */
  public static async getGameSession(sessionId: string): Promise<any | null> {
    try {
      if (!sessionId) return null;
      const sessionRef = doc(db, 'game_sessions', sessionId);
      const snap = await getDoc(sessionRef);
      if (snap.exists()) {
        return snap.data();
      }
      return null;
    } catch (e) {
      console.warn('Error fetching game session from Firestore:', e);
      return null;
    }
  }

  /**
   * Save user XP and level progress to Firestore.
   */
  public static async saveUserXp(uid: string, xpState: any): Promise<void> {
    try {
      if (!uid || uid.startsWith('guest-')) return;
      const sanitized = sanitizeForFirestore(xpState);
      const xpRef = doc(db, 'users', uid, 'progress', 'xp');
      await setDoc(xpRef, sanitized, { merge: true });
    } catch (e) {
      console.warn('Error saving user XP to Firestore:', e);
    }
  }

  /**
   * Fetch user XP and level progress from Firestore.
   */
  public static async getUserXp(uid: string): Promise<any | null> {
    try {
      if (!uid || uid.startsWith('guest-')) return null;
      const xpRef = doc(db, 'users', uid, 'progress', 'xp');
      const snap = await getDoc(xpRef);
      if (snap.exists()) {
        return snap.data();
      }
      return null;
    } catch (e) {
      console.warn('Error fetching user XP from Firestore:', e);
      return null;
    }
  }

  /**
   * Save curriculum / lesson overall progress map to Firestore.
   */
  public static async saveCurriculumProgress(uid: string, curriculumProgress: any): Promise<void> {
    try {
      if (!uid || uid.startsWith('guest-')) return;
      const sanitized = sanitizeForFirestore(curriculumProgress);
      const lessonRef = doc(db, 'users', uid, 'progress', 'curriculum');
      await setDoc(lessonRef, sanitized, { merge: true });
    } catch (e) {
      console.warn('Error saving curriculum progress to Firestore:', e);
    }
  }

  /**
   * Fetch curriculum / lesson overall progress map from Firestore.
   */
  public static async getCurriculumProgress(uid: string): Promise<any | null> {
    try {
      if (!uid || uid.startsWith('guest-')) return null;
      const lessonRef = doc(db, 'users', uid, 'progress', 'curriculum');
      const snap = await getDoc(lessonRef);
      if (snap.exists()) {
        return snap.data();
      }
      return null;
    } catch (e) {
      console.warn('Error fetching curriculum progress from Firestore:', e);
      return null;
    }
  }

  /**
   * Persist connected external accounts (Chess.com, Lichess) to Firestore on the user's document.
   */
  public static async saveUserSyncedAccounts(
    uid: string,
    syncedAccounts: { chessCom?: SyncedChessComAccount | null; lichess?: SyncedLichessAccount | null }
  ): Promise<void> {
    try {
      if (!uid || uid.startsWith('guest-')) return;
      const userRef = doc(db, 'users', uid);
      const sanitized = sanitizeForFirestore({ syncedAccounts });
      await setDoc(userRef, sanitized, { merge: true });
    } catch (e) {
      console.warn('Error saving synced accounts to Firestore:', e);
    }
  }

  /**
   * Fetch connected external accounts (Chess.com, Lichess) from the user's document in Firestore.
   */
  public static async getUserSyncedAccounts(
    uid: string
  ): Promise<{ chessCom?: SyncedChessComAccount; lichess?: SyncedLichessAccount } | null> {
    try {
      if (!uid || uid.startsWith('guest-')) return null;
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        return data?.syncedAccounts || null;
      }
      return null;
    } catch (e) {
      console.warn('Error retrieving synced accounts from Firestore:', e);
      return null;
    }
  }
}


