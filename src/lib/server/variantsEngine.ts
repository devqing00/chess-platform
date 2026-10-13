import { Chess, Square, PieceSymbol } from 'chess.js';
import { ChessVariant, PieceType, PieceColor } from '@/types/chess';

export interface CrazyhousePocket {
  p: number;
  n: number;
  b: number;
  r: number;
  q: number;
}

export interface VariantGameState {
  variant: ChessVariant;
  fen: string;
  turn: PieceColor;
  moveCount: number;
  isGameOver: boolean;
  winner: PieceColor | 'draw' | null;
  winReason?: string;
  // 3-Check state
  whiteChecksGiven: number;
  blackChecksGiven: number;
  // Crazyhouse pockets
  whitePocket: CrazyhousePocket;
  blackPocket: CrazyhousePocket;
  // Promoted squares set (represented as array of squares for JSON serialization)
  promotedSquares: Square[];
  // Chess960 metadata
  chess960Index?: number;
}

export class VariantsEngine {
  /**
   * Generates Chess960 back rank using the exact Scharnagl Algorithm (0 - 959).
   */
  public static generateChess960BackRank(n: number): string[] {
    if (n < 0 || n > 959) {
      throw new Error('Chess960 ID must be between 0 and 959');
    }

    const rank: (string | null)[] = [null, null, null, null, null, null, null, null];

    // 1. Dark-squared bishop on squares 1, 3, 5, 7
    let remainder = n % 4;
    let quotient = Math.floor(n / 4);
    const darkSquares = [1, 3, 5, 7];
    rank[darkSquares[remainder]] = 'B';

    // 2. Light-squared bishop on squares 0, 2, 4, 6
    remainder = quotient % 4;
    quotient = Math.floor(quotient / 4);
    const lightSquares = [0, 2, 4, 6];
    rank[lightSquares[remainder]] = 'B';

    // 3. Queen on remaining empty squares
    remainder = quotient % 6;
    quotient = Math.floor(quotient / 6);
    let emptyIdx = rank.map((p, i) => (p === null ? i : -1)).filter((i) => i !== -1);
    rank[emptyIdx[remainder]] = 'Q';

    // 4. Knights: 10 combinations for 2 knights in remaining 5 squares
    const knightCombos: [number, number][] = [
      [0, 1], [0, 2], [0, 3], [0, 4],
      [1, 2], [1, 3], [1, 4],
      [2, 3], [2, 4],
      [3, 4],
    ];
    const kIdx = quotient % 10;
    emptyIdx = rank.map((p, i) => (p === null ? i : -1)).filter((i) => i !== -1);
    const [k1, k2] = knightCombos[kIdx];
    rank[emptyIdx[k1]] = 'N';
    rank[emptyIdx[k2]] = 'N';

    // 5. Rooks and King: remaining 3 squares filled with Rook, King, Rook
    emptyIdx = rank.map((p, i) => (p === null ? i : -1)).filter((i) => i !== -1);
    rank[emptyIdx[0]] = 'R';
    rank[emptyIdx[1]] = 'K';
    rank[emptyIdx[2]] = 'R';

    return rank as string[];
  }

  /**
   * Generates full Chess960 starting FEN for a given index.
   */
  public static generateChess960Fen(index: number = 518): { fen: string; index: number } {
    const pieces = this.generateChess960BackRank(index);
    const whiteRank = pieces.join('');
    const blackRank = pieces.map((p) => p.toLowerCase()).join('');

    const fen = `${blackRank}/pppppppp/8/8/8/8/PPPPPPPP/${whiteRank} w KQkq - 0 1`;
    return { fen, index };
  }

  /**
   * Initializes a fresh variant game state.
   */
  public static initVariantGame(variant: ChessVariant, chess960Index?: number): VariantGameState {
    let startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    let chosen960 = chess960Index;

    if (variant === 'chess960') {
      const idx = chosen960 !== undefined ? chosen960 : Math.floor(Math.random() * 960);
      const res = this.generateChess960Fen(idx);
      startFen = res.fen;
      chosen960 = res.index;
    }

    return {
      variant,
      fen: startFen,
      turn: 'w',
      moveCount: 0,
      isGameOver: false,
      winner: null,
      whiteChecksGiven: 0,
      blackChecksGiven: 0,
      whitePocket: { p: 0, n: 0, b: 0, r: 0, q: 0 },
      blackPocket: { p: 0, n: 0, b: 0, r: 0, q: 0 },
      promotedSquares: [],
      chess960Index: chosen960,
    };
  }

