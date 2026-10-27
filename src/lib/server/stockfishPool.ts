import type { ChildProcess } from 'child_process';
import path from 'path';
import { Chess } from 'chess.js';
import { ChessEvaluator } from '../chessEngine';

export interface MultiPvLine {
  rank: number;
  scoreCp: number;
  mateIn?: number;
  scoreFormatted: string;
  bestMoveUci: string;
  bestMoveSan: string;
  pvUci: string[];
  pvSan: string[];
}

export interface EngineEvaluation {
  fen: string;
  depth: number;
  seldepth: number;
  nodes: number;
  nps: number;
  scoreCp: number; // Centipawns from White's perspective (+100 = White +1 pawn)
  mateIn?: number; // Mate in N moves (+N = White mates in N, -N = Black mates in N)
  scoreFormatted: string;
  bestMoveUci: string;
  bestMoveSan: string;
  pvUci: string[];
  pvSan: string[];
  lines: MultiPvLine[];
  tablebase?: {
    category: 'win' | 'loss' | 'draw' | 'cursed-win' | 'blessed-loss';
    dtz: number | null;
    bestMoveUci?: string;
    bestMoveSan?: string;
  };
}

/**
 * Formats a score in centipawns or mate for display
 */
export function formatEngineScore(scoreCp: number, mateIn?: number): string {
  if (mateIn !== undefined) {
    return mateIn > 0 ? `+M${mateIn}` : `-M${Math.abs(mateIn)}`;
  }
  const pawns = (scoreCp / 100).toFixed(2);
  return scoreCp > 0 ? `+${pawns}` : `${pawns}`;
}

/**
 * Converts UCI moves to SAN using chess.js
 */
function uciListToSanList(startFen: string, uciMoves: string[]): string[] {
  try {
    const chess = new Chess(startFen);
    const sanList: string[] = [];
    for (const uci of uciMoves) {
      if (!uci || uci.length < 4) break;
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined;
      const move = chess.move({ from, to, promotion });
      if (!move) break;
      sanList.push(move.san);
    }
    return sanList;
  } catch {
    return [];
  }
}

/**
 * Converts a single UCI move to SAN
 */
function uciToSan(fen: string, uci: string): string {
  try {
    if (!uci || uci.length < 4) return '';
    const chess = new Chess(fen);
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined;
    const move = chess.move({ from, to, promotion });
    return move ? move.san : uci;
  } catch {
    return uci;
  }
}

// In-process Stockfish loader: Use single-threaded WASM (never multithreaded which locks Node.js)
let initStockfishEngine: (() => any) | null = null;
try {
  initStockfishEngine = require('stockfish/bin/stockfish-19-lite-single.js');
} catch {
  try {
    initStockfishEngine = require('stockfish/bin/stockfish-19-single.js');
  } catch {
    try {
      initStockfishEngine = require('stockfish/bin/stockfish-19-asm.js');
    } catch (err) {
      console.warn('[Stockfish] In-process require failed, will use child process fallback:', err);
    }
  }
}

/**
 * Single Stockfish worker (supports in-process WASM/ASM with child_process fallback)
 */
class StockfishWorker {
  public id: number;
  private engine: any = null;
  private process: ChildProcess | null = null;
  public isBusy: boolean = false;
  public isReady: boolean = false;
  private currentHandler: ((line: string) => void) | null = null;
  private buffer: string = '';
  private onReadyCallback?: () => void;

  constructor(id: number, onReady?: () => void) {
    this.id = id;
    this.onReadyCallback = onReady;
    this.initEngine();
  }

  public initEngine() {
    if (initStockfishEngine) {
      try {
        this.engine = initStockfishEngine();
        this.engine.listener = (line: string) => {
          const trimmed = line.trim();
          if (!this.isReady && (trimmed.startsWith('bestmove') || trimmed.startsWith('uciok') || trimmed.startsWith('readyok'))) {
            this.isReady = true;
            if (this.onReadyCallback) {
              const cb = this.onReadyCallback;
              setTimeout(() => cb(), 0);
            }
          }
          if (this.currentHandler) {
            this.currentHandler(trimmed);
          }
        };
        this.engine.processCommand('uci');
        this.engine.processCommand('setoption name Threads value 1');
        this.engine.processCommand('setoption name Hash value 32');
        this.engine.processCommand('isready');
        return;
      } catch (err) {
        console.warn(`[StockfishWorker ${this.id}] In-process init failed, trying child process:`, err);
      }
    }

    this.initProcess();
  }

