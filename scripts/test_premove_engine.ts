/**
 * Automated Aggressive Test Suite for Chess Premove Functionality
 * Covers:
 *  - Full geometric piece movement theory across all 6 piece types
 *  - Premove candidate square generation
 *  - Legal auto-execution in standard positions
 *  - Capture of premoved piece (cancellation)
 *  - Blocked destination square (cancellation)
 *  - Check delivered by opponent making flank move illegal (cancellation)
 *  - Check delivered by opponent with legal King evasion premove (execution)
 *  - Pawn promotion to Queen premove (execution)
 *  - Castling premove (valid vs rook captured vs through check)
 *  - En-passant premove (valid when 2-square push vs invalid on quiet move)
 *  - Pinned piece attempting to move into check (cancellation)
 *  - Terminal game-over state (cancellation)
 */

import { Chess, Square } from 'chess.js';
import {
  isGeometricMoveValid,
  getPremoveCandidateSquares,
  validatePremoveInPosition,
} from '../src/lib/premoveValidator';
import { Premove } from '../src/types/chess';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${testName}${detail ? ` - ${detail}` : ''}`);
  }
}

console.log('\n======================================================');
console.log('   CHESS PREMOVE ENGINE AGGRESSIVE TEST SUITE');
console.log('======================================================\n');

// -----------------------------------------------------------------------------
// 1. GEOMETRIC PIECE MOVEMENT VALIDATION
// -----------------------------------------------------------------------------
console.log('--- Suite 1: Geometric Piece Movement Rules ---');

// Pawns
assert(isGeometricMoveValid('e2', 'e3', 'p', 'w'), 'White pawn 1 step forward');
assert(isGeometricMoveValid('e2', 'e4', 'p', 'w'), 'White pawn 2 steps from starting rank');
assert(!isGeometricMoveValid('e3', 'e5', 'p', 'w'), 'White pawn cannot move 2 steps from non-starting rank');
assert(isGeometricMoveValid('e2', 'd3', 'p', 'w'), 'White pawn diagonal capture left');
assert(isGeometricMoveValid('e2', 'f3', 'p', 'w'), 'White pawn diagonal capture right');
assert(!isGeometricMoveValid('e4', 'e3', 'p', 'w'), 'White pawn cannot move backwards');
assert(!isGeometricMoveValid('e4', 'd4', 'p', 'w'), 'White pawn cannot move sideways');

assert(isGeometricMoveValid('e7', 'e6', 'p', 'b'), 'Black pawn 1 step forward');
assert(isGeometricMoveValid('e7', 'e5', 'p', 'b'), 'Black pawn 2 steps from starting rank');
assert(!isGeometricMoveValid('e6', 'e4', 'p', 'b'), 'Black pawn cannot move 2 steps from non-starting rank');
assert(isGeometricMoveValid('e7', 'd6', 'p', 'b'), 'Black pawn diagonal capture');
assert(!isGeometricMoveValid('e5', 'e6', 'p', 'b'), 'Black pawn cannot move backwards');

// Knights
assert(isGeometricMoveValid('g1', 'f3', 'n', 'w'), 'Knight hop g1 -> f3');
assert(isGeometricMoveValid('b1', 'c3', 'n', 'w'), 'Knight hop b1 -> c3');
assert(isGeometricMoveValid('e4', 'f6', 'n', 'w'), 'Knight hop e4 -> f6 (+1, +2)');
assert(isGeometricMoveValid('e4', 'd6', 'n', 'w'), 'Knight hop e4 -> d6 (-1, +2)');
assert(isGeometricMoveValid('e4', 'g5', 'n', 'w'), 'Knight hop e4 -> g5 (+2, +1)');
assert(isGeometricMoveValid('e4', 'c5', 'n', 'w'), 'Knight hop e4 -> c5 (-2, +1)');
assert(!isGeometricMoveValid('e4', 'e6', 'n', 'w'), 'Knight cannot move straight 2 squares');
assert(!isGeometricMoveValid('e4', 'g6', 'n', 'w'), 'Knight cannot move diagonally');

// Bishops
assert(isGeometricMoveValid('c1', 'f4', 'b', 'w'), 'Bishop diagonal move');
assert(isGeometricMoveValid('f1', 'a6', 'b', 'w'), 'Bishop long diagonal move');
assert(!isGeometricMoveValid('c1', 'c4', 'b', 'w'), 'Bishop cannot move orthogonally');

// Rooks
assert(isGeometricMoveValid('a1', 'a8', 'r', 'w'), 'Rook vertical move along file');
assert(isGeometricMoveValid('a1', 'h1', 'r', 'w'), 'Rook horizontal move along rank');
assert(!isGeometricMoveValid('a1', 'b2', 'r', 'w'), 'Rook cannot move diagonally');

// Queens
assert(isGeometricMoveValid('d1', 'h5', 'q', 'w'), 'Queen diagonal move');
assert(isGeometricMoveValid('d1', 'd8', 'q', 'w'), 'Queen vertical move');
assert(isGeometricMoveValid('d1', 'a1', 'q', 'w'), 'Queen horizontal move');
assert(!isGeometricMoveValid('d1', 'e3', 'q', 'w'), 'Queen cannot make knight hop');

// Kings
assert(isGeometricMoveValid('e1', 'e2', 'k', 'w'), 'King 1 step forward');
assert(isGeometricMoveValid('e1', 'd1', 'k', 'w'), 'King 1 step left');
assert(isGeometricMoveValid('e1', 'f2', 'k', 'w'), 'King 1 step diagonally');
assert(isGeometricMoveValid('e1', 'g1', 'k', 'w'), 'White King kingside castling geometry');
assert(isGeometricMoveValid('e1', 'c1', 'k', 'w'), 'White King queenside castling geometry');
assert(isGeometricMoveValid('e8', 'g8', 'k', 'b'), 'Black King kingside castling geometry');
assert(isGeometricMoveValid('e8', 'c8', 'k', 'b'), 'Black King queenside castling geometry');
assert(!isGeometricMoveValid('e1', 'e3', 'k', 'w'), 'King cannot move 2 steps straight');

// Same square & out of bounds
assert(!isGeometricMoveValid('e4', 'e4', 'n', 'w'), 'Reject move to same square');

// -----------------------------------------------------------------------------
// 2. PREMOVE CANDIDATE SQUARE GENERATION
// -----------------------------------------------------------------------------
console.log('\n--- Suite 2: Premove Candidate Generation ---');

const e4KnightCandidates = getPremoveCandidateSquares('e4', 'n', 'w');
assert(e4KnightCandidates.length === 8, 'Knight on e4 has exactly 8 geometric candidates');
assert(e4KnightCandidates.includes('f6') && e4KnightCandidates.includes('c3'), 'Knight candidates include f6 and c3');

const a1KnightCandidates = getPremoveCandidateSquares('a1', 'n', 'w');
assert(a1KnightCandidates.length === 2, 'Corner knight on a1 has exactly 2 candidates (b3, c2)');

const e2PawnCandidates = getPremoveCandidateSquares('e2', 'p', 'w');
assert(
  e2PawnCandidates.length === 4 &&
  e2PawnCandidates.includes('e3') &&
  e2PawnCandidates.includes('e4') &&
  e2PawnCandidates.includes('d3') &&
  e2PawnCandidates.includes('f3'),
  'Starting White pawn e2 has exactly 4 candidates (e3, e4, d3, f3)'
);

// -----------------------------------------------------------------------------
// 3. SCENARIO 1: STANDARD LEGAL PREMOVE
// -----------------------------------------------------------------------------
console.log('\n--- Suite 3: Scenario 1 - Standard Legal Premove Execution ---');

{
  // 1. e4 e5; White queued premove Nf3 (g1 -> f3)
  const chess = new Chess();
  chess.move('e4');
  chess.move('e5');
  // It is now White's turn
  const premove: Premove = { from: 'g1', to: 'f3' };
  const res = validatePremoveInPosition(chess.fen(), premove);
  assert(res.valid === true, 'Nf3 premove is valid after 1. e4 e5');
  assert(res.move?.san === 'Nf3', 'Premove resolves to SAN Nf3');
}

// -----------------------------------------------------------------------------
// 4. SCENARIO 2: PREMOVED PIECE CAPTURED BY OPPONENT
// -----------------------------------------------------------------------------
console.log('\n--- Suite 4: Scenario 2 - Opponent Captures Premoved Piece ---');

{
  // Board: White has knight on f3. Black has bishop on g4. Black to move.
  // White premoves Nf3 -> e5.
  // Black plays Bxg4xf3 capturing the knight on f3!
  const chess = new Chess('r2qkbnr/ppp1pppp/2n5/3p4/4P1b1/5N2/PPPP1PPP/RNBQKB1R b KQkq - 2 3');
  // Black captures knight on f3 with Bishop
  chess.move({ from: 'g4', to: 'f3' });
  // It is now White's turn. White's premove was f3 -> e5
  const premove: Premove = { from: 'f3', to: 'e5' };
  const res = validatePremoveInPosition(chess.fen(), premove);
  assert(res.valid === false, 'Premove from f3 is rejected because knight was captured');
}

// -----------------------------------------------------------------------------
// 5. SCENARIO 3: TARGET SQUARE BLOCKED BY OPPONENT MOVE
// -----------------------------------------------------------------------------
console.log('\n--- Suite 5: Scenario 3 - Destination Blocked by Opponent Move ---');

{
  // White has pawn on e4. Black to move.
  // White premoves e4 -> e5.
  // Black plays e7 -> e5, landing on e5!
  const chess = new Chess('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
  chess.move('e5');
  // It is now White's turn. White premoved e4 -> e5
  const premove: Premove = { from: 'e4', to: 'e5' };
  const res = validatePremoveInPosition(chess.fen(), premove);
  assert(res.valid === false, 'Pawn cannot move straight into occupied square e5');
}

// -----------------------------------------------------------------------------
// 6. SCENARIO 4: OPPONENT DELIVERS CHECK (FLANK MOVE PREMOVE CANCELLED)
// -----------------------------------------------------------------------------
console.log('\n--- Suite 6: Scenario 4 - Opponent Delivers Check (Illegal Move Cancelled) ---');

{
  // Position where White can deliver check
  // Black premoved a flank pawn move a7 -> a6
  const chess = new Chess('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2');
  // White plays Qh5 delivering pressure, or Bb5+ giving check
  chess.load('r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3');
  // Suppose White delivered check with Bxc6+
  const chessCheck = new Chess('rnb1kbnr/pppp1ppp/8/4p3/5PPq/8/PPPPP2P/RNBQKBNR w KQkq - 1 3');
  // White is in check from Qh4!
  // White premoved a2 -> a3 (flank move)
  const premove: Premove = { from: 'a2', to: 'a3' };
  const res = validatePremoveInPosition(chessCheck.fen(), premove);
  assert(res.valid === false, 'Flank move is rejected when King is in check');
}

// -----------------------------------------------------------------------------
// 7. SCENARIO 5: OPPONENT DELIVERS CHECK & PREMOVE IS LEGAL EVASION
// -----------------------------------------------------------------------------
console.log('\n--- Suite 7: Scenario 5 - Opponent Delivers Check & Premove is Legal Evasion ---');

{
  // 1. e4 e5 2. f4 exf4 3. Bc4 Qh4+
  // White is in check from Qh4. White pawn is on g2.
  // White premoved g2 -> g3 to block check!
  const chessCheck = new Chess();
  chessCheck.move('e4');
  chessCheck.move('e5');
  chessCheck.move('f4');
  chessCheck.move('exf4');
  chessCheck.move('Bc4');
  chessCheck.move('Qh4+');

  assert(chessCheck.inCheck(), 'Position is in check');
  assert(!chessCheck.isCheckmate(), 'Position is not checkmate');

  const premove: Premove = { from: 'g2', to: 'g3' };
  const res = validatePremoveInPosition(chessCheck.fen(), premove);
  assert(res.valid === true, 'Premove blocking check (g2 -> g3) executes legally!');
  assert(res.move?.san === 'g3', 'SAN matches g3 blocking check');
}

// -----------------------------------------------------------------------------
// 8. SCENARIO 6: PAWN PROMOTION PREMOVE
// -----------------------------------------------------------------------------
console.log('\n--- Suite 8: Scenario 6 - Pawn Promotion Premove ---');

{
  // White pawn on e7. Black to move.
  // Black plays a harmless move Kh8 -> h7.
  const chess = new Chess('7k/4P3/8/8/8/8/8/4K3 b - - 0 1');
  chess.move({ from: 'h8', to: 'g7' });
  // White premoved e7 -> e8 (auto-queen 'q')
  const premove: Premove = { from: 'e7', to: 'e8', promotion: 'q' };
  const res = validatePremoveInPosition(chess.fen(), premove);
  assert(res.valid === true, 'Pawn promotion premove is legal');
  assert(res.move?.promotion === 'q', 'Pawn promoted to Queen');
  assert(Boolean(res.move?.san?.includes('Q')), 'SAN contains Queen promotion indicator');
}

// -----------------------------------------------------------------------------
// 9. SCENARIO 7: CASTLING PREMOVE (LEGAL VS ILLEGAL)
// -----------------------------------------------------------------------------
console.log('\n--- Suite 9: Scenario 7 - Castling Premove ---');

{
  // Case A: Legal castling premove
  const chessA = new Chess('r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 1 5');
  const premoveA: Premove = { from: 'e1', to: 'g1' };
  const resA = validatePremoveInPosition(chessA.fen(), premoveA);
  assert(resA.valid === true, 'Kingside castling premove is legal');
  assert(resA.move?.san === 'O-O', 'Castling move SAN is O-O');

  // Case B: Castling through check (Bishop attacks f1)
  const chessB = new Chess('r1bqk2r/pppp1ppp/2n2n2/4p3/1b2P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 1 5');
  // Black bishop on b4 checks King on e1!
  const resB = validatePremoveInPosition(chessB.fen(), premoveA);
  assert(resB.valid === false, 'Castling while in check is rejected');

  // Case C: Rook on h1 was captured on opponent turn
  const chessC = new Chess('r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2b w Qkq - 0 6');
  // Bishop on h1 captured rook!
  const resC = validatePremoveInPosition(chessC.fen(), premoveA);
  assert(resC.valid === false, 'Castling rejected when rook was captured');
}

// -----------------------------------------------------------------------------
// 10. SCENARIO 8: EN-PASSANT PREMOVE
// -----------------------------------------------------------------------------
console.log('\n--- Suite 10: Scenario 8 - En-Passant Premove ---');

{
  // White pawn on e5. Black on move.
  // White anticipates d7 -> d5 and premoves e5 -> d6!
  // Case A: Black plays d7 -> d5 (en-passant becomes legal!)
  const chessA = new Chess('rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2');
  const premove: Premove = { from: 'e5', to: 'd6' };
  const resA = validatePremoveInPosition(chessA.fen(), premove);
  assert(resA.valid === true, 'En-passant premove executes when opponent plays 2-square push!');
  assert(Boolean(resA.move?.flags?.includes('e')), 'Move flag includes en-passant "e"');

  // Case B: Black plays Nf6 instead of d5 (d6 remains empty, no en-passant)
  const chessB = new Chess('rnbqkb1r/pppppppp/5n2/4P3/8/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2');
  const resB = validatePremoveInPosition(chessB.fen(), premove);
  assert(resB.valid === false, 'En-passant premove is cancelled when opponent plays non-pawn move');
}

// -----------------------------------------------------------------------------
// 11. SCENARIO 9: PINNED PIECE PREMOVE
// -----------------------------------------------------------------------------
console.log('\n--- Suite 11: Scenario 9 - Pinned Piece Premove ---');

{
  // White Queen on e2 pins Black Knight on e7 against Black King on e8.
  // Black premoved Ne7 -> d5.
  const chess = new Chess('r1bqk2r/ppppnppp/8/8/4Q3/8/PPPP1PPP/RNB1KB1R b KQkq - 0 6');
  const premove: Premove = { from: 'e7', to: 'd5' };
  const res = validatePremoveInPosition(chess.fen(), premove);
  assert(res.valid === false, 'Pinned piece premove exposing King to check is rejected');
}

// -----------------------------------------------------------------------------
// 12. SCENARIO 10: GAME OVER TERMINATION (CHECKMATE & STALEMATE)
// -----------------------------------------------------------------------------
console.log('\n--- Suite 12: Scenario 10 - Game Over Cancellation ---');

{
  // Scholar's mate position (Checkmate on the board)
  const mateFen = 'r1bqkb1r/pppp1Qpp/2n5/4p3/2B1n3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4';
  const premove: Premove = { from: 'e4', to: 'f2' };
  const res = validatePremoveInPosition(mateFen, premove);
  assert(res.valid === false, 'Premove rejected when board is in checkmate');
}

{
  // Stalemate position (Black King on a8, White King c7, Queen c6 stalemate)
  const stalemateFen = 'k7/2K5/8/8/8/8/8/8 b - - 0 1'; // King is trapped without check
  const premove: Premove = { from: 'a8', to: 'a7' };
  const res = validatePremoveInPosition(stalemateFen, premove);
  assert(res.valid === false, 'Premove rejected when board is in stalemate');
}

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n======================================================');
console.log(`TOTAL TESTS: ${totalTests}`);
console.log(`PASSED:      ${passedTests}`);
console.log(`FAILED:      ${failedTests}`);
console.log('======================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL PREMOVE ENGINE SCENARIOS PASSED WITH 100% ACCURACY!\n');
}