  /**
   * Executes a standard move and evaluates variant-specific victory triggers.
   */
  public static playMove(
    state: VariantGameState,
    from: Square,
    to: Square,
    promotion?: PieceSymbol
  ): { nextState: VariantGameState; san: string; captured?: PieceSymbol } {
    if (state.isGameOver) {
      throw new Error('Game is already over');
    }

    const chess = new Chess(state.fen);
    const movingPiece = chess.get(from);
    if (!movingPiece) {
      throw new Error(`No piece at square ${from}`);
    }

    const moveResult = chess.move({ from, to, promotion: promotion || 'q' });
    if (!moveResult) {
      throw new Error(`Illegal move: ${from}-${to}`);
    }

    let nextPromotedSquares = [...state.promotedSquares];
    // If the moving piece was on a promoted square, its new destination inherits the promoted status
    if (nextPromotedSquares.includes(from)) {
      nextPromotedSquares = nextPromotedSquares.filter((sq) => sq !== from);
      nextPromotedSquares.push(to);
    }
    // If this move was a pawn promotion, add `to` to promoted squares
    if (moveResult.promotion) {
      if (!nextPromotedSquares.includes(to)) {
        nextPromotedSquares.push(to);
      }
    }

    const nextState: VariantGameState = {
      ...state,
      fen: chess.fen(),
      turn: chess.turn() as PieceColor,
      moveCount: state.moveCount + 1,
      whitePocket: { ...state.whitePocket },
      blackPocket: { ...state.blackPocket },
      promotedSquares: nextPromotedSquares,
    };

    // 1. King of the Hill (KOTH) Check: King reaches d4, e4, d5, or e5
    if (state.variant === 'kingofthehill' && movingPiece.type === 'k') {
      const hillSquares = new Set(['d4', 'e4', 'd5', 'e5']);
      if (hillSquares.has(to)) {
        nextState.isGameOver = true;
        nextState.winner = movingPiece.color;
        nextState.winReason = `${movingPiece.color === 'w' ? 'White' : 'Black'} conquered the Hill (${to})!`;
        return { nextState, san: moveResult.san, captured: moveResult.captured };
      }
    }

    // 2. 3-Check: Check detected
    if (state.variant === '3check' && chess.isCheck()) {
      if (movingPiece.color === 'w') {
        nextState.whiteChecksGiven += 1;
        if (nextState.whiteChecksGiven >= 3) {
          nextState.isGameOver = true;
          nextState.winner = 'w';
          nextState.winReason = 'White delivered 3 checks and won the game! (+3)';
          return { nextState, san: moveResult.san, captured: moveResult.captured };
        }
      } else {
        nextState.blackChecksGiven += 1;
        if (nextState.blackChecksGiven >= 3) {
          nextState.isGameOver = true;
          nextState.winner = 'b';
          nextState.winReason = 'Black delivered 3 checks and won the game! (+3)';
          return { nextState, san: moveResult.san, captured: moveResult.captured };
        }
      }
    }

    // 3. Crazyhouse: Captured pieces transfer into capturer's pocket
    if (state.variant === 'crazyhouse' && moveResult.captured) {
      // If captured piece was on a promoted square, it reverts to a PAWN in pocket!
      const wasPromoted = state.promotedSquares.includes(to);
      const pieceKey: keyof CrazyhousePocket = wasPromoted
        ? 'p'
        : (moveResult.captured.toLowerCase() as keyof CrazyhousePocket);

      // Remove captured square from promoted list if present
      nextState.promotedSquares = nextState.promotedSquares.filter((sq) => sq !== to);

      if (movingPiece.color === 'w') {
        nextState.whitePocket[pieceKey] = (nextState.whitePocket[pieceKey] || 0) + 1;
      } else {
        nextState.blackPocket[pieceKey] = (nextState.blackPocket[pieceKey] || 0) + 1;
      }
    }

    // Standard Checkmate / Draw evaluation
    if (chess.isCheckmate()) {
      nextState.isGameOver = true;
      nextState.winner = state.turn;
      nextState.winReason = `${state.turn === 'w' ? 'White' : 'Black'} won by Checkmate!`;
    } else if (chess.isDraw() || chess.isStalemate()) {
      nextState.isGameOver = true;
      nextState.winner = 'draw';
      nextState.winReason = 'Game drawn by stalemate / repetition / 50-move rule.';
    }

    return { nextState, san: moveResult.san, captured: moveResult.captured };
  }

