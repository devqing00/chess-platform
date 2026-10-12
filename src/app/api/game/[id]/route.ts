import { NextRequest, NextResponse } from 'next/server';
import { AuthoritativeGameEngine } from '@/lib/server/authoritativeGameEngine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await params;
    const game = AuthoritativeGameEngine.getGame(gameId);

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      game,
    });
  } catch (err: any) {
    console.error('Error in /api/game/[id]:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch game' },
      { status: 500 }
    );
  }
}
