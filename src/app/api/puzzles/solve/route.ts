import { NextRequest, NextResponse } from 'next/server';
import { PuzzleService } from '@/lib/server/puzzleService';
import { Glicko2Rating } from '@/lib/server/glicko2Calculator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      puzzleId,
      submittedMoves,
      playerRating,
    } = body as {
      puzzleId: string;
      submittedMoves: string[];
      playerRating?: Glicko2Rating;
    };

    if (!puzzleId || !Array.isArray(submittedMoves)) {
      return NextResponse.json(
        { error: 'puzzleId and submittedMoves array are required' },
        { status: 400 }
      );
    }

    const result = PuzzleService.solvePuzzle({
      puzzleId,
      submittedMoves,
      playerRating,
    });

    return NextResponse.json({
      ...result,
    });
  } catch (err: any) {
    console.error('Error in /api/puzzles/solve:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to verify puzzle' },
      { status: 500 }
    );
  }
}
