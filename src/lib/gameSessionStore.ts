import {
  GameSession,
  GameReviewReport,
  MoveRecord,
  GamePlayer,
  ClassificationTallies,
  EvalTimelinePoint,
  KeyMoment,
  ChessVariant,
  GameResultDetails,
} from '@/types/chess';
import { Chess } from 'chess.js';
import { ChessEvaluator } from './chessEngine';
import { CHESS_BOTS } from './botsData';
import { calculateGameAdvancedStats } from './advancedStatsCalculator';
import { FirestoreService } from './firebase/firestoreService';

/**
 * Robustly parses a PGN string into a complete array of MoveRecord objects
 */
export function parsePgnToMoveRecords(pgn: string): MoveRecord[] {
  if (!pgn || typeof pgn !== 'string') return [];
  try {
    // 1. Sanitize PGN comments and variations
    const cleaned = pgn
      .replace(/\{[^}]*\}/g, ' ') // Strip { [%clk ...] } or inline commentary
      .replace(/\([^)]*\)/g, ' ') // Strip recursive variations (1... c5)
      .replace(/\$\d+/g, ' ')     // Strip NAGs ($1, $2, etc.)
      .replace(/[?!]+/g, '')      // Strip move annotations (??, !!, !?, ?!)
      .trim();

    const c = new Chess();
    let movesList: any[] = [];

    try {
      c.loadPgn(cleaned);
      movesList = c.history({ verbose: true });
    } catch {
      movesList = [];
    }

    // 2. Fallback: If loadPgn failed, extract move tokens directly
    if (!movesList || movesList.length === 0) {
      try {
        const fallbackChess = new Chess();
        const moveTokens: string[] = [];
        const tokenRegex = /(?:\d+\.+|\d+\.\.\.)\s*([a-zA-Z0-9+#=\-_]+)(?:\s+([a-zA-Z0-9+#=\-_]+))?/g;
        let match;
        while ((match = tokenRegex.exec(cleaned)) !== null) {
          if (
            match[1] &&
            !match[1].includes('/') &&
            !match[1].includes('-') &&
            match[1] !== '1-0' &&
            match[1] !== '0-1'
          ) {
            moveTokens.push(match[1]);
          }
          if (
            match[2] &&
            !match[2].includes('/') &&
            !match[2].includes('-') &&
            match[2] !== '1-0' &&
            match[2] !== '0-1'
          ) {
            moveTokens.push(match[2]);
          }
        }

        for (const token of moveTokens) {
          const move = fallbackChess.move(token);
          if (!move) break;
        }
        movesList = fallbackChess.history({ verbose: true });
      } catch {
        movesList = [];
      }
    }

    if (!movesList || movesList.length === 0) return [];

    const runner = new Chess();
    const records: MoveRecord[] = [];

    for (let i = 0; i < movesList.length; i++) {
      const m = movesList[i];
      const fenBefore = runner.fen();
      let res;
      try {
        res = runner.move({ from: m.from, to: m.to, promotion: m.promotion });
      } catch {
        res = runner.move(m.san);
      }
      const fenAfter = runner.fen();

      records.push({
        san: m.san,
        from: (m.from || 'a1') as any,
        to: (m.to || 'a1') as any,
        captured: (m.captured || undefined) as any,
        promotion: (m.promotion || undefined) as any,
        fenBefore,
        fenAfter,
        evalBefore: 0,
        evalAfter: 0,
        classification: i < 8 ? 'book' : 'good',
        coachComment: '',
        isCheck: runner.inCheck(),
      });
    }

    return records;
  } catch (err) {
    console.warn('Could not parse PGN to MoveRecords:', err);
    return [];
  }
}

/**
 * Safely counts the number of full moves (or plies / 2) from a PGN string
 */
export function countMovesInPgn(pgn: string): number {
  if (!pgn || typeof pgn !== 'string') return 0;
  try {
    const c = new Chess();
    c.loadPgn(pgn);
    const history = c.history();
    if (history.length > 0) {
      return Math.ceil(history.length / 2);
    }
  } catch {
    // fallback regex matching
  }
  const moveMatches = pgn.match(/\b\d+\.\s+([^\s]+)/g);
  return moveMatches ? moveMatches.length : 0;
}

/**
 * Accurately determines if the current user played White in this session
 */
