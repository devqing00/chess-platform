'use client';

import React, { useState } from 'react';
import { Chess, Square, PieceSymbol } from 'chess.js';
import { ChessBoard } from '../board/ChessBoard';
import { ClassificationBadge, CLASSIFICATION_CONFIG } from '../board/ClassificationBadge';
import { PieceIcon } from '../board/PieceIcons';
import { CoachDannyAvatar } from './CoachDannyAvatar';
import { MentorAvatar } from './MentorAvatar';
import { useShell } from '@/context/ShellContext';
import { getMentorById } from '@/lib/mentorsData';
import {
  GameReviewReport,
  BoardTheme,
  PieceTheme,
  MoveClassification,
  EngineStrengthTier,
  ENGINE_STRENGTH_CONFIGS,
} from '@/types/chess';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Volume2,
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  X,
  Target,
  Layers,
  Cpu,
  Flame,
  Network,
  Bot,
  Microscope,
  MoreHorizontal,
  RefreshCw,
  Award,
  Trophy,
  Flag,
  Clock,
  Shield,
  ChevronLeft,
  ChevronRight,
  Zap,
  Check,
  Star,
} from 'lucide-react';
import { formatGameOutcomeDescription, extractTerminationReason, isSessionUserWhite } from '@/lib/gameSessionStore';
import { calculateGameAdvancedStats } from '@/lib/advancedStatsCalculator';
import { soundService } from '@/lib/audioService';
import confetti from 'canvas-confetti';

interface GameReviewSummaryViewProps {
  report: GameReviewReport;
  boardTheme: BoardTheme;
  pieceTheme: PieceTheme;
  engineStrength?: EngineStrengthTier;
  onStartInteractiveReview: () => void;
  onBackToGame: () => void;
  onEngineChange?: (engine: 'torch_human' | 'stockfish') => void;
  onStrengthChange?: (strength: EngineStrengthTier) => void;
  onReanalyze?: () => void;
}

