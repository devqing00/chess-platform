/**
 * PuzzleEngineService - Unified Adaptive Mastery & Infinite Spaced Repetition Engine
 * Covers all three chess mastery pillars:
 * 1. TACTICS (Pins, forks, skewers, deflections, mate sequences)
 * 2. STRATEGY (Pawn breaks, outposts, weak squares, prophylactic maneuvers)
 * 3. ENDGAMES (Opposition, rook bridges, triangulation, tablebase technique)
 *
 * Implements Leitner Spaced Repetition (SRS):
 * - Solves require consecutive mastery (2-3 clean solves) to graduate.
 * - Mastered puzzles are retired from immediate rotation to prevent over-repetition.
 * - Failed puzzles reset to interval 0 and reappear within range.
 * - Infinite streaming: never reveals a finite counter ("10 of 10"), continuously refills.
 * - Zero fake Elo: progression is 100% governed by XP and streaks.
 */

import { TacticalPuzzle, PuzzlePillar, PuzzleTier } from '@/types/chess';
import { TACTICAL_PUZZLES } from '@/lib/puzzlesData';
import { ENDGAME_STUDIES } from '@/lib/endgamesData';

export interface SpacedRepetitionRecord {
  puzzleId: string;
  pillar: PuzzlePillar;
  tier: PuzzleTier;
  consecutiveCorrect: number;
  lastAttemptAt: number;
  nextDueAt: number;
  status: 'learning' | 'reviewing' | 'mastered';
  totalAttempts: number;
  failureCount: number;
}

export interface UserMasteryStats {
  totalSolved: number;
  totalMastered: number;
  currentStreak: number;
  tacticsMastered: number;
  strategyMastered: number;
  endgameMastered: number;
  unlockedTiers: {
    fundamentals: boolean;
    club: boolean;
    advanced: boolean;
    master: boolean;
  };
}

// Convert EndgameStudy to TacticalPuzzle structure for unified handling
const CONVERTED_ENDGAME_PUZZLES: TacticalPuzzle[] = ENDGAME_STUDIES.map((study) => {
  const tier: PuzzleTier =
    study.difficulty === 'Beginner'
      ? 'fundamentals'
      : study.difficulty === 'Intermediate'
      ? 'club'
      : study.difficulty === 'Advanced'
      ? 'advanced'
      : 'master';

  const xpReward = tier === 'fundamentals' ? 15 : tier === 'club' ? 25 : tier === 'advanced' ? 40 : 60;

  return {
    id: `endgame-${study.id}`,
    title: study.title,
    rating: study.rating,
    theme: study.category.replace('_', ' ').toUpperCase(),
    fen: study.fen,
    moves: study.moves,
    solutionDescription: study.description,
    pillar: 'endgame' as PuzzlePillar,
    tier,
    xpReward,
    coachHint: study.keyTechnique,
    teachingNotes: study.tablebaseEvaluation || 'Tablebase Precision Technique',
  };
});

