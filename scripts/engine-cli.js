const readline = require('readline');
const path = require('path');

function main() {
  let initEngine;
  try {
    initEngine = require('stockfish/bin/stockfish-19-lite-single.js');
  } catch (err) {
    try {
      initEngine = require(path.join(__dirname, '..', 'node_modules', 'stockfish', 'bin', 'stockfish-19-lite-single.js'));
    } catch (err2) {
      try {
        initEngine = require('stockfish/bin/stockfish-19-asm.js');
      } catch (err3) {
        console.error('Failed to load Stockfish engine:', err3);
        process.exit(1);
      }
    }
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
