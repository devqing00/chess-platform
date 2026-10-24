import { Chess, Square, PieceSymbol } from 'chess.js';

export type Color = 'w' | 'b';

export type MotifType =
  | 'smothered_mate'
  | 'back_rank_mate'
  | 'poisoned'
  | 'overload'
  | 'deflection'
  | 'zwischenzug'
  | 'desperado'
  | 'tactical_sacrifice'
  | 'skewer'
  | 'pin'
  | 'fork'
  | 'discovered_check'
  | 'discovered_attack'
  | 'hanging_piece'
  | 'outpost';

export interface TacticalMotif {
  type: MotifType;
  name: string;
  description: string;
  confidence?: number;
  sourceSquare?: Square;
  targetSquares?: Square[];
  attackerPiece?: PieceSymbol;
  victimPieces?: PieceSymbol[];
}

export const PIECE_NAMES: Record<PieceSymbol, string> = {
  p: 'pawn',
  n: 'Knight',
  b: 'Bishop',
  r: 'Rook',
  q: 'Queen',
  k: 'King',
};

export const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 100,
};

export const VAL: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

const ORDER: PieceSymbol[] = ['p', 'n', 'b', 'r', 'q', 'k'];
export const otherColor = (c: Color): Color => (c === 'w' ? 'b' : 'w');

export const MOTIF_PRIORITY: Record<MotifType, number> = {
  smothered_mate: 100,
  back_rank_mate: 95,
  poisoned: 90,
  overload: 85,
  deflection: 80,
  zwischenzug: 75,
  desperado: 70,
  tactical_sacrifice: 65,
  skewer: 60,
  pin: 55,
  fork: 50,
  discovered_check: 45,
  discovered_attack: 40,
  hanging_piece: 35,
  outpost: 30,
};

/**
 * Least Valuable Attacker (LVA) on a target square
 */
function lva(b: Chess, sq: Square, side: Color): Square | null {
  try {
    let best: Square | null = null;
    let bi = 99;
    const attackers = b.attackers(sq, side);
    for (const s of attackers) {
      const p = b.get(s);
      if (!p) continue;
      const i = ORDER.indexOf(p.type);
      if (i < bi) {
        bi = i;
        best = s;
      }
    }
    return best;
  } catch {
    return null;
  }
}

/**
 * Static Exchange Evaluation (SEE)
 * Evaluates net material gain for `by` side capturing on `sq`.
 * Uses isolated scratch board and safely handles King exposure.
 */
export function see(c: Chess, sq: Square, by: Color, removed: Square[] = []): number {
  try {
    const b = new Chess(c.fen());
    for (const r of removed) {
      b.remove(r);
    }
    const target = b.get(sq);
    if (!target || target.color === by) return 0;
    const gains: number[] = [];
    let captured = VAL[target.type] || 0;
    let side = by;
    for (;;) {
      const from = lva(b, sq, side);
      if (!from) break;
      const piece = b.get(from);
      if (!piece) break;
      // King cannot capture into protected square
      if (piece.type === 'k' && b.attackers(sq, otherColor(side)).length > 0) break;
      gains.push(captured - (gains.length ? gains[gains.length - 1] : 0));
      captured = VAL[piece.type] || 0;
      b.remove(from);
      b.remove(sq);
      b.put({ type: piece.type, color: piece.color }, sq);
      side = otherColor(side);
    }
    for (let i = gains.length - 1; i > 0; i--) {
      gains[i - 1] = -Math.max(-gains[i - 1], gains[i]);
    }
    return gains[0] ?? 0;
  } catch {
    return 0;
  }
}

export const threat = (c: Chess, sq: Square, owner: Color, removed: Square[] = []): number =>
  Math.max(0, see(c, sq, otherColor(owner), removed));

export interface Duty {
  target: Square;
  kind: 'defend' | 'block';
  swing: number;
}

/**
 * Duty Map: A piece's duties are friendly pieces that would become capturable if it were removed.
 * Captures both direct defense and line shielding (blocking) without separate ray-casting logic.
 */