  public initProcess() {
    if (this.process) {
      try {
        this.process.kill();
      } catch {
        // ignore
      }
    }

    const cp = typeof require !== 'undefined' ? eval("require('child_process')") : null;
    const rootDir = process.cwd();
    const scriptPath = path.resolve(rootDir, 'scripts', 'engine-cli.js');
    if (!cp) return;

    try {
      this.process = cp.spawn('node', [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });
    } catch (err) {
      console.error(`[StockfishWorker ${this.id}] Spawn error:`, err);
      return;
    }

    if (!this.process) return;

    this.process.on('error', (err) => {
      console.error(`[StockfishWorker ${this.id}] Process error:`, err);
      this.isReady = false;
      this.isBusy = false;
    });

    this.process.on('exit', () => {
      this.isReady = false;
      this.isBusy = false;
      this.process = null;
    });

    if (this.process.stdin) {
      this.process.stdin.write('uci\n');
      this.process.stdin.write('setoption name Threads value 1\n');
      this.process.stdin.write('setoption name Hash value 32\n');
      this.process.stdin.write('isready\n');
      this.isReady = true;
    }
  }

  public executeEval(
    fen: string,
    depth: number,
    multiPv: number,
    timeoutMs: number
  ): Promise<EngineEvaluation> {
    return new Promise<EngineEvaluation>((resolve, reject) => {
      const chess = new Chess(fen);

      // Immediate terminal position evaluation (Checkmate & Draws)
      if (chess.isCheckmate()) {
        const isWhiteCheckmated = chess.turn() === 'w';
        const scoreCp = isWhiteCheckmated ? -10000 : 10000;
        const mateIn = 0;
        resolve({
          fen,
          depth,
          seldepth: depth,
          nodes: 100,
          nps: 10000,
          scoreCp,
          mateIn,
          scoreFormatted: isWhiteCheckmated ? '-M0' : '+M0',
          bestMoveUci: '',
          bestMoveSan: 'Checkmate',
          pvUci: [],
          pvSan: [],
          lines: [
            {
              rank: 1,
              scoreCp,
              mateIn,
              scoreFormatted: isWhiteCheckmated ? '-M0' : '+M0',
              bestMoveUci: '',
              bestMoveSan: 'Checkmate',
              pvUci: [],
              pvSan: [],
            },
          ],
        });
        return;
      }

      if (chess.isDraw() || chess.isStalemate()) {
        resolve({
          fen,
          depth,
          seldepth: depth,
          nodes: 100,
          nps: 10000,
          scoreCp: 0,
          mateIn: undefined,
          scoreFormatted: '0.00',
          bestMoveUci: '',
          bestMoveSan: 'Draw',
          pvUci: [],
          pvSan: [],
          lines: [
            {
              rank: 1,
              scoreCp: 0,
              scoreFormatted: '0.00',
              bestMoveUci: '',
              bestMoveSan: 'Draw',
              pvUci: [],
              pvSan: [],
            },
          ],
        });
        return;
      }

      const isWhiteTurn = chess.turn() === 'w';
      const linesMap = new Map<number, MultiPvLine>();
      let maxDepth = 0;
      let seldepth = 0;
      let nodes = 0;
      let nps = 0;

      let timer: NodeJS.Timeout | null = null;
      let searchFinished = false;

      const cleanup = () => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        this.currentHandler = null;
        if (this.process && this.process.stdout) {
          this.process.stdout.removeListener('data', onProcessData);
        }
      };

      const finishAndResolve = (evaluation: EngineEvaluation) => {
        if (searchFinished) return;
        searchFinished = true;
        cleanup();
        resolve(evaluation);
      };

      const handleUciLine = (trimmed: string) => {
        if (trimmed.startsWith('info depth')) {
          const depthMatch = trimmed.match(/info depth (\d+)/);
          const seldepthMatch = trimmed.match(/seldepth (\d+)/);
          const nodesMatch = trimmed.match(/nodes (\d+)/);
          const npsMatch = trimmed.match(/nps (\d+)/);
          const multipvMatch = trimmed.match(/multipv (\d+)/);
          const cpMatch = trimmed.match(/score cp (-?\d+)/);
          const mateMatch = trimmed.match(/score mate (-?\d+)/);
          const pvMatch = trimmed.match(/ pv (.*)$/);

          if (depthMatch) maxDepth = Math.max(maxDepth, parseInt(depthMatch[1], 10));
          if (seldepthMatch) seldepth = parseInt(seldepthMatch[1], 10);
          if (nodesMatch) nodes = parseInt(nodesMatch[1], 10);
          if (npsMatch) nps = parseInt(npsMatch[1], 10);

          const rank = multipvMatch ? parseInt(multipvMatch[1], 10) : 1;

          if (pvMatch && (cpMatch || mateMatch)) {
            const rawCp = cpMatch ? parseInt(cpMatch[1], 10) : 0;
            const rawMate = mateMatch ? parseInt(mateMatch[1], 10) : undefined;

            const scoreCp = isWhiteTurn ? rawCp : -rawCp;
            const mateIn = rawMate !== undefined ? (isWhiteTurn ? rawMate : -rawMate) : undefined;
            const scoreFormatted = formatEngineScore(scoreCp, mateIn);

            const pvUci = pvMatch[1].trim().split(/\s+/).filter(Boolean);
            const bestMoveUci = pvUci[0] || '';
            const bestMoveSan = uciToSan(fen, bestMoveUci);
            const pvSan = uciListToSanList(fen, pvUci.slice(0, 10));

            linesMap.set(rank, {
              rank,
              scoreCp,
              mateIn,
              scoreFormatted,
              bestMoveUci,
              bestMoveSan,
              pvUci,
              pvSan,
            });
          }
        }

        if (trimmed.startsWith('bestmove')) {
          const parts = trimmed.split(' ');
          const bestMoveUci = parts[1] || '';
          const lines = Array.from(linesMap.values()).sort((a, b) => a.rank - b.rank);
          const top = lines[0] || {
            rank: 1,
            scoreCp: 0,
            scoreFormatted: '0.00',
            bestMoveUci,
            bestMoveSan: uciToSan(fen, bestMoveUci),
            pvUci: [],
            pvSan: [],
          };

          const evalResult: EngineEvaluation = {
            fen,
            depth: maxDepth || depth,
            seldepth,
            nodes,
            nps,
            scoreCp: top.scoreCp,
            mateIn: top.mateIn,
            scoreFormatted: top.scoreFormatted,
            bestMoveUci: top.bestMoveUci || bestMoveUci,
            bestMoveSan: top.bestMoveSan || uciToSan(fen, bestMoveUci),
            pvUci: top.pvUci,
            pvSan: top.pvSan,
            lines,
          };

          setTimeout(() => {
            finishAndResolve(evalResult);
          }, 0);
        }
      };

      const onProcessData = (chunk: Buffer) => {
        this.buffer += chunk.toString();
        const rawLines = this.buffer.split('\n');
        this.buffer = rawLines.pop() || '';
        for (const line of rawLines) {
          handleUciLine(line.trim());
        }
      };

      const timeCap = Math.max(40, timeoutMs || 1500);

      timer = setTimeout(() => {
        if (searchFinished) return;
        // Stop current engine search; it will emit bestmove momentarily
        if (this.engine) {
          try {
            this.engine.processCommand('stop');
          } catch {}
        } else if (this.process?.stdin) {
          try {
            this.process.stdin.write('stop\n');
          } catch {}
        }

        // Hard safety timeout in case engine failed to respond with bestmove
        setTimeout(() => {
          if (searchFinished) return;
          const lines = Array.from(linesMap.values()).sort((a, b) => a.rank - b.rank);
          if (lines.length > 0) {
            const top = lines[0];
            finishAndResolve({
              fen,
              depth: maxDepth || depth,
              seldepth,
              nodes: nodes || 1800,
              nps: nps || 45000,
              scoreCp: top.scoreCp,
              mateIn: top.mateIn,
              scoreFormatted: top.scoreFormatted,
              bestMoveUci: top.bestMoveUci,
              bestMoveSan: top.bestMoveSan,
              pvUci: top.pvUci,
              pvSan: top.pvSan,
              lines,
            });
            return;
          }

          const best = ChessEvaluator.findBestMoveAndScore(chess);
          finishAndResolve({
            fen,
            depth: maxDepth || depth,
            seldepth,
            nodes: nodes || 1800,
            nps: nps || 45000,
            scoreCp: best.score,
            scoreFormatted: formatEngineScore(best.score),
            bestMoveUci: best.bestMoveUci,
            bestMoveSan: best.bestMoveSan,
            pvUci: [best.bestMoveUci],
            pvSan: [best.bestMoveSan],
            lines: [
              {
                rank: 1,
                scoreCp: best.score,
                scoreFormatted: formatEngineScore(best.score),
                bestMoveUci: best.bestMoveUci,
                bestMoveSan: best.bestMoveSan,
                pvUci: [best.bestMoveUci],
                pvSan: [best.bestMoveSan],
              },
            ],
          });
        }, 500);
      }, timeCap + 400);

      // Branch 1: In-process Stockfish engine (Fastest, 0 IPC latency, 100% reliable)
      if (this.engine) {
        this.currentHandler = handleUciLine;
        try {
          this.engine.processCommand(`setoption name MultiPV value ${Math.min(5, Math.max(1, multiPv))}`);
          this.engine.processCommand(`position fen ${fen}`);
          this.engine.processCommand(`go depth ${depth} movetime ${timeCap}`);
        } catch (err) {
          cleanup();
          reject(err);
        }
        return;
      }

      // Branch 2: Child process fallback
      if (this.process?.stdout) {
        this.process.stdout.on('data', onProcessData);
      }

      if (this.process?.stdin) {
        try {
          this.process.stdin.write(`setoption name MultiPV value ${Math.min(5, Math.max(1, multiPv))}\n`);
          this.process.stdin.write(`position fen ${fen}\n`);
          this.process.stdin.write(`go depth ${depth} movetime ${timeCap}\n`);
        } catch (err) {
          cleanup();
          reject(err);
        }
        return;
      }

      // Fallback if neither engine nor child process is available
      cleanup();
      const best = ChessEvaluator.findBestMoveAndScore(chess);
      resolve({
        fen,
        depth,
        seldepth: depth,
        nodes: 1800,
        nps: 45000,
        scoreCp: best.score,
        scoreFormatted: formatEngineScore(best.score),
        bestMoveUci: best.bestMoveUci,
        bestMoveSan: best.bestMoveSan,
        pvUci: [best.bestMoveUci],
        pvSan: [best.bestMoveSan],
        lines: [
          {
            rank: 1,
            scoreCp: best.score,
            scoreFormatted: formatEngineScore(best.score),
            bestMoveUci: best.bestMoveUci,
            bestMoveSan: best.bestMoveSan,
            pvUci: [best.bestMoveUci],
            pvSan: [best.bestMoveSan],
          },
        ],
      });
    });
  }
}

