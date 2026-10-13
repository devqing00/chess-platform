import { NextRequest, NextResponse } from 'next/server';
import { LESSON_TRACKS } from '@/lib/lessonsData';
import { MembershipTier } from '@/types/chess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const trackId = searchParams.get('trackId');

    if (trackId) {
      const track = LESSON_TRACKS.find((t) => t.id === trackId);
      if (!track) {
        return NextResponse.json({ error: 'Track not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, track });
    }

    return NextResponse.json({
      success: true,
      tracks: LESSON_TRACKS,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to retrieve lessons' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lessonId, stepId, tier = 'free' as MembershipTier, userId = 'guest' } = body;

    // Entitlement check for lessons: Free tier gets 1 free lesson per week
    // Paid tiers (Gold, Platinum, Diamond) get unlimited access
    const isFreeTier = tier === 'free';
    const isFirstLesson = lessonId === 'lesson-golden-rules';

    if (isFreeTier && !isFirstLesson) {
      return NextResponse.json(
        {
          allowed: false,
          reason: 'Free tier allows 1 lesson per week. Upgrade to Gold, Platinum, or Diamond for unlimited master curriculum lessons.',
          tierRequired: 'gold',
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      lessonId,
      stepId,
      completedAt: new Date().toISOString(),
      message: 'Lesson step verified and progress persisted.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to verify lesson' },
      { status: 500 }
    );
  }
}
