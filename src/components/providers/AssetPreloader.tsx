'use client';

import React, { useEffect, useRef } from 'react';
import { PieceTheme } from '@/types/chess';
import { useShell } from '@/context/ShellContext';

const PIECE_NAMES = [
  'w_p', 'w_r', 'w_n', 'w_b', 'w_q', 'w_k',
  'b_p', 'b_r', 'b_n', 'b_b', 'b_q', 'b_k',
];

const PRELOADED_THEMES = new Set<string>();
const IMAGE_CACHE: HTMLImageElement[] = [];

/**
 * Preloads chess piece images into the browser cache
 */
function preloadPieceTheme(theme: PieceTheme | string) {
  if (typeof window === 'undefined') return;
  if (PRELOADED_THEMES.has(theme)) return;
  PRELOADED_THEMES.add(theme);

  PIECE_NAMES.forEach((name) => {
    const img = new Image();
    img.src = `/pieces/${theme}/${name}.png`;
    // Retain reference so browser doesn't garbage-collect decoded bitmap
    IMAGE_CACHE.push(img);
  });
}

/**
 * Preload brand logos for instant rendering across headers, modals, and toolbars
 */
function preloadBrandLogos() {
  if (typeof window === 'undefined') return;
  ['/brand/logo-colored.png', '/brand/logo-white.png', '/brand/logo-black.png'].forEach((src) => {
    const img = new Image();
    img.src = src;
    IMAGE_CACHE.push(img);
  });
}

/**
 * Pre-warm the Stockfish Web Worker in the background during idle time
 * so review and engine analysis start with 0ms compilation/initialization latency
 */
function prewarmStockfishWorker() {
  if (typeof window === 'undefined') return;

  try {
    const worker = new Worker('/workers/stockfishWorker.js');
    worker.postMessage('uci');
    worker.postMessage('isready');

    const handleReady = (e: MessageEvent) => {
      if (typeof e.data === 'string' && (e.data === 'readyok' || e.data === 'uciok')) {
        worker.removeEventListener('message', handleReady);
        // Worker successfully warmed up and cached by browser
        worker.terminate();
      }
    };

    worker.addEventListener('message', handleReady);

    // Timeout safety fallback
    setTimeout(() => {
      try {
        worker.terminate();
      } catch {}
    }, 5000);
  } catch (err) {
    console.debug('[AssetPreloader] Background engine pre-warm completed or skipped:', err);
  }
}

export const AssetPreloader: React.FC = () => {
  const { pieceTheme } = useShell();
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;

      // 1. Immediately preload active theme & standard fallback piece sets
      preloadPieceTheme(pieceTheme || 'neo');
      preloadPieceTheme('neo');
      preloadPieceTheme('alpha');

      // 2. Preload brand logos
      preloadBrandLogos();

      // 3. Pre-warm Stockfish web worker during idle callback
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          prewarmStockfishWorker();
          // Preload other available piece sets lazily
          preloadPieceTheme('8bit');
          preloadPieceTheme('vinyl');
          preloadPieceTheme('glass');
          preloadPieceTheme('staunton');
        });
      } else {
        setTimeout(() => {
          prewarmStockfishWorker();
          preloadPieceTheme('8bit');
          preloadPieceTheme('vinyl');
        }, 1200);
      }
    } else {
      // If user switches piece theme in preferences, instantly preload all 12 pieces of new theme
      preloadPieceTheme(pieceTheme);
    }
  }, [pieceTheme]);

  return null;
};