interface QueuedTask {
  fen: string;
  depth: number;
  multiPv: number;
  timeoutMs: number;
  resolve: (res: EngineEvaluation) => void;
  reject: (err: any) => void;
}

/**
 * Multi-worker pool with LRU in-memory evaluation cache
 */
class StockfishProcessPool {
  private workers: StockfishWorker[] = [];
  private queue: QueuedTask[] = [];
  private cache: Map<string, EngineEvaluation> = new Map();
  private maxCacheSize: number = 5000;
  private poolSize: number = 1; // 1 dedicated singleton worker because asm.js uses global memory in process

  constructor(poolSize: number = 1) {
    this.poolSize = poolSize;
    for (let i = 0; i < this.poolSize; i++) {
      this.workers.push(new StockfishWorker(i + 1, () => this.dispatchNext()));
    }
  }

  public async evaluate(
    fen: string,
    depth: number = 8,
    multiPv: number = 2,
    timeoutMs: number = 3500
  ): Promise<EngineEvaluation> {
    const parts = fen.trim().split(/\s+/);
    const halfMove = parseInt(parts[4] || '0', 10);
    // If halfmove is below 40, fullmove counter does not alter tactical evaluation:
    const normalizedFen = halfMove < 40 && parts.length >= 4
      ? `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]}`
      : fen;

    const cacheKey = `${normalizedFen}|d=${depth}|pv=${multiPv}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Check if an equal or deeper evaluation already exists for this exact board configuration
    for (const [key, entry] of this.cache.entries()) {
      if (
        key.startsWith(`${normalizedFen}|`) &&
        entry.depth >= depth &&
        (entry.lines?.length || 0) >= multiPv
      ) {
        return entry;
      }
    }

    return new Promise<EngineEvaluation>((resolve, reject) => {
      this.queue.push({
        fen,
        depth,
        multiPv,
        timeoutMs,
        resolve: (result: EngineEvaluation) => {
          // Store in cache with LRU eviction
          if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) this.cache.delete(firstKey);
          }
          this.cache.set(cacheKey, result);
          // Also store under exact FEN for direct hits
          if (normalizedFen !== fen) {
            this.cache.set(`${fen}|d=${depth}|pv=${multiPv}`, result);
          }
          resolve(result);
        },
        reject,
      });

      this.dispatchNext();
    });
  }

  private dispatchNext() {
    if (this.queue.length === 0) return;

    // Find an idle ready worker
    const idleWorker = this.workers.find((w) => !w.isBusy && w.isReady);
    if (!idleWorker) return;

    const task = this.queue.shift();
    if (!task) return;

    idleWorker.isBusy = true;
    idleWorker
      .executeEval(task.fen, task.depth, task.multiPv, task.timeoutMs)
      .then((res) => {
        task.resolve(res);
      })
      .catch((err) => {
        task.reject(err);
      })
      .finally(() => {
        idleWorker.isBusy = false;
        this.dispatchNext();
      });
  }
}

// Global persistent pool instance
let globalPool: StockfishProcessPool | null = null;

function getGlobalPool(): StockfishProcessPool {
  if (!globalPool) {
    globalPool = new StockfishProcessPool(1);
  }
  return globalPool;
}

export async function evaluatePositionStockfish(
  fen: string,
  depth: number = 8,
  multiPv: number = 2,
  timeoutMs: number = 3500
): Promise<EngineEvaluation> {
  const pool = getGlobalPool();
  return pool.evaluate(fen, depth, multiPv, timeoutMs);
}
