import { UserProfile } from './types';
import { User as FirebaseUser } from 'firebase/auth';

const GUEST_UID_STORAGE_KEY = 'checkmate_guest_uid';
const GUEST_NAME_STORAGE_KEY = 'checkmate_guest_name';
const CHALLENGE_HOST_PREFIX = 'checkmate_challenge_host_';

/**
 * Returns a rock-solid, persistent guest UID for unauthenticated users.
 * Never generates a new ID if one already exists in localStorage.
 */
export function getPersistentGuestUid(): string {
  if (typeof window === 'undefined') {
    return 'guest-ssr';
  }

  let stored = localStorage.getItem(GUEST_UID_STORAGE_KEY);
  if (!stored) {
    stored = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(GUEST_UID_STORAGE_KEY, stored);
  }
  return stored;
}

/**
 * Returns the stored guest display name, or a default.
 */
export function getPersistentGuestName(): string {
  if (typeof window === 'undefined') {
    return 'Guest Player';
  }

  let stored = localStorage.getItem(GUEST_NAME_STORAGE_KEY);
  if (!stored) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    stored = `Guest #${randomSuffix}`;
    localStorage.setItem(GUEST_NAME_STORAGE_KEY, stored);
  }
  return stored;
}

/**
 * Returns an authoritative UserProfile for matchmaking, challenges, and live gameplay.
 * Works uniformly across authenticated users and guests.
 */
export function getEffectiveUserProfile(
  user?: FirebaseUser | null,
  profile?: UserProfile | null,
  fallbackDisplayName?: string
): UserProfile {
  if (profile && profile.uid) {
    return profile;
  }

  if (user && user.uid) {
    return {
      uid: user.uid,
      email: user.email || null,
      displayName: fallbackDisplayName || user.displayName || 'Player',
      avatar: user.photoURL || '♟️',
      tier: 'free',
      country: 'US',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      isAnonymous: user.isAnonymous,
      ratings: {
        blitz: 1200,
        rapid: 1200,
        bullet: 1200,
        daily: 1200,
        puzzles: 1500,
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
  }

  const guestUid = getPersistentGuestUid();
  const guestName = fallbackDisplayName || getPersistentGuestName();

  return {
    uid: guestUid,
    email: null,
    displayName: guestName,
    avatar: '♟️',
    tier: 'free',
    country: 'US',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    isAnonymous: true,
    ratings: {
      blitz: 1200,
      rapid: 1200,
      bullet: 1200,
      daily: 1200,
      puzzles: 1500,
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
}

/**
 * Marks that this browser created a specific challenge room.
 */
export function markChallengeAsHost(gameId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`${CHALLENGE_HOST_PREFIX}${gameId}`, 'true');
  }
}

/**
 * Checks if this browser is the registered creator of the challenge room.
 */
export function isBrowserChallengeHost(gameId: string): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(`${CHALLENGE_HOST_PREFIX}${gameId}`) === 'true';
}