// Strategic Mastery Puzzles (Positional, Outpost, Pawn Structure)
const STRATEGY_PUZZLES: TacticalPuzzle[] = [
  {
    id: 'strategy-1',
    title: 'Knight Outpost Seizure',
    rating: 1250,
    theme: 'Positional Outpost',
    fen: 'r1bq1rk1/pp1nbppp/2p1pn2/3p4/2PP4/2N1PN2/PPQ1BPPP/R1B2RK1 w - - 4 9',
    moves: ['e3e4', 'd5e4', 'c3e4'],
    solutionDescription: 'Seize central territory with e4! When Black captures, White centralizes the knight with a dominant outpost on e4 eyeing d6 and f6.',
    pillar: 'strategy',
    tier: 'fundamentals',
    xpReward: 20,
    coachHint: 'Strike in the center when the opponent delays counterplay.',
    teachingNotes: 'Outposts on 4th and 5th ranks cannot be challenged by enemy pawns without creating major structural weaknesses.',
  },
  {
    id: 'strategy-2',
    title: 'The Minority Attack Pawn Break',
    rating: 1550,
    theme: 'Pawn Structure',
    fen: 'r1b2rk1/pp3ppp/2n1pn2/q1bp4/2PP4/2NB1N2/PP1B1PPP/R2Q1RK1 w - - 0 10',
    moves: ['b2b4', 'c5b4', 'a2a3'],
    solutionDescription: 'Initiate a queen-side minority attack with b4! Undermining Black’s c6 pawn creates a chronic backward pawn on the open c-file.',
    pillar: 'strategy',
    tier: 'club',
    xpReward: 30,
    coachHint: 'Use fewer pawns to create permanent weaknesses against more pawns.',
    teachingNotes: 'The minority attack is a cornerstone of the Carlsbad pawn structure in the Queen’s Gambit.',
  },
  {
    id: 'strategy-3',
    title: 'Exchanging the Bad Bishop',
    rating: 1720,
    theme: 'Piece Quality',
    fen: 'r2q1rk1/1ppbbppp/p1np1n2/4p3/B3P3/2PP1N1P/PP1N1PP1/R1BQ1RK1 w - - 1 10',
    moves: ['a4c6', 'b7c6', 'd3d4'],
    solutionDescription: 'Trade off the dark-squared bishop for Black’s active c6 knight before executing d4 to open diagonals for your good light-squared bishop.',
    pillar: 'strategy',
    tier: 'advanced',
    xpReward: 45,
    coachHint: 'Identify which pieces are restricted by your own central pawns.',
    teachingNotes: 'Good vs Bad bishops: Pawns locked on the same color as your bishop limit its scope to defense.',
  },
  {
    id: 'strategy-4',
    title: 'Prophylactic King Retreat',
    rating: 1980,
    theme: 'Prophylaxis',
    fen: 'r4rk1/1pqb1ppp/p1n1pn2/2pp4/P1PP4/2NBPN2/1P1Q1PPP/R4RK1 w - - 2 12',
    moves: ['f1c1', 'c5d4', 'e3d4'],
    solutionDescription: 'Prophylaxis against Black’s planned queen-side break: reposition the rook to the c-file in anticipation of center files opening.',
    pillar: 'strategy',
    tier: 'master',
    xpReward: 65,
    coachHint: 'Prevent the opponent’s ideal move before executing your own attack.',
    teachingNotes: 'Petrosian and Karpov built world championship careers on small prophylactic adjustments.',
  },
];

// Combine all master seeded puzzles with rich pillar and tier tags
const MASTER_PUZZLE_BANK: TacticalPuzzle[] = [
  ...TACTICAL_PUZZLES.map((p) => {
    const tier: PuzzleTier =
      p.rating < 1300 ? 'fundamentals' : p.rating < 1650 ? 'club' : p.rating < 1950 ? 'advanced' : 'master';
    const xpReward = tier === 'fundamentals' ? 15 : tier === 'club' ? 25 : tier === 'advanced' ? 40 : 60;
    return {
      ...p,
      pillar: 'tactics' as PuzzlePillar,
      tier,
      xpReward,
      coachHint: p.theme,
      teachingNotes: p.solutionDescription,
    };
  }),
  ...CONVERTED_ENDGAME_PUZZLES,
  ...STRATEGY_PUZZLES,
];

const SRS_STORAGE_KEY = 'checkmate_srs_records_v2';
const STATS_STORAGE_KEY = 'checkmate_mastery_stats_v2';
const DYNAMIC_BUFFER_KEY = 'checkmate_dynamic_buffer_v2';

