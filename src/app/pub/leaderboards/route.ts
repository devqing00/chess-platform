import { NextRequest, NextResponse } from 'next/server';
import { PubApiService } from '@/lib/server/pubApiService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const leaderboards = PubApiService.getLeaderboards();

    return NextResponse.json(leaderboards, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
        'X-RateLimit-Limit': '600',
        'X-RateLimit-Remaining': '599',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
