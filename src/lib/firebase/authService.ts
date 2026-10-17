import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './config';
import { UserProfile } from './types';

const googleProvider = new GoogleAuthProvider();

export class AuthService {
  /**
   * Listen to Firebase auth state changes.
   */
  public static onAuthChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }

  /**
   * Log in with Email and Password.
   */
  public static async loginWithEmail(email: string, pass: string): Promise<User> {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    await this.touchLastLogin(cred.user.uid);
    return cred.user;
  }

  /**
   * Register a new user with Email, Password, and Display Name.
   */
  public static async registerWithEmail(
    email: string,
    pass: string,
    displayName: string
  ): Promise<User> {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName });
    await this.initUserProfile(cred.user, displayName);
    return cred.user;
  }

  /**
   * Sign in with Google Popup.
   */
  public static async loginWithGoogle(): Promise<User> {
    const cred = await signInWithPopup(auth, googleProvider);
    const existing = await this.getUserProfile(cred.user.uid);
    if (!existing) {
      await this.initUserProfile(cred.user, cred.user.displayName || 'Chess Player');
    } else {
      await this.touchLastLogin(cred.user.uid);
    }
    return cred.user;
  }

  /**
   * Sign in anonymously as a Guest player.
   */
  public static async loginAnonymously(): Promise<User> {
    const cred = await signInAnonymously(auth);
    const guestName = `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
    await updateProfile(cred.user, { displayName: guestName });
    await this.initUserProfile(cred.user, guestName, true);
    return cred.user;
  }

  /**
   * Sign out the current user.
   */
  public static async logout(): Promise<void> {
    await signOut(auth);
  }

  /**
   * Retrieve a user's profile document from Firestore.
   */
  public static async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        return snap.data() as UserProfile;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Initialize a default profile document in Firestore for new users.
   */
  private static async initUserProfile(
    user: User,
    displayName: string,
    isAnonymous: boolean = false
  ): Promise<UserProfile> {
    const profile: UserProfile = {
      uid: user.uid,
      email: user.email,
      displayName: displayName || user.displayName || 'Player',
      avatar: user.photoURL || '♟️',
      tier: 'diamond', // Default grant to diamond for full suite demonstration
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      isAnonymous,
      ratings: {
        rapid: 800,
        blitz: 800,
        bullet: 800,
        daily: 800,
        puzzles: 800,
        puzzleRush: 0,
      },
      stats: {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winStreak: 0,
      },
    };

    try {
      await setDoc(doc(db, 'users', user.uid), profile, { merge: true });
    } catch (e) {
      console.warn('Could not write user doc to Firestore:', e);
    }

    return profile;
  }

  /**
   * Update last login timestamp in Firestore.
   */
  private static async touchLastLogin(uid: string) {
    try {
      await updateDoc(doc(db, 'users', uid), {
        lastLoginAt: new Date().toISOString(),
      });
    } catch {
      // ignore
    }
  }
}
