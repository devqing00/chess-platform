import { NextRequest, NextResponse } from 'next/server';
import { VariantsEngine, VariantGameState, CrazyhousePocket } from '@/lib/server/variantsEngine';
import { ChessVariant, Square, PieceSymbol } from '@/types/chess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const variant = (searchParams.get('variant') || 'chess960') as ChessVariant;
    const spParam = searchParams.get('sp');
    const chess960Index = spParam ? parseInt(spParam, 10) : undefined;

    const state = VariantsEngine.initVariantGame(variant, chess960Index);
    return NextResponse.json({ success: true, state });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to initialize variant' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'init') {
      const { variant = 'chess960', chess960Index } = body;
      const state = VariantsEngine.initVariantGame(variant, chess960Index);
      return NextResponse.json({ success: true, state });
    }

    if (action === 'legal-drops') {
      const { state, pieceType } = body;
      if (!state || !pieceType) {
        return NextResponse.json({ error: 'Missing state or pieceType' }, { status: 400 });
      }
      const legalSquares = VariantsEngine.getLegalDropSquares(state, pieceType);
      return NextResponse.json({ success: true, legalSquares });
    }

    if (action === 'move') {
      const { state, from, to, promotion, withBotReply = false } = body;
      if (!state || !from || !to) {
        return NextResponse.json({ error: 'Missing state, from, or to' }, { status: 400 });
      }

      const moveRes = VariantsEngine.playMove(state, from as Square, to as Square, promotion as PieceSymbol);
      let currentState = moveRes.nextState;
      let botAction = null;

      // If requested and game is still ongoing, let bot execute a reply move
      if (withBotReply && !currentState.isGameOver) {
        const botMove = VariantsEngine.generateVariantBotMove(currentState);
        if (botMove) {
          if (botMove.type === 'move' && botMove.from && botMove.to) {
            const botRes = VariantsEngine.playMove(
              currentState,
              botMove.from,
              botMove.to,
              botMove.promotion
            );
            currentState = botRes.nextState;
            botAction = { type: 'move', from: botMove.from, to: botMove.to, san: botRes.san };
          } else if (botMove.type === 'drop' && botMove.pieceType && botMove.to) {
            const botDropRes = VariantsEngine.playCrazyhouseDrop(
              currentState,
              botMove.pieceType,
              botMove.to
            );
            currentState = botDropRes.nextState;
            botAction = {
              type: 'drop',
              pieceType: botMove.pieceType,
              targetSquare: botMove.to,
              san: botDropRes.san,
            };
          }
        }
      }

      return NextResponse.json({
        success: true,
        state: currentState,
        san: moveRes.san,
        captured: moveRes.captured,
        botAction,
      });
    }

    if (action === 'drop') {
      const { state, pieceType, targetSquare, withBotReply = false } = body;
      if (!state || !pieceType || !targetSquare) {
        return NextResponse.json(
          { error: 'Missing state, pieceType, or targetSquare' },
          { status: 400 }
        );
      }

      const dropRes = VariantsEngine.playCrazyhouseDrop(
        state,
        pieceType as keyof CrazyhousePocket,
        targetSquare as Square
      );
      let currentState = dropRes.nextState;
      let botAction = null;

      if (withBotReply && !currentState.isGameOver) {
        const botMove = VariantsEngine.generateVariantBotMove(currentState);
        if (botMove) {
          if (botMove.type === 'move' && botMove.from && botMove.to) {
            const botRes = VariantsEngine.playMove(
              currentState,
              botMove.from,
              botMove.to,
              botMove.promotion
            );
            currentState = botRes.nextState;
            botAction = { type: 'move', from: botMove.from, to: botMove.to, san: botRes.san };
          } else if (botMove.type === 'drop' && botMove.pieceType && botMove.to) {
            const botDropRes = VariantsEngine.playCrazyhouseDrop(
              currentState,
              botMove.pieceType,
              botMove.to
            );
            currentState = botDropRes.nextState;
            botAction = {
              type: 'drop',
              pieceType: botMove.pieceType,
              targetSquare: botMove.to,
              san: botDropRes.san,
            };
          }
        }
      }

      return NextResponse.json({
        success: true,
        state: currentState,
        san: dropRes.san,
        botAction,
      });
    }

    if (action === 'random-960') {
      const index = Math.floor(Math.random() * 960);
      const res = VariantsEngine.generateChess960Fen(index);
      return NextResponse.json({ success: true, index, fen: res.fen });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Internal variant processing error' },
      { status: 500 }
    );
  }
}
