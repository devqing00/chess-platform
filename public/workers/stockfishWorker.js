/**
 * Stockfish 19 Web Worker
 * Runs Stockfish 19 Lite NNUE via asm.js in a dedicated background Web Worker thread.
 * Compatible with all modern browsers without requiring Cross-Origin-Opener-Policy (COOP) headers.
 */

try {
  // Load the authentic Stockfish 19 ASM.JS engine
  importScripts('/workers/stockfish-19-asm.js');
} catch (e1) {
  try {
    importScripts('stockfish-19-asm.js');
  } catch (e2) {
    console.error('[Stockfish Worker] Failed to load Stockfish 19 ASM script:', e2);
  }
}
