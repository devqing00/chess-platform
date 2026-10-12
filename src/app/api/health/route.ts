import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    engine: 'Stockfish 18 NNUE Multithreaded',
    version: '18.0.8',
    tablebase: 'Syzygy 7-Piece Endgame Active',
    capsVersion: '2.0 (Official Win-Expectancy Model)',
    timestamp: new Date().toISOString(),
  });
}
