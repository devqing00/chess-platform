# Game Review Engine Spec

Classification, tactical motifs, refutation lines, key moments and structured commentary for the chess review platform (Next.js, TypeScript, chess.js, Stockfish).

## 0. Read this first: what is public and what is not

Chess.com publishes the shape of its system but not the fitted numbers.

**Published by Chess.com:** the Expected Points model (1.00 is a certain win, 0.00 a certain loss, 0.50 even, and it depends on the player's rating), the Expected Points Lost thresholds for Best through Blunder, and qualitative definitions of Brilliant, Great and Miss, including the fact that Brilliant and Great are more generous for lower-rated players.

**Not published:** the per-rating Expected Points curve, the CAPS2 accuracy formula, the exact Brilliant and Great rules, and the Game Rating mapping.

So this spec is built in three layers:

1. Thresholds in 1.2 are Chess.com's published numbers.
2. Win probability and accuracy in 1.1 and 1.3 use the Lichess formulas, which are open source and fitted on a large game set. They are the best public base.
3. Brilliant, Great, Miss and Book rules are reverse engineered. Every constant marked `TUNE` should be calibrated against Chess.com's own labels on a sample of real reviews. Treat anything I give as a starting value, not a fact about Chess.com.

## 1. Win probability and move classification

### 1.1 Centipawns to expected points

Use a logistic curve. With the Lichess constant:

```
E(cp) = 1 / (1 + exp(-k * cp)),   k = 0.00368208
```

This is the same as Lichess's `50 + 50 * (2 / (1 + exp(-0.00368208 * cp)) - 1)` in percent. Mate for the mover is E = 1, being mated is E = 0. Always compute from the mover's point of view.

Why it dampens extremes: the slope is `dE/dcp = k * E * (1 - E)`. At cp = 0 that is about 9.2 percentage points per 100 cp. At +800 it is about 1.7 points per 100 cp. The curve is roughly 5 times flatter when you are already winning, so big evals barely move.

Worked examples, mover's view:

| Eval change | E before | E after | Loss L | Label |
| --- | --- | --- | --- | --- |
| +9.0 to +7.0 | 0.965 | 0.929 | 0.035 | Good |
| +3.0 to +1.0 | 0.751 | 0.591 | 0.160 | Mistake |
| +0.5 to -1.5 | 0.546 | 0.365 | 0.181 | Mistake |
| +0.5 to -2.0 | 0.546 | 0.324 | 0.222 | Blunder |
| 0.0 to -1.0 | 0.500 | 0.409 | 0.091 | Inaccuracy |
| -5.0 to -7.0 | 0.137 | 0.071 | 0.066 | Inaccuracy |

Two corrections to the premise in the brief: +9 to +7 is not "almost 0", it costs 3.5 points under this curve (a Good move, never a blunder). And +0.5 to -1.5 is a Mistake at 0.18, not yet a Blunder. A blunder from +0.5 needs roughly -1.7 or worse.

**Rating conditioning.** Chess.com says the curve depends on rating, because lower-rated players convert and defend worse, so the same eval is worth less. Model it as `E(cp, R) = 1 / (1 + exp(-k(R) * cp))`. Fit `k(R)` yourself: take Lichess open database games that carry `%eval` annotations (CC0, database.lichess.org), bucket by average rating, and run logistic regression of score (win = 1, draw = 0.5, loss = 0) on cp for each bucket. Until you have it, use these **placeholder** values and do not ship them as final: k(800) = 0.0025, k(1500) = 0.0031, k(2300 and up) = 0.00368, linearly interpolated.

**Engine-native alternative.** Stockfish can print its own win/draw/loss model with `setoption name UCI_ShowWDL value true`. Then `E = (W + D/2) / 1000`. It is material and ply aware, but it is not rating conditioned, so it works as a cross-check rather than a replacement.

**What to measure.** For a move played by side S:

```
eBest   = E of the best line at fenBefore (S's view)
ePlayed = E of the position after the move (S's view)
L       = eBest - ePlayed     // expected points lost, clamp at 0
```

Both numbers come from searches at the same depth or node budget. See section 3 for how to reuse each search so you only run one per position.

### 1.2 The classification ladder

Chess.com's published Expected Points Lost bands:

| Label | Symbol | L lower | L upper |
| --- | --- | --- | --- |
| Best | star | 0.00 | 0.00 |
| Excellent | check | 0.00 | 0.02 |
| Good | check | 0.02 | 0.05 |
| Inaccuracy | ?! | 0.05 | 0.10 |
| Mistake | ? | 0.10 | 0.20 |
| Blunder | ?? | 0.20 | 1.00 |

Implementation notes: Best means the engine's top move, or any move within 0.002 of it, which absorbs search noise. Boundaries are inclusive on the upper side. Brilliant, Great, Miss and Book sit outside this ladder and override it.

**Precedence order:**

```ts
export type Label = 'forced'|'book'|'brilliant'|'great'|'best'|'excellent'
  |'good'|'miss'|'inaccuracy'|'mistake'|'blunder';

export function classify(i: ClassifyInput): Label {
  if (i.legalMoveCount === 1) return 'forced';          // do not grade
  if (i.inBook) return 'book';
  const L = Math.max(0, i.eBest - i.ePlayed);
  if (isBrilliant(i, L)) return 'brilliant';
  if (isGreat(i, L)) return 'great';
  if (L <= 0.002) return 'best';
  if (L <= 0.02) return 'excellent';
  if (L <= 0.05) return 'good';
  if (isMiss(i, L)) return 'miss';
  if (L <= 0.10) return 'inaccuracy';
  if (L <= 0.20) return 'mistake';
  return 'blunder';
}
```

**Rating tiers** (all `TUNE`, loosely modeled on the published statement that lower ratings get more generous rules):

| Param | under 1000 | 1000 to 1800 | over 1800 |
| --- | --- | --- | --- |
| brilMaxLoss (L) | 0.04 | 0.03 | 0.02 |
| brilFloor (E after, mover) | 0.40 | 0.45 | 0.48 |
| brilCeil (E before, mover) | 0.97 | 0.95 | 0.92 |
| minSac (material, pawn = 1) | 2 | 3 | 3 |
| greatGap (best minus second best) | 0.07 | 0.10 | 0.13 |

**Brilliant.** The move must be best or nearly best, contain a real offer of material, be sound, and not be a case where the position was already trivially won. Formal rule:

1. `L <= brilMaxLoss`.
2. `ePlayed >= brilFloor`, so the sacrifice does not leave the mover worse than about equal.
3. `eBefore <= brilCeil`, so a crushing position does not farm brilliants.
4. Not a promotion, and not a move out of check with at most two legal replies.
5. **Sacrifice test.** After the move, some opponent capture `c` has a nominal static exchange gain of at least `minSac` for the opponent (the offer is real), and the engine's evaluation after `c` is still at least `brilFloor` for the mover (the offer is sound). Both the accepted-sacrifice case (the capture is the opponent's best reply) and the declined case (the capture is bad for the opponent) qualify.

