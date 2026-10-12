import { NextRequest, NextResponse } from 'next/server';
import { PuzzleService } from '@/lib/server/puzzleService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const theme = searchParams.get('theme') || undefined;
    const minRating = searchParams.get('minRating') ? parseInt(searchParams.get('minRating')!, 10) : undefined;
    const maxRating = searchParams.get('maxRating') ? parseInt(searchParams.get('maxRating')!, 10) : undefined;

    const puzzle = PuzzleService.getRandomPuzzle({ theme, minRating, maxRating });

    return NextResponse.json({
      success: true,
      puzzle,
    });
  } catch (err: any) {
    console.error('Error in /api/puzzles/random:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch puzzle' },
      { status: 500 }
    );
  }
}
