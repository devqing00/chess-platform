import { MembershipTier } from '@/types/chess';

export interface TierEntitlements {
  tier: MembershipTier;
  dailyReviewQuota: number; // -1 for unlimited
  maxEngineDepth: number;
  unlimitedPuzzles: boolean;
  unlimitedPuzzleRush: boolean;
  openingExplorerDepthLimit: number; // -1 for unlimited
  unlimitedTablebase: boolean;
  coachExplanations: boolean;
  cloudDeepAnalysis: boolean;
}

export const TIER_CONFIGS: Record<MembershipTier, TierEntitlements> = {
  free: {
    tier: 'free',
    dailyReviewQuota: 1,
    maxEngineDepth: 10,
    unlimitedPuzzles: false,
    unlimitedPuzzleRush: false,
    openingExplorerDepthLimit: 4, // 4 plies max on free tier
    unlimitedTablebase: false,
    coachExplanations: false,
    cloudDeepAnalysis: false,
  },
  gold: {
    tier: 'gold',
    dailyReviewQuota: 1,
    maxEngineDepth: 12,
    unlimitedPuzzles: true,
    unlimitedPuzzleRush: true,
    openingExplorerDepthLimit: -1,
    unlimitedTablebase: true,
    coachExplanations: false,
    cloudDeepAnalysis: false,
  },
  platinum: {
    tier: 'platinum',
    dailyReviewQuota: -1, // unlimited
    maxEngineDepth: 14,
    unlimitedPuzzles: true,
    unlimitedPuzzleRush: true,
    openingExplorerDepthLimit: -1,
    unlimitedTablebase: true,
    coachExplanations: false,
    cloudDeepAnalysis: false,
  },
  diamond: {
    tier: 'diamond',
    dailyReviewQuota: -1, // unlimited
    maxEngineDepth: 18, // Deep Cloud Analysis
    unlimitedPuzzles: true,
    unlimitedPuzzleRush: true,
    openingExplorerDepthLimit: -1,
    unlimitedTablebase: true,
    coachExplanations: true,
    cloudDeepAnalysis: true,
  },
};

// In-memory daily consumption tracker: key = `userId:YYYY-MM-DD` -> count
const dailyReviewUsage = new Map<string, number>();

function getTodayKey(userId: string): string {
  const dateStr = new Date().toISOString().slice(0, 10);
  return `${userId}:${dateStr}`;
}

export class EntitlementGuard {
  /**
   * Retrieves entitlements specification for a given membership tier
   */
  static getEntitlements(tier: MembershipTier = 'free'): TierEntitlements {
    return TIER_CONFIGS[tier] || TIER_CONFIGS.free;
  }

  /**
   * Checks remaining daily game reviews for a user
   */
  static getRemainingDailyReviews(userId: string, tier: MembershipTier = 'free'): number {
    const config = this.getEntitlements(tier);
    if (config.dailyReviewQuota === -1) return Infinity;

    const key = getTodayKey(userId);
    const used = dailyReviewUsage.get(key) || 0;
    return Math.max(0, config.dailyReviewQuota - used);
  }

  /**
   * Validates and consumes a daily game review quota
   */
  static consumeReviewQuota(
    userId: string,
    tier: MembershipTier = 'free',
    requestedDepth?: number
  ): {
    allowed: boolean;
    effectiveDepth: number;
    remainingQuota: number;
    reason?: string;
  } {
    const config = this.getEntitlements(tier);
    const key = getTodayKey(userId);
    const used = dailyReviewUsage.get(key) || 0;

    // Check review count quota
    if (config.dailyReviewQuota !== -1 && used >= config.dailyReviewQuota) {
      return {
        allowed: false,
        effectiveDepth: config.maxEngineDepth,
        remainingQuota: 0,
        reason: `Daily free Game Review quota reached (1/day). Upgrade to Platinum or Diamond for unlimited reviews.`,
      };
    }

    // Clamp engine depth to tier ceiling
    const effectiveDepth = Math.min(
      config.maxEngineDepth,
      requestedDepth || config.maxEngineDepth
    );

    // Increment usage
    dailyReviewUsage.set(key, used + 1);

    const remainingQuota =
      config.dailyReviewQuota === -1 ? Infinity : Math.max(0, config.dailyReviewQuota - (used + 1));

    return {
      allowed: true,
      effectiveDepth,
      remainingQuota,
    };
  }

  /**
   * Verifies if a user has access to a specific premium feature
   */
  static canAccessFeature(
    tier: MembershipTier = 'free',
    feature: keyof Omit<TierEntitlements, 'tier' | 'dailyReviewQuota' | 'maxEngineDepth'>
  ): boolean {
    const config = this.getEntitlements(tier);
    const val = config[feature];
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val === -1;
    return false;
  }
}
