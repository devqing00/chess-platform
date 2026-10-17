'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chess, Square, PieceSymbol } from 'chess.js';
import { ChessBoard } from '../board/ChessBoard';
import { OpeningCounterEngine, FullOpeningMasteryDossier } from '@/lib/server/openingCounterEngine';
import { BoardTheme, PieceTheme, PieceColor } from '@/types/chess';
import { soundService } from '@/lib/audioService';
import { useXpSystem } from '@/hooks/useXpSystem';
import { useRouter } from 'next/navigation';
import {
  Compass,
  Search,
  RotateCcw,
  Shield,
  Target,
  Sparkles,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Award,
  Play,
  Layers,
  Bot,
} from 'lucide-react';
import { SlideDrawer } from '@/components/ui/SlideDrawer';

interface OpeningExplorerProps {
  boardTheme: BoardTheme;
  pieceTheme: PieceTheme;
}

export const OpeningExplorer: React.FC<OpeningExplorerProps> = ({
  boardTheme,
  pieceTheme,
}) => {
  const router = useRouter();
  const { awardXp } = useXpSystem();
  const dossiers = useMemo(() => OpeningCounterEngine.listAllDossiers(), []);

  const [selectedDossier, setSelectedDossier] = useState<FullOpeningMasteryDossier>(dossiers[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | '1.e4' | '1.d4' | 'flank'>('all');
  const [orientation, setOrientation] = useState<PieceColor>('w');
  const [isCatalogDrawerOpen, setIsCatalogDrawerOpen] = useState(false);

  // Continuation drill state
  const [drillIndex, setDrillIndex] = useState(0);
  const [drillStatus, setDrillStatus] = useState<'idle' | 'practicing' | 'completed'>('idle');
  const [coachFeedback, setCoachFeedback] = useState<string>('');

  // Chess instance synced to opening moves
  const [chess, setChess] = useState<Chess>(() => {
    const c = new Chess();
    // Parse moves string (e.g. "1. e4 e5 2. Nf3 Nc6 3. Bb5")
    const cleanMoves = dossiers[0].moves.replace(/\d+\./g, '').trim().split(/\s+/);
    cleanMoves.forEach((san) => {
      try { c.move(san); } catch {}
    });
    return c;
  });

  const loadOpeningDossier = useCallback((dossier: FullOpeningMasteryDossier) => {
    setSelectedDossier(dossier);
    const c = new Chess();
    const cleanMoves = dossier.moves.replace(/\d+\./g, '').trim().split(/\s+/);
    cleanMoves.forEach((san) => {
      try { c.move(san); } catch {}
    });
    setChess(c);
    setDrillIndex(0);
    setDrillStatus('idle');
    setCoachFeedback(`Opening loaded: ${dossier.name}. Inspect the counter-opening strategy on the right.`);
    soundService.playMove();
  }, []);

  const filteredDossiers = useMemo(() => {
    return dossiers.filter((d) => {
      const matchesSearch =
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.eco.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        categoryFilter === 'all' ||
        (categoryFilter === '1.e4' && d.moves.startsWith('1. e4')) ||
        (categoryFilter === '1.d4' && d.moves.startsWith('1. d4')) ||
        (categoryFilter === 'flank' && !d.moves.startsWith('1. e4') && !d.moves.startsWith('1. d4'));
      return matchesSearch && matchesCategory;
    });
  }, [dossiers, searchQuery, categoryFilter]);

  // Handle board move in interactive continuation drill
  const handleMove = (from: Square, to: Square, promotion?: PieceSymbol) => {
    try {
      const copy = new Chess(chess.fen());
      const move = copy.move({
        from,
        to,
        promotion: promotion || 'q',
      });
      if (!move) return;

      const currentBranch = selectedDossier.continuationTree[drillIndex];

      if (currentBranch && move.san.toLowerCase() === currentBranch.moveSan.toLowerCase()) {
        setChess(copy);
        soundService.playMove();

        setCoachFeedback(`Correct! ${move.san}: ${currentBranch.coachNote}`);

        // Opponent master response
        setTimeout(() => {
          if (currentBranch.responseSan) {
            const oppCopy = new Chess(copy.fen());
            try {
              oppCopy.move(currentBranch.responseSan);
              setChess(oppCopy);
              soundService.playMove();
            } catch {}
          }

          const nextIndex = drillIndex + 1;
          if (nextIndex >= selectedDossier.continuationTree.length) {
            setDrillStatus('completed');
            soundService.playGameEndWin();
            awardXp(30, `Mastered Continuation: ${selectedDossier.name}`);
            setCoachFeedback(`Continuation line mastered! You have successfully practiced the ${selectedDossier.bestCounterOpening.counterName}.`);
          } else {
            setDrillIndex(nextIndex);
          }
        }, 500);
      } else {
        // Move made outside continuation line
        setChess(copy);
        soundService.playMove();
        setCoachFeedback(`${move.san} played. Explore freely or click Reset to practice the recommended counter-line.`);
      }
    } catch {
      // Invalid move ignored
    }
  };

  const handleResetBoard = () => {
    loadOpeningDossier(selectedDossier);
  };

  return (
    <div className="w-full h-full min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch select-none text-zinc-100">
      {/* LEFT COLUMN (3 Cols on desktop / Drawer on small screens): OPENINGS DIRECTORY */}
      <div className="hidden lg:flex lg:col-span-3 h-full p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex-col gap-3 min-h-0">
        <div className="flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Opening Directory
            </span>
            <span className="text-[10px] font-mono text-zinc-500 font-bold">
              {filteredDossiers.length} Lines
            </span>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search ECO or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 rounded-lg bg-[#141311] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#81b64c]"
            />
          </div>

          {/* Category Filters */}
          <div className="flex items-center gap-1">
            {(['all', '1.e4', '1.d4', 'flank'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`flex-1 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-[#81b64c] text-black font-black'
                    : 'bg-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Directory List */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-1.5">
          {filteredDossiers.map((d) => {
            const isSelected = selectedDossier.eco === d.eco;
            return (
              <button
                key={d.eco}
                onClick={() => loadOpeningDossier(d)}
                className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                  isSelected
                    ? 'bg-white/15 border-[#81b64c] shadow-sm'
                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white truncate max-w-[150px]">
                    {d.name}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-[#81b64c] bg-[#81b64c]/10 px-1.5 py-0.2 rounded">
                    {d.eco}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono truncate">{d.moves}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CENTER COLUMN (5 Cols): INTERACTIVE BOARD & CONTINUATION STEPPER */}
      <div className="lg:col-span-5 h-full p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3 min-h-0">
        {/* Top Board HUD */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-extrabold text-white truncate">
              {selectedDossier.name}
            </span>
            <span className="text-[10px] font-mono text-zinc-400">({selectedDossier.eco})</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setOrientation((prev) => (prev === 'w' ? 'b' : 'w'))}
              className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold cursor-pointer"
              title="Flip Board"
            >
              Flip: {orientation === 'w' ? '⚪' : '⚫'}
            </button>
            <button
              onClick={handleResetBoard}
              className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 cursor-pointer"
              title="Reset to Opening Moves"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* The Board */}
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div className="h-full max-h-[400px] aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-xl bg-black">
            <ChessBoard
              chess={chess}
              orientation={orientation}
              boardTheme={boardTheme}
              pieceTheme={pieceTheme}
              onMove={handleMove}
            />
          </div>
        </div>

        {/* Coach Danny Live Continuation Feedback */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-zinc-200 leading-snug shrink-0">
          <div className="flex items-center gap-1.5 text-[#81b64c] font-bold text-[10px] uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Coach Danny &bull; Continuation Strategy</span>
          </div>
          <p>{coachFeedback}</p>
        </div>

        {/* Continuation Line Stepper Buttons */}
        <div className="flex items-center gap-2 pt-1 border-t border-white/5 shrink-0">
          <button
            onClick={() => {
              setDrillStatus('practicing');
              setDrillIndex(0);
              const c = new Chess();
              const cleanMoves = selectedDossier.moves.replace(/\d+\./g, '').trim().split(/\s+/);
              cleanMoves.forEach((san) => {
                try { c.move(san); } catch {}
              });
              setChess(c);
              const branch = selectedDossier.continuationTree[0];
              setCoachFeedback(`Practice Mode Active: Play the counter move ${branch?.moveSan || 'your move'}.`);
            }}
            className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Practice Counter Continuation</span>
          </button>

          <button
            onClick={() => router.push(`/bots?fen=${encodeURIComponent(chess.fen())}`)}
            className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            title="Spar current position against Bot"
          >
            <Bot className="w-3.5 h-3.5 text-amber-400" />
            <span>Spar Bot</span>
          </button>
        </div>
      </div>

      {/* RIGHT COLUMN (4 Cols): COUNTER-OPENING STRATEGY DOSSIER */}
      <div className="lg:col-span-4 h-full p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3 min-h-0">
        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto pr-1">
          {/* Header Badge */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Recommended Counter-System</span>
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {selectedDossier.bestCounterOpening.difficulty}
            </span>
          </div>

          {/* Counter Name & Moves Card */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-rose-950/30 to-[#141311] border border-rose-500/30 flex flex-col gap-1.5">
            <h4 className="text-sm font-extrabold text-white">
              {selectedDossier.bestCounterOpening.counterName}
            </h4>
            <span className="font-mono text-xs font-bold text-rose-300">
              {selectedDossier.bestCounterOpening.counterMoves}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              Advantage: {selectedDossier.bestCounterOpening.winRateAdvantage}
            </span>
          </div>

          {/* Why It Works Breakdown */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Why This Counter Works
            </span>
            <p className="text-xs text-zinc-300 leading-relaxed font-medium">
              {selectedDossier.bestCounterOpening.whyItWorks}
            </p>
          </div>

          {/* Key Pawn Breaks */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Key Strategic Pawn Breaks
            </span>
            <div className="flex flex-wrap gap-1.5">
              {selectedDossier.bestCounterOpening.keyPawnBreaks.map((pb, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] font-mono font-bold text-amber-300"
                >
                  {pb}
                </span>
              ))}
            </div>
          </div>

          {/* Winning Roadmap */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Strategic Winning Roadmap
            </span>
            <div className="flex flex-col gap-1 text-xs text-zinc-300">
              {selectedDossier.winningRoadmap.map((step, idx) => (
                <div key={idx} className="flex items-start gap-1.5">
                  <span className="text-[#81b64c] font-black shrink-0">&bull;</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Common Pitfalls & Traps Alert */}
          {selectedDossier.commonTraps && selectedDossier.commonTraps.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col gap-1 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Tactical Pitfalls to Avoid</span>
              </span>
              <p className="text-zinc-300 leading-snug">{selectedDossier.commonTraps[0]}</p>
            </div>
          )}
        </div>

        {/* P1 PRIMARY ACTION ANCHOR - EXACTLY ONE PER SCREEN */}
        <div className="pt-2 border-t border-white/5 shrink-0">
          <button
            onClick={() => {
              setDrillStatus('practicing');
              setDrillIndex(0);
              const branch = selectedDossier.continuationTree[0];
              setCoachFeedback(`Drill Active: Play ${branch?.moveSan} on the board to refute the opening.`);
            }}
            className="w-full py-3.5 px-4 rounded-xl bg-[#81b64c] hover:bg-[#92cb56] text-black font-black text-xs sm:text-sm tracking-tight shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Master Counter Line (+30 XP)</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>
    </div>
  );
};
