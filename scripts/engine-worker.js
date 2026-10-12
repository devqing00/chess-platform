const initEngine = require('stockfish');

let engineInstance = null;
let currentResolve = null;

async function getEngine() {
  if (!engineInstance) {
    engineInstance = await initEngine();
    engineInstance.sendCommand('uci');
    engineInstance.sendCommand('setoption name Threads value 2');
    engineInstance.sendCommand('setoption name Hash value 32');
    engineInstance.sendCommand('isready');
  }
  return engineInstance;
}

process.on('message', async (msg) => {
  if (!msg || !msg.type) return;

  if (msg.type === 'ping') {
    process.send({ type: 'pong' });
    return;
  }

  if (msg.type === 'evaluate') {
    const { id, fen, depth = 12, multiPv = 3 } = msg;
    try {
      const engine = await getEngine();
      const linesMap = {};
      let maxDepth = 0;
      let seldepth = 0;
      let nodes = 0;
      let nps = 0;

      engine.print = (line) => {
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
      };

      engine.sendCommand('stop');
      engine.sendCommand(`setoption name MultiPV value ${multiPv}`);
      engine.sendCommand(`position fen ${fen}`);
      engine.sendCommand(`go depth ${depth}`);
    } catch (err) {
      process.send({
        type: 'evaluate_result',
        id,
        success: false,
        error: err.message,
      });
    }
  }
});
