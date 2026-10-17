const path = require('path');

let initEngine;
try {
  initEngine = require('stockfish/bin/stockfish-19-asm.js');
} catch (e1) {
  try {
    initEngine = require(path.join(__dirname, '..', 'node_modules', 'stockfish', 'bin', 'stockfish-19-asm.js'));
  } catch (e2) {
    console.error('Failed to load Stockfish engine in worker:', e2);
    process.exit(1);
  }
}

let engineInstance = null;

function getEngine() {
  if (!engineInstance) {
    engineInstance = initEngine();
    engineInstance.processCommand('uci');
    engineInstance.processCommand('setoption name Threads value 1');
    engineInstance.processCommand('setoption name Hash value 32');
    engineInstance.processCommand('isready');
  }
  return engineInstance;
}

process.on('message', async (msg) => {
  if (!msg || !msg.type) return;

  if (msg.type === 'ping') {
    if (process.send) process.send({ type: 'pong' });
    return;
  }

  if (msg.type === 'evaluate') {
    const { id, fen, depth = 12, multiPv = 3 } = msg;
    try {
      const engine = getEngine();
      const linesMap = {};
      let maxDepth = 0;
      let seldepth = 0;
      let nodes = 0;
      let nps = 0;

      engine.listener = (line) => {
        if (typeof line !== 'string') return;

        if (line.startsWith('info depth')) {
          const depthMatch = line.match(/info depth (\d+)/);
          const seldepthMatch = line.match(/seldepth (\d+)/);
          const nodesMatch = line.match(/nodes (\d+)/);
          const npsMatch = line.match(/nps (\d+)/);
          const multipvMatch = line.match(/multipv (\d+)/);
          const cpMatch = line.match(/score cp (-?\d+)/);
          const mateMatch = line.match(/score mate (-?\d+)/);
          const pvMatch = line.match(/ pv (.*)$/);

          if (depthMatch) maxDepth = Math.max(maxDepth, parseInt(depthMatch[1], 10));
          if (seldepthMatch) seldepth = parseInt(seldepthMatch[1], 10);
          if (nodesMatch) nodes = parseInt(nodesMatch[1], 10);
          if (npsMatch) nps = parseInt(npsMatch[1], 10);

          const rank = multipvMatch ? parseInt(multipvMatch[1], 10) : 1;
          if (pvMatch && (cpMatch || mateMatch)) {
            const rawCp = cpMatch ? parseInt(cpMatch[1], 10) : 0;
            const rawMate = mateMatch ? parseInt(mateMatch[1], 10) : undefined;
            const pvUci = pvMatch[1].trim().split(/\s+/).filter(Boolean);

            linesMap[rank] = {
              rank,
              rawCp,
              rawMate,
              pvUci,
              bestMoveUci: pvUci[0] || '',
            };
          }
        }

        if (line.startsWith('bestmove')) {
          const bestMoveUci = line.split(' ')[1] || '';
          const lines = Object.values(linesMap).sort((a, b) => a.rank - b.rank);
          if (process.send) {
            process.send({
              type: 'evaluate_result',
              id,
              success: true,
              data: {
                fen,
                depth: maxDepth || depth,
                seldepth,
                nodes,
                nps,
                bestMoveUci,
                lines,
              },
            });
          }
        }
      };

      engine.processCommand('stop');
      engine.processCommand(`setoption name MultiPV value ${multiPv}`);
      engine.processCommand(`position fen ${fen}`);
      engine.processCommand(`go depth ${depth}`);
    } catch (err) {
      if (process.send) {
        process.send({
          type: 'evaluate_result',
          id,
          success: false,
          error: err.message,
        });
      }
    }
  }
});