This is why 29.Ne7+ is Brilliant: the knight lands where a knight can take it for free by static exchange, but the engine says taking loses.

```ts
function isBrilliant(i: ClassifyInput, L: number): boolean {
  const p = tier(i.rating);
  if (L > p.brilMaxLoss) return false;
  if (i.ePlayed < p.brilFloor || i.eBefore > p.brilCeil) return false;
  if (i.move.promotion || (i.inCheckBefore && i.legalMoveCount <= 2)) return false;
  return i.offer !== null
    && i.offer.nominalGain >= p.minSac
    && i.offer.eAfterCapture >= p.brilFloor;   // mover's E if the opponent takes
}
```

`i.offer` is produced by the poisoned/sacrifice detector in 2.3.

**Great (`!`).** The only move that holds. Needs MultiPV of at least 2 at the position before the move:

```ts
function isGreat(i: ClassifyInput, L: number): boolean {
  const p = tier(i.rating);
  if (L > 0.02 || i.eSecond === undefined) return false;
  const gap = i.eBest - i.eSecond;                      // every alternative is at least this much worse
  const bandCross = i.eBest >= 0.80 && i.eSecond < 0.65 // keeps a win vs lets it slip
    || i.eBest >= 0.45 && i.eSecond < 0.30;             // holds a draw vs falls into a loss
  return (gap >= p.greatGap || bandCross)
    && !i.isObviousRecapture && i.eBest < 0.97;
}
```

`isObviousRecapture` is true when the move is the only capture on the square the opponent just captured on and SEE says it is plainly winning back material. Without this guard every forced recapture becomes Great.

**Book.** Use the open Lichess `chess-openings` data (CC0), keyed by EPD (FEN without move counters). Mark Book when the EPD after the move is in the table and every earlier move of that game was also in book. Book **wins over Best**, because theory is the authority in the opening, and a book move that is also the engine's top choice is still shown as Book. Once a non-book move is played, never return to Book for that game. Guard against database noise: if `L > 0.20` and ply > 12, drop the Book label.

**Miss.** Chess.com describes a miss as failing to take advantage of a tactical opportunity, find mate, or punish an opponent's bad move. Rule:

```ts
function isMiss(i: ClassifyInput, L: number): boolean {
  if (L < 0.10) return false;                              // a miss is at least mistake sized
  const opponentJustErred = (i.prev?.loss ?? 0) >= 0.10;   // their move gave us something
  const hadMate = i.bestIsMate && !i.playedIsMate;
  return hadMate || (opponentJustErred && i.bestIsTactical);
}
// bestIsTactical: engine's best move is a capture or check, or its PV wins >= 2 material within 4 plies.
```

If the conditions are not met the move stays a Mistake or Blunder. A miss is a Mistake or Blunder with a specific cause, so it is purely a relabel and does not change the ladder underneath.

### 1.3 Accuracy and performance rating

Chess.com's CAPS2 is not published. The Lichess formulas are open and make a good base. Per move, with win percent from 0 to 100 (that is `100 * E`):

```
moveAcc = 103.1668 * exp(-0.04354 * (winBefore - winAfter)) - 3.1669    // clamp to [0, 100]
```

Game accuracy is the mean of a volatility-weighted mean and a harmonic mean:

```ts
export function gameAccuracy(wins: number[], accs: number[]): number {
  // wins: win% of the player's POV before each of their moves (+ final); accs: moveAcc per move
  const n = accs.length;
  const w = Math.min(8, Math.max(2, Math.floor(n / 10)));
  const weights = accs.map((_, i) => {
    const win = wins.slice(i, i + w);
    const mean = win.reduce((a, b) => a + b, 0) / win.length;
    const sd = Math.sqrt(win.reduce((a, b) => a + (b - mean) ** 2, 0) / win.length);
    return Math.min(12, Math.max(0.5, sd));
  });
  const weighted = accs.reduce((a, x, i) => a + x * weights[i], 0) / weights.reduce((a, b) => a + b, 0);
  const harmonic = n / accs.reduce((a, x) => a + 1 / Math.max(x, 1e-6), 0);
  return (weighted + harmonic) / 2;
}
```

Because CAPS2 is unknown, run your function on 50 games where you can read Chess.com's displayed accuracy, and fit a one-dimensional correction (`a + b * accuracy`). Expect small offsets, not a different curve.

**Performance (game) rating.** No public formula exists. Do not use a closed-form ACPL guess. Calibrate instead: sample Lichess games across rating buckets, compute your accuracy for each side, and fit a monotone map from accuracy (and optionally game length and average eval volatility) to the player's actual rating, using isotonic or a smoothed piecewise-linear lookup. Report the estimate with an interval (for example plus or minus 150 for a 40-move game) and shrink toward the player's current rating for games under about 20 moves. Clamp the output to 100 to 3200.

## 2. Algorithmic detection of tactical motifs

