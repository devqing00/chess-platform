import { NextRequest, NextResponse } from 'next/server';
import { evaluatePositionStockfish } from '@/lib/server/stockfishPool';
import { queryTablebase } from '@/lib/server/tablebaseService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ message: 'Engine evaluate endpoint ready. Use POST with { fen }' });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fen, depth = 14, multiPv = 3 } = body;

    if (!fen || typeof fen !== 'string') {
      return NextResponse.json({ error: 'Valid FEN string is required' }, { status: 400 });
    }

    const targetDepth = Math.min(22, Math.max(8, Number(depth)));
    const targetMultiPv = Math.min(5, Math.max(1, Number(multiPv)));

    // 1. Check 7-piece endgame tablebase first if applicable
    const tablebaseResult = await queryTablebase(fen);

    // 2. Run Stockfish 18 NNUE evaluation
    const evalResult = await evaluatePositionStockfish(fen, targetDepth, targetMultiPv);

    return NextResponse.json({
      success: true,
      data: {
        ...evalResult,
        tablebase: tablebaseResult,
      },
    });
  } catch (err: any) {
    console.error('Error in /api/engine/evaluate:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to evaluate position' },
      { status: 500 }
    );
  }
}
