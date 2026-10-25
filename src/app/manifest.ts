import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Check.mate - Play Chess Online & Master Tactics',
    short_name: 'Check.mate',
    description: 'The premier chess platform featuring Stockfish evaluation, AI Coach explanations, 20+ grandmaster bots, tactical puzzles, opening explorer, and game review.',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    theme_color: '#161512',
    background_color: '#161512',
    categories: ['games', 'sports', 'entertainment'],
    lang: 'en',
    dir: 'ltr',
    prefer_related_applications: false,
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'Play Online PvP',
        short_name: 'Play',
        description: 'Instant matchmaking live chess against players worldwide',
        url: '/play?source=shortcut',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Grandmaster Bots',
        short_name: 'Bots',
        description: 'Spar with 20+ grandmaster and personality chess engines',
        url: '/bots?source=shortcut',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Tactical Puzzles',
        short_name: 'Puzzles',
        description: 'Solve rated tactical puzzles and sharpen your tactical eye',
        url: '/puzzles?source=shortcut',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Analysis Board',
        short_name: 'Analysis',
        description: 'Deep Stockfish analysis with evaluation graph & coach insights',
        url: '/analysis?source=shortcut',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
    ],
  };
}
