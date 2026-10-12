import { NextRequest, NextResponse } from 'next/server';
import { OPENINGS_DATABASE } from '@/lib/openingsData';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const movesQuery = searchParams.get('moves');
  const ecoQuery = searchParams.get('eco');

  if (ecoQuery) {
    const match = OPENINGS_DATABASE.find(
      (o) => o.eco.toLowerCase() === ecoQuery.toLowerCase()
    );
    if (match) {
      return NextResponse.json({ success: true, opening: match });
    }
  }

  if (movesQuery) {
    const normalizedQuery = movesQuery.replace(/\d+\.\s*/g, '').trim().toLowerCase();
    const match = OPENINGS_DATABASE.find((o) => {
      const normalizedOpening = o.moves.replace(/\d+\.\s*/g, '').trim().toLowerCase();
      return (
        normalizedOpening.startsWith(normalizedQuery) ||
        normalizedQuery.startsWith(normalizedOpening)
      );
    });

    if (match) {
      return NextResponse.json({ success: true, opening: match });
    }
  }

  return NextResponse.json({
    success: true,
    total: OPENINGS_DATABASE.length,
    openings: OPENINGS_DATABASE,
  });
}
