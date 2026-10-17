/**
 * Check.mate Global XP & Progression System
 * Comprehensive Leveling, Leagues, Streaks & Event Dispatcher
 */
import { auth } from './firebase/config';
import { FirestoreService } from './firebase/firestoreService';

export interface LeagueTier {
  id: string;
  name: string;
  minXp: number;
  maxXp: number;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  icon: string;
}

export const LEAGUE_TIERS: LeagueTier[] = [
  {
    id: 'bronze',
    name: 'Bronze League',
    minXp: 0,
    maxXp: 499,
    color: '#cd7f32',
    badgeBg: '#2a221a',
    badgeBorder: '#8c501e',
    icon: 'Shield',
  },
  {
    id: 'silver',
    name: 'Silver League',
    minXp: 500,
    maxXp: 1499,
    color: '#c0c0c0',
    badgeBg: '#232528',
    badgeBorder: '#71767b',
    icon: 'ShieldCheck',
  },
  {
    id: 'gold',
    name: 'Gold League',
    minXp: 1500,
    maxXp: 3499,
    color: '#eab308',
    badgeBg: '#292415',
    badgeBorder: '#ca8a04',
    icon: 'Award',
  },
  {
    id: 'platinum',
    name: 'Platinum League',
    minXp: 3500,
    maxXp: 6999,
    color: '#06b6d4',
    badgeBg: '#13282f',
    badgeBorder: '#0891b2',
    icon: 'Sparkles',
  },
  {
    id: 'diamond',
    name: 'Diamond League',
    minXp: 7000,
    maxXp: 11999,
    color: '#a855f7',
    badgeBg: '#261836',
    badgeBorder: '#9333ea',
    icon: 'Crown',
  },
  {
    id: 'master',
    name: 'Master League',
    minXp: 12000,
    maxXp: 19999,
    color: '#ef4444',
    badgeBg: '#2d1818',
    badgeBorder: '#dc2626',
    icon: 'Flame',
  },
  {
    id: 'grandmaster',
    name: 'Grandmaster League',
    minXp: 20000,
    maxXp: Infinity,
    color: '#58cc02',
    badgeBg: '#172710',
    badgeBorder: '#46a302',
    icon: 'Zap',
  },
];

export const LEVEL_TITLES: { minLevel: number; title: string }[] = [
  { minLevel: 1, title: 'Novice Woodpusher' },
  { minLevel: 2, title: 'Tactical Apprentice' },
  { minLevel: 3, title: 'Knight Errant' },
  { minLevel: 4, title: 'Bishop of Strategy' },
  { minLevel: 5, title: 'Citadel Defender' },
  { minLevel: 7, title: 'Attacking Virtuoso' },
  { minLevel: 10, title: 'Endgame Sage' },
  { minLevel: 15, title: 'Repertoire Master' },
  { minLevel: 20, title: 'Grandmaster of Check.mate' },
];

export interface XpProfile {
  totalXp: number;
  level: number;
  levelTitle: string;
  xpInCurrentLevel: number;
  xpNeededForNextLevel: number;
  levelProgressPercent: number;
  league: LeagueTier;
  nextLeague: LeagueTier | null;
  leagueProgressPercent: number;
  leagueRank: number; // Simulated rank within league, e.g. #4
  streak: number;
  dailyXp: number;
  dailyGoal: number;
  dailyGoalAchieved: boolean;
  lastActiveDate: string;
}

export type XpAction =
  | 'solve_puzzle_first_try'
  | 'solve_puzzle_retry'
  | 'complete_endgame_study'
  | 'complete_opening_lesson'
  | 'complete_game_review'
  | 'win_bot_match'
  | 'puzzle_rush_bonus'
  | 'daily_streak_bonus'
  | 'claim_unit_chest';

