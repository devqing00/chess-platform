import { NextResponse } from 'next/server';
import { PuzzleService } from '@/lib/server/puzzleService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const puzzle = PuzzleService.getDailyPuzzle();
    return NextResponse.json({
      success: true,
      puzzle,
    });
  } catch (err: any) {
    console.error('Error in /api/puzzles/daily:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch daily puzzle' },
      { status: 500 }
    );
  }
}