**Design rule: output a list of motifs, not one label.** For 29.Ne7+ the detector should return a fork (king plus the d5 knight), a poisoned piece, an overloaded blocker and a zwischenzug, then rank them. The original "Knight Fork" tag was a true fact, just the least explanatory of the four. The fix is multi-label output plus ranking, not removing fork detection.

Engine data is passed in, so these functions stay cheap and testable. The shapes:

```ts
import { Chess, Color, Move, PieceSymbol, Square } from 'chess.js';

export interface EngLine { pv: string[]; cp?: number; mate?: number }  // UCI pv, side-to-move POV
export interface MoveCtx {
  fenBefore: string; fenAfter: string; move: Move;
  prevMove?: Move;                 // the opponent's previous move
  linesBefore: EngLine[];          // MultiPV at fenBefore
  linesAfter: EngLine[];           // MultiPV at fenAfter (opponent to move)
}
export interface Motif {
  id: 'fork'|'zwischenzug'|'poisoned'|'overload'|'deflection'|'desperado';
  confidence: number; squares: Square[]; note: string;
}
```

### 2.0 Primitives: SEE and the duty map

Static exchange evaluation, with x-rays handled by mutating a scratch board (chess.js `attackers()` then sees pieces uncovered by earlier captures). Never mutate the live instance, because `remove` and `put` can clear castling rights. Pins are ignored, which is fine for tagging, since the engine is the source of truth.

```ts
export const VAL: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const ORDER: PieceSymbol[] = ['p', 'n', 'b', 'r', 'q', 'k'];
export const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');

function lva(b: Chess, sq: Square, side: Color): Square | null {
  let best: Square | null = null, bi = 99;
  for (const s of b.attackers(sq, side)) {
    const i = ORDER.indexOf(b.get(s)!.type);
    if (i < bi) { bi = i; best = s; }
  }
  return best;
}

/** Material the side `by` nets by capturing on `sq` (swap algorithm). `removed` squares are cleared first. */
export function see(c: Chess, sq: Square, by: Color, removed: Square[] = []): number {
  const b = new Chess(c.fen());
  removed.forEach(r => b.remove(r));
  const target = b.get(sq);
  if (!target || target.color === by) return 0;
  const gains: number[] = [];
  let captured = VAL[target.type];
  let side = by;
  for (;;) {
    const from = lva(b, sq, side);
    if (!from) break;
    const piece = b.get(from)!;
    if (piece.type === 'k' && b.attackers(sq, other(side)).length) break; // king cannot capture into cover
    gains.push(captured - (gains.length ? gains[gains.length - 1] : 0));
    captured = VAL[piece.type];
    b.remove(from); b.remove(sq); b.put(piece, sq);
    side = other(side);
  }
  for (let i = gains.length - 1; i > 0; i--) gains[i - 1] = -Math.max(-gains[i - 1], gains[i]);
  return gains[0] ?? 0;
}
export const threat = (c: Chess, sq: Square, owner: Color, removed: Square[] = []) =>
  Math.max(0, see(c, sq, other(owner), removed));
```

**Duty map.** A piece's duties are the friendly pieces that would become capturable if it were removed. Computing the same quantity with the piece deleted handles both defending a piece and blocking a line to it, with no special cases.

```ts
export interface Duty { target: Square; kind: 'defend' | 'block'; swing: number }

export function duties(c: Chess, x: Square, minSwing = 2): Duty[] {
  const me = c.get(x)!.color, out: Duty[] = [];
  for (const row of c.board()) for (const t of row) {
    if (!t || t.color !== me || t.square === x || t.type === 'k') continue;
    const swing = threat(c, t.square, me, [x]) - threat(c, t.square, me);
    if (swing >= minSwing)
      out.push({ target: t.square, kind: c.attackers(t.square, me).includes(x) ? 'defend' : 'block', swing });
  }
  return out;
}
```

Example from the game: in the position after 29.Ne7+, Black's knight on d5 has one duty, `{ target: 'd8', kind: 'block', swing: 5 }`. It is not defending the rook, it is standing between Rd3 and Rd8. Removing it exposes an undefended rook.

### 2.1 Deflection and overload

A piece is overloaded when it holds two or more duties, or holds one duty while also being the only piece that can meet a demand the move just created (capture the checker, take the offered piece). A deflection is verified when the legal reply that meets the demand drags the piece off its duty and the duty target becomes capturable.

```ts
export function detectOverloadDeflection(ctx: MoveCtx): Motif[] {
  const after = new Chess(ctx.fenAfter);               // opponent to move
  const me = ctx.move.color;
  const replies = after.moves({ verbose: true });
  const capturers = replies.filter(m => m.to === ctx.move.to && m.captured);
  const out: Motif[] = [];
  for (const r of capturers) {
    const d = duties(after, r.from);
    if (!d.length) continue;
    const g = new Chess(ctx.fenAfter); g.move(r.san);
    const hanging = d.filter(x => see(g, x.target, me) >= 2);   // what falls once r leaves its post
    if (!hanging.length) continue;
    const sqs = [r.from, ...hanging.map(h => h.target)];
    out.push({ id: 'deflection', confidence: 0.8, squares: sqs,
      note: `${r.san} pulls the ${r.piece} off ${r.from}, exposing ${hanging.map(h => h.target).join(', ')}` });
    if (d.length >= 2 || capturers.length === 1)
      out.push({ id: 'overload', confidence: 0.85, squares: sqs,
        note: `the piece on ${r.from} cannot both answer the move and keep ${d[0].target} ${d[0].kind === 'block' ? 'shielded' : 'defended'}` });
  }
  return out;
}
```

On 29.Ne7+ this returns both `deflection` (Nxe7 exposes d8) and `overload` (the knight is the only piece that can capture on e7).

### 2.2 Zwischenzug

A zwischenzug is a forcing move inserted before the obvious pending capture, where the capture is still available afterwards. Four conditions:

