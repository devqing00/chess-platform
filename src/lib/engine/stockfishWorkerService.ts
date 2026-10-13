/**
 * Stockfish Client-Side Web Worker Service
 * Offloads depth-16/20 evaluation to background Web Workers, running at 0 cloud compute cost.
 */

export interface EngineEvaluationResult {
  scoreCp: number;
  depth: number;
  bestMove: string;
  pv: string[];
}

export class StockfishWorkerService {
  private static worker: Worker | null = null;
  private static isInitialized = false;

  private static getWorker(): Worker | null {
    if (typeof window === 'undefined') return null;

    if (!this.worker) {
      try {
        this.worker = new Worker('/workers/stockfishWorker.js');
        this.worker.postMessage('uci');
        this.worker.postMessage('isready');
        this.isInitialized = true;
      } catch (err) {
        console.warn('Could not initialize Stockfish Web Worker:', err);
        return null;
      }
    }
    return this.worker;
  }

  /**
   * Evaluate a FEN string asynchronously in the background Web Worker
   */
  public static async evaluatePosition(
    fen: string,
    targetDepth: number = 14,
    onProgress?: (depth: number, scoreCp: number) => void
  ): Promise<EngineEvaluationResult> {
    const worker = this.getWorker();

    if (!worker) {
      // Fallback result if workers are unavailable
      return {
        scoreCp: 25,
        depth: targetDepth,
        bestMove: 'e2e4',
        pv: ['e2e4'],
      };
    }

    return new Promise((resolve) => {
      let finalScoreCp = 0;
      let finalBestMove = 'e2e4';
      let finalPv: string[] = [];

      const messageHandler = (e: MessageEvent) => {
        const line = e.data;
        if (typeof line !== 'string') return;

        // info depth 12 score cp 45 pv ...
        if (line.startsWith('info depth')) {
          const depthMatch = line.match(/depth\s+(\d+)/);
          const cpMatch = line.match(/score cp\s+(-?\d+)/);
          const pvMatch = line.match(/pv\s+(.*)/);

          const depth = depthMatch ? parseInt(depthMatch[1], 10) : 0;
          const cp = cpMatch ? parseInt(cpMatch[1], 10) : 0;

          finalScoreCp = cp;
          if (pvMatch) {
            finalPv = pvMatch[1].split(' ');
          }

          if (onProgress) {
            onProgress(depth, cp);
          }
        }

        // bestmove ...
        if (line.startsWith('bestmove')) {
          const parts = line.split(' ');
          finalBestMove = parts[1] || 'e2e4';
          worker.removeEventListener('message', messageHandler);
          resolve({
            scoreCp: finalScoreCp,
            depth: targetDepth,
            bestMove: finalBestMove,
            pv: finalPv,
          });
        }
      };

      worker.addEventListener('message', messageHandler);
      worker.postMessage(`position fen ${fen}`);
      worker.postMessage(`go depth ${targetDepth}`);
    });
  }

  /**
   * Clean up background worker
   */
  public static terminate() {
    if (this.worker) {
      this.worker.postMessage('quit');
      this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }
}
