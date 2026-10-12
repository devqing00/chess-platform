import { NextRequest, NextResponse } from 'next/server';
import { parsePgn } from '@/lib/server/pgnService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pgn } = body;

    if (!pgn || typeof pgn !== 'string') {
      return NextResponse.json({ error: 'Valid PGN string is required' }, { status: 400 });
    }

    const parsed = parsePgn(pgn);
    if (parsed.moves.length === 0) {
      return NextResponse.json(
        { error: 'No valid chess moves found in provided PGN' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: parsed,
    });
  } catch (err: any) {
    console.error('Error in /api/pgn/import:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to parse PGN' },
      { status: 500 }
    );
  }
}
