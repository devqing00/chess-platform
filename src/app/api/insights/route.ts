import { NextRequest, NextResponse } from 'next/server';
import { InsightsService } from '@/lib/server/insightsService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username') || 'player';
    const timeClass = (searchParams.get('timeClass') || 'all') as 'all' | 'blitz' | 'rapid' | 'bullet';
    const colorFilter = (searchParams.get('color') || 'all') as 'all' | 'white' | 'black';

    const report = InsightsService.generateInsightsReport(username, timeClass, colorFilter);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to generate insights report' },
      { status: 500 }
    );
  }
}
