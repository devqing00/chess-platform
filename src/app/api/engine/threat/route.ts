import { NextRequest, NextResponse } from 'next/server';
import { Chess } from 'chess.js';
import { evaluatePositionStockfish } from '@/lib/server/stockfishPool';
import { Square, ArrowAnnotation, EngineThreat } from '@/types/chess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fen } = body;

    if (!fen || typeof fen !== 'string') {
      return NextResponse.json({ error: 'Valid FEN is required' }, { status: 400 });
    }

    const chess = new Chess(fen);
    if (chess.isGameOver()) {
      return NextResponse.json({
        success: true,
        threat: null,
        message: 'Game is already concluded',
      });
    }

    const currentTurn = chess.turn();
    const opponentTurn = currentTurn === 'w' ? 'b' : 'w';

    // Construct null-move FEN: flip active side without changing pieces
    // Note: If king is in check, null-move is illegal in chess rules, so threat is resolving check
    if (chess.inCheck()) {
      return NextResponse.json({
        success: true,
        threat: {
          threatMoveSan: 'Check',
          threatMoveUci: '',
          from: 'e1' as Square,
          to: 'e1' as Square,
          description: 'The king is currently in check and must respond immediately!',
          severity: 'critical',
          arrow: null,
        },
      });
    }

    const fenParts = fen.split(' ');
    fenParts[1] = opponentTurn; // Switch turn to opponent
    fenParts[3] = '-'; // Clear en-passant target
    const nullMoveFen = fenParts.join(' ');

    // Run Stockfish evaluation from opponent's perspective
    const evalResult = await evaluatePositionStockfish(nullMoveFen, 11, 1);
    const threatMoveUci = evalResult.bestMoveUci;
    const threatMoveSan = evalResult.bestMoveSan;

    if (!threatMoveUci || threatMoveUci.length < 4) {
      return NextResponse.json({ success: true, threat: null });
    }

    const from = threatMoveUci.slice(0, 2) as Square;
    const to = threatMoveUci.slice(2, 4) as Square;

    // Severity assessment: if opponent is White, eval > 150 is critical; if opponent is Black, eval < -150 is critical
    const isOpponentWinning =
      opponentTurn === 'w' ? evalResult.scoreCp >= 150 : evalResult.scoreCp <= -150;
    const hasMateThreat = evalResult.mateIn !== undefined;

    const severity: 'critical' | 'moderate' | 'mild' = hasMateThreat || isOpponentWinning
      ? 'critical'
      : Math.abs(evalResult.scoreCp) >= 70
      ? 'moderate'
      : 'mild';

    const arrow: ArrowAnnotation = {
      from,
      to,
      color: severity === 'critical' ? '#ef4444' : '#f59e0b',
    };

    let description = `Opponent threatens ${threatMoveSan}`;
    if (hasMateThreat) {
      description = `CRITICAL THREAT: Opponent can force checkmate with ${threatMoveSan}!`;
    } else if (isOpponentWinning) {
      description = `DANGEROUS THREAT: Opponent threatens ${threatMoveSan}, winning decisive material or attack.`;
    } else {
      description = `Positional threat: Opponent prepares ${threatMoveSan} to gain space and piece pressure.`;
    }

    // Find optimal defensive rebuttal move from player's actual turn
    const defensiveEval = await evaluatePositionStockfish(fen, 10, 1);
    const defensiveMoveSan = defensiveEval.bestMoveSan || undefined;
    const defensiveExplanation = defensiveMoveSan
      ? `Defensive rebuttal: Play ${defensiveMoveSan} to neutralize ${threatMoveSan} and hold the position.`
      : undefined;

    const threat: EngineThreat & { arrow: ArrowAnnotation } = {
      threatMoveSan,
      threatMoveUci,
      from,
      to,
      description,
      severity,
      arrow,
      defensiveMoveSan,
      defensiveExplanation,
    };

    return NextResponse.json({
      success: true,
      threat,
    });
  } catch (err: any) {
    console.error('Error in /api/engine/threat:', err);
    return NextResponse.json(
      { error: err?.message || 'Threat detection failed' },
      { status: 500 }
    );
  }
}
