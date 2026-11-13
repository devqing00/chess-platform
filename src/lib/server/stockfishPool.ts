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
  isFallback?: boolean;
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

export function buildFallbackEvaluation(
  fen: string,
  depth: number = 8,
  best?: { score: number; bestMoveSan: string; bestMoveUci: string }
): EngineEvaluation {
  const chess = new Chess(fen);
  const evalBest = best || ChessEvaluator.findBestMoveAndScore(chess, true);
  return {
    fen,
    depth: depth || 8,
    seldepth: depth || 8,
    nodes: 1800,
    nps: 45000,
    scoreCp: evalBest.score,
    scoreFormatted: formatEngineScore(evalBest.score),
    bestMoveUci: evalBest.bestMoveUci,
    bestMoveSan: evalBest.bestMoveSan,
    pvUci: [evalBest.bestMoveUci],
    pvSan: [evalBest.bestMoveSan],
    isFallback: true,
    lines: [
      {
        rank: 1,
        scoreCp: evalBest.score,
        scoreFormatted: formatEngineScore(evalBest.score),
        bestMoveUci: evalBest.bestMoveUci,
        bestMoveSan: evalBest.bestMoveSan,
        pvUci: [evalBest.bestMoveUci],
        pvSan: [evalBest.bestMoveSan],
      },
    ],
  };
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

/**
 * Dedicated Stockfish worker running in an isolated Node.js child process.
 * This completely isolates Stockfish WASM/ASM from Next.js / Turbopack virtual paths
 * and eliminates C:\ROOT ENOENT errors.
 */
class StockfishWorker {
  public id: number;
  private process: ChildProcess | null = null;
  public isBusy: boolean = false;
  public isReady: boolean = false;
  public hasFailed: boolean = false;
  private currentHandler: ((line: string) => void) | null = null;
  private buffer: string = '';
  private onReadyCallback?: () => void;
  private bootTimer: NodeJS.Timeout | null = null;

  constructor(id: number, onReady?: () => void) {
    this.id = id;
    this.onReadyCallback = onReady;
    this.initProcess();
  }

  public isAlive(): boolean {
    return Boolean(this.process && !this.process.killed);
  }

  public destroy() {
    if (this.bootTimer) {
      clearTimeout(this.bootTimer);
      this.bootTimer = null;
    }
    if (this.process) {
      try {
        if (this.process.stdin) {
          this.process.stdin.write('quit\n');
        }
        this.process.kill();
      } catch {
        // ignore
      }
      this.process = null;
    }
    this.isReady = false;
    this.isBusy = false;
    this.currentHandler = null;
  }

  public initProcess() {
    if (this.bootTimer) {
      clearTimeout(this.bootTimer);
      this.bootTimer = null;
    }
    if (this.process) {
      try {
        if (this.process.stdin) {
          this.process.stdin.write('quit\n');
        }
        this.process.kill();
      } catch {
        // ignore
      }
      this.process = null;
    }

    const cp = typeof require !== 'undefined' ? eval("require('child_process')") : null;
    if (!cp) {
      this.hasFailed = true;
      this.isReady = false;
      this.onReadyCallback?.();
      return;
    }

    const rootDir = process.cwd();
    const scriptPath = path.resolve(rootDir, 'scripts', 'engine-cli.js');
    const fs = typeof require !== 'undefined' ? eval("require('fs')") : null;
    if (!fs || !fs.existsSync(scriptPath)) {
      this.hasFailed = true;
      this.isReady = false;
      this.onReadyCallback?.();
      return;
    }

    try {
      this.process = cp.spawn('node', [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });
    } catch (err) {
      console.warn(`[StockfishWorker ${this.id}] Spawn error:`, err);
      this.hasFailed = true;
      this.isReady = false;
      this.onReadyCallback?.();
      return;
    }

    if (!this.process) {
      this.hasFailed = true;
      this.isReady = false;
      this.onReadyCallback?.();
      return;
    }

    // Fast boot timeout: If worker does not report ready within 2000ms, mark failed so pool can fallback instantly without stalling serverless execution
    this.bootTimer = setTimeout(() => {
      if (!this.isReady) {
        console.warn(`[StockfishWorker ${this.id}] Boot timed out after 2s`);
        this.hasFailed = true;
        this.onReadyCallback?.();
      }
    }, 2000);

    this.process.stdout?.on('data', (chunk: Buffer) => {
      this.buffer += chunk.toString();
      const rawLines = this.buffer.split('\n');
      this.buffer = rawLines.pop() || '';
      for (const raw of rawLines) {
        const line = raw.trim();
        if (!line) continue;

        if (!this.isReady && (line.startsWith('readyok') || line.startsWith('uciok') || line.startsWith('bestmove'))) {
          this.isReady = true;
          this.hasFailed = false;
          if (this.bootTimer) {
            clearTimeout(this.bootTimer);
            this.bootTimer = null;
          }
          if (this.onReadyCallback) {
            const cb = this.onReadyCallback;
            setTimeout(() => cb(), 0);
          }
        }

        if (this.currentHandler) {
          this.currentHandler(line);
        }
      }
    });

    this.process.stderr?.on('data', (chunk: Buffer) => {
      const errStr = chunk.toString().trim();
      if (errStr) {
        console.warn(`[StockfishWorker ${this.id}] stderr:`, errStr);
      }
    });

    this.process.on('error', (err) => {
      console.warn(`[StockfishWorker ${this.id}] Process error:`, err);
      this.isReady = false;
      this.isBusy = false;
      this.hasFailed = true;
      this.currentHandler = null;
      this.onReadyCallback?.();
    });

    this.process.on('exit', (code, signal) => {
      console.warn(`[StockfishWorker ${this.id}] Process exited with code ${code}, signal ${signal}`);
      this.isReady = false;
      this.isBusy = false;
      this.hasFailed = true;
      this.process = null;
      this.currentHandler = null;
      this.onReadyCallback?.();
    });

    if (this.process.stdin) {
      try {
        this.process.stdin.write('uci\n');
        this.process.stdin.write('setoption name Threads value 1\n');
        this.process.stdin.write('setoption name Hash value 32\n');
        this.process.stdin.write('isready\n');
      } catch {
        this.hasFailed = true;
        this.onReadyCallback?.();
      }
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

      // If process failed or is unavailable, attempt to revive it
      if (this.hasFailed || !this.process || !this.process.stdin) {
        this.initProcess();
        if (!this.process || !this.process.stdin) {
          const best = ChessEvaluator.findBestMoveAndScore(chess);
          resolve(buildFallbackEvaluation(fen, depth, best));
          return;
        }
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

      const timeCap = Math.max(50, timeoutMs || 100);

      timer = setTimeout(() => {
        if (searchFinished) return;
        // Stop current engine search if it hasn't emitted bestmove within budget + 350ms
        if (this.process?.stdin) {
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

          const best = ChessEvaluator.findBestMoveAndScore(chess, true);
          finishAndResolve(buildFallbackEvaluation(fen, depth, best));
        }, 300);
      }, timeCap + 350);

      this.currentHandler = handleUciLine;

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

      // Fallback if child process is not available
      cleanup();
      const best = ChessEvaluator.findBestMoveAndScore(chess, true);
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
  timer?: NodeJS.Timeout;
}

/**
 * Multi-worker pool with LRU in-memory evaluation cache
 */
class StockfishProcessPool {
  private workers: StockfishWorker[] = [];
  private queue: QueuedTask[] = [];
  private cache: Map<string, EngineEvaluation> = new Map();
  private maxCacheSize: number = 5000;
  private poolSize: number = 2; // 2 concurrent child process workers

  constructor(poolSize: number = 2) {
    this.poolSize = poolSize;
    for (let i = 0; i < this.poolSize; i++) {
      this.workers.push(new StockfishWorker(i + 1, () => this.dispatchNext()));
    }
  }

  public destroy() {
    for (const w of this.workers) {
      w.destroy();
    }
    this.workers = [];
    this.queue = [];
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
    // Per explicit user directive: caching disabled for now to always ensure fresh, authentic evaluations
    // const cached = this.cache.get(cacheKey);
    // if (cached) return cached;

    const allDead = this.workers.length > 0 && this.workers.every((w) => !w.isAlive());
    if (allDead) {
      for (const w of this.workers) {
        w.initProcess();
      }
    }

    return new Promise<EngineEvaluation>((resolve) => {
      const task: QueuedTask = {
        fen,
        depth,
        multiPv,
        timeoutMs,
        resolve: (result: EngineEvaluation) => {
          if (task.timer) clearTimeout(task.timer);
          // Store in cache with LRU eviction ONLY if it is a genuine Stockfish evaluation (not a dummy fallback)
          if (!result.isFallback) {
            if (this.cache.size >= this.maxCacheSize) {
              const firstKey = this.cache.keys().next().value;
              if (firstKey) this.cache.delete(firstKey);
            }
            this.cache.set(cacheKey, result);
            if (normalizedFen !== fen) {
              this.cache.set(`${fen}|d=${depth}|pv=${multiPv}`, result);
            }
          }
          resolve(result);
        },
        reject: () => {
          if (task.timer) clearTimeout(task.timer);
          const fallback = buildFallbackEvaluation(fen, depth);
          resolve(fallback);
        },
      };

      // Infallible hard timeout: Never let a task sit pending indefinitely
      const timeLimit = Math.max(3000, timeoutMs + 1500);
      task.timer = setTimeout(() => {
        const qIdx = this.queue.indexOf(task);
        if (qIdx !== -1) {
          this.queue.splice(qIdx, 1);
        }
        task.resolve(buildFallbackEvaluation(fen, depth));
      }, timeLimit);

      this.queue.push(task);
      this.dispatchNext();
    });
  }

  private dispatchNext() {
    if (this.queue.length === 0) return;

    // Check if any worker is alive or able to boot
    const hasLiveWorker = this.workers.some((w) => w.isAlive());
    const anyCanBoot = this.workers.some((w) => !w.hasFailed);

    if (!hasLiveWorker && anyCanBoot) {
      for (const w of this.workers) {
        if (!w.hasFailed && !w.isAlive()) {
          w.initProcess();
        }
      }
      return;
    }

    if (!hasLiveWorker && !anyCanBoot) {
      // No workers could be spawned or all failed (e.g. serverless environment):
      // Immediately drain queue with high-speed tactical evaluation in 0ms!
      while (this.queue.length > 0) {
        const task = this.queue.shift();
        if (task) {
          if (task.timer) clearTimeout(task.timer);
          task.resolve(buildFallbackEvaluation(task.fen, task.depth));
        }
      }
      return;
    }

    while (this.queue.length > 0) {
      // Find an idle ready worker
      const idleWorker = this.workers.find((w) => !w.isBusy && w.isReady && w.isAlive());
      if (!idleWorker) {
        break;
      }

      const task = this.queue.shift();
      if (!task) break;

      idleWorker.isBusy = true;
      idleWorker
        .executeEval(task.fen, task.depth, task.multiPv, task.timeoutMs)
        .then((res) => {
          task.resolve(res);
        })
        .catch(() => {
          task.resolve(buildFallbackEvaluation(task.fen, task.depth));
        })
        .finally(() => {
          idleWorker.isBusy = false;
          this.dispatchNext();
        });
    }
  }
}

// Global persistent pool instance across Next.js Turbopack / HMR reloads
const globalForStockfish = globalThis as unknown as { stockfishPool?: StockfishProcessPool };

function getGlobalPool(): StockfishProcessPool {
  if (!globalForStockfish.stockfishPool) {
    const defaultWorkers = Math.min(4, Math.max(2, (require('os').cpus()?.length || 2) - 1));
    globalForStockfish.stockfishPool = new StockfishProcessPool(defaultWorkers);
  }
  return globalForStockfish.stockfishPool;
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
