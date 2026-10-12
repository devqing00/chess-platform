import { NextRequest, NextResponse } from 'next/server';
import { EntitlementGuard } from '@/lib/server/entitlementGuard';
import { MembershipTier } from '@/types/chess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'guest-user';
    const tier = (searchParams.get('tier') || 'free') as MembershipTier;

    const entitlements = EntitlementGuard.getEntitlements(tier);
    const remainingReviews = EntitlementGuard.getRemainingDailyReviews(userId, tier);

    return NextResponse.json({
      success: true,
      userId,
      tier,
      remainingReviews,
      entitlements,
    });
  } catch (err: any) {
    console.error('Error in /api/entitlements:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch entitlements' },
      { status: 500 }
    );
  }
}