export const XP_ACTION_VALUES: Record<XpAction, number> = {
  solve_puzzle_first_try: 15,
  solve_puzzle_retry: 5,
  complete_endgame_study: 30,
  complete_opening_lesson: 25,
  complete_game_review: 35,
  win_bot_match: 40,
  puzzle_rush_bonus: 30,
  daily_streak_bonus: 20,
  claim_unit_chest: 100,
};

const STORAGE_KEY = 'chess_xp_profile';

/**
 * Calculate total XP threshold required to reach a given level.
 * Level 1 = 0 XP
 * Level 2 = 100 XP
 * Level 3 = 250 XP
 * Level 4 = 460 XP...
 */
export function totalXpForLevel(lvl: number): number {
  if (lvl <= 1) return 0;
  return Math.floor(75 * Math.pow(lvl - 1, 1.45) + 25 * (lvl - 1));
}

export function calculateLevelFromXp(xp: number): {
  level: number;
  xpInLevel: number;
  xpNeeded: number;
  progressPercent: number;
} {
  let level = 1;
  while (totalXpForLevel(level + 1) <= xp) {
    level++;
  }

  const currentLevelBase = totalXpForLevel(level);
  const nextLevelBase = totalXpForLevel(level + 1);
  const xpNeeded = nextLevelBase - currentLevelBase;
  const xpInLevel = Math.max(0, xp - currentLevelBase);
  const progressPercent = Math.min(100, Math.round((xpInLevel / xpNeeded) * 100));

  return { level, xpInLevel, xpNeeded, progressPercent };
}

export function getLeagueForXp(xp: number): {
  current: LeagueTier;
  next: LeagueTier | null;
  progressPercent: number;
} {
  for (let i = 0; i < LEAGUE_TIERS.length; i++) {
    const tier = LEAGUE_TIERS[i];
    if (xp >= tier.minXp && (xp <= tier.maxXp || tier.maxXp === Infinity)) {
      const next = i < LEAGUE_TIERS.length - 1 ? LEAGUE_TIERS[i + 1] : null;
      let progressPercent = 100;
      if (next && tier.maxXp !== Infinity) {
        const range = tier.maxXp - tier.minXp + 1;
        const currentInRange = xp - tier.minXp;
        progressPercent = Math.min(100, Math.round((currentInRange / range) * 100));
      }
      return { current: tier, next, progressPercent };
    }
  }
  return { current: LEAGUE_TIERS[0], next: LEAGUE_TIERS[1], progressPercent: 0 };
}

export function getTitleForLevel(lvl: number): string {
  let title = LEVEL_TITLES[0].title;
  for (const item of LEVEL_TITLES) {
    if (lvl >= item.minLevel) {
      title = item.title;
    }
  }
  return title;
}

