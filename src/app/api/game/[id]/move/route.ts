import { NextRequest, NextResponse } from 'next/server';
import { AuthoritativeGameEngine } from '@/lib/server/authoritativeGameEngine';
import { Square, PieceSymbol, PieceColor } from '@/types/chess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await params;
    const body = await req.json();
    const {
      playerColor,
      from,
      to,
      promotion,
      clientPingMs,
    } = body as {
      playerColor: PieceColor;
      from: Square;
      to: Square;
      promotion?: PieceSymbol;
      clientPingMs?: number;
    };

    if (!playerColor || !from || !to) {
      return NextResponse.json(
        { error: 'Missing required move fields: playerColor, from, to' },
        { status: 400 }
      );
    }

    const result = AuthoritativeGameEngine.submitMove({
      gameId,
      playerColor,
      from,
      to,
      promotion,
      clientPingMs,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, game: result.game },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      game: result.game,
    });
  } catch (err: any) {
    console.error('Error in /api/game/[id]/move:', err);
    return NextResponse.json(
      { error: err?.message || 'Move submission failed' },
      { status: 500 }
    );
  }
}
