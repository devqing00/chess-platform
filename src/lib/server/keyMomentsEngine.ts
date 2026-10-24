import { KeyMoment, MoveClassification, PieceColor } from '@/types/chess';

export interface PlyRow {
  ply: number;
  moveNumber: number;
  san: string;
  color: PieceColor;
  isUser: boolean;
  label: MoveClassification;
  eBeforeW: number;
  eAfterW: number;
  evalBefore: number;
  evalAfter: number;
  bestMoveSan: string;
  coachComment: string;
  inBook: boolean;
  missedMate?: boolean;
}

const lead = (e: number) => (e > 0.58 ? 1 : e < 0.42 ? -1 : 0);

function decisivePly(rows: PlyRow[]): number | null {
  if (rows.length === 0) return null;
  const last = rows[rows.length - 1].eAfterW;
  const side = last >= 0.85 ? 1 : last <= 0.15 ? -1 : 0;
  if (!side) return null;
  let i = rows.length - 1;
  while (i >= 0 && (side === 1 ? rows[i].eAfterW >= 0.85 : rows[i].eAfterW <= 0.15)) i--;
  return i + 1 < rows.length ? rows[i + 1].ply : null;
}

/**
 * Key Moments (Turning Points) Selector
 * Based on Section 4 of Game Review Engine Spec:
 * Uses consistent White POV Expected Points (E), swings, Brilliants,
 * lead changes, missed mates, and decisive plies to extract the 4 to 8 critical moments.
 */
export function selectKeyMoments(rows: PlyRow[], minScore = 0.12): KeyMoment[] {
  if (rows.length === 0) return [];

  const k = Math.min(8, Math.max(4, Math.round(rows.length / 20)));
  const dec = decisivePly(rows);
  let lastLead = 0;

  const scored = rows.map((r) => {
    const l = lead(r.eAfterW);
    const leadChange = l !== 0 && lastLead !== 0 && l !== lastLead;
    if (l !== 0) lastLead = l;
    const decided =
      (r.eBeforeW > 0.97 || r.eBeforeW < 0.03) && (r.eAfterW > 0.97 || r.eAfterW < 0.03);
    let s =
      Math.abs(r.eAfterW - r.eBeforeW) +
      (r.label === 'brilliant' ? 0.2 : r.label === 'great' ? 0.1 : 0) +
      (r.label === 'miss' ? 0.1 : 0) +
      (r.missedMate ? 0.15 : 0) +
      (leadChange ? 0.15 : 0) +
      (r.ply === dec ? 0.2 : 0) +
      (r.isUser ? 0.03 : 0);

    if (r.inBook) {
      s = 0;
    } else if (decided && !r.missedMate) {
      s *= 0.2;
    }

    return { r, s, leadChange };
  });

  const user = scored.filter((x) => x.r.isUser);
  const signed = (x: (typeof user)[number]) =>
    (x.r.eAfterW - x.r.eBeforeW) * (x.r.color === 'w' ? 1 : -1);

  const pins: (typeof scored)[number][] = [];
  if (user.length > 0) {
    const worstForUser = user.reduce((a, b) => (signed(b) < signed(a) ? b : a), user[0]);
    const bestForUser = user.reduce((a, b) => (signed(b) > signed(a) ? b : a), user[0]);
    if (worstForUser) pins.push(worstForUser);
    if (bestForUser && bestForUser !== worstForUser) pins.push(bestForUser);
  }

  scored
    .filter((x) => x.r.isUser && (x.r.label === 'brilliant' || x.r.missedMate))
    .forEach((x) => {
      if (!pins.includes(x)) pins.push(x);
    });

  if (dec !== null) {
    const decRow = scored.find((x) => x.r.ply === dec);
    if (decRow && !pins.includes(decRow)) pins.push(decRow);
  }

  const validPins = pins.filter((x) => x && x.s > 0);
  const pool = scored.filter((x) => x.s >= minScore).sort((a, b) => b.s - a.s);

  const chosen: { x: (typeof scored)[number]; span: [number, number] }[] = [];
  for (const x of [...validPins, ...pool]) {
    const near = chosen.find((c) => Math.abs(c.x.r.ply - x.r.ply) < 3);
    if (near) {
      near.span = [Math.min(near.span[0], x.r.ply), Math.max(near.span[1], x.r.ply)];
      continue;
    }
    if (chosen.length < k && !chosen.some((c) => c.x.r.ply === x.r.ply)) {
      chosen.push({ x, span: [x.r.ply, x.r.ply] });
    }
  }

  // Fallback: If pool had fewer than 3 moments, pick top 4 from all scored non-book moves
  if (chosen.length < 3) {
    const fallbackPool = scored.filter((x) => !x.r.inBook).sort((a, b) => b.s - a.s);
    for (const x of fallbackPool) {
      if (chosen.length >= k) break;
      if (!chosen.some((c) => Math.abs(c.x.r.ply - x.r.ply) < 2)) {
        chosen.push({ x, span: [x.r.ply, x.r.ply] });
      }
    }
  }

  // Chronological sort
  return chosen
    .sort((a, b) => a.x.r.ply - b.x.r.ply)
    .map(({ x, span }) => {
      const kind: KeyMoment['kind'] =
        x.r.label === 'brilliant'
          ? 'brilliancy'
          : x.r.label === 'blunder'
          ? 'blunder'
          : x.r.label === 'miss' || x.r.missedMate
          ? 'missed_win'
          : x.r.ply === dec
          ? 'decisive'
          : 'turning_point';

      let description = '';
      if (kind === 'brilliancy') description = 'Spectacular tactical piece sacrifice';
      else if (kind === 'blunder') description = 'Critical mistake that swung the game';
      else if (kind === 'missed_win') description = 'Overlooked winning tactical knockout';
      else if (kind === 'decisive') description = 'The decisive breakthrough of the game';
      else description = 'Crucial turning point in evaluation';

      return {
        moveIndex: x.r.ply,
        turnNumber: x.r.moveNumber,
        turnColor: x.r.color,
        moveSan: x.r.san,
        bestMoveSan: x.r.bestMoveSan,
        classification: x.r.label,
        evalBefore: x.r.evalBefore,
        evalAfter: x.r.evalAfter,
        coachComment: x.r.coachComment,
        isMistake: ['inaccuracy', 'mistake', 'blunder', 'miss'].includes(x.r.label),
        kind,
        score: +x.s.toFixed(3),
        span,
        description,
      };
    });
}
