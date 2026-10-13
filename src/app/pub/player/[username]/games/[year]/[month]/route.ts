import { NextRequest, NextResponse } from 'next/server';
import { PubApiService } from '@/lib/server/pubApiService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string; year: string; month: string }> }
) {
  try {
    const { username, year, month } = await params;
    const gamesData = PubApiService.getMonthlyGames(username, year, month);

    return NextResponse.json(gamesData, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, s-maxage=600',
        'X-RateLimit-Limit': '600',
        'X-RateLimit-Remaining': '599',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
