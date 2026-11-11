const readline = require('readline');
const path = require('path');

function main() {
  let initEngine;
  const candidates = [
    'stockfish/bin/stockfish-19-lite-single.js',
    path.join(__dirname, '..', 'node_modules', 'stockfish', 'bin', 'stockfish-19-lite-single.js'),
    path.join(process.cwd(), 'node_modules', 'stockfish', 'bin', 'stockfish-19-lite-single.js'),
    'stockfish/bin/stockfish-19-asm.js',
    path.join(__dirname, '..', 'node_modules', 'stockfish', 'bin', 'stockfish-19-asm.js'),
    path.join(process.cwd(), 'node_modules', 'stockfish', 'bin', 'stockfish-19-asm.js'),
  ];

  for (const candidate of candidates) {
    try {
      initEngine = require(candidate);
      if (typeof initEngine === 'function') break;
    } catch {
      // try next
    }
  }

  if (typeof initEngine !== 'function') {
    console.error('Failed to load Stockfish engine from any candidate paths');
    process.exit(1);
  }

  const engine = initEngine();

  engine.listener = (line) => {
    process.stdout.write(line + '\n');
  };

  const rl = readline.createInterface({
    input: process.stdin,
    terminal: false,
  });

  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (trimmed === 'quit') {
      process.exit(0);
    }
    engine.processCommand(trimmed);
  });
}

main();
