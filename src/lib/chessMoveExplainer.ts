import { Chess, Square, PieceSymbol } from 'chess.js';

export interface MoveExplanationDetails {
  san: string;
  pieceName: string;
  from?: Square;
  to?: Square;
  isCapture: boolean;
  isCheck: boolean;
  isCheckmate: boolean;
  isCastling: boolean;
  capturedPieceName?: string;
  promotionPieceName?: string;
  description: string;
}

const PIECE_NAMES: Record<PieceSymbol, string> = {
  p: 'pawn',
  n: 'Knight',
  b: 'Bishop',
  r: 'Rook',
  q: 'Queen',
  k: 'King',
};

/**
 * Converts a raw SAN chess move into beginner-friendly, plain English descriptive text.
 * e.g.:
 * - "Bf8" from c5 -> "Bishop at c5 to f8 (Bf8)"
 * - "Qe7" from d8 -> "Queen at d8 to e7 (Qe7)"
 * - "Nc3" from b1 -> "Knight at b1 to c3 (Nc3)"
 * - "exd4" from e5 -> "pawn on e5 capturing on d4 (exd4)"
 * - "c6" from c7 -> "pawn at c7 to c6 (c6)"
 * - "O-O" -> "castling kingside (O-O)"
 * - "O-O-O" -> "castling queenside (O-O-O)"
 */
export function explainChessMove(
  san: string,
  fenBefore?: string,
  options?: {
    includeSan?: boolean;
    style?: 'at_to' | 'from_to' | 'action';
  }
): string {
  if (!san) return '';

  const { includeSan = true, style = 'at_to' } = options || {};

  // Clean SAN for matching
  const cleanSan = san.trim();

  // 1. Castling shortcuts
  if (cleanSan.startsWith('O-O-O') || cleanSan.startsWith('0-0-0')) {
    return includeSan ? 'castling queenside (O-O-O)' : 'castling queenside';
  }
  if (cleanSan.startsWith('O-O') || cleanSan.startsWith('0-0')) {
    return includeSan ? 'castling kingside (O-O)' : 'castling kingside';
  }

  // 2. If fenBefore is provided, use Chess.js for precise origin, destination, and capture details
  if (fenBefore) {
    try {
      const chess = new Chess(fenBefore);
      const legalMoves = chess.moves({ verbose: true });

      // Match either exact SAN or SAN without check/mate glyphs
      const strippedSan = cleanSan.replace(/[+#?!]/g, '');
      const matched = legalMoves.find(
        (m) => m.san === cleanSan || m.san.replace(/[+#?!]/g, '') === strippedSan
      );

      if (matched) {
        const pieceName = PIECE_NAMES[matched.piece] || 'piece';
        const isCapture = Boolean(matched.captured);
        const capturedPieceName = matched.captured ? PIECE_NAMES[matched.captured] : undefined;
        const isCheck = cleanSan.includes('+');
        const isCheckmate = cleanSan.includes('#');

        let desc = '';

        if (matched.piece === 'p') {
          // Pawn moves
          if (isCapture) {
            desc = capturedPieceName
              ? `pawn on ${matched.from} capturing ${capturedPieceName} on ${matched.to}`
              : `pawn on ${matched.from} capturing on ${matched.to}`;
          } else if (matched.promotion) {
            const promo = PIECE_NAMES[matched.promotion as PieceSymbol] || 'Queen';
            desc = `pawn at ${matched.from} promoting to ${promo} on ${matched.to}`;
          } else {
            desc = style === 'from_to'
              ? `moving pawn from ${matched.from} to ${matched.to}`
              : `pawn at ${matched.from} to ${matched.to}`;
          }
        } else {
          // Piece moves (Bishop, Knight, Rook, Queen, King)
          if (isCapture) {
            desc = capturedPieceName
              ? `${pieceName} at ${matched.from} capturing ${capturedPieceName} on ${matched.to}`
              : `${pieceName} at ${matched.from} capturing on ${matched.to}`;
          } else {
            desc = style === 'from_to'
              ? `moving ${pieceName} from ${matched.from} to ${matched.to}`
              : `${pieceName} at ${matched.from} to ${matched.to}`;
          }
        }

        if (isCheckmate) {
          desc += ' with checkmate';
        } else if (isCheck) {
          desc += ' with check';
        }

        return includeSan ? `${desc} (${cleanSan})` : desc;
      }
    } catch {
      // Fall through to regex-based parser
    }
  }

  // 3. Fallback: Parse raw SAN using regex when FEN is not available or unmatched
  const isCheckmate = cleanSan.includes('#');
  const isCheck = cleanSan.includes('+');
  const isCapture = cleanSan.includes('x');
  const baseSan = cleanSan.replace(/[+#?!]/g, '');

  let fallbackDesc = '';

  // Piece letter: N, B, R, Q, K
  const pieceMatch = baseSan.match(/^([NBRQK])([a-h1-8])?x?([a-h][1-8])(=[NBRQ])?/);
  if (pieceMatch) {
    const pLetter = pieceMatch[1].toLowerCase() as PieceSymbol;
    const pName = PIECE_NAMES[pLetter] || 'piece';
    const originHint = pieceMatch[2];
    const dest = pieceMatch[3];

    if (originHint) {
      fallbackDesc = isCapture
        ? `${pName} on ${originHint} capturing on ${dest}`
        : `${pName} on ${originHint} to ${dest}`;
    } else {
      fallbackDesc = isCapture
        ? `${pName} capturing on ${dest}`
        : `${pName} to ${dest}`;
    }
  } else {
    // Pawn move: e.g. exd4, e4, d5, c6, e8=Q
    const pawnCaptureMatch = baseSan.match(/^([a-h])x([a-h][1-8])/);
    const pawnPushMatch = baseSan.match(/^([a-h][1-8])(=[NBRQ])?/);

    if (pawnCaptureMatch) {
      fallbackDesc = `pawn on ${pawnCaptureMatch[1]} capturing on ${pawnCaptureMatch[2]}`;
    } else if (pawnPushMatch) {
      fallbackDesc = `pawn to ${pawnPushMatch[1]}`;
    } else {
      fallbackDesc = cleanSan;
    }
  }

  if (isCheckmate) fallbackDesc += ' with checkmate';
  else if (isCheck) fallbackDesc += ' with check';

  return includeSan ? `${fallbackDesc} (${cleanSan})` : fallbackDesc;
}

/**
 * Returns a short, readable human description for UI subtitles and badges.
 * e.g. "Bishop at c5 to f8"
 */
export function getShortMoveDescription(san: string, fenBefore?: string): string {
  return explainChessMove(san, fenBefore, { includeSan: false, style: 'at_to' });
}