  /**
   * Returns all valid squares where a Crazyhouse piece can legally be dropped.
   */
  public static getLegalDropSquares(
    state: VariantGameState,
    pieceType: keyof CrazyhousePocket
  ): Square[] {
    if (state.variant !== 'crazyhouse' || state.isGameOver) return [];

    const isWhite = state.turn === 'w';
    const pocket = isWhite ? state.whitePocket : state.blackPocket;
    if (!pocket[pieceType] || pocket[pieceType] <= 0) return [];

    const chess = new Chess(state.fen);
    const squares: Square[] = [];
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

    for (const file of files) {
      for (const rank of ranks) {
        const sq = `${file}${rank}` as Square;
        // Pawns cannot be dropped on rank 1 or 8
        if (pieceType === 'p' && (rank === '1' || rank === '8')) continue;
        // Square must be empty
        if (chess.get(sq) !== null) continue;

        // Test if drop leaves player's king in check
        const testChess = new Chess(state.fen);
        testChess.put({ type: pieceType as PieceSymbol, color: state.turn }, sq);
        // Put doesn't toggle turn, so check if own king is in check in current position
        if (testChess.isCheck()) {
          // If own king is currently in check, this drop didn't resolve it!
          continue;
        }

        squares.push(sq);
      }
    }

    return squares;
  }

  /**
   * Executes a Crazyhouse Piece Drop move (e.g. N@f3 or P@e4).
   */
  public static playCrazyhouseDrop(
    state: VariantGameState,
    pieceType: keyof CrazyhousePocket,
    targetSquare: Square
  ): { nextState: VariantGameState; san: string } {
    if (state.variant !== 'crazyhouse') {
      throw new Error('Drop moves are only permitted in Crazyhouse');
    }
    if (state.isGameOver) {
      throw new Error('Game is already over');
    }

    const isWhite = state.turn === 'w';
    const pocket = isWhite ? state.whitePocket : state.blackPocket;

    if (!pocket[pieceType] || pocket[pieceType] <= 0) {
      throw new Error(`No ${pieceType.toUpperCase()} available in pocket`);
    }

    // Pawn drop restriction: cannot drop on rank 1 or 8
    const rank = targetSquare[1];
    if (pieceType === 'p' && (rank === '1' || rank === '8')) {
      throw new Error('Pawns cannot be dropped on the 1st or 8th rank');
    }

    const chess = new Chess(state.fen);
    if (chess.get(targetSquare) !== null) {
      throw new Error(`Square ${targetSquare} is already occupied`);
    }

    // Place piece on board
    const putSuccess = chess.put(
      { type: pieceType as PieceSymbol, color: state.turn },
      targetSquare
    );
    if (!putSuccess) {
      throw new Error('Failed to drop piece on target square');
    }

    // Test if this drop leaves own king in check (must resolve check if king was in check)
    if (chess.isCheck()) {
      throw new Error('Illegal drop: King remains in check');
    }

    // Advance turn to opponent
    const fenParts = chess.fen().split(' ');
    fenParts[1] = isWhite ? 'b' : 'w';
    fenParts[3] = '-'; // clear en-passant on drop
    const newFen = fenParts.join(' ');

    const newPocket = { ...pocket, [pieceType]: pocket[pieceType] - 1 };

    const opponentChess = new Chess(newFen);
    const deliversCheck = opponentChess.isCheck();
    const deliversMate = opponentChess.isCheckmate();

    let san = `${pieceType.toUpperCase()}@${targetSquare}`;
    if (deliversMate) {
      san += '#';
    } else if (deliversCheck) {
      san += '+';
    }

    const nextState: VariantGameState = {
      ...state,
      fen: newFen,
      turn: isWhite ? 'b' : 'w',
      moveCount: state.moveCount + 1,
      whitePocket: isWhite ? newPocket : { ...state.whitePocket },
      blackPocket: !isWhite ? newPocket : { ...state.blackPocket },
    };

    if (deliversMate) {
      nextState.isGameOver = true;
      nextState.winner = state.turn;
      nextState.winReason = `${state.turn === 'w' ? 'White' : 'Black'} won by Drop Checkmate (${san})!`;
    }

    return { nextState, san };
  }