export function isSessionUserWhite(session: GameSession, currentUsername?: string): boolean {
  const user = (currentUsername || '').toLowerCase().trim();

  // 1. Authoritative check: PGN headers if available
  if (session.pgn && user) {
    const wMatch = session.pgn.match(/\[White\s+"([^"]+)"\]/i);
    const bMatch = session.pgn.match(/\[Black\s+"([^"]+)"\]/i);
    const pgnW = (wMatch ? wMatch[1] : '').toLowerCase().trim();
    const pgnB = (bMatch ? bMatch[1] : '').toLowerCase().trim();
    if (pgnW === user || (pgnW && user && (pgnW.includes(user) || user.includes(pgnW)))) return true;
    if (pgnB === user || (pgnB && user && (pgnB.includes(user) || user.includes(pgnB)))) return false;
  }

  // 2. Check player IDs assigned during session generation
  if (session.whitePlayer?.id === 'user-local' || session.whitePlayer?.id === 'player-1') return true;
  if (session.blackPlayer?.id === 'user-local' || session.blackPlayer?.id === 'player-1') return false;

  // 3. Check player names against current username
  const wName = (session.whitePlayer?.name || '').toLowerCase().trim();
  const bName = (session.blackPlayer?.name || '').toLowerCase().trim();

  if (wName === 'you' || wName.includes('you')) return true;
  if (bName === 'you' || bName.includes('you')) return false;

  if (user) {
    if (wName === user || wName.includes(user)) return true;
    if (bName === user || bName.includes(user)) return false;
  }

  return true;
}

/**
 * Accurately returns 'win' | 'loss' | 'draw' for the current user in a session
 * Authoritative ground truth: PGN [Result "..."], then gameResult, then resultDetails.
 */
export function getSessionUserOutcome(session: GameSession, currentUsername?: string): 'win' | 'loss' | 'draw' {
  const isWhite = isSessionUserWhite(session, currentUsername);

  // 1. Authoritative Ground Truth: PGN header Result tag
  if (session.pgn) {
    const match = session.pgn.match(/\[Result\s+"([^"]+)"\]/i);
    if (match) {
      const pgnRes = match[1].trim();
      if (pgnRes === '1/2-1/2' || pgnRes === '1/2' || pgnRes === '0.5-0.5') return 'draw';
      if (pgnRes === '1-0') return isWhite ? 'win' : 'loss';
      if (pgnRes === '0-1') return isWhite ? 'loss' : 'win';
    }
  }

  // 2. Authoritative: session.gameResult string
  const res = (session.gameResult || '').trim();
  if (res.includes('1/2') || res.includes('0.5') || res.toLowerCase().includes('draw')) return 'draw';
  if (res === '1-0' || res.startsWith('1-0') || res.endsWith('1-0')) return isWhite ? 'win' : 'loss';
  if (res === '0-1' || res.startsWith('0-1') || res.endsWith('0-1')) return isWhite ? 'loss' : 'win';

  // 3. Fallback: explicit winner in resultDetails
  if (session.resultDetails?.winner) {
    if (session.resultDetails.winner === 'draw') return 'draw';
    return session.resultDetails.winner === (isWhite ? 'w' : 'b') ? 'win' : 'loss';
  }

  return 'loss';
}

const STORAGE_KEY = 'chess_platform_sessions_v1';

// Initial demonstration finished game for instant testing of Game Review
const DEMO_FINISHED_GAME_ID = 'demo-game-masterpiece';

function createEmptyTallies(): ClassificationTallies {
  return {
    brilliant: 0,
    great: 0,
    best: 0,
    excellent: 0,
    good: 0,
    book: 0,
    inaccuracy: 0,
    mistake: 0,
    miss: 0,
    blunder: 0,
  };
}

/**
 * Computes a full GameReviewReport from move history
 */