export const XpSystem = {
  async syncWithFirestore(uid: string): Promise<void> {
    if (!uid || uid.startsWith('guest-')) return;
    try {
      const remote = await FirestoreService.getUserXp(uid);
      if (remote && typeof remote.totalXp === 'number') {
        const localRaw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
        const local = localRaw ? JSON.parse(localRaw) : null;
        if (!local || remote.totalXp > (local.totalXp || 0)) {
          const merged = { ...local, ...remote, totalXp: Math.max(local?.totalXp || 0, remote.totalXp) };
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            window.dispatchEvent(
              new CustomEvent('chess_xp_awarded', {
                detail: {
                  amount: 0,
                  reason: 'sync',
                  newTotalXp: merged.totalXp,
                  leveledUp: false,
                  newLevel: calculateLevelFromXp(merged.totalXp).level,
                },
              })
            );
          }
        }
      }
    } catch {}
  },

  getProfile(): XpProfile {
    const today = new Date().toISOString().split('T')[0];

    let stored = {
      totalXp: 180, // Default starter XP
      streak: 1,
      dailyXp: 0,
      dailyGoal: 50,
      lastActiveDate: today,
    };

    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          stored = { ...stored, ...JSON.parse(saved) };
        } else {
          // Check if learning progress store has legacy XP
          const leg = localStorage.getItem('chess_learning_progress');
          if (leg) {
            const parsed = JSON.parse(leg);
            if (typeof parsed.xp === 'number' && parsed.xp > 0) {
              stored.totalXp = parsed.xp;
            }
            if (typeof parsed.streak === 'number' && parsed.streak > 0) {
              stored.streak = parsed.streak;
            }
          }
        }
      } catch {}
    }

    // Reset daily XP if day changed
    if (stored.lastActiveDate !== today) {
      stored.dailyXp = 0;
      // Streak continuity check: if lastActiveDate was yesterday, keep/increment, else reset to 1
      const lastDate = new Date(stored.lastActiveDate);
      const currDate = new Date(today);
      const diffDays = Math.round((currDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
      if (diffDays > 1) {
        stored.streak = 1;
      }
      stored.lastActiveDate = today;
    }

    const { level, xpInLevel, xpNeeded, progressPercent } = calculateLevelFromXp(stored.totalXp);
    const { current: league, next: nextLeague, progressPercent: leagueProgressPercent } = getLeagueForXp(stored.totalXp);
    const levelTitle = getTitleForLevel(level);

    // Compute consistent simulated league rank (1 to 30) based on total XP
    const leagueRank = Math.max(1, 30 - Math.floor((leagueProgressPercent / 100) * 29));

    return {
      totalXp: stored.totalXp,
      level,
      levelTitle,
      xpInCurrentLevel: xpInLevel,
      xpNeededForNextLevel: xpNeeded,
      levelProgressPercent: progressPercent,
      league,
      nextLeague,
      leagueProgressPercent,
      leagueRank,
      streak: stored.streak,
      dailyXp: stored.dailyXp,
      dailyGoal: stored.dailyGoal,
      dailyGoalAchieved: stored.dailyXp >= stored.dailyGoal,
      lastActiveDate: stored.lastActiveDate,
    };
  },

  awardXp(
    amountOrAction: number | XpAction,
    reason: string = 'Exercise Completed'
  ): {
    amount: number;
    newTotalXp: number;
    leveledUp: boolean;
    newLevel: number;
    profile: XpProfile;
  } {
    const amount =
      typeof amountOrAction === 'number'
        ? amountOrAction
        : XP_ACTION_VALUES[amountOrAction] || 15;

    const oldProfile = this.getProfile();
    const newTotalXp = oldProfile.totalXp + amount;
    const newDailyXp = oldProfile.dailyXp + amount;
    const today = new Date().toISOString().split('T')[0];

    const { level: newLevel } = calculateLevelFromXp(newTotalXp);
    const leveledUp = newLevel > oldProfile.level;

    let updatedStreak = oldProfile.streak;
    if (oldProfile.lastActiveDate !== today) {
      updatedStreak += 1;
    }

    const toSave = {
      totalXp: newTotalXp,
      streak: updatedStreak,
      dailyXp: newDailyXp,
      dailyGoal: oldProfile.dailyGoal,
      lastActiveDate: today,
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));

        // Mirror to learning progress store so legacy components sync
        const leg = localStorage.getItem('chess_learning_progress');
        if (leg) {
          const parsed = JSON.parse(leg);
          parsed.xp = newTotalXp;
          parsed.streak = updatedStreak;
          parsed.lastActiveDate = today;
          localStorage.setItem('chess_learning_progress', JSON.stringify(parsed));
        }

        // Persist to Firestore database
        const uid = auth.currentUser?.uid;
        if (uid && !uid.startsWith('guest-')) {
          FirestoreService.saveUserXp(uid, toSave).catch(() => {});
        }
      } catch {}

      // Dispatch global event for live reactive UI updates
      window.dispatchEvent(
        new CustomEvent('chess_xp_awarded', {
          detail: {
            amount,
            reason,
            newTotalXp,
            leveledUp,
            newLevel,
          },
        })
      );
    }

    const updatedProfile = this.getProfile();

    return {
      amount,
      newTotalXp,
      leveledUp,
      newLevel,
      profile: updatedProfile,
    };
  },
};