  /**
   * Generates a high-quality bot move tailored for each specific variant.
   */
  public static generateVariantBotMove(state: VariantGameState): {
    type: 'move' | 'drop';
    from?: Square;
    to?: Square;
    pieceType?: keyof CrazyhousePocket;
    promotion?: PieceSymbol;
  } | null {
    if (state.isGameOver) return null;

    const chess = new Chess(state.fen);
    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) return null;

    // 1. King of the Hill: prioritize king stepping onto hill squares
    if (state.variant === 'kingofthehill') {
      const hillSquares = new Set(['d4', 'e4', 'd5', 'e5']);
      const kingWinMove = moves.find((m) => m.piece === 'k' && hillSquares.has(m.to));
      if (kingWinMove) {
        return { type: 'move', from: kingWinMove.from as Square, to: kingWinMove.to as Square };
      }
      // If King can get closer to hill (distance metric)
      const kingMoves = moves.filter((m) => m.piece === 'k');
      if (kingMoves.length > 0 && Math.random() > 0.4) {
        const sorted = kingMoves.sort((a, b) => {
          const distA = Math.min(
            ...['d4', 'e4', 'd5', 'e5'].map(
              (h) => Math.abs(a.to.charCodeAt(0) - h.charCodeAt(0)) + Math.abs(parseInt(a.to[1]) - parseInt(h[1]))
            )
          );
          const distB = Math.min(
            ...['d4', 'e4', 'd5', 'e5'].map(
              (h) => Math.abs(b.to.charCodeAt(0) - h.charCodeAt(0)) + Math.abs(parseInt(b.to[1]) - parseInt(h[1]))
            )
          );
          return distA - distB;
        });
        return { type: 'move', from: sorted[0].from as Square, to: sorted[0].to as Square };
      }
    }

    // 2. 3-Check: prioritize moves delivering check
    if (state.variant === '3check') {
      const checkMoves = moves.filter((m) => m.san.includes('+') || m.san.includes('#'));
      if (checkMoves.length > 0) {
        // Delivering check wins the game if it's the 3rd check!
        const checksGiven = state.turn === 'w' ? state.whiteChecksGiven : state.blackChecksGiven;
        if (checksGiven === 2) {
          return { type: 'move', from: checkMoves[0].from as Square, to: checkMoves[0].to as Square };
        }
        return { type: 'move', from: checkMoves[0].from as Square, to: checkMoves[0].to as Square };
      }
    }

    // 3. Crazyhouse: consider dropping pieces if available and tactical
    if (state.variant === 'crazyhouse') {
      const pocket = state.turn === 'w' ? state.whitePocket : state.blackPocket;
      const availablePieces = (Object.keys(pocket) as (keyof CrazyhousePocket)[]).filter(
        (p) => pocket[p] > 0
      );

      // 40% chance to drop if pocket has pieces, or drop immediately if under check or can check
      if (availablePieces.length > 0 && Math.random() > 0.6) {
        for (const pt of availablePieces) {
          const legalDrops = this.getLegalDropSquares(state, pt);
          if (legalDrops.length > 0) {
            // Prioritize drop near center or enemy king
            const chosenSq = legalDrops[Math.floor(Math.random() * legalDrops.length)];
            return { type: 'drop', pieceType: pt, to: chosenSq };
          }
        }
      }
    }

    // Default heuristic: captures, checks, or highest value move
    const captures = moves.filter((m) => m.captured);
    if (captures.length > 0 && Math.random() > 0.3) {
      const bestCap = captures[Math.floor(Math.random() * captures.length)];
      return {
        type: 'move',
        from: bestCap.from as Square,
        to: bestCap.to as Square,
        promotion: (bestCap.promotion as PieceSymbol) || 'q',
      };
    }

    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    return {
      type: 'move',
      from: randomMove.from as Square,
      to: randomMove.to as Square,
      promotion: (randomMove.promotion as PieceSymbol) || 'q',
    };
  }
}

