import { Chess, Square, PieceSymbol } from 'chess.js';
import { MoveClassification } from '@/types/chess';
import { explainChessMove } from '@/lib/chessMoveExplainer';

export interface TacticalMotif {
  type:
    | 'fork'
    | 'pin'
    | 'skewer'
    | 'hanging-piece'
    | 'discovered-attack'
    | 'back-rank'
    | 'king-safety'
    | 'passed-pawn'
    | 'sacrifice'
    | 'overloaded-defender'
    | 'mate-threat';
  description: string;
}

/**
 * High-precision tactical motif detector using full chess board geometry
 */
export function detectTacticalMotifs(params: {
  chessAfter: Chess;
  playedMoveSan: string;
  from?: string;
  to?: string;
  turnColor?: 'w' | 'b';
  fenBefore?: string;
  classification?: MoveClassification;
}): TacticalMotif[] {
  const { chessAfter, playedMoveSan, from, to, turnColor, fenBefore, classification } = params;
  const motifs: TacticalMotif[] = [];

  try {
    const isWhite = turnColor === 'w' || chessAfter.turn() === 'b'; // Move was made by who is NOT on turn now
    const movingColor = isWhite ? 'w' : 'b';
    const opponentColor = isWhite ? 'b' : 'w';

    // 1. Immediate Checkmate or Check
    if (chessAfter.isCheckmate()) {
      motifs.push({
        type: 'back-rank',
        description: 'Delivered an unstoppable checkmate!',
      });
      return motifs;
    }

    // 1b. Check if this move allows opponent to deliver immediate checkmate in 1 (e.g. Qxf7#)
    if (!chessAfter.isGameOver()) {
      const oppMatingMove = chessAfter.moves({ verbose: true }).find((m) => m.san.includes('#'));
      if (oppMatingMove) {
        motifs.push({
          type: 'king-safety',
          description: `Allows immediate checkmate with ${oppMatingMove.san}`,
        });
        return motifs;
      }
    }

    // 2. Discovered Attack / Discovered Check
    if (playedMoveSan.includes('+') && fenBefore && from) {
      try {
        const before = new Chess(fenBefore);
        const movingPiece = before.get(from as Square);
        // If the moved piece is not the one checking the king directly (e.g. Knight moved, but Bishop checks)
        if (movingPiece && !['q', 'r', 'b'].includes(movingPiece.type)) {
          motifs.push({
            type: 'discovered-attack',
            description: 'Discovered check! Unmasking a lethal attack on the enemy King.',
          });
        }
      } catch {}
    }

    // 3. Knight & Pawn Fork Detection
    const targetSquare = (to || playedMoveSan.replace(/[+#!?x]/g, '').slice(-2)) as Square;
    if (targetSquare && targetSquare.length === 2) {
      const file = targetSquare.charCodeAt(0) - 97; // 0..7
      const rank = parseInt(targetSquare[1], 10) - 1; // 0..7

      if (playedMoveSan.startsWith('N')) {
        const knightDeltas = [
          [1, 2], [1, -2], [-1, 2], [-1, -2],
          [2, 1], [2, -1], [-2, 1], [-2, -1],
        ];
        const attackedValuablePieces: { type: PieceSymbol; sq: string }[] = [];

        for (const [df, dr] of knightDeltas) {
          const nf = file + df;
          const nr = rank + dr;
          if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
            const sqName = `${String.fromCharCode(97 + nf)}${nr + 1}` as Square;
            const piece = chessAfter.get(sqName);
            if (piece && piece.color === opponentColor) {
              if (piece.type === 'k' || piece.type === 'q' || piece.type === 'r' || piece.type === 'b') {
                attackedValuablePieces.push({ type: piece.type, sq: sqName });
              }
            }
          }
        }

        const hasKing = attackedValuablePieces.some((p) => p.type === 'k');
        const hasQueen = attackedValuablePieces.some((p) => p.type === 'q');
        const hasRook = attackedValuablePieces.some((p) => p.type === 'r');

        if (hasKing && hasQueen) {
          motifs.push({
            type: 'fork',
            description: 'Royal Fork! Attacking both the King and Queen simultaneously.',
          });
        } else if (hasKing && hasRook) {
          motifs.push({
            type: 'fork',
            description: 'Devastating Knight fork! Checking the King while skewering the Rook.',
          });
        } else if (hasQueen && hasRook) {
          motifs.push({
            type: 'fork',
            description: 'Tactical fork! Attacking both the Queen and Rook.',
          });
        } else if (attackedValuablePieces.length >= 2) {
          motifs.push({
            type: 'fork',
            description: 'Knight fork! Striking two valuable opponent pieces at once.',
          });
        }
      }

      // Pawn Fork
      if (/^[a-h]/.test(playedMoveSan) && !playedMoveSan.startsWith('O-O')) {
        const pawnDir = movingColor === 'w' ? 1 : -1;
        const pawnAttacks = [
          [file - 1, rank + pawnDir],
          [file + 1, rank + pawnDir],
        ];
        const attackedPieces: PieceSymbol[] = [];
        for (const [pf, pr] of pawnAttacks) {
          if (pf >= 0 && pf < 8 && pr >= 0 && pr < 8) {
            const sq = `${String.fromCharCode(97 + pf)}${pr + 1}` as Square;
            const p = chessAfter.get(sq);
            if (p && p.color === opponentColor && ['q', 'r', 'b', 'n'].includes(p.type)) {
              attackedPieces.push(p.type);
            }
          }
        }
        if (attackedPieces.length >= 2) {
          motifs.push({
            type: 'fork',
            description: 'Pawn fork! A humble pawn attacks two major enemy pieces.',
          });
        }
      }
    }

    // 4. Passed Pawn March (MUST be a real pawn, and no opposing pawns ahead)
    const isPawnMove = /^[a-h]/.test(playedMoveSan) && !playedMoveSan.startsWith('O-O');
    if (isPawnMove && targetSquare && targetSquare.length === 2) {
      const pawnRank = parseInt(targetSquare[1], 10);
      const isAdvanced = movingColor === 'w' ? pawnRank >= 6 : pawnRank <= 3;
      if (isAdvanced || playedMoveSan.includes('=')) {
        const fileIdx = targetSquare.charCodeAt(0) - 97;
        const board = chessAfter.board();
        let hasEnemyPawnAhead = false;
        const startRow = movingColor === 'w' ? 0 : (8 - pawnRank + 1);
        const endRow = movingColor === 'w' ? (8 - pawnRank - 1) : 7;
        for (let r = startRow; r <= endRow; r++) {
          for (let c = Math.max(0, fileIdx - 1); c <= Math.min(7, fileIdx + 1); c++) {
            const p = board[r]?.[c];
            if (p && p.type === 'p' && p.color === opponentColor) {
              hasEnemyPawnAhead = true;
              break;
            }
          }
          if (hasEnemyPawnAhead) break;
        }

        if (!hasEnemyPawnAhead) {
          motifs.push({
            type: 'passed-pawn',
            description: 'Advanced a dangerous passed pawn close to Queen promotion.',
          });
        }
      }
    }

    // 5. Piece Sacrifice
    if (classification === 'brilliant') {
      motifs.push({
        type: 'sacrifice',
        description: 'Offered an inspired piece sacrifice to blow open the enemy defense.',
      });
    }

    // 6. Hanging Piece Warning (for Inaccuracies / Mistakes / Blunders)
    if (classification === 'blunder' || classification === 'mistake') {
      motifs.push({
        type: 'hanging-piece',
        description: 'Leaves vital material or coordination undefended.',
      });
    }
  } catch (err) {
    console.warn('Tactical motif detection fallback:', err);
  }

  return motifs;
}

/**
 * Synthesizes deep Coach Danny natural-language advice
 */
export function generateCoachExplanation(params: {
  classification: MoveClassification;
  moveSan: string;
  bestMoveSan: string;
  pieceType: PieceSymbol;
  evalBeforeCp: number;
  evalAfterCp: number;
  mateIn?: number;
  isCapture: boolean;
  isCheck: boolean;
  turnColor: 'w' | 'b';
  playerAccuracy: number;
  playerName?: string;
  isUser?: boolean;
  motif?: TacticalMotif;
  fenBefore?: string;
  refutations?: {
    accepted?: { replySan: string; lineSan: string; material: string; mateIn?: number };
    declined?: { replySan: string; lineSan: string; material: string; mateIn?: number };
    acceptIsBest?: boolean;
  };
}): string {
  const {
    classification,
    moveSan,
    bestMoveSan,
    evalBeforeCp,
    evalAfterCp,
    mateIn,
    isCheck,
    isCapture,
    turnColor,
    playerName,
    isUser = true,
    motif,
    fenBefore,
    refutations,
  } = params;

  const player = playerName || (isUser ? 'You' : 'Opponent');
  const betterMoveText = bestMoveSan ? explainChessMove(bestMoveSan, fenBefore) : '';

  const evalDeltaCp = turnColor === 'w' ? evalAfterCp - evalBeforeCp : evalBeforeCp - evalAfterCp;
  const evalDiffPawns = (Math.abs(evalDeltaCp) / 100).toFixed(1);

  if (moveSan.includes('#') || mateIn === 0) {
    return isUser
      ? `Checkmate! Outstanding finish. You found the decisive mating blow!`
      : `${player} delivered checkmate with ${moveSan}. A decisive finish.`;
  }

  if (mateIn !== undefined && Math.abs(mateIn) <= 3) {
    if (classification === 'best' || classification === 'great' || classification === 'brilliant') {
      return isUser
        ? `Masterful execution! You found the fastest forcing line with ${moveSan}, leading to forced checkmate in ${Math.abs(mateIn)}!`
        : `${player} found a forcing continuation with ${moveSan}, threatening checkmate in ${Math.abs(mateIn)}.`;
    }
  }

  // OPPONENT'S MOVE PERSPECTIVE
  if (!isUser) {
    const motifText = motif ? ` (${motif.description})` : '';
    switch (classification) {
      case 'brilliant':
        return `${player} found an inspired sacrifice with ${moveSan}!${motifText} Watch out for their attacking threats.`;
      case 'great':
        return `${player} found a great move (${moveSan})${motifText} that holds their position under pressure.`;
      case 'best':
        return `${player} found the engine's best move (${moveSan}).${motifText} Calculate your response carefully.`;
      case 'excellent':
      case 'good':
        return `${player} made a solid move with ${moveSan}.${motifText}`;
      case 'book':
        return `${player} played standard opening theory with ${moveSan}.`;
      case 'inaccuracy':
        return `${player} played an inaccuracy with ${moveSan}.${motifText} A great chance to take the initiative!`;
      case 'mistake':
        return `${player} made a mistake with ${moveSan}!${motifText} You have an advantage—look for the most forcing response.`;
      case 'miss':
        return `${player} missed a tactical opportunity! You dodged a bullet.`;
      case 'blunder': {
        const isOpponentMatingUs = mateIn !== undefined && (turnColor === 'w' ? mateIn < 0 : mateIn > 0);
        if (isOpponentMatingUs || motif?.type === 'mate-threat' || Math.abs(evalAfterCp) >= 20000) {
          const mateDetail = motif?.type === 'mate-threat' ? motif.description : (mateIn ? `allows forced checkmate in ${Math.abs(mateIn)}` : 'allows forced checkmate');
          return `${player} blundered with ${moveSan}! ${mateDetail}.`;
        }
        return `${player} blundered with ${moveSan}!${motifText} This gives you a clear winning opportunity.`;
      }
      default:
        return `${player} played ${moveSan}.${motifText}`;
    }
  }

  // USER'S MOVE PERSPECTIVE
  const motifPrefix = motif ? `${motif.description} ` : '';

  switch (classification) {
    case 'brilliant': {
      let refutationText = '';
      if (refutations?.accepted && refutations?.declined) {
        refutationText = ` If ${refutations.accepted.replySan}, then ${refutations.accepted.lineSan}${refutations.accepted.material ? ` (${refutations.accepted.material})` : ''}. If ${refutations.declined.replySan}, then ${refutations.declined.lineSan}${refutations.declined.material ? ` (${refutations.declined.material})` : ''}.`;
      } else if (refutations?.accepted) {
        refutationText = ` If ${refutations.accepted.replySan}, then ${refutations.accepted.lineSan}${refutations.accepted.material ? ` (${refutations.accepted.material})` : ''}.`;
      }
      return motif
        ? `Brilliant move! ${motif.description}${refutationText}`
        : `Brilliant move! You offered an intuitive piece sacrifice that shatters the defense.${refutationText}`;
    }

    case 'great': {
      let refutationText = '';
      if (refutations?.accepted && refutations.acceptIsBest === false) {
        refutationText = ` Accepting with ${refutations.accepted.replySan} runs into ${refutations.accepted.lineSan}${refutations.accepted.material ? ` (${refutations.accepted.material})` : ''}.`;
      }
      return motif
        ? `Great move! ${motif.description}${refutationText}`
        : `Great move! ${moveSan} was the ONLY move on the board to keep your advantage.${refutationText}`;
    }

    case 'best':
      if (motif && motif.type === 'fork') {
        return `Best move! ${motif.description} Perfectly executes the winning sequence.`;
      }
      if (isCheck) {
        return `Best move! Giving check with ${moveSan} keeps maximal pressure and restricts the enemy king's flight squares.`;
      }
      if (isCapture) {
        return `Best move! Capturing with ${moveSan} resolves the tension in your favor and strengthens your position.`;
      }
      return motif
        ? `Best move! ${motif.description} Executed with complete accuracy.`
        : `Best move! ${moveSan} develops piece harmony and perfectly executes the top engine recommendation.`;

    case 'excellent':
      return motif
        ? `Excellent move! ${motif.description} Keeps relentless pressure.`
        : `Excellent move! ${moveSan} is a high-caliber choice that maintains solid control and relentless pressure.`;

    case 'good':
      return `Good move. A completely sound and solid continuation that maintains the balance of the position.`;

    case 'book':
      return `${moveSan} is standard grandmaster opening theory, following time-tested principles for piece development.`;

    case 'inaccuracy':
      return betterMoveText
        ? `Inaccuracy. ${moveSan} slightly loses steam (${evalDiffPawns} pawns). Playing ${betterMoveText} would have preserved a tighter grip.`
        : `Inaccuracy. ${moveSan} gives your opponent unnecessary breathing room.`;

    case 'mistake':
      return betterMoveText
        ? `Mistake! ${motifPrefix}${moveSan} surrenders significant ground. Finding ${betterMoveText} kept the position much safer.`
        : `Mistake! That concedes the initiative to your opponent.`;

    case 'miss':
      return betterMoveText
        ? `Miss! You missed a crushing tactical blow! Finding ${betterMoveText} would have seized a winning advantage immediately.`
        : `Miss! You had a decisive opportunity here and let it slip.`;

    case 'blunder': {
      const isOpponentMating = mateIn !== undefined && (turnColor === 'w' ? mateIn < 0 : mateIn > 0);
      const movesToMate = mateIn !== undefined ? Math.abs(mateIn) : 0;
      if (isOpponentMating || motif?.type === 'mate-threat' || Math.abs(evalAfterCp) >= 20000) {
        let mateText = 'allows forced checkmate';
        if (motif?.type === 'mate-threat' && motif.description) {
          mateText = motif.description.toLowerCase();
          if (!mateText.startsWith('allows')) mateText = `allows ${mateText}`;
        } else if (movesToMate === 1) {
          mateText = 'allows immediate checkmate';
        } else if (movesToMate > 1) {
          mateText = `allows forced checkmate in ${movesToMate}`;
        }
        return betterMoveText
          ? `Blunder! ${moveSan} ${mateText}! ${betterMoveText} was essential to defend the king.`
          : `Blunder! ${moveSan} ${mateText}! King safety had to be prioritized.`;
      }
      return betterMoveText
        ? `Blunder! ${motifPrefix}${moveSan} hangs critical material or king safety (-${evalDiffPawns} pawns). ${betterMoveText} was essential to stay in the fight.`
        : `Blunder! This decisively compromises your position.`;
    }

    default:
      return `${moveSan} was played.`;
  }
}