export function generateGameReviewReport(
  gameId: string,
  whitePlayer: GamePlayer,
  blackPlayer: GamePlayer,
  moves: MoveRecord[],
  skipReanalysis: boolean = false
): GameReviewReport {
  // Deeply analyze game history with engine evaluator unless pre-calculated or explicitly skipped
  let analyzedMoves: MoveRecord[] = [];
  if (skipReanalysis) {
    analyzedMoves = moves;
  } else if (moves.length > 0) {
    analyzedMoves = ChessEvaluator.analyzeGameHistory(moves);
  } else {
    analyzedMoves = [];
  }

  const whiteLosses: number[] = [];
  const blackLosses: number[] = [];
  const whiteTallies = createEmptyTallies();
  const blackTallies = createEmptyTallies();
  const evalTimeline: EvalTimelinePoint[] = [];
  const keyMoments: KeyMoment[] = [];

  let blunderPuzzle: GameReviewReport['blunderRetryPuzzle'] | undefined = undefined;

  analyzedMoves.forEach((m, idx) => {
    const isWhite = idx % 2 === 0;
    const moveNumber = Math.floor(idx / 2) + 1;

    const winProbLoss = m.winProbLoss !== undefined
      ? m.winProbLoss
      : Math.max(0, (isWhite ? ChessEvaluator.centipawnsToWinProbability(m.evalBefore) : 100 - ChessEvaluator.centipawnsToWinProbability(m.evalBefore)) -
                    (isWhite ? ChessEvaluator.centipawnsToWinProbability(m.evalAfter) : 100 - ChessEvaluator.centipawnsToWinProbability(m.evalAfter)));

    if (isWhite) {
      whiteLosses.push(winProbLoss);
      if (m.classification && m.classification in whiteTallies) {
        whiteTallies[m.classification as keyof ClassificationTallies]++;
      }
    } else {
      blackLosses.push(winProbLoss);
      if (m.classification && m.classification in blackTallies) {
        blackTallies[m.classification as keyof ClassificationTallies]++;
      }
    }

    evalTimeline.push({
      ply: idx,
      moveNumber,
      isWhite,
      score: m.evalAfter,
      classification: m.classification,
    });

    if (
      m.classification === 'brilliant' ||
      m.classification === 'great' ||
      m.classification === 'blunder' ||
      m.classification === 'mistake' ||
      m.classification === 'miss'
    ) {
      keyMoments.push({
        moveIndex: idx,
        turnNumber: moveNumber,
        turnColor: isWhite ? 'w' : 'b',
        moveSan: m.san,
        bestMoveSan: m.bestMoveSan || m.san,
        classification: m.classification,
        evalBefore: m.evalBefore,
        evalAfter: m.evalAfter,
        coachComment: m.coachComment || '',
        isMistake: m.classification === 'blunder' || m.classification === 'mistake',
      });
    }

    // Set first critical blunder/mistake for interactive retry puzzle
    if (!blunderPuzzle && (m.classification === 'blunder' || m.classification === 'mistake') && m.bestMoveSan) {
      blunderPuzzle = {
        ply: idx,
        fen: m.fenBefore,
        blunderedMoveSan: m.san,
        solutionSan: m.bestMoveSan,
        explanation: m.coachComment || `Instead of ${m.san}, ${m.bestMoveSan} was Stockfish's top recommendation.`,
      };
    }
  });

  const whiteAccuracy = ChessEvaluator.calculateCapsAccuracy(whiteLosses);
  const blackAccuracy = ChessEvaluator.calculateCapsAccuracy(blackLosses);

  // Check game outcome for authentic coach summary
  const lastMove = analyzedMoves[analyzedMoves.length - 1];
  const isCheckmateLast = Boolean(lastMove?.san?.includes('#'));
  const whiteWonByMate = isCheckmateLast && analyzedMoves.length % 2 === 1;
  const blackWonByMate = isCheckmateLast && analyzedMoves.length % 2 === 0;

  let summaryComment: string;
  if (whiteWonByMate) {
    summaryComment = `White won decisively by checkmate with ${whiteAccuracy}% accuracy! Clinical tactical execution.`;
  } else if (blackWonByMate) {
    summaryComment = `Black won decisively by checkmate with ${blackAccuracy}% accuracy! Decisive finish.`;
  } else if (whiteAccuracy > blackAccuracy) {
    summaryComment = `White outplayed Black with ${whiteAccuracy}% accuracy (vs ${blackAccuracy}%), controlling key imbalances!`;
  } else {
    summaryComment = `Competitive match (${whiteAccuracy}% vs ${blackAccuracy}%). Review the key tactical moments to explore sharper continuations!`;
  }

  const report: GameReviewReport = {
    id: `review-${gameId}`,
    gameId,
    whitePlayer,
    blackPlayer,
    whiteAccuracy,
    blackAccuracy,
    blunderRetryPuzzle: blunderPuzzle,
    tallies: {
      white: whiteTallies,
      black: blackTallies,
    },
    evalTimeline,
    keyMoments,
    moves: analyzedMoves,
    summaryComment,
  };

  report.advancedStats = calculateGameAdvancedStats(report);

  return report;
}

export class GameSessionStore {
  private static cachedSessions: Record<string, GameSession> | null = null;
  private static cachedRecentList: GameSession[] | null = null;

