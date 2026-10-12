import { NextRequest, NextResponse } from 'next/server';
import { queryTablebase, countBoardPieces } from '@/lib/server/tablebaseService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const fen = searchParams.get('fen');

  if (!fen) {
    return NextResponse.json({ error: 'FEN parameter is required' }, { status: 400 });
  }

  const pieceCount = countBoardPieces(fen);
  if (pieceCount > 7) {
    return NextResponse.json({
      isTablebase: false,
      pieceCount,
      message: 'Endgame tablebases only apply to positions with 7 or fewer pieces.',
    });
  }

  const result = await queryTablebase(fen);
  if (!result) {
    return NextResponse.json({
      isTablebase: true,
      pieceCount,
      error: 'Tablebase lookup failed or timed out',
    }, { status: 502 });
  }

  return NextResponse.json({
    success: true,
    data: result,
  });
}
