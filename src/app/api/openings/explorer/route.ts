import { NextRequest, NextResponse } from 'next/server';
import { Chess } from 'chess.js';
import { OpeningExplorerService } from '@/lib/server/openingExplorerService';
import { MembershipTier } from '@/types/chess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fen = searchParams.get('fen') || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const tier = (searchParams.get('tier') || 'free') as MembershipTier;
    const ply = parseInt(searchParams.get('ply') || '0', 10);

    // Validate FEN
    try {
      new Chess(fen);
    } catch {
      return NextResponse.json(
        { error: 'Invalid FEN string provided' },
        { status: 400 }
      );
    }

    const result = OpeningExplorerService.queryPosition(fen, tier, ply);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error('Error in /api/openings/explorer:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to query opening explorer' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fen: inputFen,
      moves: inputMoves,
      tier = 'free' as MembershipTier,
    } = body;

    let targetFen = inputFen;
    let plyCount = 0;

    if (!targetFen && Array.isArray(inputMoves)) {
      const runner = new Chess();
      for (const m of inputMoves) {
        try {
          runner.move(m);
          plyCount++;
        } catch {
          break;
        }
      }
      targetFen = runner.fen();
    }

    if (!targetFen) {
      targetFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    }

    const result = OpeningExplorerService.queryPosition(targetFen, tier, plyCount);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error('Error in /api/openings/explorer POST:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to query opening explorer' },
      { status: 500 }
    );
  }
}
