import { Chess, Square, PieceSymbol, Move } from 'chess.js';
import { PieceColor, Premove } from '@/types/chess';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'];

/**
 * Checks whether a move from `from` to `to` conforms to the theoretical geometry
 * of the given piece type and color on an 8x8 chessboard.
 *
 * This allows premoving even if intermediate pieces exist or target square is currently
 * occupied/empty, matching competitive Chess.com behavior.
 */
export function isGeometricMoveValid(
  from: Square,
  to: Square,
  pieceType: PieceSymbol,
  pieceColor: PieceColor
): boolean {
  if (from === to) return false;

  const fromFile = from.charCodeAt(0) - 97; // 0..7
  const fromRank = parseInt(from[1], 10) - 1; // 0..7
  const toFile = to.charCodeAt(0) - 97;
  const toRank = parseInt(to[1], 10) - 1;

  if (
    fromFile < 0 || fromFile > 7 || fromRank < 0 || fromRank > 7 ||
    toFile < 0 || toFile > 7 || toRank < 0 || toRank > 7
  ) {
    return false;
  }

  const dx = toFile - fromFile;
  const dy = toRank - fromRank;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  switch (pieceType) {
    case 'p': { // Pawn
      if (pieceColor === 'w') {
        // White moves forward (dy > 0)
        // 1 step straight forward
        if (dx === 0 && dy === 1) return true;
        // 2 steps straight forward from starting rank (rank 2, index 1)
        if (fromRank === 1 && dx === 0 && dy === 2) return true;
        // Diagonal capture: 1 step forward-left or forward-right
        if (absDx === 1 && dy === 1) return true;
      } else {
        // Black moves forward (dy < 0)
        // 1 step straight forward
        if (dx === 0 && dy === -1) return true;
        // 2 steps straight forward from starting rank (rank 7, index 6)
        if (fromRank === 6 && dx === 0 && dy === -2) return true;
        // Diagonal capture: 1 step forward-left or forward-right
        if (absDx === 1 && dy === -1) return true;
      }
      return false;
    }

    case 'n': { // Knight: 8 possible L-shaped jumps
      return (absDx === 1 && absDy === 2) || (absDx === 2 && absDy === 1);
    }

    case 'b': { // Bishop: diagonals
      return absDx === absDy && absDx > 0;
    }

    case 'r': { // Rook: ranks and files
      return (absDx === 0 && absDy > 0) || (absDy === 0 && absDx > 0);
    }

    case 'q': { // Queen: diagonals or ranks or files
      return (absDx === absDy && absDx > 0) || (absDx === 0 && absDy > 0) || (absDy === 0 && absDx > 0);
    }

    case 'k': { // King: 1 step in any direction, plus castling
      if (absDx <= 1 && absDy <= 1) return true;
      // White Castling
      if (pieceColor === 'w' && from === 'e1' && (to === 'g1' || to === 'c1')) {
        return true;
      }
      // Black Castling
      if (pieceColor === 'b' && from === 'e8' && (to === 'g8' || to === 'c8')) {
        return true;
      }
      return false;
    }

    default:
      return false;
  }
}

/**
 * Returns all candidate target squares on an 8x8 board that conform to the theoretical
 * geometry of the piece. Useful for rendering premove indicator dots.
 */
export function getPremoveCandidateSquares(
  from: Square,
  pieceType: PieceSymbol,
  pieceColor: PieceColor
): Square[] {
  const candidates: Square[] = [];
  for (const f of FILES) {
    for (const r of RANKS) {
      const sq = `${f}${r}` as Square;
      if (isGeometricMoveValid(from, sq, pieceType, pieceColor)) {
        candidates.push(sq);
      }
    }
  }
  return candidates;
}

/**
 * Validates a premove against a newly arrived chess position (FEN).
 * Returns whether the move is 100% legal under standard FIDE rules.
 */
export function validatePremoveInPosition(
  fen: string,
  premove: Premove
): { valid: boolean; move: Move | null; reason?: string } {
  try {
    const chess = new Chess(fen);
    if (chess.isGameOver()) {
      return { valid: false, move: null, reason: 'Game is already over' };
    }

    // Attempt to make move in sandbox
    const move = chess.move({
      from: premove.from,
      to: premove.to,
      promotion: (premove.promotion as any) || 'q',
    });

    if (move) {
      return { valid: true, move };
    }
    return { valid: false, move: null, reason: 'Move is not legal in current position' };
  } catch (err: any) {
    return { valid: false, move: null, reason: err?.message || 'Illegal move' };
  }
}
