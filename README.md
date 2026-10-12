# Chess.com Platform - Grandmaster Suite ♟️

A high-performance, standalone, full-featured web replica of the **Chess.com** platform built with **Next.js 16**, **React 19**, **TypeScript**, **Tailwind CSS**, and **chess.js**. Engineered with a "Player-First" design system, Web Audio acoustic feedback, real-time evaluation, AI coaching, tactical training, and grandmaster bots.

---

## 🌟 Key Features

### 1. 🎨 Player-First Interface & Design System
- **Iconic Chess.com UI**: Dark tactile aesthetic (`#161512`), responsive grid layout, coordinate notation, and quick access navigation.
- **Granular Board Customization**:
  - **Themes**: Classic Green (`#779556` / `#ebecd0`), Walnut Wood, Glass & Ice, Cyber Neon, Minimalist Marble, 8-Bit Arcade.
  - **Piece Styles**: Neo, Staunton, 8-Bit, Alpha (rendered in vector SVG).
  - **Board Perspective**: Flip board dynamically for White or Black perspective.
  - **Highlights & Indicators**: Selected square glow, last move indicator, legal move dots / capture rings, and in-check radial glow.

### 2. 🔊 Auditory Feedback Architecture (Web Audio API)
- Zero-latency synthesized sound cues:
  - **Standard Move**: Tactile wooden tap.
  - **Capture**: Heavy impact sound for immediate acoustic feedback.
  - **Check**: High-alert double-tone chime.
  - **Checkmate & Victory**: Triumphant brass harmonic chime with confetti.
  - **Castling**: Dual-glide sound effect.
  - **Low Time**: Clock alert tick under 20 seconds.
- **Sound Themes**: Classic Chess.com, Heavy Oak, Smooth Marble, 8-Bit Arcade, and Silman Minimalist.

### 3. 🧠 Engine Evaluation & Diamond AI Coach
- **Live Evaluation Bar**: Smooth centipawn score bar with sigmoid win probability curve and mate indicators (`+1.4`, `-0.8`, `+M2`).
- **Chess.com Move Classification**:
  - `!!` **Brilliant**: Tactical sacrifices that crush the opponent's position.
  - `!` **Great Move**: Crucial game-winning or saving tactical moves.
  - `★` **Best Move**: Engine's top algorithmic choice.
  - `✓` **Excellent / Good**: Strong positional continuation.
  - `?!` **Inaccuracy**: Concedes minor counterplay.
  - `?` **Mistake**: Shifts advantage to the opponent.
  - `??` **Blunder**: Critical oversight hanging material or mate.
  - `✕` **Miss**: Overlooked decisive tactical win.
- **Coach Danny AI Commentary**: Real-time natural language coaching bubble explaining the strategic reasoning behind every move.
- **Full Game Review Report**: CAPS (Chess Accuracy Percentage System) calculation for White and Black, move quality count tables, and turning-point verdicts.

### 4. 🤖 20+ Computer Bots & Grandmaster Personalities
- **Beginner**: Martin (250), Elani (400), Wayne (700).
- **Intermediate**: Nelson (1300, Scholar's Mate Queen attacker!), Isabel (1600).
- **Advanced & Master**: Wendy (1800), Jonas (2200), Coach Danny (2000).
- **Grandmasters**: Hikaru-bot (2820, fast tactical monster), Magnus-bot (2882, positional squeeze).
- **Interactive Banter**: Bots chat and react dynamically to blunders, checks, good moves, and victories!

### 5. ⚡ Tactical Puzzles & Puzzle Rush
- **Daily Tactics**: Solve curated tactical problems (Forks, Pins, Smothered Mate, Greek Gift, Anastasia's Net, Deflection).
- **3-Minute Puzzle Rush**: Race against the clock, build combo streaks, and avoid 3 strikes (`✕✕✕`).

### 6. 📖 Interactive Opening Explorer
- Deep opening tree with **ECO Codes**, popularity rankings, White/Draw/Black win probability bars, and master move sequences (Ruy Lopez, Sicilian Najdorf, Queen's Gambit, Italian Game, Caro-Kann, London System, King's Indian, etc.).

### 7. 🏛️ Master Historical Games Archive
- Step through immortal games move-by-move with interactive replay:
  - **Paul Morphy's Opera Game** (1858)
  - **Bobby Fischer's Game of the Century** (1956)
  - **Garry Kasparov's Immortal vs Topalov** (1999)

### 8. 🎭 Solo Chess & Blindfold Practice
- **Solo Chess**: Tactical elimination puzzle where every move must be a capture until 1 piece remains.
- **Blindfold Mode**: Invisible piece toggle for high-level mental calculation and board visualization training.

### 9. 🌐 Live Chess.com PubAPI Explorer
- Real-time queries against the official `api.chess.com` REST service to inspect actual grandmaster ratings (Blitz, Rapid, Bullet), profiles, and stats.

### 10. 👑 Subscription Tiers Modal
- Full feature matrix comparing **Free**, **Gold**, **Platinum**, and **Diamond** memberships.

---

## 🚀 Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run the local development server**:
   ```bash
   npm run dev
   ```

3. Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🛠️ Stack & Architecture
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19 + TypeScript
- **Styling**: Tailwind CSS v4 with custom Chess.com color palette
- **Chess Engine**: `chess.js` + custom Minimax Alpha-Beta evaluator & heuristic PST
- **Sound**: Web Audio API AudioContext synthesis
- **Celebration**: `canvas-confetti`