  private static getStoredSessions(): Record<string, GameSession> {
    if (this.cachedSessions) return this.cachedSessions;
    if (typeof window === 'undefined') return {};
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      this.cachedSessions = data ? JSON.parse(data) : {};
      return this.cachedSessions || {};
    } catch {
      return {};
    }
  }

  private static saveSessions(sessions: Record<string, GameSession>) {
    this.cachedSessions = sessions;
    this.cachedRecentList = null;
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch {
      // Storage full or unavailable
    }
  }

  public static saveSessionsBatch(newSessions: GameSession[]) {
    if (!newSessions || newSessions.length === 0) return;
    const sessions = this.getStoredSessions();
    for (const s of newSessions) {
      if (s && s.id) {
        sessions[s.id] = s;
      }
    }
    this.saveSessions(sessions);
  }

  public static getSession(id: string): GameSession | null {
    if (!id) return null;
    const sessions = this.getStoredSessions();

    // 1. Direct key match
    let session =
      sessions[id] ||
      sessions[`chesscom-${id}`] ||
      (id.startsWith('chesscom-') ? sessions[id.replace('chesscom-', '')] : null);

    // 2. Partial or numeric match across stored sessions
    if (!session) {
      const rawDigits = id.replace(/\D/g, '');
      const matchedKey = Object.keys(sessions).find((k) => {
        if (k === id || k.includes(id) || id.includes(k)) return true;
        if (rawDigits && rawDigits.length >= 6 && k.includes(rawDigits)) return true;
        return false;
      });
      if (matchedKey) session = sessions[matchedKey];
    }

    // If session found but has no moves and has a PGN, parse on the fly
    if (session) {
      if ((!session.moves || session.moves.length === 0) && session.pgn) {
        session.moves = parsePgnToMoveRecords(session.pgn);
        session.movesCount = Math.ceil(session.moves.length / 2);
        this.saveSession(session);
      }
      return session;
    }

    // 3. Try finding in imported Chess.com games from localStorage
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('chess_com_imported_games');
        if (raw) {
          const imported: any[] = JSON.parse(raw);
          const rawDigits = id.replace(/\D/g, '');
          const found = imported.find((g) => {
            if (!g) return false;
            if (g.id === id || id === g.id) return true;
            if (g.id && (id.includes(g.id) || g.id.includes(id))) return true;
            if (g.externalUrl && (id.includes(g.externalUrl) || g.externalUrl.includes(id))) return true;
            if (g.url && (id.includes(g.url) || g.url.includes(id))) return true;
            if (rawDigits && rawDigits.length >= 6) {
              if (g.id && g.id.includes(rawDigits)) return true;
              if (g.externalUrl && g.externalUrl.includes(rawDigits)) return true;
              if (g.url && g.url.includes(rawDigits)) return true;
            }
            return false;
          });

          if (found) {
            const parsedMoves = found.pgn ? parsePgnToMoveRecords(found.pgn) : [];
            const restored: GameSession = {
              id: found.id || id,
              source: 'chesscom',
              whitePlayer: {
                id: found.isUserWhite ? 'user-local' : 'opp',
                name: found.isUserWhite ? (found.userPlayer?.username || 'You') : (found.opponent?.username || 'Opponent'),
                rating: found.isUserWhite ? found.userPlayer?.rating : found.opponent?.rating,
                avatar: found.isUserWhite ? found.userPlayer?.avatar : found.opponent?.avatar,
                country: found.isUserWhite ? found.userPlayer?.country : found.opponent?.country,
              },
              blackPlayer: {
                id: !found.isUserWhite ? 'user-local' : 'opp',
                name: !found.isUserWhite ? (found.userPlayer?.username || 'You') : (found.opponent?.username || 'Opponent'),
                rating: !found.isUserWhite ? found.userPlayer?.rating : found.opponent?.rating,
                avatar: !found.isUserWhite ? found.userPlayer?.avatar : found.opponent?.avatar,
                country: !found.isUserWhite ? found.userPlayer?.country : found.opponent?.country,
              },
              timeControl: parseInt(found.timeControl) || 600,
              variant: 'standard',
              moves: parsedMoves,
              movesCount: parsedMoves.length > 0 ? Math.ceil(parsedMoves.length / 2) : (found.movesCount || 0),
              pgn: found.pgn || '',
              fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
              isGameOver: true,
              gameResult:
                found.userResult === 'win'
                  ? (found.isUserWhite ? '1-0' : '0-1')
                  : found.userResult === 'loss'
                  ? (found.isUserWhite ? '0-1' : '1-0')
                  : '1/2-1/2',
              resultDetails: {
                winner:
                  found.userResult === 'win'
                    ? (found.isUserWhite ? 'w' : 'b')
                    : found.userResult === 'loss'
                    ? (found.isUserWhite ? 'b' : 'w')
                    : 'draw',
                reason: found.userPlayer?.result === 'win' ? 'checkmate' : 'resignation',
                ratingDelta: found.userResult === 'win' ? 8 : found.userResult === 'loss' ? -8 : 0,
                newRating: found.userPlayer?.rating || 1200,
                league: 'Elite',
                trophiesDelta: found.userResult === 'win' ? 10 : 0,
              },
              reviewReport: null,
              createdAt: found.playedAt ? new Date(found.playedAt).getTime() : Date.now(),
              updatedAt: Date.now(),
            };
            this.saveSession(restored);
            return restored;
          }
        }
      } catch (err) {
        console.warn('Error retrieving session from imported cache:', err);
      }
    }

    // Return demo game if specifically requested
    if (id === DEMO_FINISHED_GAME_ID) {
      return this.createDemoGameSession();
    }
    return null;
  }

  public static async getSessionAsync(id: string): Promise<GameSession | null> {
    const local = this.getSession(id);
    if (local && local.moves && local.moves.length > 0) return local;

    // Fallback to Firestore cloud database
    try {
      const remote = await FirestoreService.getGameSession(id);
      if (remote) {
        this.saveSession(remote);
        return remote;
      }
    } catch {}

    return local;
  }

  public static saveSession(session: GameSession): void {
    const sessions = this.getStoredSessions();
    sessions[session.id] = { ...session, updatedAt: Date.now() };
    this.saveSessions(sessions);

    // Sync to Firestore database asynchronously
    if (typeof window !== 'undefined') {
      try {
        FirestoreService.saveGameSession(session).catch(() => {});
      } catch {}
    }
  }

  public static createSession(
    whitePlayer: GamePlayer,
    blackPlayer: GamePlayer,
    timeControl: number,
    variant: ChessVariant = 'standard',
    startingFen?: string,
    incrementSeconds: number = 0
  ): GameSession {
    const id = `game-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const session: GameSession = {
      id,
      whitePlayer,
      blackPlayer,
      timeControl,
      incrementSeconds,
      variant,
      moves: [],
      fen: startingFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      isGameOver: false,
      gameResult: null,
      resultDetails: null,
      reviewReport: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.saveSession(session);
    return session;
  }

  public static completeGame(
    id: string,
    moves: MoveRecord[],
    gameResult: string,
    resultDetails: GameResultDetails
  ): GameReviewReport {
    let session = this.getSession(id);
    if (!session) {
      const defaultWhite: GamePlayer = { id: 'p1', name: 'You', rating: 1250, avatar: '🧑‍💻' };
      const defaultBlack: GamePlayer = { id: 'p2', name: 'Martin (Bot)', rating: 250, avatar: '🤖', isBot: true };
      session = this.createSession(defaultWhite, defaultBlack, 600);
    }

    // Do not run synchronous heavy multi-ply minimax analysis on the main UI thread during game-over!
    // Full engine evaluation is done asynchronously and lazily when the user visits Game Review.
    const report = generateGameReviewReport(id, session.whitePlayer, session.blackPlayer, moves, true);

    session.moves = moves;
    session.isGameOver = true;
    session.gameResult = gameResult;
    session.resultDetails = resultDetails;
    session.reviewReport = report;
    session.updatedAt = Date.now();

    this.saveSession(session);
    return report;
  }

  public static updateSessionMoves(id: string, moves: MoveRecord[]): void {
    const session = this.getSession(id);
    if (session) {
      session.moves = moves;
      session.updatedAt = Date.now();
      this.saveSession(session);
    }
  }

  public static listRecentSessions(): GameSession[] {
    if (this.cachedRecentList && this.cachedRecentList.length > 0) {
      return this.cachedRecentList;
    }

    const sessionsMap = this.getStoredSessions();
    const sessions = Object.values(sessionsMap);

    // Merge in any imported Chess.com games from localStorage with gentle batching
    let hasHealed = false;
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('chess_com_imported_games');
        if (raw) {
          const imported: any[] = JSON.parse(raw);
          imported.forEach((g) => {
            const expectedResult =
              g.gameResult ||
              (g.userResult === 'win'
                ? g.isUserWhite
                  ? '1-0'
                  : '0-1'
                : g.userResult === 'loss'
                ? g.isUserWhite
                  ? '0-1'
                  : '1-0'
                : '1/2-1/2');

            const expectedWinner: 'w' | 'b' | 'draw' =
              expectedResult === '1-0'
                ? 'w'
                : expectedResult === '0-1'
                ? 'b'
                : 'draw';

            const approximateMoveCount =
              g.movesCount ||
              (g.moves && g.moves.length > 0
                ? Math.ceil(g.moves.length / 2)
                : g.pgn
                ? Math.ceil((g.pgn.match(/\b\d+\./g)?.length || 10))
                : 15);

            if (sessionsMap[g.id]) {
              const existing = sessionsMap[g.id];
              let modified = false;

              if (!existing.movesCount || existing.movesCount === 0) {
                existing.movesCount = approximateMoveCount;
                modified = true;
              }
              if (g.pgn && !existing.pgn) {
                existing.pgn = g.pgn;
                modified = true;
              }
              if (existing.gameResult !== expectedResult) {
                existing.gameResult = expectedResult;
                modified = true;
              }
              if (modified) {
                sessionsMap[g.id] = existing;
                hasHealed = true;
              }
            } else {
              const importedSession: GameSession = {
                id: g.id,
                source: 'chesscom',
                whitePlayer: {
                  id: g.isUserWhite ? 'user-local' : 'opp',
                  name: g.isUserWhite ? g.userPlayer?.username || 'You' : g.opponent?.username || 'Opponent',
                  rating: g.isUserWhite ? g.userPlayer?.rating : g.opponent?.rating,
                  avatar: g.isUserWhite ? g.userPlayer?.avatar : g.opponent?.avatar,
                  country: g.isUserWhite ? g.userPlayer?.country : g.opponent?.country,
                },
                blackPlayer: {
                  id: !g.isUserWhite ? 'user-local' : 'opp',
                  name: !g.isUserWhite ? g.userPlayer?.username || 'You' : g.opponent?.username || 'Opponent',
                  rating: !g.isUserWhite ? g.userPlayer?.rating : g.opponent?.rating,
                  avatar: !g.isUserWhite ? g.userPlayer?.avatar : g.opponent?.avatar,
                  country: !g.isUserWhite ? g.userPlayer?.country : g.opponent?.country,
                },
                timeControl: parseInt(g.timeControl) || 600,
                variant: 'standard',
                moves: g.moves || [],
                movesCount: approximateMoveCount,
                pgn: g.pgn || '',
                fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
                isGameOver: true,
                gameResult: expectedResult,
                resultDetails: {
                  winner: expectedWinner,
                  reason: g.userPlayer?.result === 'win' ? 'checkmate' : 'resignation',
                  ratingDelta: g.userResult === 'win' ? 8 : g.userResult === 'loss' ? -8 : 0,
                  newRating: g.userPlayer?.rating || 1200,
                  league: 'Elite',
                  trophiesDelta: g.userResult === 'win' ? 10 : 0,
                },
                reviewReport: null,
                createdAt: g.playedAt ? new Date(g.playedAt).getTime() : g.timestamp || Date.now(),
                updatedAt: Date.now(),
              };
              sessionsMap[g.id] = importedSession;
              sessions.push(importedSession);
              hasHealed = true;
            }
          });
        }
      } catch (err) {
        console.warn('Error reading imported games for listRecentSessions:', err);
      }
    }

    if (hasHealed) {
      this.saveSessions(sessionsMap);
    }

    if (sessions.length === 0) {
      const demo = this.createDemoGameSession();
      this.cachedRecentList = [demo];
      return [demo];
    }

    const sorted = sessions.sort((a, b) => {
      const timeB = b.createdAt || b.updatedAt || 0;
      const timeA = a.createdAt || a.updatedAt || 0;
      return timeB - timeA;
    });

    this.cachedRecentList = sorted;
    return sorted;
  }

  /**
   * Demo Game that matches Screenshot 1, 2, 3, 4, 5 with Brilliant moves and checkmate
   */
  public static createDemoGameSession(): GameSession {
    const whitePlayer: GamePlayer = {
      id: 'lmnk_06',
      name: 'lmnk_06',
      rating: 1996,
      avatar: '🧑‍💻',
      country: 'CH',
    };

    const blackPlayer: GamePlayer = {
      id: 'arkadon',
      name: 'arkadon...',
      rating: 1725,
      avatar: '♟️',
      country: 'ES',
    };

    // Pre-calculated moves sequence featuring brilliant moves matching Image 2 & 5
    const demoMoves: MoveRecord[] = [
      { san: 'e4', from: 'e2', to: 'e4', fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', evalBefore: 20, evalAfter: 25, classification: 'book' },
      { san: 'd5', from: 'd7', to: 'd5', fenBefore: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', fenAfter: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', evalBefore: -25, evalAfter: -20, classification: 'book' },
      { san: 'exd5', from: 'e4', to: 'd5', captured: 'p', fenBefore: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', fenAfter: 'rnbqkbnr/ppp1pppp/8/3P4/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2', evalBefore: 20, evalAfter: 35, classification: 'best' },
      { san: 'Qxd5', from: 'd8', to: 'd5', captured: 'p', fenBefore: 'rnbqkbnr/ppp1pppp/8/3P4/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2', fenAfter: 'rnb1kbnr/ppp1pppp/8/3q4/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3', evalBefore: -35, evalAfter: -40, classification: 'good' },
      { san: 'Nc3', from: 'b1', to: 'c3', fenBefore: 'rnb1kbnr/ppp1pppp/8/3q4/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3', fenAfter: 'rnb1kbnr/ppp1pppp/8/3q4/8/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 3', evalBefore: 40, evalAfter: 65, classification: 'best' },
      { san: 'Qd7', from: 'd5', to: 'd7', fenBefore: 'rnb1kbnr/ppp1pppp/8/3q4/8/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 3', fenAfter: 'rnb1kbnr/pppqpppp/8/8/8/2N5/PPPP1PPP/R1BQKBNR w KQkq - 2 4', evalBefore: -65, evalAfter: -95, classification: 'inaccuracy' },
      { san: 'Bb5', from: 'f1', to: 'b5', fenBefore: 'rnb1kbnr/pppqpppp/8/8/8/2N5/PPPP1PPP/R1BQKBNR w KQkq - 2 4', fenAfter: 'rnb1kbnr/pppqpppp/8/1B6/8/2N5/PPPP1PPP/R1BQK1NR b KQkq - 3 4', evalBefore: 95, evalAfter: 120, classification: 'best' },
      { san: 'c6', from: 'c7', to: 'c6', fenBefore: 'rnb1kbnr/pppqpppp/8/1B6/8/2N5/PPPP1PPP/R1BQK1NR b KQkq - 3 4', fenAfter: 'rnb1kbnr/pp1qpppp/2p5/1B6/8/2N5/PPPP1PPP/R1BQK1NR w KQkq - 0 5', evalBefore: -120, evalAfter: -110, classification: 'good' },
      { san: 'Bc4', from: 'b5', to: 'c4', fenBefore: 'rnb1kbnr/pp1qpppp/2p5/1B6/8/2N5/PPPP1PPP/R1BQK1NR w KQkq - 0 5', fenAfter: 'rnb1kbnr/pp1qpppp/2p5/8/2B5/2N5/PPPP1PPP/R1BQK1NR b KQkq - 1 5', evalBefore: 110, evalAfter: 115, classification: 'best' },
      { san: 'e6', from: 'e7', to: 'e6', fenBefore: 'rnb1kbnr/pp1qpppp/2p5/8/2B5/2N5/PPPP1PPP/R1BQK1NR b KQkq - 1 5', fenAfter: 'rnb1kbnr/pp1q1ppp/2p1p3/8/2B5/2N5/PPPP1PPP/R1BQK1NR w KQkq - 0 6', evalBefore: -115, evalAfter: -120, classification: 'good' },
      { san: 'Qf3', from: 'd1', to: 'f3', fenBefore: 'rnb1kbnr/pp1q1ppp/2p1p3/8/2B5/2N5/PPPP1PPP/R1BQK1NR w KQkq - 0 6', fenAfter: 'rnb1kbnr/pp1q1ppp/2p1p3/8/2B5/2N2Q2/PPPP1PPP/R1B1K1NR b KQkq - 1 6', evalBefore: 120, evalAfter: 130, classification: 'excellent' },
      { san: 'a5', from: 'a7', to: 'a5', fenBefore: 'rnb1kbnr/pp1q1ppp/2p1p3/8/2B5/2N2Q2/PPPP1PPP/R1B1K1NR b KQkq - 1 6', fenAfter: 'rnb1kbnr/1p1q1ppp/2p1p3/p7/2B5/2N2Q2/PPPP1PPP/R1B1K1NR w KQkq - 0 7', evalBefore: -130, evalAfter: -160, classification: 'inaccuracy' },
      { san: 'd3', from: 'd2', to: 'd3', fenBefore: 'rnb1kbnr/1p1q1ppp/2p1p3/p7/2B5/2N2Q2/PPPP1PPP/R1B1K1NR w KQkq - 0 7', fenAfter: 'rnb1kbnr/1p1q1ppp/2p1p3/p7/2B5/2NP1Q2/PPP2PPP/R1B1K1NR b KQkq - 0 7', evalBefore: 160, evalAfter: 165, classification: 'best' },
      { san: 'b5', from: 'b7', to: 'b5', fenBefore: 'rnb1kbnr/1p1q1ppp/2p1p3/p7/2B5/2NP1Q2/PPP2PPP/R1B1K1NR b KQkq - 0 7', fenAfter: 'rnb1kbnr/3q1ppp/2p1p3/pp6/2B5/2NP1Q2/PPP2PPP/R1B1K1NR w KQkq - 0 8', evalBefore: -165, evalAfter: -170, classification: 'good' },
      {
        san: 'Bxb5',
        from: 'c4',
        to: 'b5',
        captured: 'p',
        fenBefore: 'rnb1kbnr/3q1ppp/2p1p3/pp6/2B5/2NP1Q2/PPP2PPP/R1B1K1NR w KQkq - 0 8',
        fenAfter: 'rnb1kbnr/3q1ppp/2p1p3/pB6/8/2NP1Q2/PPP2PPP/R1B1K1NR b KQkq - 0 8',
        evalBefore: 170,
        evalAfter: 280,
        classification: 'brilliant',
        coachComment: 'Bxb5 is brilliant! You sacrificed the bishop to rip open the queenside and launch an unstoppable attack!',
        bestMoveSan: 'Bxb5',
      },
      {
        san: 'cxb5',
        from: 'c6',
        to: 'b5',
        captured: 'b',
        fenBefore: 'rnb1kbnr/3q1ppp/2p1p3/pB6/8/2NP1Q2/PPP2PPP/R1B1K1NR b KQkq - 0 8',
        fenAfter: 'rnb1kbnr/3q1ppp/4p3/pp6/8/2NP1Q2/PPP2PPP/R1B1K1NR w KQkq - 0 9',
        evalBefore: -280,
        evalAfter: -340,
        classification: 'good',
      },
      {
        san: 'Qxa8',
        from: 'f3',
        to: 'a8',
        captured: 'r',
        fenBefore: 'rnb1kbnr/3q1ppp/4p3/pp6/8/2NP1Q2/PPP2PPP/R1B1K1NR w KQkq - 0 9',
        fenAfter: 'Qnb1kbnr/3q1ppp/4p3/pp6/8/2NP4/PPP2PPP/R1B1K1NR b KQk - 0 9',
        evalBefore: 340,
        evalAfter: 350,
        classification: 'best',
      },
      {
        san: 'Qc7',
        from: 'd7',
        to: 'c7',
        fenBefore: 'Qnb1kbnr/3q1ppp/4p3/pp6/8/2NP4/PPP2PPP/R1B1K1NR b KQk - 0 9',
        fenAfter: 'Qnb1kbnr/2q2ppp/4p3/pp6/8/2NP4/PPP2PPP/R1B1K1NR w KQk - 1 10',
        evalBefore: -350,
        evalAfter: -360,
        classification: 'best',
      },
      {
        san: 'Nxb5',
        from: 'c3',
        to: 'b5',
        captured: 'p',
        fenBefore: 'Qnb1kbnr/2q2ppp/4p3/pp6/8/2NP4/PPP2PPP/R1B1K1NR w KQk - 1 10',
        fenAfter: 'Qnb1kbnr/2q2ppp/4p3/pN6/8/3P4/PPP2PPP/R1B1K1NR b KQk - 0 10',
        evalBefore: 360,
        evalAfter: 375,
        classification: 'best',
      },
      {
        san: 'Bb7',
        from: 'c8',
        to: 'b7',
        fenBefore: 'Qnb1kbnr/2q2ppp/4p3/pN6/8/3P4/PPP2PPP/R1B1K1NR b KQk - 0 10',
        fenAfter: 'Qn2kbnr/1bq2ppp/4p3/pN6/8/3P4/PPP2PPP/R1B1K1NR w KQk - 1 11',
        evalBefore: -375,
        evalAfter: -490,
        classification: 'mistake',
      },
      {
        san: 'Nxc7+',
        from: 'b5',
        to: 'c7',
        captured: 'q',
        fenBefore: 'Qn2kbnr/1bq2ppp/4p3/pN6/8/3P4/PPP2PPP/R1B1K1NR w KQk - 1 11',
        fenAfter: 'Qn2kbnr/1bN2ppp/4p3/8/8/3P4/PPP2PPP/R1B1K1NR b KQk - 0 11',
        evalBefore: 490,
        evalAfter: 550,
        classification: 'great',
        coachComment: 'Nxc7+ is great! You win the queen with check, shattering black resistance!',
        bestMoveSan: 'Nxc7+',
        isCheck: true,
      },
      {
        san: 'Kd7',
        from: 'e8',
        to: 'd7',
        fenBefore: 'Qn2kbnr/1bN2ppp/4p3/8/8/3P4/PPP2PPP/R1B1K1NR b KQk - 0 11',
        fenAfter: 'Qn3bnr/1bNk1ppp/4p3/8/8/3P4/PPP2PPP/R1B1K1NR w KQ - 1 12',
        evalBefore: -550,
        evalAfter: -570,
        classification: 'best',
      },
      {
        san: 'Qe8+',
        from: 'a8',
        to: 'e8',
        fenBefore: 'Qn3bnr/1bNk1ppp/4p3/8/8/3P4/PPP2PPP/R1B1K1NR w KQ - 1 12',
        fenAfter: '4Qbnr/1bNk1ppp/4p3/8/8/3P4/PPP2PPP/R1B1K1NR b KQ - 2 12',
        evalBefore: 570,
        evalAfter: 20000,
        classification: 'brilliant',
        coachComment: 'Qe8+ is brilliant! You left your queen on a square where it can be taken, but you will get a checkmate!',
        bestMoveSan: 'Qe8+',
        isCheck: true,
      },
    ];

    const resultDetails: GameResultDetails = {
      winner: 'w',
      reason: 'resignation',
      ratingDelta: 113,
      newRating: 1996,
      league: 'Wood League',
      trophiesDelta: 9,
      achievementToast: {
        title: 'New Achievement!',
        subtitle: 'Blitz 1',
        icon: 'zap',
      },
    };

    const session: GameSession = {
      id: DEMO_FINISHED_GAME_ID,
      whitePlayer,
      blackPlayer,
      timeControl: 300,
      variant: 'standard',
      moves: demoMoves,
      fen: demoMoves[demoMoves.length - 1].fenAfter,
      isGameOver: true,
      gameResult: 'White won by resignation (1-0)',
      resultDetails,
      reviewReport: null,
      createdAt: Date.now() - 3600000,
      updatedAt: Date.now(),
    };

    session.reviewReport = generateGameReviewReport(
      DEMO_FINISHED_GAME_ID,
      whitePlayer,
      blackPlayer,
      demoMoves,
      true
    );

    return session;
  }
}