1. The opponent's previous move was a capture, and a recapture on that square exists now.
2. The played move is not that recapture.
3. The played move is forcing: it gives check, or it threatens mate in one.
4. The engine's best line confirms the deferred capture: the mover's next or third ply lands on the same square.

```ts
export function threatensMate(fen: string): boolean {            // null-move test via FEN
  const p = fen.split(' '); p[1] = p[1] === 'w' ? 'b' : 'w'; p[3] = '-';
  try { return new Chess(p.join(' ')).moves().some(s => s.endsWith('#')); } catch { return false; }
}

export function detectZwischenzug(ctx: MoveCtx): Motif | null {
  const prev = ctx.prevMove; if (!prev?.captured || ctx.move.to === prev.to) return null;
  const before = new Chess(ctx.fenBefore);
  if (!before.moves({ verbose: true }).some(m => m.to === prev.to && m.captured)) return null;
  const forcing = /[+#]/.test(ctx.move.san) || threatensMate(ctx.fenAfter);
  if (!forcing) return null;
  const pv = ctx.linesAfter[0]?.pv ?? [];                  // reply, our next, their move, our third
  const deferred = [pv[1], pv[3]].find(u => u && u.slice(2, 4) === prev.to);
  if (!deferred) return null;
  return { id: 'zwischenzug', confidence: 0.8, squares: [prev.to, ctx.move.to],
    note: `${ctx.move.san} comes in before the capture on ${prev.to}, which is still there afterwards` };
}
```

Optional margin check: run one `searchmoves <directRecaptureUci>` search at fenBefore and require `E(played) - E(recapture) >= 0.03`. This separates a real intermezzo from a harmless check.

### 2.3 Poisoned pieces, sacrifices and desperados

**Poisoned offer.** The move leaves a piece that static exchange says the opponent wins, yet the engine says taking it is the worse choice. This also feeds `i.offer` for the Brilliant test.

```ts
export interface Offer { square: Square; nominalGain: number; eAfterCapture: number; eDecline: number; accepted: boolean }

export function detectOffer(ctx: MoveCtx, E: (l: EngLine) => number): { motif: Motif | null; offer: Offer | null } {
  const after = new Chess(ctx.fenAfter), me = ctx.move.color;
  let best: { sq: Square; gain: number } | null = null;
  for (const row of after.board()) for (const t of row) {   // every mover piece the opponent can win
    if (!t || t.color !== me || t.type === 'k') continue;
    const gain = see(after, t.square, other(me));
    if (gain >= 2 && (!best || gain > best.gain)) best = { sq: t.square, gain };
  }
  if (!best) return { motif: null, offer: null };
  const takes = (l: EngLine) => l.pv[0]?.slice(2, 4) === best!.sq;
  const acc = ctx.linesAfter.find(takes), dec = ctx.linesAfter.find(l => !takes(l));
  if (!acc || !dec) return { motif: null, offer: null };      // caller may run searchmoves for the missing side
  const eAcc = 1 - E(acc), eDec = 1 - E(dec);                  // E(...) is opponent POV, flip to mover
  const offer = { square: best.sq, nominalGain: best.gain, eAfterCapture: eAcc, eDecline: eDec,
                  accepted: ctx.linesAfter[0] === acc };
  const poisoned = !offer.accepted && eAcc - eDec >= 0.15;     // mover is 0.15 better off if taken
  return { offer,
    motif: poisoned ? { id: 'poisoned', confidence: Math.min(1, (eAcc - eDec) / 0.4), squares: [best.sq],
      note: `taking on ${best.sq} wins ${best.gain} on paper but costs the opponent ${(100 * (eAcc - eDec)).toFixed(0)} points` } : null };
}
```

**Desperado.** A piece that is lost anyway cashes in before it goes: it was already attackable with a static loss, and the move captures or checks without saving it.

```ts
export function detectDesperado(ctx: MoveCtx): Motif | null {
  const me = ctx.move.color;
  const before = new Chess(ctx.fenBefore), after = new Chess(ctx.fenAfter);
  if (see(before, ctx.move.from, other(me)) < 2) return null;     // it was not doomed
  if (!ctx.move.captured && !/[+#]/.test(ctx.move.san)) return null;
  if (see(after, ctx.move.to, other(me)) < 1) return null;         // it escaped, so not a desperado
  return { id: 'desperado', confidence: 0.7, squares: [ctx.move.from, ctx.move.to],
    note: 'the piece was lost anyway, so it takes or checks first' };
}
```

**Fork.** Count opponent pieces the moved piece attacks that were not already winnable before the move:

```ts
export function detectFork(ctx: MoveCtx): Motif | null {
  const before = new Chess(ctx.fenBefore), after = new Chess(ctx.fenAfter), me = ctx.move.color;
  const hit: Square[] = [];
  for (const row of after.board()) for (const t of row) {
    if (!t || t.color === me || !after.attackers(t.square, me).includes(ctx.move.to)) continue;
    const king = t.type === 'k';
    const gained = Math.max(0, see(after, t.square, me)) > Math.max(0, see(before, t.square, me));
    if (king || gained) hit.push(t.square);
  }
  return hit.length >= 2 ? { id: 'fork', confidence: 0.9, squares: [ctx.move.to, ...hit],
    note: `the piece on ${ctx.move.to} hits ${hit.join(' and ')}` } : null;
}
```

On 29.Ne7+ the targets are g8 (check) and d5 (static exchange rises from 0 to +5), so the fork is correct. It just is not the reason the move is brilliant.

**Ranking** for the headline in the commentary:

```ts
const RANK = ['poisoned', 'overload', 'deflection', 'zwischenzug', 'desperado', 'fork'] as const;
export const primary = (m: Motif[]) =>
  [...m].sort((a, b) => RANK.indexOf(a.id) - RANK.indexOf(b.id) || b.confidence - a.confidence)[0];
```

The rule behind the order: the tag that explains why the opponent's best reply fails is more informative than the tag that merely describes the geometry.

## 3. If accepted vs if declined: refutation lines

