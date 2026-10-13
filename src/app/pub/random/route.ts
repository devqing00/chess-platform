import { NextRequest, NextResponse } from 'next/server';
import { PuzzleService } from '@/lib/server/puzzleService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const theme = searchParams.get('theme') || undefined;
    const ratingParam = searchParams.get('rating');
    const targetRating = ratingParam ? parseInt(ratingParam, 10) : undefined;

    const minRating = targetRating ? targetRating - 150 : undefined;
    const maxRating = targetRating ? targetRating + 150 : undefined;

    const puzzle = PuzzleService.getRandomPuzzle({ theme, minRating, maxRating });

    return NextResponse.json(
      {
        title: puzzle.description || `Tactical Drill ${puzzle.id}`,
        url: `https://chess-platform.internal/puzzles/${puzzle.id}`,
        fen: puzzle.fen,
        rating: puzzle.rating,
        theme: puzzle.themes[0] || 'tactics',
        solution: puzzle.solutionMoves,
        solutionDescription: puzzle.description,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=10',
          'X-RateLimit-Limit': '600',
          'X-RateLimit-Remaining': '599',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
