import { NextRequest, NextResponse } from 'next/server';
import { PuzzleService } from '@/lib/server/puzzleService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const puzzle = PuzzleService.getDailyPuzzle();

    return NextResponse.json(
      {
        title: puzzle.description || `Tactical Drill ${puzzle.id}`,
        url: `https://chess-platform.internal/puzzles/${puzzle.id}`,
        publish_time: Math.floor(Date.now() / 1000),
        fen: puzzle.fen,
        pgn: `[FEN "${puzzle.fen}"]\n1. ${puzzle.solutionMoves.join(' ')}`,
        image: 'https://chess-platform.internal/images/daily_puzzle.png',
        rating: puzzle.rating,
        theme: puzzle.themes[0] || 'tactics',
        solution: puzzle.solutionMoves,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600',
          'X-RateLimit-Limit': '600',
          'X-RateLimit-Remaining': '599',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
