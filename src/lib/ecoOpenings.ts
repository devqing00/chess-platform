import ecoOpeningsRaw from './ecoOpenings.json';

export interface EcoOpening {
  eco: string;
  name: string;
  moves: string;
  description?: string;
}

interface TrieNode {
  children: Map<string, TrieNode>;
  opening?: EcoOpening;
}

// Build root trie for lightning-fast O(plies) book detection and opening matching
let trieRoot: TrieNode | null = null;
const allOpenings: EcoOpening[] = ecoOpeningsRaw as EcoOpening[];

function normalizeMovesTokens(movesStr: string): string[] {
  return movesStr
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\$\d+/g, ' ')
    .replace(/[?!]+/g, '')
    .replace(/\d+\.{1,3}/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function getTrie(): TrieNode {
  if (trieRoot) return trieRoot;

  const root: TrieNode = { children: new Map() };

  for (const op of allOpenings) {
    const tokens = normalizeMovesTokens(op.moves);
    if (tokens.length === 0) continue;

    let curr = root;
    for (const token of tokens) {
      if (!curr.children.has(token)) {
        curr.children.set(token, { children: new Map() });
      }
      curr = curr.children.get(token)!;
    }
    // Deepest node gets assigned the opening
    curr.opening = op;
  }

  trieRoot = root;
  return trieRoot;
}

/**
 * Returns true if the played move prefix exists in any of the 3,865 standard ECO opening lines
 */
export function isEcoBookMove(sanMovesPrefix: string[]): boolean {
  if (!sanMovesPrefix || sanMovesPrefix.length === 0) return true;
  const root = getTrie();
  let curr = root;

  for (const move of sanMovesPrefix) {
    const next = curr.children.get(move);
    if (!next) return false;
    curr = next;
  }

  return true;
}

/**
 * Finds the most specific opening match for the given SAN moves
 */
export function matchEcoOpening(sanMoves: string[]): { eco: string; name: string; moves: string; description?: string } | null {
  if (!sanMoves || sanMoves.length === 0) return null;
  const root = getTrie();
  let curr = root;
  let bestMatch: EcoOpening | null = null;

  for (const move of sanMoves) {
    const next = curr.children.get(move);
    if (!next) break;
    curr = next;
    if (curr.opening) {
      bestMatch = curr.opening;
    }
  }

  return bestMatch;
}

/**
 * Search all openings by text query, ECO code, or move category (e.g. '1.e4', '1.d4')
 */
export function searchEcoOpenings(
  query: string = '',
  category: string = 'all',
  limit: number = 60,
  offset: number = 0
): { items: EcoOpening[]; total: number } {
  const q = query.trim().toLowerCase();

  const filtered = allOpenings.filter((op) => {
    // 1. Category filter
    if (category === '1.e4' && !op.moves.startsWith('1. e4')) return false;
    if (category === '1.d4' && !op.moves.startsWith('1. d4')) return false;
    if (category === '1.c4' && !op.moves.startsWith('1. c4')) return false;
    if (category === '1.Nf3' && !op.moves.startsWith('1. Nf3')) return false;
    if (category === 'gambit' && !op.name.toLowerCase().includes('gambit')) return false;

    // 2. Query filter
    if (q) {
      const matchName = op.name.toLowerCase().includes(q);
      const matchEco = op.eco.toLowerCase().includes(q);
      const matchMoves = op.moves.toLowerCase().includes(q);
      if (!matchName && !matchEco && !matchMoves) return false;
    }

    return true;
  });

  return {
    items: filtered.slice(offset, offset + limit),
    total: filtered.length,
  };
}

/**
 * Retrieve opening by exact ECO code or starting prefix
 */
export function getEcoOpening(eco: string): EcoOpening | undefined {
  const clean = eco.trim().toUpperCase();
  return allOpenings.find((op) => op.eco === clean);
}

export const ALL_ECO_OPENINGS = allOpenings;