export class PuzzleEngineService {
  /**
   * Load Spaced Repetition records from persistent client storage
   */
  public static getSrsRecords(): Record<string, SpacedRepetitionRecord> {
    if (typeof window === 'undefined') return {};
    try {
      const stored = localStorage.getItem(SRS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  /**
   * Save Spaced Repetition records
   */
  private static saveSrsRecords(records: Record<string, SpacedRepetitionRecord>): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(SRS_STORAGE_KEY, JSON.stringify(records));
    } catch {}
  }

  /**
   * Get User Mastery Statistics
   */
  public static getMasteryStats(): UserMasteryStats {
    if (typeof window === 'undefined') {
      return {
        totalSolved: 0,
        totalMastered: 0,
        currentStreak: 0,
        tacticsMastered: 0,
        strategyMastered: 0,
        endgameMastered: 0,
        unlockedTiers: { fundamentals: true, club: true, advanced: false, master: false },
      };
    }

    try {
      const stored = localStorage.getItem(STATS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}

    const records = this.getSrsRecords();
    let tactics = 0;
    let strategy = 0;
    let endgame = 0;
    let totalMastered = 0;

    Object.values(records).forEach((r) => {
      if (r.status === 'mastered') {
        totalMastered++;
        if (r.pillar === 'tactics') tactics++;
        else if (r.pillar === 'strategy') strategy++;
        else if (r.pillar === 'endgame') endgame++;
      }
    });

    const stats: UserMasteryStats = {
      totalSolved: Object.keys(records).length,
      totalMastered,
      currentStreak: 0,
      tacticsMastered: tactics,
      strategyMastered: strategy,
      endgameMastered: endgame,
      unlockedTiers: {
        fundamentals: true,
        club: totalMastered >= 5,
        advanced: totalMastered >= 15,
        master: totalMastered >= 35,
      },
    };

    return stats;
  }

  /**
   * Dynamic replenishment: fetch from external stream or buffer to ensure infinite supply
   */
  public static async replenishDynamicBuffer(pillar?: PuzzlePillar): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // Fetch dynamic puzzles from public unfinishable Lichess stream
      const response = await fetch(
        `/api/puzzles/random?count=10&theme=${encodeURIComponent(pillar || 'tactics')}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.puzzles && Array.isArray(data.puzzles)) {
          const stored = localStorage.getItem(DYNAMIC_BUFFER_KEY);
          const currentBuffer: TacticalPuzzle[] = stored ? JSON.parse(stored) : [];

          const existingIds = new Set([
            ...MASTER_PUZZLE_BANK.map((p) => p.id),
            ...currentBuffer.map((p) => p.id),
          ]);

          const newPuzzles: TacticalPuzzle[] = data.puzzles
            .filter((p: any) => !existingIds.has(p.id))
            .map((p: any) => ({
              id: p.id,
              title: p.title || `${p.theme || 'Tactical'} Master Challenge`,
              rating: p.rating || 1500,
              theme: p.theme || 'Tactics',
              fen: p.fen,
              moves: p.moves || [],
              solutionDescription: p.description || 'Find the tactical refutation.',
              pillar: (pillar || 'tactics') as PuzzlePillar,
              tier: p.rating < 1300 ? 'fundamentals' : p.rating < 1650 ? 'club' : p.rating < 1950 ? 'advanced' : 'master',
              xpReward: p.rating < 1300 ? 15 : p.rating < 1650 ? 25 : p.rating < 1950 ? 40 : 60,
              coachHint: p.theme || 'Look for tactical relationships',
            }));

          const updatedBuffer = [...currentBuffer, ...newPuzzles].slice(0, 50);
          localStorage.setItem(DYNAMIC_BUFFER_KEY, JSON.stringify(updatedBuffer));
        }
      }
    } catch {
      // Dynamic fetch failure gracefully handled by seed bank
    }
  }

  /**
   * Pull the next optimal puzzle using Spaced Repetition logic
   * - Avoids over-repetition when user gets it right consecutively.
   * - Prioritizes due review items or learning items.
   * - Falls back to unattempted stream items.
   */
  public static getNextPuzzle(
    pillar: PuzzlePillar = 'tactics',
    requestedTier?: PuzzleTier
  ): TacticalPuzzle {
    const records = this.getSrsRecords();
    const now = Date.now();

    // 1. Combine master seed bank + dynamic buffer
    let dynamicPuzzles: TacticalPuzzle[] = [];
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(DYNAMIC_BUFFER_KEY);
        if (stored) dynamicPuzzles = JSON.parse(stored);
      } catch {}
    }

    const fullPool = [...MASTER_PUZZLE_BANK, ...dynamicPuzzles].filter(
      (p) => p.pillar === pillar && (!requestedTier || p.tier === requestedTier)
    );

    // 2. Priority 1: Due for review (unsolved or spaced review time elapsed, but NOT mastered)
    const duePuzzles = fullPool.filter((p) => {
      const record = records[p.id];
      if (!record) return false;
      if (record.status === 'mastered') return false; // DO NOT over-repeat mastered items
      return record.nextDueAt <= now;
    });

    if (duePuzzles.length > 0) {
      return duePuzzles[Math.floor(Math.random() * duePuzzles.length)];
    }

    // 3. Priority 2: Completely new unattempted puzzle from active range
    const newPuzzles = fullPool.filter((p) => !records[p.id]);
    if (newPuzzles.length > 0) {
      // Trigger background replenishment if available pool is running low
      if (newPuzzles.length < 5) {
        this.replenishDynamicBuffer(pillar).catch(() => {});
      }
      return newPuzzles[Math.floor(Math.random() * newPuzzles.length)];
    }

    // 4. Priority 3: Learning items still in progress
    const learningPuzzles = fullPool.filter((p) => {
      const record = records[p.id];
      return record && record.status === 'learning';
    });

    if (learningPuzzles.length > 0) {
      return learningPuzzles[Math.floor(Math.random() * learningPuzzles.length)];
    }

    // 5. Fallback: random selection from pool
    return fullPool[Math.floor(Math.random() * fullPool.length)] || MASTER_PUZZLE_BANK[0];
  }

  /**
   * Record attempt and execute Leitner Spaced Repetition update
   */
  public static recordSolveAttempt(
    puzzleId: string,
    success: boolean,
    pillar: PuzzlePillar = 'tactics',
    tier: PuzzleTier = 'club'
  ): {
    graduatedToMastered: boolean;
    consecutiveCorrect: number;
    xpEarned: number;
  } {
    const records = this.getSrsRecords();
    const existing = records[puzzleId] || {
      puzzleId,
      pillar,
      tier,
      consecutiveCorrect: 0,
      lastAttemptAt: 0,
      nextDueAt: 0,
      status: 'learning',
      totalAttempts: 0,
      failureCount: 0,
    };

    const now = Date.now();
    existing.totalAttempts++;
    existing.lastAttemptAt = now;

    let graduated = false;
    let xpEarned = 0;

    if (success) {
      existing.consecutiveCorrect++;
      const requiredToGraduate = tier === 'master' ? 3 : 2;

      if (existing.consecutiveCorrect >= requiredToGraduate) {
        existing.status = 'mastered';
        existing.nextDueAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days review window
        graduated = true;
      } else {
        existing.status = 'reviewing';
        existing.nextDueAt = now + 4 * 60 * 60 * 1000; // 4 hours review window
      }

      // Calculate XP based on tier (zero fake Elo)
      const baseTierXp = tier === 'fundamentals' ? 15 : tier === 'club' ? 25 : tier === 'advanced' ? 40 : 60;
      xpEarned = baseTierXp + (existing.consecutiveCorrect > 1 ? 10 : 0);
    } else {
      // Failed: reset consecutive streak and recycle back to active deck
      existing.consecutiveCorrect = 0;
      existing.failureCount++;
      existing.status = 'learning';
      existing.nextDueAt = now + 10 * 60 * 1000; // Re-test within 10 minutes
      xpEarned = 5; // Effort reward
    }

    records[puzzleId] = existing;
    this.saveSrsRecords(records);

    return {
      graduatedToMastered: graduated,
      consecutiveCorrect: existing.consecutiveCorrect,
      xpEarned,
    };
  }
}
