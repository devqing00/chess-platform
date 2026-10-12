import { NextRequest, NextResponse } from 'next/server';
import { PuzzleService } from '@/lib/server/puzzleService';
import { Chess } from 'chess.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { moves: inputMoves, pgn } = body;

    let sanMoves: string[] = [];
    if (Array.isArray(inputMoves)) {
      sanMoves = inputMoves;
    } else if (pgn) {
      const runner = new Chess();
      try {
        runner.loadPgn(pgn);
        sanMoves = runner.history();
      } catch {
        //
      }
    }

    if (sanMoves.length === 0) {
      return NextResponse.json(
        { error: 'Valid game moves or PGN required for puzzle extraction' },
        { status: 400 }
      );
    }

    const extractedPuzzles = await PuzzleService.extractPuzzlesFromGame(sanMoves);

    return NextResponse.json({
      success: true,
      count: extractedPuzzles.length,
      puzzles: extractedPuzzles,
    });
  } catch (err: any) {
    console.error('Error in /api/puzzles/extract:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to extract puzzles' },
      { status: 500 }
    );
  }
}
