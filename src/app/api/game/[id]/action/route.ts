import { NextRequest, NextResponse } from 'next/server';
import { AuthoritativeGameEngine } from '@/lib/server/authoritativeGameEngine';
import { PieceColor, GameActionType } from '@/types/chess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await params;
    const body = await req.json();
    const { playerColor, action } = body as {
      playerColor: PieceColor;
      action: GameActionType;
    };

    if (!playerColor || !action) {
      return NextResponse.json(
        { error: 'Missing required action fields: playerColor, action' },
        { status: 400 }
      );
    }

    const result = AuthoritativeGameEngine.handleAction({
      gameId,
      playerColor,
      action,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      game: result.game,
    });
  } catch (err: any) {
    console.error('Error in /api/game/[id]/action:', err);
    return NextResponse.json(
      { error: err?.message || 'Action handling failed' },
      { status: 500 }
    );
  }
}