**Core idea: you almost never need extra searches.** The MultiPV search you already run to grade the next move is the refutation search for this one. Position `P_i` (after ply `i`) is analyzed once with MultiPV 4 or 5. Its lines serve two jobs:

- As "after" for move `i`: each line starts with an opponent reply, then continues with the mover's best answer. That is a ready-made 2-ply branch.
- As "before" for move `i+1`: the top line is the best move, the second line gives the gap used for Great.

So a game of N plies costs N+1 searches, not N times the number of branches.

**Tiered budget to keep it fast.** Run every position at a cheap budget first (for example depth 12 or about 100k nodes, MultiPV 3). Flag positions where the swing is at least 0.08, where `detectOffer` found an offered piece, or where a label would be Brilliant, Great or Miss. Re-search only the flagged positions and their neighbors at the deep budget (depth 20 or about 2M nodes, MultiPV 5). Typically 10 to 20 percent of positions. Cache every result by `FEN + budget` in IndexedDB so transpositions and re-opened reviews are free.

### 3.1 Choosing the two branches

1. **Define the offer.** If `detectOffer` returned a square, that is the target. Otherwise use `move.to`. A quiet sacrifice with no capture available has no acceptance branch, so skip to step 5.
2. **Acceptance move.** The first line in `linesAfter` whose first move is a legal capture on the target square. If several pieces can capture, MultiPV already ranks them, so take the highest ranked.
3. **Not in the top K?** If no line captures on the target, run one extra search at fenAfter with `go searchmoves <capture1> <capture2> ... nodes 300000`. The best result becomes the accepted branch. This is the only common extra search.
4. **Declining move.** The first line in `linesAfter` that is not an acceptance. That is the opponent's best defense.
5. **Quiet sacrifices.** Use the top line and the highest line whose first move differs by piece type or destination (skip moves that only transpose).
6. **Order.** If the acceptance is not the engine's top reply (the poisoned case), show **accepted first** because it is the temptation, then declined. If the acceptance is the top reply (a real sacrifice), show accepted as the main line and show declined only when it is within 0.10 of it.

### 3.2 Formatting a branch

Rules that keep lines readable for a human:

