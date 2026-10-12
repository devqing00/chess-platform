import { NextRequest, NextResponse } from 'next/server';
import { exportAnnotatedPgn } from '@/lib/server/pgnService';
import { GameReviewReport } from '@/types/chess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { report } = body as { report: GameReviewReport };

    if (!report || !report.moves || report.moves.length === 0) {
      return NextResponse.json({ error: 'Valid GameReviewReport is required' }, { status: 400 });
    }

    const pgnString = exportAnnotatedPgn(report);

    return new NextResponse(pgnString, {
      headers: {
        'Content-Type': 'application/x-chess-pgn',
        'Content-Disposition': `attachment; filename="game-review-${report.gameId || 'game'}.pgn"`,
      },
    });
  } catch (err: any) {
    console.error('Error in /api/pgn/export:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to export PGN' },
      { status: 500 }
    );
  }
}
