import { NextRequest, NextResponse } from 'next/server';
import { AntiCheatEngine } from '@/lib/server/antiCheatEngine';
import { PieceColor, MoveRecord } from '@/types/chess';
import { Chess } from 'chess.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      gameId = `eval-${Date.now()}`,
      evaluatedColor = 'w' as PieceColor,
      moves: inputMoves,
      pgn,
      moveTimingsMs,
      playerRating = 1400,
      depth = 11,
    } = body;

    const runner = new Chess();
    if (pgn) {
      try {
        runner.loadPgn(pgn);
      } catch {
        //
      }
    }

    let sanMoves: string[] = [];
    if (Array.isArray(inputMoves)) {
      if (typeof inputMoves[0] === 'string') {
        sanMoves = inputMoves as string[];
      } else if (inputMoves[0] && typeof inputMoves[0] === 'object' && inputMoves[0].san) {
        sanMoves = (inputMoves as MoveRecord[]).map((m) => m.san);
      }
    } else if (pgn) {
      sanMoves = runner.history();
    }

    if (sanMoves.length === 0) {
      return NextResponse.json(
        { error: 'Valid game moves or PGN required for anti-cheat screening' },
        { status: 400 }
      );
    }

    const report = await AntiCheatEngine.evaluateGame({
      gameId,
      evaluatedColor,
      sanMoves,
      moveTimingsMs,
      playerRating,
      depth,
    });

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (err: any) {
    console.error('Error in /api/anti-cheat/evaluate:', err);
    return NextResponse.json(
      { error: err?.message || 'Anti-cheat evaluation failed' },
      { status: 500 }
    );
  }
}