export const GameReviewSummaryView: React.FC<GameReviewSummaryViewProps> = ({
  report,
  boardTheme,
  pieceTheme,
  engineStrength,
  onStartInteractiveReview,
  onBackToGame,
  onEngineChange,
  onStrengthChange,
  onReanalyze,
}) => {
  const router = useRouter();
  const { activeMentorId, analysisEngine, setAnalysisEngine } = useShell();
  const currentMentor = getMentorById(activeMentorId);
  const { whitePlayer, blackPlayer, whiteAccuracy, blackAccuracy, tallies, evalTimeline, moves } = report;

  const isUserWhite = React.useMemo(() => {
    return isSessionUserWhite(report as any);
  }, [report]);

  // Authoritative Game Outcome details
  const gameOutcome = React.useMemo(() => {
    let winner = report.resultDetails?.winner;
    const res = (report.gameResult || '').trim().toLowerCase();
    if (res.includes('white win') || res.includes('white won') || res.includes('1-0')) {
      winner = 'w';
    } else if (res.includes('black win') || res.includes('black won') || res.includes('0-1')) {
      winner = 'b';
    } else if (!winner) {
      if (report.gameResult === '1-0') winner = 'w';
      else if (report.gameResult === '0-1') winner = 'b';
      else if (report.gameResult?.includes('1/2') || report.gameResult?.includes('0.5')) winner = 'draw';
      else winner = isUserWhite ? 'w' : 'b';
    }
    const reason = report.resultDetails?.reason || (report.termination ? extractTerminationReason({ pgn: `[Termination "${report.termination}"]` }) : 'resignation');
    return formatGameOutcomeDescription({
      winner,
      reason,
      whiteName: whitePlayer.name,
      blackName: blackPlayer.name,
      isUserWhite,
    });
  }, [report, whitePlayer.name, blackPlayer.name, isUserWhite]);

  // Mobile sub-tab state for zero-scroll viewport
  const [mobileTab, setMobileTab] = useState<'stats' | 'board'>('stats');

  // Board position for summary: show final move or most brilliant move
  const keyMove = moves.find((m) => m.classification === 'brilliant') || moves[moves.length - 1];
  const summaryChess = new Chess(keyMove ? keyMove.fenAfter : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

  // Multi-Mistake Interactive Practice Queue (Spaced Repetition across blunders, misses & mistakes)
  const userMistakesPuzzles = React.useMemo(() => {
    const list: Array<{
      ply: number;
      moveNumber: number;
      fen: string;
      blunderedMoveSan: string;
      solutionSan: string;
      classification: MoveClassification;
      explanation: string;
      motif?: { type: string; description: string };
    }> = [];

    moves.forEach((m, idx) => {
      const isWhite = idx % 2 === 0;
      const isUser = isUserWhite ? isWhite : !isUserWhite;
      if (isUser && (m.classification === 'blunder' || m.classification === 'miss' || m.classification === 'mistake')) {
        list.push({
          ply: idx + 1,
          moveNumber: Math.floor(idx / 2) + 1,
          fen: m.fenBefore,
          blunderedMoveSan: m.san,
          solutionSan: m.bestMoveSan || '',
          classification: m.classification,
          explanation: m.coachComment || '',
          motif: m.motif,
        });
      }
    });

    if (list.length === 0 && report.blunderRetryPuzzle) {
      list.push({
        ply: report.blunderRetryPuzzle.ply,
        moveNumber: Math.ceil(report.blunderRetryPuzzle.ply / 2),
        fen: report.blunderRetryPuzzle.fen,
        blunderedMoveSan: report.blunderRetryPuzzle.blunderedMoveSan,
        solutionSan: report.blunderRetryPuzzle.solutionSan,
        classification: 'blunder',
        explanation: report.blunderRetryPuzzle.explanation,
      });
    }

    return list;
  }, [moves, isUserWhite, report.blunderRetryPuzzle]);

  const [currentMistakeIndex, setCurrentMistakeIndex] = useState(0);
  const [solvedMistakes, setSolvedMistakes] = useState<Set<number>>(new Set());
  const [isBlunderModalOpen, setIsBlunderModalOpen] = useState(false);
  const [blunderStatus, setBlunderStatus] = useState<'idle' | 'correct' | 'wrong' | 'revealed'>('idle');
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  const activeMistakePuzzle = userMistakesPuzzles[currentMistakeIndex] || userMistakesPuzzles[0];

  const [blunderChess, setBlunderChess] = useState(() => {
    return new Chess(
      activeMistakePuzzle?.fen || report.blunderRetryPuzzle?.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    );
  });

  const loadMistakeIndex = (idx: number) => {
    const target = userMistakesPuzzles[idx];
    if (target) {
      setCurrentMistakeIndex(idx);
      setBlunderChess(new Chess(target.fen));
      setBlunderStatus(solvedMistakes.has(idx) ? 'correct' : 'idle');
    }
  };

  const handleBlunderMove = (from: Square, to: Square, promotion?: PieceSymbol) => {
    if (!activeMistakePuzzle || blunderStatus === 'correct' || blunderStatus === 'revealed') return;

    try {
      const clone = new Chess(blunderChess.fen());
      const res = clone.move({ from, to, promotion: promotion || 'q' });
      if (!res) return;

      const isSolution =
        res.san === activeMistakePuzzle.solutionSan ||
        `${res.from}${res.to}`.toLowerCase() === activeMistakePuzzle.solutionSan.toLowerCase();

      setBlunderChess(clone);

      if (isSolution) {
        setBlunderStatus('correct');
        setSolvedMistakes((prev) => new Set(prev).add(currentMistakeIndex));
        soundService.playPuzzleSuccess();
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      } else {
        setBlunderStatus('wrong');
        soundService.playMove();
      }
    } catch {
      // invalid move
    }
  };

  const resetBlunderPuzzle = () => {
    if (activeMistakePuzzle) {
      setBlunderChess(new Chess(activeMistakePuzzle.fen));
      setBlunderStatus('idle');
    }
  };

  const revealBlunderSolution = () => {
    if (activeMistakePuzzle) {
      try {
        const clone = new Chess(activeMistakePuzzle.fen);
        clone.move(activeMistakePuzzle.solutionSan);
        setBlunderChess(clone);
        setBlunderStatus('revealed');
        soundService.playMove();
      } catch {
        // fallback
      }
    }
  };

  // Classification comparison rows matching Screenshot 3
  // Classification comparison rows matching Chess.com screenshots (all 10 tiers)
  const classificationRows: {
    label: string;
    classification: MoveClassification;
    whiteCount: number;
    blackCount: number;
  }[] = [
    {
      label: 'Brilliant',
      classification: 'brilliant',
      whiteCount: tallies.white.brilliant || 0,
      blackCount: tallies.black.brilliant || 0,
    },
    {
      label: 'Great',
      classification: 'great',
      whiteCount: tallies.white.great || 0,
      blackCount: tallies.black.great || 0,
    },
    {
      label: 'Best',
      classification: 'best',
      whiteCount: tallies.white.best || 0,
      blackCount: tallies.black.best || 0,
    },
    {
      label: 'Excellent',
      classification: 'excellent',
      whiteCount: tallies.white.excellent || 0,
      blackCount: tallies.black.excellent || 0,
    },
    {
      label: 'Good',
      classification: 'good',
      whiteCount: tallies.white.good || 0,
      blackCount: tallies.black.good || 0,
    },
    {
      label: 'Book',
      classification: 'book',
      whiteCount: tallies.white.book || 0,
      blackCount: tallies.black.book || 0,
    },
    {
      label: 'Inaccuracy',
      classification: 'inaccuracy',
      whiteCount: tallies.white.inaccuracy || 0,
      blackCount: tallies.black.inaccuracy || 0,
    },
    {
      label: 'Mistake',
      classification: 'mistake',
      whiteCount: tallies.white.mistake || 0,
      blackCount: tallies.black.mistake || 0,
    },
    {
      label: 'Miss',
      classification: 'miss',
      whiteCount: tallies.white.miss || 0,
      blackCount: tallies.black.miss || 0,
    },
    {
      label: 'Blunder',
      classification: 'blunder',
      whiteCount: tallies.white.blunder || 0,
      blackCount: tallies.black.blunder || 0,
    },
  ];

  // Dynamic Advanced Stats calculated across Opening, Tactics, Strategy, and Endgame
  const advancedStats = React.useMemo(() => {
    return report.advancedStats || calculateGameAdvancedStats(report);
  }, [report]);

  const advancedStatsRows = React.useMemo(() => [
    {
      key: 'opening',
      label: 'Opening',
      description: 'Development & center control',
      white: advancedStats.white.opening,
      black: advancedStats.black.opening,
    },
    {
      key: 'tactics',
      label: 'Tactics',
      description: 'Sharp calculation & attacks',
      white: advancedStats.white.tactics,
      black: advancedStats.black.tactics,
    },
    {
      key: 'strategy',
      label: 'Strategy',
      description: 'Positional plans & harmony',
      white: advancedStats.white.strategy,
      black: advancedStats.black.strategy,
    },
    {
      key: 'endgame',
      label: 'Endgame',
      description: 'Technique & conversion',
      white: advancedStats.white.endgame,
      black: advancedStats.black.endgame,
    },
  ], [advancedStats]);

  // SVG Evaluation graph points
  const points = evalTimeline.map((p, idx) => {
    const x = (idx / Math.max(1, evalTimeline.length - 1)) * 100;
    const winProb = 1 / (1 + Math.pow(10, -p.score / 400));
    const y = 100 - winProb * 100;
    return `${x},${y}`;
  }).join(' ');

  // Shared Stats & Accuracy Panel
  const renderStatsPanel = (isMobile = false) => (
    <div className={`flex flex-col gap-3 w-full ${isMobile ? 'pb-16' : ''}`}>
      {/* Dynamic Mentor Header Bubble */}
      <div className="flex items-start gap-2.5 bg-[#1e1c18] border border-[#2e2a24] rounded-xl p-2.5 sm:p-3 shadow-lg">
        <div className="relative shrink-0">
          <MentorAvatar mentorId={activeMentorId} size={40} />
          <span
            className="absolute -bottom-1 -right-1 px-1 rounded-full text-[8px] font-black text-white border border-[#2a2723]"
            style={{ backgroundColor: currentMentor.accentColor }}
          >
            AI
          </span>
        </div>
        <div className="flex-1 bg-white text-zinc-900 rounded-lg p-2.5 text-xs font-semibold shadow relative">
          <div className="absolute top-2.5 -left-1.5 w-0 h-0 border-t-[5px] border-t-transparent border-r-[6px] border-r-white border-b-[5px] border-b-transparent" />
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[11px] font-black text-zinc-900">{currentMentor.name}</span>
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">{currentMentor.title}</span>
          </div>
          <p className="line-clamp-3 sm:line-clamp-none text-[11px] leading-relaxed">
            {report.summaryComment || `Right, let's go through this game and find some key moments.`}
          </p>
        </div>
      </div>

      {/* Authentic Review Summary Hub */}
      <div className="bg-[#1f1d1a] border border-[#2d2a26] rounded-xl p-3 flex flex-col gap-3 shadow-lg">
        {/* Decisive Game Outcome Banner */}
        <div
          className={`flex items-center justify-between px-3 py-2 rounded-xl border ${
            gameOutcome.badgeType === 'win'
              ? 'bg-[#81b64c]/15 border-[#81b64c]/40 text-[#81b64c]'
              : gameOutcome.badgeType === 'loss'
              ? 'bg-[#e05344]/15 border-[#e05344]/40 text-[#f87171]'
              : 'bg-[#312e2b] border-[#44403a] text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {gameOutcome.subtitle.toLowerCase().includes('time') ? (
              <Clock className="w-4 h-4 shrink-0 text-amber-400" />
            ) : gameOutcome.subtitle.toLowerCase().includes('resignation') ? (
              <Flag className="w-4 h-4 shrink-0 text-[#81b64c]" />
            ) : (
              <Trophy className="w-4 h-4 shrink-0 text-amber-400" />
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-black tracking-wide truncate">
                {gameOutcome.fullSentence}
              </span>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                {report.gameResult || (gameOutcome.badgeType === 'win' ? (isUserWhite ? '1-0' : '0-1') : '1/2-1/2')} · {gameOutcome.subtitle}
              </span>
            </div>
          </div>
          <span
            className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border shrink-0 shadow-sm ${
              gameOutcome.badgeType === 'win'
                ? 'bg-[#81b64c] text-white border-[#4d7a24]'
                : gameOutcome.badgeType === 'loss'
                ? 'bg-[#ca3431] text-white border-[#7f1d1d]'
                : 'bg-zinc-700 text-white border-zinc-600'
            }`}
          >
            {gameOutcome.title}
          </span>
        </div>

        {/* Players Row */}
        <div className="grid grid-cols-[70px_1fr_1fr] sm:grid-cols-[85px_1fr_1fr] items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
            Players
          </span>
          
          {/* White Player */}
          <div className="flex flex-col items-center gap-1 min-w-0">
            <span className="text-[11px] font-bold text-zinc-200 truncate w-full text-center flex items-center justify-center gap-1">
              <span className="truncate">{whitePlayer.name}</span>
              {isUserWhite && (
                <span className="text-[9px] font-black text-[#81b64c] bg-[#81b64c]/10 px-1 py-0.2 rounded shrink-0">
                  YOU
                </span>
              )}
            </span>
            <div
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-[#2a2723] ${
                isUserWhite ? 'border-2 border-[#81b64c]' : 'border border-[#3d3932]'
              } flex items-center justify-center p-2 shadow-sm relative`}
            >
              {whitePlayer.avatar && whitePlayer.avatar.startsWith('http') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={whitePlayer.avatar} alt={whitePlayer.name} className="w-full h-full object-cover rounded-md" />
              ) : (
                <div className="w-8 h-8 flex items-center justify-center">
                  <PieceIcon type="p" color="w" theme={pieceTheme} />
                </div>
              )}
            </div>
          </div>

          {/* Black Player */}
          <div className="flex flex-col items-center gap-1 min-w-0">
            <span className="text-[11px] font-bold text-zinc-200 truncate w-full text-center flex items-center justify-center gap-1">
              <span className="truncate">{blackPlayer.name}</span>
              {!isUserWhite && (
                <span className="text-[9px] font-black text-[#81b64c] bg-[#81b64c]/10 px-1 py-0.2 rounded shrink-0">
                  YOU
                </span>
              )}
            </span>
            <div
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-[#272522] ${
                !isUserWhite ? 'border-2 border-[#81b64c]' : 'border border-[#3d3932]'
              } flex items-center justify-center p-2 shadow-sm relative`}
            >
              {blackPlayer.avatar && blackPlayer.avatar.startsWith('http') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={blackPlayer.avatar} alt={blackPlayer.name} className="w-full h-full object-cover rounded-md" />
              ) : (
                <div className="w-8 h-8 flex items-center justify-center">
                  <PieceIcon type="p" color="b" theme={pieceTheme} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Accuracy Row */}
        <div className="grid grid-cols-[70px_1fr_1fr] sm:grid-cols-[85px_1fr_1fr] items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
            Accuracy
          </span>
          <div className="bg-white text-zinc-950 font-black text-lg py-1.5 px-2 rounded-lg text-center shadow-sm font-mono">
            {whiteAccuracy}
          </div>
          <div className="bg-[#312e2b] text-white font-black text-lg py-1.5 px-2 rounded-lg text-center shadow-sm font-mono border border-[#44403a]">
            {blackAccuracy}
          </div>
        </div>

        {/* Classification Matrix Rows */}
        <div className="flex flex-col gap-0.5 pt-2 border-t border-[#2d2a26]">
          {classificationRows.map((row) => {
            const cfg = CLASSIFICATION_CONFIG[row.classification];
            return (
              <div
                key={row.classification}
                className="grid grid-cols-[1fr_36px_40px_36px] items-center py-0.5 hover:bg-[#25221d] rounded px-1.5 transition-colors"
              >
                <span className="text-xs font-bold text-zinc-300">
                  {row.label}
                </span>
                <span className={`text-right font-mono font-black text-xs ${cfg?.countColor || 'text-zinc-200'}`}>
                  {row.whiteCount}
                </span>
                <div className="flex justify-center">
                  <ClassificationBadge classification={row.classification} size="sm" />
                </div>
                <span className={`text-left font-mono font-black text-xs ${cfg?.countColor || 'text-zinc-200'}`}>
                  {row.blackCount}
                </span>
              </div>
            );
          })}
        </div>

        {/* Game Rating Row */}
        <div className="grid grid-cols-[70px_1fr_1fr] sm:grid-cols-[85px_1fr_1fr] items-center gap-2 pt-2 border-t border-[#2d2a26]">
          <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 leading-tight">
            Rating
          </span>
          <div className="bg-white text-zinc-950 font-black text-base py-1 px-2 rounded-lg text-center shadow-sm font-mono">
            {report.whiteEstimatedElo ?? 850}
          </div>
          <div className="bg-[#312e2b] text-white font-black text-base py-1 px-2 rounded-lg text-center shadow-sm font-mono border border-[#44403a]">
            {report.blackEstimatedElo ?? 1100}
          </div>
        </div>

        {/* Advanced Stats Section */}
        <div className="flex flex-col gap-1.5 pt-2 border-t border-[#2d2a26]">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
              Phase Performance
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            {advancedStatsRows.map((row) => (
              <div
                key={row.key}
                className="grid grid-cols-[1fr_36px_40px_36px] items-center py-0.5 hover:bg-[#25221d] rounded px-1.5 transition-colors group cursor-default"
                title={`White: ${row.white.score}% (${row.white.summary})\nBlack: ${row.black.score}% (${row.black.summary})`}
              >
                <div className="flex flex-col min-w-0 pr-1">
                  <span className="text-xs font-bold text-zinc-300 group-hover:text-white transition-colors">
                    {row.label}
                  </span>
                  <span className="text-[9px] text-zinc-500 truncate group-hover:text-zinc-400 transition-colors">
                    {row.description}
                  </span>
                </div>
                <div
                  className="flex justify-end items-center pr-1"
                  title={`White: ${row.white.score}% - ${row.white.summary}`}
                >
                  <ClassificationBadge classification={row.white.classification} size="sm" />
                </div>
                <div className="flex justify-center items-center">
                  <span className="text-zinc-600 text-xs font-black select-none">·</span>
                </div>
                <div
                  className="flex justify-start items-center pl-1"
                  title={`Black: ${row.black.score}% - ${row.black.summary}`}
                >
                  <ClassificationBadge classification={row.black.classification} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        <button
          onClick={onStartInteractiveReview}
          className="w-full py-2.5 rounded-xl bg-[#81b64c] hover:bg-[#8cc653] text-white font-black text-sm uppercase tracking-wider border-2 border-[#4d7a24] shadow-[0_3px_0_0_#4d7a24] active:translate-y-[2px] active:shadow-[0_1px_0_0_#4d7a24] transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Continue Review</span>
        </button>

        {/* Interactive Mistakes SRS Practice Button */}
        {userMistakesPuzzles.length > 0 ? (
          <button
            onClick={() => {
              loadMistakeIndex(0);
              setIsBlunderModalOpen(true);
            }}
            className="w-full py-2 rounded-lg bg-[#e05344]/15 hover:bg-[#e05344]/25 text-[#f87171] hover:text-white font-black uppercase tracking-wider text-xs border border-[#e05344] shadow-[0_2px_0_0_#7f1d1d] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Target className="w-3.5 h-3.5 text-[#e05344]" />
            <span>Practice & Retry Mistakes ({userMistakesPuzzles.length})</span>
          </button>
        ) : (
          <div className="w-full py-1.5 px-3 rounded-lg bg-[#81b64c]/10 border border-[#81b64c]/20 text-[#81b64c] text-xs font-bold flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Flawless play — 0 Blunders or Misses!</span>
          </div>
        )}

        {/* Hub Bridges */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#2d2a26]">
          <button
            onClick={() => {
              const movesStr = report.moves?.map((m) => m.san).join(' ') || '';
              const targetPly = report.blunderRetryPuzzle?.ply !== undefined
                ? report.blunderRetryPuzzle.ply
                : Math.max(0, report.moves.length - 2);
              router.push(
                `/analysis?gameId=${encodeURIComponent(report.gameId || report.id)}&moves=${encodeURIComponent(movesStr)}&ply=${targetPly}`
              );
            }}
            className="py-1.5 px-2 rounded-lg bg-[#201e1a] hover:bg-[#2c2924] border border-[#332f27] hover:border-[#06b6d4] text-zinc-300 hover:text-white font-black uppercase tracking-wider text-[10px] shadow-[0_2px_0_0_#141311] active:translate-y-[1px] transition-all cursor-pointer flex items-center justify-center gap-1.5"
            title="Deep calculate this game in Analysis Studio"
          >
            <Microscope className="w-3 h-3 text-cyan-400" />
            <span>Deep Studio</span>
          </button>

          <button
            onClick={() => {
              const sparFen = report.blunderRetryPuzzle?.fen || summaryChess.fen();
              router.push(`/bots?fen=${encodeURIComponent(sparFen)}`);
            }}
            className="py-1.5 px-2 rounded-lg bg-[#201e1a] hover:bg-[#2c2924] border border-[#332f27] hover:border-[#f59e0b] text-zinc-300 hover:text-white font-black uppercase tracking-wider text-[10px] shadow-[0_2px_0_0_#141311] active:translate-y-[1px] transition-all cursor-pointer flex items-center justify-center gap-1.5"
            title="Practice turning point against adaptive bots"
          >
            <Bot className="w-3 h-3 text-amber-400" />
            <span>Spar Bot</span>
          </button>
        </div>

        {/* PGN Export Button */}
        <button
          onClick={async () => {
            try {
              const res = await fetch('/api/pgn/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ report }),
              });
              if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `review-${report.gameId || 'game'}.pgn`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
              }
            } catch (e) {
              console.error('Export failed:', e);
            }
          }}
          className="w-full py-1.5 rounded-lg bg-[#282622] hover:bg-[#34312b] text-zinc-400 hover:text-white font-black uppercase tracking-wider text-[10px] border border-[#3d3932] shadow-[0_2px_0_0_#141311] active:translate-y-[1px] transition-all cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Sparkles className="w-3 h-3 text-[#81b64c]" />
          <span>Export PGN</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-[100dvh] lg:h-[100dvh] lg:max-h-[100dvh] w-full bg-[#161512] text-zinc-100 select-none overflow-y-auto lg:overflow-hidden justify-start pb-20 lg:pb-0">
      {/* Top Header Bar - Ultra-compact 36px-40px */}
      <header className="h-9 sm:h-10 px-2 sm:px-3 bg-[#1f1d1a] border-b border-[#2d2a26] flex items-center justify-between shrink-0 shadow-sm z-30">
        {/* Left: Back / Play button + Title */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onBackToGame}
            className="px-2 py-1 rounded-full border border-[#35322b] bg-[#282622] text-zinc-300 hover:text-white hover:bg-[#34312b] shadow-sm active:translate-y-[1px] transition-all cursor-pointer flex items-center gap-1 text-[11px] font-black uppercase tracking-wider shrink-0"
            title="Back to Play / Home"
          >
            <ArrowLeft className="w-3 h-3" />
            <span className="hidden xs:inline">Play</span>
          </button>
          <span className="text-zinc-600 hidden xs:inline">|</span>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[#81b64c] shrink-0" />
            <h1 className="text-xs font-black text-white tracking-wide uppercase truncate">
              Review Summary
            </h1>

            {/* Tactile Engine Selection Toggle - Full Inline on xl+ screens */}
            <div className="hidden xl:flex items-center bg-[#141311] p-0.5 rounded-full border border-[#2e2a24] text-[9px] font-black uppercase tracking-wider ml-2">
              <button
                onClick={() => {
                  setAnalysisEngine('torch_human');
                  onEngineChange?.('torch_human');
                }}
                className={`px-2 py-0.5 rounded-full flex items-center gap-1 transition-all cursor-pointer ${
                  analysisEngine === 'torch_human'
                    ? 'bg-[#f59e0b] text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Torch Human (Maia NNUE)"
              >
                <Flame className="w-2.5 h-2.5 text-amber-300" />
                <span>Torch</span>
              </button>

              <button
                onClick={() => {
                  setAnalysisEngine('stockfish');
                  onEngineChange?.('stockfish');
                }}
                className={`px-2 py-0.5 rounded-full flex items-center gap-1 transition-all cursor-pointer ${
                  analysisEngine === 'stockfish'
                    ? 'bg-[#81b64c] text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Stockfish 18"
              >
                <Cpu className="w-2.5 h-2.5 text-white" />
                <span>Stockfish</span>
              </button>
            </div>

            {/* 4-Tier Strength Switcher (Fast, Standard, Deep, Maximum) */}
            <div className="hidden 2xl:flex items-center bg-[#141311] p-0.5 rounded-full border border-[#2e2a24] text-[9px] font-black uppercase tracking-wider ml-1">
              {(['fast', 'standard', 'deep', 'maximum'] as EngineStrengthTier[]).map((tier) => {
                const cfg = ENGINE_STRENGTH_CONFIGS[tier];
                const activeTier = engineStrength || report.strengthTier || 'fast';
                const isSelected = activeTier === tier;
                return (
                  <button
                    key={tier}
                    onClick={() => onStrengthChange?.(tier)}
                    className={`px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#35322b] text-[#81b64c] font-black shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                    title={`${cfg.label}: ${cfg.description}`}
                  >
                    <span>{cfg.badge}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Actions: More Options Popover & Primary CTA */}
        <div className="flex items-center gap-1.5 shrink-0 relative">
          {/* Options Popover */}
          <div className="relative">
            <button
              onClick={() => setIsOptionsOpen(!isOptionsOpen)}
              className="p-1.5 rounded-full border border-[#35322b] bg-[#211f1c] hover:bg-[#2c2823] text-zinc-300 hover:text-white transition shadow-sm cursor-pointer"
              title="Engine & Strength Settings"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>

            {isOptionsOpen && (
              <div className="absolute top-full right-0 mt-1.5 w-64 bg-[#1e1c19] border-2 border-[#35322b] rounded-2xl shadow-2xl p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                {/* Engine Mode Section */}
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Engine Mode</span>
                  <span className="text-zinc-500 font-mono text-[9px]">WASM</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 bg-[#141311] p-1 rounded-xl border border-[#2b2824] mb-3">
                  <button
                    onClick={() => {
                      setAnalysisEngine('torch_human');
                      onEngineChange?.('torch_human');
                      setIsOptionsOpen(false);
                    }}
                    className={`px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 text-[10px] font-black uppercase transition-all cursor-pointer ${
                      analysisEngine === 'torch_human'
                        ? 'bg-[#f59e0b] text-white shadow'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Flame className="w-3 h-3 text-amber-300" />
                    <span>Torch</span>
                  </button>
                  <button
                    onClick={() => {
                      setAnalysisEngine('stockfish');
                      onEngineChange?.('stockfish');
                      setIsOptionsOpen(false);
                    }}
                    className={`px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 text-[10px] font-black uppercase transition-all cursor-pointer ${
                      analysisEngine === 'stockfish'
                        ? 'bg-[#81b64c] text-white shadow'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Cpu className="w-3 h-3 text-white" />
                    <span>Stockfish</span>
                  </button>
                </div>

                {/* Engine Strength Tiers Section */}
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Strength Tier</span>
                  <span className="text-[#81b64c] font-mono text-[9px]">
                    {ENGINE_STRENGTH_CONFIGS[engineStrength || report.strengthTier || 'fast'].label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 bg-[#141311] p-1 rounded-xl border border-[#2b2824] mb-3">
                  {(['fast', 'standard', 'deep', 'maximum'] as EngineStrengthTier[]).map((tier) => {
                    const cfg = ENGINE_STRENGTH_CONFIGS[tier];
                    const activeTier = engineStrength || report.strengthTier || 'fast';
                    const isSelected = activeTier === tier;
                    return (
                      <button
                        key={tier}
                        onClick={() => {
                          onStrengthChange?.(tier);
                          setIsOptionsOpen(false);
                        }}
                        className={`px-2 py-1.5 rounded-lg flex flex-col items-center justify-center text-[10px] transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-[#2a2723] border-[#81b64c] text-white shadow-sm font-black'
                            : 'border-transparent text-zinc-400 hover:text-white hover:bg-[#201e1a]'
                        }`}
                      >
                        <span className="font-bold">{cfg.badge}</span>
                        <span className="text-[8px] text-zinc-500 font-mono">D{cfg.depth}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-1 border-t border-[#2b2824] pt-2">
                  <button
                    onClick={() => {
                      soundService.playMove();
                      setIsOptionsOpen(false);
                    }}
                    className="w-full py-1.5 px-2 rounded-lg hover:bg-[#282622] text-xs font-bold text-zinc-300 hover:text-white flex items-center gap-2 transition cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Test Audio Feedback</span>
                  </button>

                  {onReanalyze && (
                    <button
                      onClick={() => {
                        setIsOptionsOpen(false);
                        onReanalyze();
                      }}
                      className="w-full py-1.5 px-2 rounded-lg hover:bg-[#282622] text-xs font-bold text-zinc-300 hover:text-white flex items-center gap-2 transition cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-[#81b64c]" />
                      <span>Re-analyze Game</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onStartInteractiveReview}
            className="px-3 py-1 rounded-full bg-[#81b64c] hover:bg-[#8cc653] text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1 border border-[#4d7a24] shadow-[0_2px_0_0_#4d7a24] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer shrink-0"
          >
            <Play className="w-2.5 h-2.5 fill-current" />
            <span className="hidden xs:inline">Start Review</span>
            <span className="xs:hidden">Review</span>
          </button>
        </div>
      </header>

      {/* Mobile Tab Switcher (< lg) */}
      <div className="lg:hidden flex items-center justify-center p-1.5 bg-[#171614] border-b border-[#262420] shrink-0">
        <div className="flex bg-[#1f1d1a] p-0.5 rounded-full border border-[#2d2a26] w-full max-w-xs text-[11px] font-black uppercase">
          <button
            onClick={() => setMobileTab('stats')}
            className={`flex-1 py-1 rounded-full text-center transition-all cursor-pointer ${
              mobileTab === 'stats' ? 'bg-[#81b64c] text-white shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            📊 Accuracies & Stats
          </button>
          <button
            onClick={() => setMobileTab('board')}
            className={`flex-1 py-1 rounded-full text-center transition-all cursor-pointer ${
              mobileTab === 'board' ? 'bg-[#81b64c] text-white shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            ♟ Board & Advantage
          </button>
        </div>
      </div>

      {/* Main Review Hub Body: Responsive container */}
      <div className="flex-1 min-h-0 overflow-visible lg:overflow-hidden flex flex-col lg:flex-row items-center lg:items-start justify-start lg:justify-center p-0 lg:p-3 xl:p-4 gap-4 w-full max-w-5xl mx-auto">
        {/* Desktop Split View (Left: Board + Graph, Right: Stats Panel) */}
        <div className="hidden lg:flex flex-row gap-5 w-full h-full justify-center items-start min-h-0">
          {/* Left Column: Board & Eval Flow */}
          <div className="flex flex-col items-center gap-2.5 w-[min(44vh,440px)] shrink-0">
            <div className="w-full aspect-square rounded-xl overflow-hidden border border-[#35322b] shadow-xl bg-[#1a1816]">
              <ChessBoard
                chess={summaryChess}
                orientation={isUserWhite ? 'w' : 'b'}
                boardTheme={boardTheme}
                pieceTheme={pieceTheme}
                activeClassification={
                  keyMove
                    ? { square: keyMove.to, classification: keyMove.classification || 'brilliant' }
                    : null
                }
                lastMove={keyMove ? { from: keyMove.from, to: keyMove.to } : null}
                customArrows={
                  keyMove
                    ? [{ from: keyMove.from, to: keyMove.to, color: '#f59e0b' }]
                    : []
                }
                disabled={true}
              />
            </div>

            {/* Evaluation Flow Area Chart */}
            <div className="w-full bg-[#1b1917] p-2 rounded-lg border border-[#2d2a26] flex flex-col gap-1 shadow-md">
              <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400">
                <span>Advantage Over Time</span>
                <span className="font-mono text-[11px] text-[#81b64c] font-black">
                  {moves.length} Moves
                </span>
              </div>
              <div className="h-12 w-full bg-[#12110f] rounded border border-[#282622] relative overflow-hidden">
                <div className="absolute inset-x-0 top-1/2 h-[1px] bg-zinc-700/60" />
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <polyline
                    fill="none"
                    stroke="#81b64c"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points}
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Right Column: Independently scrollable stats */}
          <div className="w-full max-w-md h-full overflow-y-auto custom-scrollbar flex flex-col pr-2 pb-4 shrink-0">
            {renderStatsPanel(false)}
          </div>
        </div>

        {/* Mobile View: Switch between Stats tab and Board tab with responsive scroll */}
        <div className="lg:hidden flex-1 min-h-0 w-full overflow-visible flex flex-col relative">
          {mobileTab === 'stats' ? (
            <div className="flex-1 min-h-0 w-full overflow-y-auto custom-scrollbar p-2.5 flex flex-col gap-2">
              {renderStatsPanel(true)}
            </div>
          ) : (
            <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-start p-2 pb-20 overflow-visible gap-2">
              <div className="w-[min(100vw,calc(100dvh-175px))] aspect-square overflow-hidden border-0 sm:border border-[#35322b] bg-[#1a1816]">
                <ChessBoard
                  chess={summaryChess}
                  orientation={isUserWhite ? 'w' : 'b'}
                  boardTheme={boardTheme}
                  pieceTheme={pieceTheme}
                  activeClassification={
                    keyMove
                      ? { square: keyMove.to, classification: keyMove.classification || 'brilliant' }
                      : null
                  }
                  lastMove={keyMove ? { from: keyMove.from, to: keyMove.to } : null}
                  customArrows={
                    keyMove
                      ? [{ from: keyMove.from, to: keyMove.to, color: '#f59e0b' }]
                      : []
                  }
                  disabled={true}
                />
              </div>

              {/* Mobile Evaluation Flow */}
              <div className="w-full max-w-[min(100vw,calc(100dvh-175px))] bg-[#1b1917] p-2 rounded-lg border border-[#2d2a26] flex flex-col gap-1 shadow-md">
                <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400">
                  <span>Advantage Over Time</span>
                  <span className="font-mono text-[11px] text-[#81b64c] font-black">
                    {moves.length} Moves
                  </span>
                </div>
                <div className="h-10 w-full bg-[#12110f] rounded border border-[#282622] relative overflow-hidden">
                  <div className="absolute inset-x-0 top-1/2 h-[1px] bg-zinc-700/60" />
                  <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <polyline
                      fill="none"
                      stroke="#81b64c"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={points}
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Fixed Bottom Bar on Mobile */}
          <div className="fixed bottom-0 inset-x-0 p-2 bg-[#1b1916]/95 backdrop-blur-md border-t border-[#2d2a26] z-20 flex gap-2 justify-center">
            <button
              onClick={onStartInteractiveReview}
              className="w-full max-w-sm py-2 rounded-xl bg-[#81b64c] hover:bg-[#8cc653] text-white font-black text-xs uppercase tracking-wider border border-[#4d7a24] shadow-[0_2px_0_0_#4d7a24] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Interactive Review</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Mistakes SRS Practice Modal (Spaced Repetition across all user blunders/misses/mistakes) */}
      {isBlunderModalOpen && activeMistakePuzzle && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#1f1d1a] border-2 border-[#36332e] rounded-2xl w-full max-w-xl p-4 sm:p-5 flex flex-col gap-3.5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header: Title, Step Counter, Prev/Next Navigation, Close */}
            <div className="flex items-center justify-between pb-2.5 border-b border-[#2d2a26]">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#e05344]/20 border border-[#e05344]/40 flex items-center justify-center text-[#e05344] shrink-0">
                  <Target className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-white truncate">
                    Retry Mistakes (Move {activeMistakePuzzle.moveNumber})
                  </h3>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400">
                    <span>
                      Mistake {currentMistakeIndex + 1} of {userMistakesPuzzles.length}
                    </span>
                    <span>•</span>
                    <span className="text-[#81b64c]">
                      {solvedMistakes.size} Solved
                    </span>
                  </div>
                </div>
              </div>

              {/* Step Navigation Pill & Close Button */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => loadMistakeIndex(currentMistakeIndex - 1)}
                  disabled={currentMistakeIndex <= 0}
                  className="p-1 rounded-lg bg-[#272522] hover:bg-[#34312b] disabled:opacity-30 disabled:pointer-events-none text-zinc-300 border border-[#35322b] transition cursor-pointer"
                  title="Previous Mistake"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={() => loadMistakeIndex(currentMistakeIndex + 1)}
                  disabled={currentMistakeIndex >= userMistakesPuzzles.length - 1}
                  className="p-1 rounded-lg bg-[#272522] hover:bg-[#34312b] disabled:opacity-30 disabled:pointer-events-none text-zinc-300 border border-[#35322b] transition cursor-pointer"
                  title="Next Mistake"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsBlunderModalOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-[#2b2824] transition-colors cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mistake Context Card with Exact Tactical Motif */}
            <div className="text-xs text-zinc-200 bg-[#161512] p-3 rounded-xl border border-[#282622] flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ClassificationBadge
                    classification={activeMistakePuzzle.classification}
                    size="sm"
                  />
                  <span className="font-bold text-zinc-300">
                    You played <strong className="text-[#f87171] font-mono">{activeMistakePuzzle.blunderedMoveSan}</strong>
                  </span>
                </div>
                {solvedMistakes.has(currentMistakeIndex) && (
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#81b64c] bg-[#81b64c]/15 px-2 py-0.5 rounded-full border border-[#81b64c]/30 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Solved
                  </span>
                )}
              </div>

              {activeMistakePuzzle.motif && (
                <div className="text-[11px] text-amber-300 font-medium flex items-center gap-1.5 pt-0.5">
                  <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>Tactical Motif: <strong>{activeMistakePuzzle.motif.type}</strong> — {activeMistakePuzzle.motif.description}</span>
                </div>
              )}
            </div>

            {/* Interactive Chess Board */}
            <div className="flex justify-center">
              <ChessBoard
                chess={blunderChess}
                orientation={activeMistakePuzzle.ply % 2 !== 0 ? 'w' : 'b'}
                boardTheme={boardTheme}
                pieceTheme={pieceTheme}
                onMove={handleBlunderMove}
                disabled={blunderStatus === 'correct' || blunderStatus === 'revealed'}
              />
            </div>

            {/* Status Feedback */}
            {blunderStatus === 'correct' && (
              <div className="p-3 rounded-xl bg-[#81b64c]/15 border border-[#81b64c]/30 text-[#81b64c] text-xs font-bold flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Brilliant! You found the winning continuation ({activeMistakePuzzle.solutionSan})!</span>
                </div>
                {currentMistakeIndex < userMistakesPuzzles.length - 1 && (
                  <button
                    onClick={() => loadMistakeIndex(currentMistakeIndex + 1)}
                    className="px-2.5 py-1 rounded-lg bg-[#81b64c] text-white hover:bg-[#8cc653] text-[11px] font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {blunderStatus === 'wrong' && (
              <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>That's not the top move. Try again!</span>
                </div>
                <button
                  onClick={resetBlunderPuzzle}
                  className="px-2 py-1 rounded bg-[#2b2824] hover:bg-[#38342f] text-white text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>
            )}

            {blunderStatus === 'revealed' && (
              <div className="p-3 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-bold">
                Best move: <strong>{activeMistakePuzzle.solutionSan}</strong>. {activeMistakePuzzle.explanation}
              </div>
            )}

            {/* Modal Controls */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={resetBlunderPuzzle}
                className="px-3 py-1.5 rounded-xl bg-[#282622] hover:bg-[#34312b] text-zinc-300 hover:text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>

              <button
                onClick={revealBlunderSolution}
                className="px-3 py-1.5 rounded-xl bg-[#282622] hover:bg-[#34312b] text-zinc-300 hover:text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Show Solution</span>
              </button>

              <button
                onClick={() => setIsBlunderModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-[#81b64c] hover:bg-[#73a542] text-white text-xs font-black transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
