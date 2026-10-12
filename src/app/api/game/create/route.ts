import { NextRequest, NextResponse } from 'next/server';
import { AuthoritativeGameEngine } from '@/lib/server/authoritativeGameEngine';
import { GamePlayer } from '@/types/chess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      gameId = `live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      whitePlayer = { id: 'white', name: 'White Player', rating: 1500, avatar: '👤' } as GamePlayer,
      blackPlayer = { id: 'black', name: 'Black Player', rating: 1500, avatar: '👤' } as GamePlayer,
      baseTimeSec = 600,
      incrementSec = 0,
      initialFen,
    } = body;

    const game = AuthoritativeGameEngine.createGame({
      gameId,
      whitePlayer,
      blackPlayer,
      baseTimeSec,
      incrementSec,
      initialFen,
    });

    return NextResponse.json({
      success: true,
      game,
    });
  } catch (err: any) {
    console.error('Error in /api/game/create:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to initialize game' },
      { status: 500 }
    );
  }
}