export function duties(c: Chess, x: Square, minSwing = 2): Duty[] {
  try {
    const piece = c.get(x);
    if (!piece) return [];
    const me = piece.color;
    const out: Duty[] = [];
    for (const row of c.board()) {
      for (const t of row) {
        if (!t || t.color !== me || t.square === x || t.type === 'k') continue;
        const swing = threat(c, t.square, me, [x]) - threat(c, t.square, me);
        if (swing >= minSwing) {
          const isDirect = c.attackers(t.square, me).includes(x);
          out.push({
            target: t.square,
            kind: isDirect ? 'defend' : 'block',
            swing,
          });
        }
      }
    }
    return out;
  } catch {
    return [];
  }
}

export interface AdvancedMotifContext {
  fenBefore: string;
  fenAfter: string;
  moveSan: string;
  prevMove?: { from?: string; to?: string; captured?: PieceSymbol | string; san?: string };
  bestMoveSan?: string;
  evalBeforeCp?: number;
  evalAfterCp?: number;
  isCheck?: boolean;
}

/**
 * Detects Overloaded Defender and Deflection tactics
 */
export function detectOverloadDeflection(ctx: AdvancedMotifContext): TacticalMotif[] {
  try {
    const after = new Chess(ctx.fenAfter);
    const before = new Chess(ctx.fenBefore);
    const playedMove = before.moves({ verbose: true }).find((m) => m.san === ctx.moveSan || m.san.replace(/[+#?!]/g, '') === ctx.moveSan.replace(/[+#?!]/g, ''));
    if (!playedMove) return [];

    const me = playedMove.color;
    const replies = after.moves({ verbose: true });
    const capturers = replies.filter((m) => m.to === playedMove.to && m.captured);
    const out: TacticalMotif[] = [];

    for (const r of capturers) {
      const d = duties(after, r.from);
      if (!d.length) continue;
      const g = new Chess(ctx.fenAfter);
      g.move(r.san);
      const hanging = d.filter((x) => see(g, x.target, me) >= 2);
      if (!hanging.length) continue;

      const sqs: Square[] = [r.from, ...hanging.map((h) => h.target)];
      out.push({
        type: 'deflection',
        name: 'Deflection Strike',
        description: `${r.san} deflects the ${PIECE_NAMES[r.piece]} off ${r.from}, exposing the defense on ${hanging.map((h) => h.target).join(', ')}.`,
        confidence: 0.85,
        sourceSquare: playedMove.from,
        targetSquares: sqs,
        attackerPiece: playedMove.piece,
      });

      if (d.length >= 2 || capturers.length === 1) {
        out.push({
          type: 'overload',
          name: 'Overloaded Defender',
          description: `The ${PIECE_NAMES[r.piece]} on ${r.from} is overloaded: it cannot answer the attack and simultaneously keep ${d[0].target} ${d[0].kind === 'block' ? 'shielded' : 'defended'}.`,
          confidence: 0.88,
          sourceSquare: playedMove.from,
          targetSquares: sqs,
          attackerPiece: playedMove.piece,
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Detects Zwischenzug (In-Between Check or Threat before recapture)
 */
export function detectZwischenzug(ctx: AdvancedMotifContext): TacticalMotif | null {
  try {
    const prev = ctx.prevMove;
    if (!prev || !prev.captured || !prev.to) return null;

    const before = new Chess(ctx.fenBefore);
    const legalBefore = before.moves({ verbose: true });
    const playedMove = legalBefore.find((m) => m.san === ctx.moveSan || m.san.replace(/[+#?!]/g, '') === ctx.moveSan.replace(/[+#?!]/g, ''));
    if (!playedMove) return null;

    // Must NOT be the direct recapture itself
    if (playedMove.to === prev.to) return null;

    // Verify a direct recapture was actually possible on the previous capture square
    const hasPendingRecapture = legalBefore.some((m) => m.to === prev.to && m.captured);
    if (!hasPendingRecapture) return null;

    // The in-between move must be forcing: check, checkmate, or pawn promotion
    const isForcing = /[+#]/.test(ctx.moveSan) || ctx.isCheck;
    if (!isForcing) return null;

    return {
      type: 'zwischenzug',
      name: 'In-Between Move (Zwischenzug)',
      description: `${ctx.moveSan} is an in-between forcing check inserted before resolving the pending capture on ${prev.to}.`,
      confidence: 0.85,
      sourceSquare: playedMove.from,
      targetSquares: [prev.to as Square, playedMove.to],
      attackerPiece: playedMove.piece,
    };
  } catch {
    return null;
  }
}

/**
 * Detects Poisoned Pieces and Tactical Sacrifices
 */
export function detectPoisonedOrSacrifice(ctx: AdvancedMotifContext): TacticalMotif | null {
  try {
    const before = new Chess(ctx.fenBefore);
    const after = new Chess(ctx.fenAfter);
    const playedMove = before.moves({ verbose: true }).find((m) => m.san === ctx.moveSan || m.san.replace(/[+#?!]/g, '') === ctx.moveSan.replace(/[+#?!]/g, ''));
    if (!playedMove) return null;

    const me = playedMove.color;
    const dest = playedMove.to;

    // Did the move land on a square where opponent has a static exchange win (>= 2 pawns nominal gain)?
    const gain = see(after, dest, otherColor(me));
    if (gain >= 2) {
      // If our evaluation after the move is winning / strong, the piece is poisoned!
      const evalStrong = ctx.evalAfterCp !== undefined ? (me === 'w' ? ctx.evalAfterCp >= 150 : ctx.evalAfterCp <= -150) : true;
      if (evalStrong) {
        return {
          type: 'poisoned',
          name: 'Poisoned Piece Sacrifice',
          description: `The ${PIECE_NAMES[playedMove.piece]} on ${dest} is poisoned! Capturing it looks winning on paper (+${gain} material), but severely compromises the defense.`,
          confidence: 0.9,
          sourceSquare: playedMove.from,
          targetSquares: [dest],
          attackerPiece: playedMove.piece,
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Detects Desperado (doomed piece cashing in before it is lost)
 */
export function detectDesperado(ctx: AdvancedMotifContext): TacticalMotif | null {
  try {
    const before = new Chess(ctx.fenBefore);
    const after = new Chess(ctx.fenAfter);
    const playedMove = before.moves({ verbose: true }).find((m) => m.san === ctx.moveSan || m.san.replace(/[+#?!]/g, '') === ctx.moveSan.replace(/[+#?!]/g, ''));
    if (!playedMove) return null;

    const me = playedMove.color;
    // Was the piece already in a lost exchange before moving?
    if (threat(before, playedMove.from, me) < 2) return null;
    // Did it capture or check?
    if (!playedMove.captured && !/[+#]/.test(ctx.moveSan)) return null;
    // Is it still lost after moving?
    if (threat(after, playedMove.to, me) < 1) return null;

    return {
      type: 'desperado',
      name: 'Desperado Counterstrike',
      description: `The ${PIECE_NAMES[playedMove.piece]} was already lost, so it delivers a fierce strike on ${playedMove.to} to maximize compensation before being captured.`,
      confidence: 0.8,
      sourceSquare: playedMove.from,
      targetSquares: [playedMove.to],
      attackerPiece: playedMove.piece,
    };
  } catch {
    return null;
  }
}

/**
 * Comprehensive tactical motif detector returning ALL detected motifs sorted by priority
 */
export function detectTacticalMotifs(params: AdvancedMotifContext): TacticalMotif[] {
  const { fenBefore, moveSan, fenAfter } = params;
  if (!fenBefore || !fenAfter || !moveSan) return [];

  const detected: TacticalMotif[] = [];

  try {
    const chessBefore = new Chess(fenBefore);
    const chessAfter = new Chess(fenAfter);
    const legalMoves = chessBefore.moves({ verbose: true });
    const cleanSan = moveSan.replace(/[+#?!]/g, '');
    const playedMove = legalMoves.find((m) => m.san === moveSan || m.san.replace(/[+#?!]/g, '') === cleanSan);
    if (!playedMove) return [];

    const movingColor = playedMove.color;
    const opponentColor: Color = otherColor(movingColor);
    const movingPiece = playedMove.piece;
    const dest = playedMove.to;

    // 1. Smothered Mate check
    if ((moveSan.includes('#') || chessAfter.isCheckmate()) && movingPiece === 'n') {
      const board = chessAfter.board();
      let oppKingSquare: Square | null = null;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = board[r][c];
          if (p && p.type === 'k' && p.color === opponentColor) {
            oppKingSquare = `${String.fromCharCode(97 + c)}${8 - r}` as Square;
            break;
          }
        }
      }
      if (oppKingSquare) {
        detected.push({
          type: 'smothered_mate',
          name: 'Smothered Mate',
          description: `A legendary smothered checkmate! The Knight delivers mate to a King completely boxed in by its own pieces.`,
          confidence: 1.0,
          sourceSquare: playedMove.from,
          targetSquares: [dest, oppKingSquare],
          attackerPiece: 'n',
          victimPieces: ['k'],
        });
      }
    }

    // 2. Overload and Deflection
    const overloadDeflections = detectOverloadDeflection(params);
    for (const od of overloadDeflections) {
      detected.push(od);
    }

    // 3. Zwischenzug
    const zwischenzug = detectZwischenzug(params);
    if (zwischenzug) {
      detected.push(zwischenzug);
    }

    // 4. Poisoned Piece / Tactical Sacrifice
    const poisoned = detectPoisonedOrSacrifice(params);
    if (poisoned) {
      detected.push(poisoned);
    }

    // 5. Desperado
    const desperado = detectDesperado(params);
    if (desperado) {
      detected.push(desperado);
    }

    // 6. Discovered Attacks & Discovered Checks
    let oppKingSquare: Square | null = null;
    const board = chessAfter.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === opponentColor) {
          oppKingSquare = `${String.fromCharCode(97 + c)}${8 - r}` as Square;
          break;
        }
      }
    }

    const isCheck = moveSan.includes('+') || params.isCheck;
    if (isCheck && oppKingSquare) {
      let directCheck = false;
      if (movingPiece === 'n') {
        const df = Math.abs(dest.charCodeAt(0) - oppKingSquare.charCodeAt(0));
        const dr = Math.abs(parseInt(dest[1], 10) - parseInt(oppKingSquare[1], 10));
        if ((df === 1 && dr === 2) || (df === 2 && dr === 1)) directCheck = true;
      } else if (movingPiece === 'p') {
        const pawnDir = movingColor === 'w' ? 1 : -1;
        const df = Math.abs(dest.charCodeAt(0) - oppKingSquare.charCodeAt(0));
        const dr = parseInt(oppKingSquare[1], 10) - parseInt(dest[1], 10);
        if (df === 1 && dr === pawnDir) directCheck = true;
      } else if (['b', 'r', 'q'].includes(movingPiece)) {
        directCheck = true;
      }

      if (!directCheck) {
        detected.push({
          type: 'discovered_check',
          name: 'Discovered Check',
          description: `Discovered check! Moving the ${PIECE_NAMES[movingPiece]} unmasks an unstoppable discovered check from behind.`,
          confidence: 0.9,
          sourceSquare: playedMove.from,
          targetSquares: [dest, oppKingSquare],
          attackerPiece: movingPiece,
          victimPieces: ['k'],
        });
      }
    }

    // 7. Tactical Fork (attacks 2 or more enemy pieces, including King or pieces with gain)
    const forkTargets: Square[] = [];
    if (isCheck && oppKingSquare) {
      forkTargets.push(oppKingSquare);
    }

    // Check pieces attacked by moving piece on dest in fenAfter
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = `${String.fromCharCode(97 + c)}${8 - r}` as Square;
        const p = chessAfter.get(sq);
        if (!p || p.color === movingColor || sq === oppKingSquare) continue;
        const attackersOnSq = chessAfter.attackers(sq, movingColor);
        if (attackersOnSq.includes(dest)) {
          const gained = Math.max(0, see(chessAfter, sq, movingColor)) > Math.max(0, see(chessBefore, sq, movingColor));
          if (p.type === 'q' || p.type === 'r' || gained) {
            forkTargets.push(sq);
          }
        }
      }
    }

    if (forkTargets.length >= 2) {
      detected.push({
        type: 'fork',
        name: `${PIECE_NAMES[movingPiece]} Fork`,
        description: `A tactical fork! The ${PIECE_NAMES[movingPiece]} attacks multiple enemy targets simultaneously.`,
        confidence: 0.8,
        sourceSquare: playedMove.from,
        targetSquares: [dest, ...forkTargets],
        attackerPiece: movingPiece,
      });
    }

    // 8. Pins and Skewers
    if (['b', 'r', 'q'].includes(movingPiece)) {
      const fromFile = playedMove.from.charCodeAt(0) - 97;
      const fromRank = parseInt(playedMove.from[1], 10) - 1;
      const toFile = dest.charCodeAt(0) - 97;
      const toRank = parseInt(dest[1], 10) - 1;
      const df = toFile - fromFile;
      const dr = toRank - fromRank;

      const isOrthogonal = (df === 0 && dr !== 0) || (df !== 0 && dr === 0);
      const isDiagonal = Math.abs(df) === Math.abs(dr) && df !== 0;
      const isRayValid =
        (movingPiece === 'b' && isDiagonal) ||
        (movingPiece === 'r' && isOrthogonal) ||
        (movingPiece === 'q' && (isDiagonal || isOrthogonal));

      if (isRayValid) {
        const stepF = df === 0 ? 0 : df > 0 ? 1 : -1;
        const stepR = dr === 0 ? 0 : dr > 0 ? 1 : -1;

        let curF = toFile + stepF;
        let curR = toRank + stepR;
        let pieceBehind: { square: Square; piece: PieceSymbol; color: Color } | null = null;
        let pieceInFront: { square: Square; piece: PieceSymbol; color: Color } | null = null;

        while (curF >= 0 && curF <= 7 && curR >= 0 && curR <= 7) {
          const sqName = `${String.fromCharCode(97 + curF)}${curR + 1}` as Square;
          const p = chessAfter.get(sqName);
          if (p) {
            if (p.color !== movingColor) {
              if (!pieceInFront) {
                pieceInFront = { square: sqName, piece: p.type, color: p.color };
              } else if (!pieceBehind) {
                pieceBehind = { square: sqName, piece: p.type, color: p.color };
                break;
              }
            } else {
              break;
            }
          }
          curF += stepF;
          curR += stepR;
        }

        if (pieceInFront && pieceBehind) {
          if (pieceInFront.piece === 'k') {
            detected.push({
              type: 'skewer',
              name: `${PIECE_NAMES[movingPiece]} Skewer`,
              description: `A piercing skewer checking the King and penetrating through to capture the ${PIECE_NAMES[pieceBehind.piece]} behind it.`,
              confidence: 0.9,
              sourceSquare: playedMove.from,
              targetSquares: [dest, pieceInFront.square, pieceBehind.square],
              attackerPiece: movingPiece,
            });
          } else if (pieceBehind.piece === 'k' || (pieceBehind.piece === 'q' && PIECE_VALUES[pieceInFront.piece] < 9)) {
            detected.push({
              type: 'pin',
              name: `${PIECE_NAMES[movingPiece]} Pin`,
              description: `Lethal pin! Freezing the enemy ${PIECE_NAMES[pieceInFront.piece]} against its ${PIECE_NAMES[pieceBehind.piece]}.`,
              confidence: 0.85,
              sourceSquare: playedMove.from,
              targetSquares: [dest, pieceInFront.square, pieceBehind.square],
              attackerPiece: movingPiece,
            });
          }
        }
      }
    }

    // 9. Hanging Piece Capture
    if (playedMove.captured) {
      const capVal = PIECE_VALUES[playedMove.captured] || 1;
      const attVal = PIECE_VALUES[movingPiece] || 1;
      if (capVal >= 3 && attVal <= capVal && threat(chessBefore, dest, otherColor(movingColor)) <= 0) {
        detected.push({
          type: 'hanging_piece',
          name: `Captures Free ${PIECE_NAMES[playedMove.captured]}`,
          description: `Capitalizes on an undefended piece by capturing the ${PIECE_NAMES[playedMove.captured]} on ${dest}.`,
          confidence: 0.7,
          sourceSquare: playedMove.from,
          targetSquares: [dest],
          attackerPiece: movingPiece,
          victimPieces: [playedMove.captured],
        });
      }
    }
  } catch {
    // Graceful fallback on unexpected FEN parsing
  }

  // Sort by tactical priority (highest hierarchy first)
  detected.sort((a, b) => (MOTIF_PRIORITY[b.type] || 0) - (MOTIF_PRIORITY[a.type] || 0));
  return detected;
}

/**
 * Backward-compatible single motif detector.
 * Returns the highest-priority tactical motif found, or null.
 */
export function detectTacticalMotif(
  fenBefore: string,
  moveSan: string,
  fenAfter: string,
  context?: Partial<AdvancedMotifContext>
): TacticalMotif | null {
  const motifs = detectTacticalMotifs({
    fenBefore,
    moveSan,
    fenAfter,
    ...context,
  });
  return motifs.length > 0 ? motifs[0] : null;
}

export interface Branch {
  kind: 'accepted' | 'declined';
  replySan: string;
  lineSan: string;
  material: string;
  mateIn?: number;
  scoreCp?: number;
}

export interface RefutationResult {
  accepted?: Branch;
  declined?: Branch;
  acceptIsBest?: boolean;
}

export interface MultiPvCandidate {
  pv?: string[];
  pvUci?: string[];
  pvSan?: string | string[];
  scoreCp?: number;
  mateIn?: number;
}

export function sanLine(
  fen: string,
  uciMoves: string[],
  maxPlies = 4
): { text: string; moves: { san: string; color: Color; captured?: PieceSymbol; piece: PieceSymbol; from: Square; to: Square }[] } {
  const c = new Chess(fen);
  let num = parseInt(fen.split(' ')[5] || '1', 10);
  const parts: string[] = [];
  const moves: { san: string; color: Color; captured?: PieceSymbol; piece: PieceSymbol; from: Square; to: Square }[] = [];

  for (let i = 0; i < Math.min(uciMoves.length, maxPlies); i++) {
    const u = uciMoves[i];
    if (!u || u.length < 4) break;
    try {
      const from = u.slice(0, 2) as Square;
      const to = u.slice(2, 4) as Square;
      const promotion = u[4] as PieceSymbol | undefined;
      const mv = c.move({ from, to, promotion });
      if (!mv) break;
      moves.push({
        san: mv.san,
        color: mv.color as Color,
        captured: mv.captured as PieceSymbol | undefined,
        piece: mv.piece as PieceSymbol,
        from,
        to,
      });
      if (mv.color === 'w') {
        parts.push(`${num}.${mv.san}`);
      } else {
        parts.push(i === 0 ? `${num}...${mv.san}` : mv.san);
        num++;
      }
    } catch {
      break;
    }
  }
  return { text: parts.join(' '), moves };
}

export function trimPv(fen: string, pv: string[]): string[] {
  const { moves } = sanLine(fen, pv, 6);
  let keep = Math.min(2, moves.length);
  while (
    keep < 4 &&
    keep < moves.length &&
    (moves[keep - 1].captured || /[+#]/.test(moves[keep - 1].san))
  ) {
    keep++;
  }
  if (keep % 2 === 1 && keep < moves.length) {
    keep++;
  }
  return pv.slice(0, keep);
}

const PIECE_LABELS: Record<PieceSymbol, string> = {
  p: 'a pawn',
  n: 'a knight',
  b: 'a bishop',
  r: 'a rook',
  q: 'the queen',
  k: 'the king',
};

export function materialNote(
  moves: { color: Color; captured?: PieceSymbol; san?: string }[],
  mover: Color,
  mateIn?: number
): string {
  if (moves.some((m) => m.san?.includes('#'))) {
    return 'delivers checkmate';
  }
  if (mateIn !== undefined) {
    if (mateIn === 0) return 'delivers checkmate';
    return `delivers forced checkmate in ${Math.abs(mateIn)}`;
  }
  const won: PieceSymbol[] = [];
  const lost: PieceSymbol[] = [];
  for (const m of moves) {
    if (m.captured) {
      if (m.color === mover) won.push(m.captured);
      else lost.push(m.captured);
    }
  }
  for (const t of [...won]) {
    const j = lost.indexOf(t);
    if (j >= 0) {
      lost.splice(j, 1);
      won.splice(won.indexOf(t), 1);
    }
  }
  const val = (a: PieceSymbol[]) => a.reduce((s, p) => s + (VAL[p] || 0), 0);
  const list = (a: PieceSymbol[]) => a.map((p) => PIECE_LABELS[p] || p).join(' and ');
  if (!won.length && !lost.length) return '';
  if (!lost.length) return `wins ${list(won)}`;
  if (!won.length) return `gives up ${list(lost)}`;
  return val(won) >= val(lost)
    ? `wins ${list(won)} for ${list(lost)}`
    : `gives up ${list(lost)} for ${list(won)}`;
}

export function buildRefutations(params: {
  fenAfter: string;
  targetSquare?: Square;
  moverColor: Color;
  lines: MultiPvCandidate[];
}): RefutationResult {
  const { fenAfter, targetSquare, moverColor, lines } = params;
  if (!lines || lines.length === 0) return {};

  try {
    const after = new Chess(fenAfter);
    const legal = after.moves({ verbose: true });
    const target = targetSquare;

    const isAccept = (l: MultiPvCandidate) => {
      const pv = l.pvUci || l.pv || [];
      const u = pv[0];
      if (!u || !target) return false;
      const toSq = u.slice(2, 4);
      if (toSq !== target) return false;
      const leg = legal.find((m) => m.from === u.slice(0, 2) && m.to === toSq);
      return Boolean(leg && leg.captured);
    };

    const toBranch = (l: MultiPvCandidate, kind: 'accepted' | 'declined'): Branch => {
      const pv = l.pvUci || l.pv || [];
      const trimmed = trimPv(fenAfter, pv);
      const { text, moves } = sanLine(fenAfter, trimmed);
      const firstSan = Array.isArray(l.pvSan) ? l.pvSan[0] : l.pvSan;
      return {
        kind,
        replySan: moves[0]?.san || firstSan || pv[0] || '',
        lineSan: text,
        material: materialNote(moves, moverColor, l.mateIn),
        mateIn: l.mateIn,
        scoreCp: l.scoreCp,
      };
    };

    const accLine = lines.find(isAccept);
    let acceptedBranch = accLine ? toBranch(accLine, 'accepted') : undefined;

    // Fallback: If acceptance was not in top K lines (because taking the poisoned piece is so bad),
    // construct the accepted branch directly from the legal capture and mover punishment.
    if (!acceptedBranch && target) {
      const capturers = legal.filter((m) => m.to === target && m.captured);
      if (capturers.length > 0) {
        const cap = capturers[0];
        const branchUci = [cap.from + cap.to];
        try {
          const sim = new Chess(fenAfter);
          sim.move(cap);
          const moverReplies = sim.moves({ verbose: true });
          const moverPunishment =
            moverReplies.find((m) => m.captured && (m.san.includes('+') || m.san.includes('#'))) ||
            moverReplies.find((m) => m.captured && (VAL[m.captured!] || 0) >= 3) ||
            moverReplies.find((m) => m.san.includes('+')) ||
            moverReplies.find((m) => m.captured) ||
            moverReplies[0];
          if (moverPunishment) {
            branchUci.push(moverPunishment.from + moverPunishment.to);
            sim.move(moverPunishment);
            if (!sim.isGameOver()) {
              const oppResponse = sim.moves({ verbose: true })[0];
              if (oppResponse) {
                branchUci.push(oppResponse.from + oppResponse.to);
              }
            }
          }
          const { text, moves } = sanLine(fenAfter, branchUci);
          acceptedBranch = {
            kind: 'accepted',
            replySan: cap.san,
            lineSan: text,
            material: materialNote(moves, moverColor),
          };
        } catch {}
      }
    }

    const decLine = lines.find((l) => !isAccept(l));

    return {
      accepted: acceptedBranch,
      declined: decLine ? toBranch(decLine, 'declined') : undefined,
      acceptIsBest: Boolean(accLine && lines[0] === accLine),
    };
  } catch {
    return {};
  }
}

