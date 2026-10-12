# CHESS PLATFORM — FULL REPLICATION SPECIFICATION & POST-REPLICATION REMEDIATION PLAN
## Functional & Interface Parity Blueprint (Reference Model: Chess.com, research current as of Oct 2026)

> **Compliance Notice (read first).** Chess.com's API terms explicitly reserve "chessboard color palettes, piece designs, sound effects, move classification glyphs, feature names" and "UI/UX/design" as protected IP. This document therefore specifies **behavior, architecture, layout grammar, interaction logic, and token systems** — all of which are replicable with original work — and flags every place where original assets (piece sets, sounds, themes, glyphs) must be produced rather than copied. Pixel-for-pixel asset cloning is out of scope and legally inadvisable. "100% functional parity" is the target; "100% visual identity cloning" is not.

---

# PART A — REPLICATION SPECIFICATION

## A1. Information Architecture (Site Map)

```
/ (Home: quick-play card, daily puzzle, lessons teaser, news feed, friends strip)
├── /play
│   ├── /play/online      (matchmaking lobby: time-control selector, rated/casual, color)
│   ├── /play/computer    (bots: personalities, ELO bands, personalities unlock ladder)
│   ├── /play/friend      (challenge by username, link, or in-app friends)
│   └── variants hub      (Chess960, King of the Hill, 3-check, Horde, Racing Kings, Crazyhouse,
│                          Bughouse, 4-player chess)   ← known IA weakness; see remediation R2
├── /game/{id}            (live game surface; also embeddable widget)
├── /analysis             (blank analysis board + PGN/FEN import, local engine)
├── /game/review/{id}     (post-game engine report: accuracy, classifications, key moments)
├── /daily/{id}           (correspondence chess: conditional moves, vacation, time budgets)
├── /puzzles              (rated puzzles, Puzzle Rush, Puzzle Battle, Puzzle Survival, Learning Mode)
├── /lessons              (curriculum tree by level: beginner→advanced, video + interactive)
├── /openings             (explorer: player games / master games / engine eval tabs)
├── /endgames             (guided endgame trainer, per-piece sectioning)
├── /insights             (longitudinal stats: per-piece strength, openings, weakness maps) [Diamond]
├── /clubs, /tournaments, /teams
├── /friends, /messages   (realtime chat, with moderation pipeline)
├── /settings             (board, pieces, sound theme, notifications, accessibility, privacy)
├── /member               (entitlements, billing, Friends & Family plan admin)
└── /developer            (public REST API docs — see A10)
```

**Layout grammar (non-negotiable parity rules):**
1. **Board-left / context-right.** Game surfaces allocate ~60–70% viewport width to the board on the left; a scrollable right pane carries move list, captured pieces, clocks, chat, and tabbed tools (analysis, explorer, review). The board must never scroll out of view.
2. **Game-over modal.** On terminal state, an interruptive centered modal shows result + rating delta + a dominant **"Review Game"** CTA (funnel into analysis = core retention loop).
3. **Modal patterns** for: draw offer (accept/decline inline), rematch offer, takeback request, resignation confirm, time-forfeit claim after opponent disconnect.
4. **Breakpoints:** desktop ≥1200px (board + right pane side by side); tablet 768–1199px (collapsible right pane, hamburger IA); mobile <768px (board full-width, context as bottom sheet / tabs; all flows must be completable one-handed).
5. **Dark-mode-first** design: default theme dark charcoal surfaces; light theme parity required; system-preference detection + manual override.

## A2. Design Token System (to be implemented natively, assets original)

Implement as CSS custom properties / design-token JSON consumed by web + native:

- **Color tokens:** `--surface-base`, `--surface-raised`, `--surface-overlay`, `--text-primary`, `--text-secondary`, `--text-disabled`, `--accent-primary` (brand CTA), `--accent-danger`, `--accent-success`, `--border-subtle`, `--board-light`, `--board-dark` (user-overridable per theme), `--move-highlight`, `--last-move-highlight`, `--check-highlight` (must be distinguishable for color-blind users — see A9).
- **Spacing scale:** 4px base grid; component density tokens (compact/comfortable).
- **Type scale:** 12 / 14 / 16 / 20 / 28 / 40 px with weight and line-height tokens; numeric/tabular figures for clocks and move lists.
- **Elevation/overlay tokens:** modal scrim opacity, sheet shadows.
- **Motion tokens:** piece slide duration (~120–180ms ease-out), capture scale-pop, promotion dialog rise, check flash, modal fade/slide. All tokens gated by `prefers-reduced-motion`.
- **Board themes:** 20+ swappable themes via asset packs (original artwork). **Piece sets:** multiple original 2D sets + optional 3D mode with camera angles. Architecture: static asset CDN with pack manifest identical to the theme system used for sounds (see A7) — one primitive, three asset types (board, pieces, sounds).