- Always start with the opponent's reply, with the correct move-number form (`29...Nxe7`, then `30.Rxd8+`).
- Minimum 2 plies (reply plus the mover's answer). Extend while the last shown move is a capture or check, up to 4 plies, so an exchange resolves instead of stopping mid-trade.
- Always end on the mover's move, never on a hanging capture.
- Stop at mate and show it in full if it is within 3 moves.
- Add one short payoff phrase from the material change along the shown line.

```ts
export interface Branch {
  kind: 'accepted' | 'declined';
  replySan: string; lineSan: string;
  moverE: number;                 // expected points for the mover after this branch
  material: string;               // "wins a rook for a knight"
  mateIn?: number;
}

export function sanLine(fen: string, uci: string[], maxPlies = 4) {
  const c = new Chess(fen);
  let num = Number(fen.split(' ')[5]);
  const parts: string[] = [], moves: Move[] = [];
  for (let i = 0; i < Math.min(uci.length, maxPlies); i++) {
    const u = uci[i];
    const mv = c.move({ from: u.slice(0, 2) as Square, to: u.slice(2, 4) as Square, promotion: u[4] });
    moves.push(mv);
    parts.push(mv.color === 'w' ? `${num}.${mv.san}` : i === 0 ? `${num}...${mv.san}` : mv.san);
    if (mv.color === 'b') num++;
  }
  return { text: parts.join(' '), moves };
}

function trimPv(fen: string, pv: string[]): string[] {
  const { moves } = sanLine(fen, pv, 6);
  let keep = Math.min(2, moves.length);
  while (keep < 4 && keep < moves.length && (moves[keep - 1].captured || /[+#]/.test(moves[keep - 1].san))) keep++;
  if (keep % 2 === 1 && keep < moves.length) keep++;     // end on the mover's move
  return pv.slice(0, keep);
}

const NAME: Record<PieceSymbol, string> = { p: 'a pawn', n: 'a knight', b: 'a bishop', r: 'a rook', q: 'the queen', k: 'the king' };
export function materialNote(moves: Move[], mover: Color): string {
  const won: PieceSymbol[] = [], lost: PieceSymbol[] = [];
  for (const m of moves) if (m.captured) (m.color === mover ? won : lost).push(m.captured);
  for (const t of [...won]) { const j = lost.indexOf(t); if (j >= 0) { lost.splice(j, 1); won.splice(won.indexOf(t), 1); } }
  const val = (a: PieceSymbol[]) => a.reduce((s, p) => s + VAL[p], 0);
  const list = (a: PieceSymbol[]) => a.map(p => NAME[p]).join(' and ');
  if (!won.length && !lost.length) return '';
  if (!lost.length) return `wins ${list(won)}`;
  if (!won.length) return `gives up ${list(lost)}`;
  return val(won) >= val(lost) ? `wins ${list(won)} for ${list(lost)}` : `gives up ${list(lost)} for ${list(won)}`;
}

export function buildRefutations(ctx: MoveCtx, offer: Offer | null, E: (l: EngLine) => number) {
  const after = new Chess(ctx.fenAfter);
  const target = offer?.square ?? ctx.move.to;
  const legal = after.moves({ verbose: true });
  const isAccept = (l: EngLine) => {
    const u = l.pv[0]; if (!u || u.slice(2, 4) !== target) return false;
    return !!legal.find(m => m.from + m.to === u.slice(0, 4))?.captured;
  };
  const toBranch = (l: EngLine, kind: Branch['kind']): Branch => {
    const { text, moves } = sanLine(ctx.fenAfter, trimPv(ctx.fenAfter, l.pv));
    return { kind, replySan: moves[0].san, lineSan: text, moverE: 1 - E(l),
             material: materialNote(moves, ctx.move.color), mateIn: l.mate };
  };
  const acc = ctx.linesAfter.find(isAccept), dec = ctx.linesAfter.find(l => !isAccept(l));
  const needSearchMoves = !acc ? legal.filter(m => m.to === target && m.captured).map(m => m.from + m.to) : [];
  return {
    accepted: acc && toBranch(acc, 'accepted'),
    declined: dec && toBranch(dec, 'declined'),
    needSearchMoves,                       // non-empty: run `go searchmoves ...` and call again
    acceptIsBest: !!acc && ctx.linesAfter[0] === acc,
  };
}
```

For 29.Ne7+ this yields `accepted: 29...Nxe7 30.Rxd8+ Kf7` with the note "wins a rook for a knight", and `declined: 29...Kf8 30.Nxd5` with "wins a knight", and `acceptIsBest = false`, which is exactly what makes it poisoned.

## 4. Key moments (turning points)

No public algorithm exists for Chess.com's key moves. This one uses the signals that make a move matter to a human reader.

**Per-ply features** (all from White's expected points `E`, so swings have a consistent sign):

| Signal | Weight | Meaning |
| --- | --- | --- |
| swing = abs(E after minus E before) | 1.0 | raw size of the change |
| Brilliant / Great | +0.20 / +0.10 | the moments readers want to see |
| Miss | +0.10 | a chance that was available and was not taken |
| Missed mate | +0.15 | the clearest missed chance |
| Lead change | +0.15 | eval crosses from one side's advantage to the other (hysteresis at 0.42 and 0.58) |
| Decisive ply | +0.20 | first ply of the final streak in which one side stays above 0.85 |
| Played by the reviewed user | +0.03 | tie breaker |

Penalties: Book moves score 0. If both E before and E after are outside \[0.03, 0.97\] and no mate was missed, multiply by 0.2, because after the game is decided nothing is a turning point.

**How many.** `k = clamp(round(plies / 20), 4, 8)`, which is one moment per 10 full moves. An 80-ply game gets 4 and a 160-ply game gets 8.

**Selection.** Pin the must-haves first, then fill by score with a minimum spacing of 3 plies:

1. Pinned: the user's biggest swing against them, the user's biggest swing in their favor, every Brilliant by the user, the decisive ply, any missed mate by the user.
2. Fill the remaining slots by descending score, minimum score 0.12 (`TUNE`, drop to 0.08 if fewer than 3 qualify).
3. Spacing: a candidate within 3 plies of a chosen one is merged into it by extending the chosen moment's span. This combines an opponent blunder with the immediate miss or punishment into one moment instead of two.
4. Balance: split the game into thirds. If a third has no moment and the pool has one at 0.8 times the threshold or more, replace the lowest unpinned moment with it.
5. Output in chronological order.

```ts
export interface PlyRow {
  ply: number; san: string; color: Color; isUser: boolean; label: Label;
  eBeforeW: number; eAfterW: number;           // White POV expected points
  inBook: boolean; missedMate?: boolean;
}
export interface KeyMoment {
  ply: number; span: [number, number]; score: number;
  kind: 'brilliancy' | 'blunder' | 'missed_win' | 'turning_point' | 'decisive';
}

const lead = (e: number) => (e > 0.58 ? 1 : e < 0.42 ? -1 : 0);

function decisivePly(rows: PlyRow[]): number | null {
  const last = rows[rows.length - 1].eAfterW;
  const side = last >= 0.85 ? 1 : last <= 0.15 ? -1 : 0;
  if (!side) return null;
  let i = rows.length - 1;
  while (i >= 0 && (side === 1 ? rows[i].eAfterW >= 0.85 : rows[i].eAfterW <= 0.15)) i--;
  return i + 1 < rows.length ? rows[i + 1].ply : null;
}

export function selectKeyMoments(rows: PlyRow[], minScore = 0.12): KeyMoment[] {
  const k = Math.min(8, Math.max(4, Math.round(rows.length / 20)));
  const dec = decisivePly(rows);
  let lastLead = 0;
  const scored = rows.map(r => {
    const l = lead(r.eAfterW);
    const leadChange = l !== 0 && lastLead !== 0 && l !== lastLead;
    if (l !== 0) lastLead = l;
    const decided = (r.eBeforeW > 0.97 || r.eBeforeW < 0.03) && (r.eAfterW > 0.97 || r.eAfterW < 0.03);
    let s = Math.abs(r.eAfterW - r.eBeforeW)
      + (r.label === 'brilliant' ? 0.2 : r.label === 'great' ? 0.1 : 0)
      + (r.label === 'miss' ? 0.1 : 0) + (r.missedMate ? 0.15 : 0)
      + (leadChange ? 0.15 : 0) + (r.ply === dec ? 0.2 : 0) + (r.isUser ? 0.03 : 0);
    if (r.inBook) s = 0; else if (decided && !r.missedMate) s *= 0.2;
    return { r, s };
  });

  const user = scored.filter(x => x.r.isUser);
  const signed = (x: typeof user[number]) => (x.r.eAfterW - x.r.eBeforeW) * (x.r.color === 'w' ? 1 : -1);
  const pins = [
    user.reduce((a, b) => (signed(b) < signed(a) ? b : a), user[0]),          // worst for the user
    user.reduce((a, b) => (signed(b) > signed(a) ? b : a), user[0]),          // best for the user
    ...scored.filter(x => x.r.isUser && (x.r.label === 'brilliant' || x.r.missedMate)),
    ...scored.filter(x => x.r.ply === dec),
  ].filter(x => x && x.s > 0);
  const pool = scored.filter(x => x.s >= minScore).sort((a, b) => b.s - a.s);

  const chosen: { x: typeof scored[number]; span: [number, number] }[] = [];
  for (const x of [...pins, ...pool]) {
    const near = chosen.find(c => Math.abs(c.x.r.ply - x.r.ply) < 3);
    if (near) { near.span = [Math.min(near.span[0], x.r.ply), Math.max(near.span[1], x.r.ply)]; continue; }
    if (chosen.length < k) chosen.push({ x, span: [x.r.ply, x.r.ply] });
  }
  return chosen.sort((a, b) => a.x.r.ply - b.x.r.ply).map(({ x, span }) => ({
    ply: x.r.ply, span, score: +x.s.toFixed(3),
    kind: x.r.label === 'brilliant' ? 'brilliancy' : x.r.label === 'blunder' ? 'blunder'
        : x.r.label === 'miss' || x.r.missedMate ? 'missed_win' : x.r.ply === dec ? 'decisive' : 'turning_point',
  }));
}
```

The thirds balance step (item 4) is omitted from the code to keep it readable. It is a post-pass over `chosen` using `ply / rows.length` to bucket moments.

## 5. Structured commentary pipeline

**Principle: the engine and detectors produce facts, the template or a language model only turns facts into sentences.** Never let a language model invent moves or squares. Every move and square in the output must come from the input facts, and a validator enforces it.

### 5.1 Input and output schema

```ts
export interface CommentaryInput {
  schemaVersion: 1;
  ply: number; isUserMove: boolean; userRating?: number;
  fenBefore: string; fenAfter: string; moveSan: string; moveUci: string;
  label: Label;
  eval: { beforeCp: number | null; afterCp: number | null; beforeE: number; afterE: number; lossE: number; mate?: number };
  topPv: { san: string; cp: number | null }[];            // best 1 to 3 engine lines at fenBefore, SAN
  motifs: Motif[];                                         // from section 2, ranked, primary first
  refutations: { accepted?: Branch; declined?: Branch; acceptIsBest?: boolean };
  context: {
    pendingCapture?: { square: Square; byColor: Color };   // zwischenzug context
    pressure: { square: Square; piece: string; attackers: number; defenders: number }[];
    obviousMove?: { san: string; moverE: number };         // the naive move and what it would have done
  };
}

export interface CommentaryOutput {
  schemaVersion: 1;
  headline: string;                    // "Ne7+ is brilliant: a poisoned knight"
  tags: string[];                      // motif ids
  parts: {
    positionContext: string;
    moveExecution: string;
    consequences: { accepted?: string; declined?: string; summary: string };
    takeaway: string;
  };
  board: { arrows: { from: Square; to: Square; kind: 'move' | 'threat' | 'refute' }[]; highlights: Square[] };
  factsUsed: string[];                 // SAN and squares the text relies on, for the validator
}
```

### 5.2 Rule-based renderer

Start with this. It never hallucinates, and it is the fallback whenever the language model output fails validation.

```ts
const TAKEAWAY: Record<Motif['id'], string> = {
  poisoned:    'When a piece looks free, count what the capture gives up elsewhere before you take it.',
  overload:    'Find the defender doing two jobs, then hand it a third.',
  deflection:  'Ask what each defender is guarding, then force one of them to move.',
  zwischenzug: 'Before you recapture, look for a check that improves the position first.',
  desperado:   'If a piece is lost anyway, make it take something on the way out.',
  fork:        'Look for the square where one piece attacks two loose targets at once.',
};

export function renderCommentary(i: CommentaryInput): CommentaryOutput {
  const m = primary(i.motifs);
  const who = i.isUserMove ? 'You' : 'The opponent';
  const ctx = i.context;
  const press = ctx.pressure[0];
  const positionContext = [
    ctx.pendingCapture ? `A capture on ${ctx.pendingCapture.square} has just happened and can be answered.` : '',
    press ? `The ${press.piece} on ${press.square} is attacked ${press.attackers} time(s) and defended ${press.defenders}.` : '',
    ctx.obviousMove ? `The natural ${ctx.obviousMove.san} would leave the mover on about ${Math.round(ctx.obviousMove.moverE * 100)}%.` : '',
  ].filter(Boolean).join(' ');

  const moveExecution = `${who} played ${i.moveSan}. ${m ? m.note + '.' : ''}`.trim();

  const a = i.refutations.accepted, d = i.refutations.declined;
  const consequences = {
    accepted: a && `If ${a.replySan} is played, the line runs ${a.lineSan}${a.material ? ', and the mover ' + a.material : ''}.`,
    declined: d && `If the opponent declines with ${d.replySan}, ${d.lineSan}${d.material ? ' and the mover ' + d.material : ''}.`,
    summary: i.refutations.acceptIsBest === false ? 'Every reply loses material, so the apparent gift is poisoned.' : 'The line is playable for the opponent but costs them the initiative.',
  };

  return {
    schemaVersion: 1,
    headline: `${i.moveSan} is ${i.label}${m ? ': ' + m.id : ''}`,
    tags: i.motifs.map(x => x.id),
    parts: { positionContext, moveExecution, consequences, takeaway: m ? TAKEAWAY[m.id] : 'Check what each of your pieces is protecting before you move it.' },
    board: { arrows: [], highlights: m?.squares ?? [] },
    factsUsed: [i.moveSan, ...(a ? [a.lineSan] : []), ...(d ? [d.lineSan] : [])],
  };
}
```

Vary the voice by label and by who moved: praise for Brilliant and Great on the user's move, a corrective tone for Mistake, Blunder and Miss, and neutral for the opponent's moves. Keep the facts identical, change only the framing sentence.

### 5.3 Optional language model polish, with a validator

Send the structured input and ask for the same output schema in JSON. Prompt template:

```
You write a four-part review of ONE chess move for a player reviewing their game.
Use ONLY the facts in INPUT. Never name a move, square or piece that does not appear in INPUT.
Parts, in order:
1. positionContext: what the position looked like before the move (pressure, pending capture).
2. moveExecution: what the move concretely does. Lead with the primary motif.
3. consequences: accepted and declined lines, using the SAN lines exactly as given.
4. takeaway: one transferable principle, one sentence, no move numbers.
Style: plain, direct, no filler, no em dashes, no exclamation marks, under 70 words per part.
If the label is brilliant or great, say why the move is hard to find. If it is a mistake,
blunder or miss, say what the better idea was using INPUT.topPv.
Return JSON matching OUTPUT_SCHEMA and nothing else.
```

Validator that rejects invented moves and squares, then falls back to `renderCommentary`:

```ts
const SAN = /\b(O-O(?:-O)?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?)\b/g;

export function validate(out: CommentaryOutput, i: CommentaryInput): boolean {
  const text = JSON.stringify(out.parts);
  const allowedMoves = new Set<string>([
    i.moveSan, ...i.topPv.map(p => p.san),
    ...[i.refutations.accepted, i.refutations.declined].flatMap(b => b ? b.lineSan.match(SAN) ?? [] : []),
  ].map(s => s.replace(/[+#]/g, '')));
  const allowedSquares = new Set<string>([...allowedMoves].flatMap(s => s.match(/[a-h][1-8]/g) ?? [])
    .concat(i.context.pressure.map(p => p.square), i.motifs.flatMap(m => m.squares)));
  const moves = (text.match(SAN) ?? []).filter(s => /[a-h][1-8]|O-O/.test(s)).map(s => s.replace(/[+#]/g, ''));
  return moves.every(s => allowedMoves.has(s) || allowedSquares.has(s));
}
```

Also reject output containing an em dash, more than 70 words in a part, or a number that is not derivable from the input (percentages must equal `round(100 * E)`).

### 5.4 Worked example: 29.Ne7+

Only `afterCp = 455` comes from the review screenshot. The before value and branch evals below are placeholders to show the shape. The FENs are reconstructed from the board.

```json
{
  "schemaVersion": 1,
  "ply": 57,
  "isUserMove": true,
  "fenBefore": "3r2k1/p5pp/8/3n1N2/8/3R4/Pr3PPP/R6K w - - 0 29",
  "fenAfter":  "3r2k1/p3N1pp/8/3n4/8/3R4/Pr3PPP/R6K b - - 1 29",
  "moveSan": "Ne7+", "moveUci": "f5e7", "label": "brilliant",
  "eval": { "beforeCp": 300, "afterCp": 455, "beforeE": 0.751, "afterE": 0.842, "lossE": 0.0 },
  "topPv": [{ "san": "Ne7+", "cp": 455 }],
  "motifs": [
    { "id": "poisoned",    "confidence": 0.9,  "squares": ["e7"],       "note": "taking on e7 wins 3 on paper but costs the opponent about 25 points" },
    { "id": "overload",    "confidence": 0.85, "squares": ["d5", "d8"], "note": "the knight on d5 cannot both capture on e7 and keep d8 shielded" },
    { "id": "deflection",  "confidence": 0.8,  "squares": ["d5", "d8"], "note": "Nxe7 pulls the knight off the d-file" },
    { "id": "zwischenzug", "confidence": 0.8,  "squares": ["d5", "e7"], "note": "Ne7+ comes in before the capture on d5, which is still there afterwards" },
    { "id": "fork",        "confidence": 0.9,  "squares": ["e7", "g8", "d5"], "note": "the piece on e7 hits g8 and d5" }
  ],
  "refutations": {
    "acceptIsBest": false,
    "accepted": { "kind": "accepted", "replySan": "Nxe7", "lineSan": "29...Nxe7 30.Rxd8+ Kf7", "moverE": 0.80, "material": "wins a rook for a knight" },
    "declined": { "kind": "declined", "replySan": "Kf8",  "lineSan": "29...Kf8 30.Nxd5",       "moverE": 0.84, "material": "wins a knight" }
  },
  "context": {
    "pendingCapture": { "square": "d5", "byColor": "b" },
    "pressure": [{ "square": "d5", "piece": "knight", "attackers": 1, "defenders": 1 }],
    "obviousMove": { "san": "Rxd5", "moverE": 0.45 }
  }
}
```

Target output for that input:

```json
{
  "headline": "Ne7+ is brilliant: a poisoned knight",
  "tags": ["poisoned", "overload", "deflection", "zwischenzug", "fork"],
  "parts": {
    "positionContext": "Black has just taken on d5. That knight is attacked by your rook on d3 and defended only by the rook on d8. The natural Rxd5 runs into ...Rxd5 and leaves you down the exchange.",
    "moveExecution": "Ne7+ checks the king and adds a second attacker to d5 in the same move. It also looks like a free knight, because the knight on d5 can take it.",
    "consequences": {
      "accepted": "If 29...Nxe7, the d-file opens: 30.Rxd8+ Kf7 and you have won a rook for a knight.",
      "declined": "If the king steps aside, 29...Kf8 30.Nxd5 wins the knight, and ...Rxd5 Rxd5 would cost Black a rook for a knight.",
      "summary": "Every reply loses material, so the apparent gift is poisoned."
    },
    "takeaway": "When a piece is defended only once, look for a check that adds an attacker. The defender can then either take the checker or hold its post, and not both."
  },
  "board": {
    "arrows": [{ "from": "f5", "to": "e7", "kind": "move" }, { "from": "d3", "to": "d5", "kind": "threat" }, { "from": "d3", "to": "d8", "kind": "refute" }],
    "highlights": ["e7", "d5", "d8"]
  }
}
```

## 6. Build order and tests

1. Win probability, thresholds and `classify` without Brilliant, Great or Miss. Unit test against the table in 1.1.
2. Batch analysis with the shared MultiPV per position and the tiered budget. Verify N+1 searches per game.
3. SEE, duty map and the six motif detectors. Test each with a FEN fixture. 29.Ne7+ above is a good first fixture and should return poisoned, overload, deflection, zwischenzug and fork.
4. Brilliant, Great and Miss, then calibrate every `TUNE` value on 100 or more positions where you can read Chess.com's own label.
5. Refutation builder, key moments and the renderer.
6. Language model polish behind the validator, with the rule-based text as the fallback.

Two metrics worth tracking from the start: agreement with Chess.com labels per class (Brilliant and Great precision matters most, because over-calling them is the most visible error), and the share of positions that needed a deep re-search, which tells you whether the tiered budget is set right.
