import { Chess } from 'chess.js';
import { GameReviewReport, ParsedPgn } from '@/types/chess';

/**
 * Parses arbitrary PGN strings into structured metadata and SAN moves
 */
export function parsePgn(pgnText: string): ParsedPgn {
  const headers: Record<string, string> = {};
  const headerRegex = /\[(\w+)\s+"([^"]*)"\]/g;
  let match;

  while ((match = headerRegex.exec(pgnText)) !== null) {
    headers[match[1]] = match[2];
  }

  // Remove headers
  const moveText = pgnText.replace(/\[[^\]]*\]/g, ' ');

  // Remove bracketed comments { ... }
  const cleanComments = moveText.replace(/\{[^}]*\}/g, ' ');

  // Remove variations ( ... )
  const cleanVariations = cleanComments.replace(/\([^)]*\)/g, ' ');

  // Remove NAGs ($1, $2, etc.)
  const cleanNags = cleanVariations.replace(/\$\d+/g, ' ');

  // Extract result
  let result = headers.Result || '*';
  const resultMatch = cleanNags.match(/(1-0|0-1|1\/2-1\/2|\*)\s*$/);
  if (resultMatch) {
    result = resultMatch[1];
  }

  // Remove result from moves text
  const rawMoves = cleanNags.replace(/(1-0|0-1|1\/2-1\/2|\*)/g, ' ');

  // Remove move numbers like '1.', '1...', '2.', etc.
  const tokenized = rawMoves
    .replace(/\d+\.{1,3}/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  // Validate moves with chess.js
  const runner = new Chess();
  const validMoves: string[] = [];

  for (const move of tokenized) {
    try {
      const res = runner.move(move);
      if (res) {
        validMoves.push(res.san);
      } else {
        break;
      }
    } catch {
      break;
    }
  }

  return {
    headers,
    moves: validMoves,
    result,
    white: headers.White || 'White Player',
    black: headers.Black || 'Black Player',
    date: headers.Date || new Date().toISOString().split('T')[0],
    eco: headers.ECO,
    opening: headers.Opening,
  };
}

/**
 * Generates an annotated tournament PGN with CAPS metrics and engine comments
 */
export function exportAnnotatedPgn(report: GameReviewReport): string {
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '.');
  const result =
    report.summaryComment.toLowerCase().includes('white dominated')
      ? '1-0'
      : report.summaryComment.toLowerCase().includes('black outplayed')
      ? '0-1'
      : '1/2-1/2';

  const headers = [
    `[Event "Chess Platform Engine Analysis"]`,
    `[Site "Chess Platform Online"]`,
    `[Date "${dateStr}"]`,
    `[Round "1"]`,
    `[White "${report.whitePlayer.name}"]`,
    `[Black "${report.blackPlayer.name}"]`,
    `[Result "${result}"]`,
    `[WhiteElo "${report.whitePlayer.rating}"]`,
    `[BlackElo "${report.blackPlayer.rating}"]`,
    `[WhiteAccuracy "${report.whiteAccuracy}"]`,
    `[BlackAccuracy "${report.blackAccuracy}"]`,
    report.whiteEstimatedElo ? `[WhiteEstimatedElo "${report.whiteEstimatedElo}"]` : null,
    report.blackEstimatedElo ? `[BlackEstimatedElo "${report.blackEstimatedElo}"]` : null,
    report.whiteAcpl !== undefined ? `[WhiteACPL "${report.whiteAcpl}"]` : null,
    report.blackAcpl !== undefined ? `[BlackACPL "${report.blackAcpl}"]` : null,
    `[Annotator "Stockfish & Coach Danny"]`,
  ]
    .filter(Boolean)
    .join('\n');

  const movesText: string[] = [];

  report.moves.forEach((m, idx) => {
    const isWhite = idx % 2 === 0;
    const moveNumber = Math.floor(idx / 2) + 1;
    const prefix = isWhite ? `${moveNumber}. ` : '';

    // NAG conversion
    let nag = '';
    switch (m.classification) {
      case 'brilliant': nag = ' $3'; break;
      case 'great': nag = ' $1'; break;
      case 'inaccuracy': nag = ' $6'; break;
      case 'mistake': nag = ' $2'; break;
      case 'blunder': nag = ' $4'; break;
      case 'miss': nag = ' $2'; break;
    }

    const evalPawn = (m.evalAfter / 100).toFixed(2);
    const evalComment = `{ [%eval ${m.evalAfter >= 0 ? '+' : ''}${evalPawn}] }`;
    const coachComment = m.coachComment ? ` { ${m.coachComment} }` : '';

    movesText.push(`${prefix}${m.san}${nag} ${evalComment}${coachComment}`);
  });

  return `${headers}\n\n${movesText.join(' ')} ${result}\n`;
}