## A3. Board Rendering & In-Game Interaction (deepest parity layer)

**Rendering:**
- HTML5 Canvas or WebGL with devicePixelRatio-aware scaling (crisp on retina); piece sprites from the active piece-set pack; 3D mode as separate renderer.
- Square highlighting layers beneath pieces: last-move, legal-move dots (or target highlights — user choice), hover, selected piece, check (pulsing king square), premove (distinct color), drawn arrows (color + transparency), coordinate labels (toggleable: all squares / corners / none; style: letters-rank files bottom).

**Interaction state machine (must replicate exactly):**
1. **Selection:** click/tap selects (ring highlight); click destination moves; illegal target → shake animation + soft error cue. Drag-and-drop *and* click-to-move both supported (click-to-move required for motor accessibility); user picks default.
2. **Legal move indicators:** dots on empty targets; capture targets shown as ring/corner marker; castling shown by king-to-rook glyph; en passant inferable.
3. **Premoves:** queue up to N premoves (typically unlimited queue in blitz culture — verify parity; Chess.com queues multiple); visualized as ghost arrows; executed instantly on opponent's move; invalid premove silently dropped with subtle cue.
4. **Promotion:** auto-queen toggle in settings; when off → promotion picker dialog.
5. **Draw/castling/en-passant indicators** in move list (0-0, e.p., =, +, #).
6. **Captured material tray:** piece icons with material-count diff (+/−), placed adjacent to the player it was captured *from*.
7. **Clocks:** per-player digital clock with tenths-of-seconds below 20s (parity detail), active-clock pulse, flag-fall auto-detection, "low time" state change.
8. **Lag/disconnect:** connection status icon; auto-reconnect with resume; opponent-disconnect grace period → "claim win" affordance.
9. **Move list:** two-column SAN, scroll-follows-current, clickable to jump (with live-position guard), variations in analysis mode.
10. **Drawn arrows:** right-drag (desktop) draws colored arrows; shift/right-click variants; clear on click; persists per-user session.

**Game lifecycle UX:** seek creation (time-control grid: bullet/blitz/rapid/daily presets + custom), pairing animation, abort window (first N moves, no rating loss), resignation flow, timeout vs. insufficient-material auto-draws, threefold/fifty-move claim buttons, takeback & draw & rematch offers as inline banners.

## A4. Matchmaking & Game Modes

- **Lobby/matchmaking:** queue by time control + rated toggle + rating band widening over wait time; rematch offer on game end; new-opponent quick action.
- **Daily/correspondence:** conditional move sequences, move-time budgets, vacation setting, max-games management.
- **Bots:** ELO-banded personalities with opening preferences; bot games rated/unrated toggle.
- **Variants:** full rules engines per variant (drop rules for Crazyhouse, pocket UI, 4-player partnership logic, material-spawn for Horde, etc.).
- **Tournaments:** arenas (points system, berserk), swiss, round-robins, club-internal; join/waiting-room lobby UX.
- **Clubs:** join/leave, club matches (vote chess + team matches), club news feed, admin roles.
- **Anti-cheat hook points:** client reports timing stats; server-side engine-correlation screening flag (spec the *integration points* only).

## A5. Analysis & Game Review Engine (the parity-critical subsystem)

**Self-Analysis (free-tier parity):**
- Local engine via Stockfish WASM/NNUE in-browser; multi-PV (up to 3+), depth display, eval graph (centipawn-to-winning-chances conversion), FEN/PGN import/export, infinite analysis, engine lines clickable to board.
- **Opening explorer tabs:** (a) master games with win/draw/loss bars and move-frequency, (b) personal games filtered by time control/rated, (c) engine evaluation — free tier gated to shallow depth (4 plies parity), unlimited on paid.
- **Endgame tablebase integration:** with ≤7 pieces, server tablebase returns exact WDL + DTZ; free tier shows first position per section, all unlocked on paid (parity with tier gating).
- Alternate-line **pop-out board** (separate window, user-resizable).

**Game Review (server-side, all tiers with per-day free ration):**
- Accuracy score (CAPS-style, 0–100) per player.
- Move classification per move: Brilliant, Great, Best, Excellent, Good, Book, Inaccuracy, Mistake, Blunder — with distinct **original glyph/icon set** (classification glyphs are Chess.com IP — recreate iconography).
- Key moments detection (largest eval swings), game-phase breakdown, retry-your-mistakes mode, auto-generated follow-up puzzles/lessons from your errors.
- Coach Explanations tier: templated natural-language coach copy per classification + eval context (heavily tier-gated).

**Cloud analysis (top-tier exclusive parity):** server farm running stronger engine than client WASM; job continues server-side while user navigates away; "Deep" and "Maximum" strength tiers for review; queue/fair-use limits per subscription.

## A6. Learning Systems

- **Puzzles:** server-generated from master games; rating system (Glicko-class); per-attempt feedback; themes tagged; **Learning Mode** (filter by theme + rating band) — paid-unlimited parity.
- **Puzzle Rush:** 3/5-minute survival + Puzzle Battle (head-to-head), leaderboard surfaces.
- **Lessons:** curriculum DAG by level; video + interactive boards; completion tracking; one-free-lesson-per-week ration parity.
- **Drills/repetition:** spaced-repetition queue of failed puzzles.
- **Coach games:** play-against-coach variant where coach comments (paid unlimited).

## A7. Sound Design Specification (original audio assets; behavior parity)

Serve per-theme WebM/Opus packs from CDN with manifest: `sounds/{theme}/{event}.webm`.

| Event | Required behavior | Acoustic direction (original) |
|---|---|---|
| self-move | distinct from opponent-move | short mid-frequency woody "thock" |
| opponent-move | variant timbre of self-move | same family, slightly different attack |
| capture | sharper percussive impact | heavier transient, decay <300ms |
| check | alert tone | distinct pitch band, must cut through focus |
| castle | dedicated cue | two-beat "switch" motif |
| promotion | dedicated cue | rising two-note motif |
| game-start | fanfare | short rising motif |
| game-end (win/loss/draw variants) | resolution sting | win=major resolve, loss=minor fall, draw=neutral |
| **checkmate** | **check cue + game-end sting (no standalone asset)** | two-stage construction, mandatory |
| low-time (≤10s) | **audible, urgent, user-configurable volume** | high-register tick, ≥60dB relative, vibrate on mobile |
| draw offer / takeback / rematch banners | soft notification blip | non-startling |
| reconnect | subtle confirm | soft ping |

**Engineering:** Web Audio API with per-category gain buses (master / effects / voice), theme hot-swap without reload, per-event preview in settings, mute persistence, audio ducking when tab unfocused (configurable), opponent-move cue throttling (never clip during bullet scrambles), iOS silent-switch compliance note.

**Voice layer (accessibility parity):** Voice Mode announcing moves in SAN ("Knight takes f7, check"); full voice command control (hold-space push-to-talk): move entry by square, capture/castle/promotion commands, resign/draw/rematch/start; audio feedback for opponent moves, draw offers, reconnects, results.

## A8. Entitlements & Tier System (gating logic parity)

Entitlement service mapping feature → tier, enforced **server-side** (never trust client):

| Entitlement | Free | Gold | Platinum | Diamond |
|---|---|---|---|---|
| Ads | yes | no | no | no |
| Puzzles/day | ~3 | ∞ | ∞ | ∞ |
| Puzzle Rush/day | ~1 | ∞ | ∞ | ∞ |
| Lessons | 1/week | ∞ | ∞ | ∞ |
| Coach games | limited | ∞ | ∞ | ∞ |
| Game Review/day | 1 | 1 | ∞ | ∞ |
| Review engine strength | Fast/Standard | Fast/Standard | Fast/Standard | + Deep/Maximum |
| Coach Explanations | — | — | — | ✔ |
| Insights | — | — | — | ✔ |
| Cloud analysis | — | — | — | ✔ |
| 7-piece tablebases | first/section | all | all | all |
| Opening explorer depth | 4 plies | ∞ | ∞ | ∞ |
| Puzzle Learning Mode | limited | ✔ | ✔ | ✔ |

Plus: Friends & Family plan (primary + 5 invitees, full benefits), web + mobile cross-entitlement, billing (web IAP parity + app-store IAP with storefront price differences), downgrade grace behavior, gift memberships.

## A9. Accessibility Specification (target WCAG 2.2 AA minimum — parity where competitor lags, exceed where remediation demands)

- Screen-reader semantics on all chrome (move list as live region announcing moves), board as ARIA grid alternative + Voice Mode output.
- Click-to-move, keyboard-only play (arrow-key square navigation, Enter select/place), configurable keybinds.
- `prefers-reduced-motion` honored for all piece animations/modals; animation-speed setting.
- Color-blind-safe board themes and *purpose-built high-contrast theme* (not offered by reference — exceeds parity).
- Full voice control + voice narration (A7).
- Focus management in modals, minimum touch target 44px, scalable UI text, no information by color alone (classification glyphs carry shapes, not only colors).

## A10. Public API (PubAPI parity)

Read-only REST, JSON-LD, base `/pub/`, **no auth**, ETag/Last-Modified with 304 support, rate limiting with 429 + `Retry-After`. Endpoints:

```
/pub/player/{username}            /pub/player/{username}/stats
/pub/player/{username}/games/{YYYY}/{MM}   (multi-game PGN)
/pub/player/{username}/games/archives    /pub/titled/{title-abbv} (GM..WCM)
/pub/player/{username}/clubs      /pub/club/{id}[/members|/matches]
/pub/tournament/{id}[-{round}|-{group}]   /pub/tournaments (arena/daily/live, archive)
/pub/team/match/{id}              /pub/team/{country}/matches/{YYYY}/{MM}
/pub/country/{code}               /pub/country/{code}/players
/pub/daily_puzzle  +  /pub/random           (public puzzles incl. solution)
/pub/leaderboards                   /pub/streamers
```
Rules: descriptive `User-Agent` with contact info required; no move submission; no private data (chat, conditional moves); publish terms prohibiting scraping of protected UI assets (pieces/sounds/themes) — mirror that stance.

## A11. Realtime & Backend Architecture (functional parity requirements)

- **Server-authoritative:** all moves validated server-side; client optimistic rendering allowed but reconciled.
- **Persistent connection** (WebSocket class) per game; broadcast state deltas; heartbeat; resume tokens for reconnection mid-game.
- **Active-game state** in in-memory store (Redis-class) with durability journal; sub-100ms move-ack p50 target.
- **Engine pipeline:** local WASM Stockfish for client analysis; server engine fleet for Game Review (queue, priority by tier) and cloud analysis (exclusive tier); tablebase service (7-man Syzygy-class) with WDL/DTZ API.
- **Puzzle pipeline:** game ingestion → tactic extraction → rating seeding → distribution.
- **Notifications:** push (mobile) + email digest; webhook-ish polling for API consumers.
- **Moderation:** chat filter pipeline, reporting, fair-play flag store.
- **Observability:** per-feature entitlement audit, engine-queue metrics, sound-event telemetry (opt-in).

## A12. Acceptance / Parity Test Matrix (excerpt)

| # | Area | Parity test |
|---|---|---|
| 1 | Board render | DPR-crisp pieces at 1×/2×/3×; all 20+ themes + all piece sets swap without reload |
| 2 | Input | click-to-move & drag parity; premove queue executes in order; illegal move shakes + cues |
| 3 | Clocks | tenths below threshold; flag fall; low-time state + sound fires at 10.0s |
| 4 | Move list | SAN complete incl. 0-0/e.p./=Q/+/ #; jump-to-move guards live game |
| 5 | Review | accuracy + 9 classifications + key moments match reference behavior on same PGN |
| 6 | Explorer | master/personal tabs; free-tier depth gate server-enforced |
| 7 | Tablebase | ≤7 pieces → exact WDL; gate correct per tier |
| 8 | Sounds | per-event distinct; dual self/opponent cues; checkmate = check + end sting; low-time configurable |
| 9 | Voice | full game completable by voice; Voice Mode SAN accuracy |
| 10 | Entitlements | every gate server-enforced; downgrade behavior correct; F&F sharing works |
| 11 | API | all endpoints; 304 caching; 429 throttling; UA policy |
| 12 | Accessibility | keyboard-only full game; SR navigation of chrome; reduced-motion honored |
| 13 | Mobile | all flows one-handed; bottom-sheet context; reconnect resume |
| 14 | Anti-abort/disconnect | claim-win window, auto-draws (insufficient material), threefold claim |

---

# PART B — POST-REPLICATION REMEDIATION PLAN
## (Deliberate deviations: fix the reference platform's documented weaknesses)

| ID | Weakness (documented in reference) | Remediation in our build |
|---|---|---|
| R1 | **Low-time warning barely audible, not customizable, fires too late** — users miss it under focus; requests for alternate registers/custom sounds ignored for years | Ship with: volume slider + register choices (tick/shrill/beep/voice countdown), threshold user-settable (5/10/15/20s), optional vibration, "never below X% volume" override. Acceptance: audible in music playback at 50% volume in user testing. |
| R2 | **Redundant "Play" entry points** (Play → Play vs Play → Live Chess confusion); variants hub "a mess" | Single Play surface with one clear primary action; variants as first-class filter chips on the same screen; IA tree depth ≤2 for all core actions. Task-test: new user starts a 10-min game in <3 clicks from home. |
| R3 | **Accessibility debt: decade-long screen-reader neglect; contrast failures; non-resizable pop-outs; no font controls; no visual-impairment board themes** | Ship R1 of our build *with* R3 complete: purpose-built high-contrast + low-vision themes at launch, resizable/undockable pop-out boards, font-size token scale, WCAG 2.2 AA contrast audits in CI (axe), Voice Mode from day one — position as our differentiator. |
| R4 | **April 2026 mobile redesign backlash:** forced friends strip consuming half the home screen, buried puzzle streaks, horizontal-scrolling history, **zero home-screen customization**; cited as subscription-cancellation trigger | Home screen = user-composable widget grid (long-press to add/remove/reorder: quick play, puzzle streak, friends, lessons, news). Every section collapsible. Roll out via beta cohort with rollback flag. |
| R5 | **Coach Explanations quality** criticized ("literally useless") | Tier explanations by depth (summary → concept → line), source them from curated coach-content graph keyed to classification + opening family + eval swing; measure usefulness via post-game survey and thumbs signal. |
| R6 | **Weak CTA contrast / conversion friction** in acquisition surfaces | Token-driven CTA audit: accent vs. surface contrast ≥4.5:1; single primary action per screen. |
| R7 | **Muted sound ≠ consistent across surfaces; per-event preview exists but no per-event volume** | Per-event + per-category gain buses exposed in settings (R1) with presets (Focus / Casual / Commentary). |
| R8 | **Alternate-line pop-out not resizable; board magnification quirks** | Pop-out freely resizable + zoom slider; "magnify piece on select" fully configurable with live preview in settings. |
| R9 | **Free-tier ad friction** slows games; ration design occasionally feels punitive | Ads never inside the game surface (between games only); clear "what you unlock" preview per ration gate; puzzle-streak protection (never lose a streak to a gate). |
| R10 | **Rating/UX polish invariants the reference gets right — protect them** | Guardrail list (do NOT regress in remediation): board-left grammar, game-over modal → Review funnel, dual-perspective sounds, two-stage checkmate cue, arrow drawing, Puzzle Rush cadence, lesson-ration generosity. |

## Remediation sequencing
- **Phase 1 (ship-blockers):** R1, R3, R7 (sound + accessibility must be right at launch — they are the reference's loudest failures).
- **Phase 2 (first 90 days):** R2, R4, R6, R8 (IA + mobile home + conversion + board polish).
- **Phase 3 (continuous):** R5, R9, R10 guardrail enforcement + telemetry-driven iteration.
Each remediation ships behind a flag with an A/B read; guardrail metrics (game-start rate, review-completion rate, puzzle-streak retention) must not regress >2% relative.

---

*Document generated 2026-10-12. Reference behaviors verified against community documentation, official help center, API terms, and technical analyses available as of that date. Implement original artwork, audio, and iconography throughout; this spec deliberately describes behavior and architecture rather than protected assets.*
