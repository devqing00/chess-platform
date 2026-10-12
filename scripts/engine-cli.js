const readline = require('readline');
const initEngine = require('stockfish');

async function main() {
  const engine = await initEngine();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (trimmed === 'quit') {
      process.exit(0);
    }
    engine.sendCommand(trimmed);
  });
}

main().catch((err) => {
  console.error('Fatal engine error:', err);
  process.exit(1);
});
