'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess, Square, PieceSymbol } from 'chess.js';
import { ChessBoard } from '@/components/board/ChessBoard';
import { EvalBar } from '@/components/board/EvalBar';
import { BoardTheme, PieceTheme, PieceColor, ArrowAnnotation } from '@/types/chess';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Award,
  RotateCcw,
  ArrowUpDown,
  Cpu,
  Database,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Check,
  Play,
  Pause,
  Loader2,
  Sparkles,
  ShieldAlert,
  Upload,
  X,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { soundService } from '@/lib/audioService';

interface MultiPvLine {
  rank: number;
  scoreCp: number;
  mateIn?: number;
  scoreFormatted: string;
  bestMoveUci: string;
  bestMoveSan: string;
  pvSan: string[];
}

interface TablebaseInfo {
  isTablebase: boolean;
  pieceCount: number;
  category?: 'win' | 'loss' | 'draw' | 'cursed-win' | 'blessed-loss';
  dtz?: number | null;
  humanDescription: string;
  bestMoveSan?: string;
}

export default function AnalysisPage() {
  const router = useRouter();
  const [chess, setChess] = useState<Chess>(() => new Chess());
  const [boardTheme] = useState<BoardTheme>('green');
  const [pieceTheme] = useState<PieceTheme>('neo');
  const [orientation, setOrientation] = useState<PieceColor>('w');
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);

  // Engine evaluation states
  const [isEngineActive, setIsEngineActive] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [targetDepth, setTargetDepth] = useState<number>(14);
  const [currentEvalScore, setCurrentEvalScore] = useState<number>(20);
  const [currentEvalFormatted, setCurrentEvalFormatted] = useState<string>('+0.20');
  const [pvLines, setPvLines] = useState<MultiPvLine[]>([]);
  const [engineDepth, setEngineDepth] = useState<number>(0);
  const [nodesCount, setNodesCount] = useState<number>(0);
  const [tablebaseInfo, setTablebaseInfo] = useState<TablebaseInfo | null>(null);

  // Move history for step back/forward
  const [historyFens, setHistoryFens] = useState<string[]>([new Chess().fen()]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [sanHistory, setSanHistory] = useState<string[]>([]);
  const [copiedFen, setCopiedFen] = useState(false);

  // Threat analysis
  const [threatInfo, setThreatInfo] = useState<{
    threatMoveSan: string;
    description: string;
    severity: string;
    arrow: ArrowAnnotation | null;
  } | null>(null);
  const [isDetectingThreat, setIsDetectingThreat] = useState(false);

  // Import modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  // Fetch engine evaluation from backend API
  const fetchEngineEval = useCallback(async (fen: string, depth: number) => {
    if (!isEngineActive) return;
    setIsEvaluating(true);
    setThreatInfo(null); // clear old threat on new position
    try {
      const res = await fetch('/api/engine/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen, depth, multiPv: 3 }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setCurrentEvalScore(json.data.scoreCp);
          setCurrentEvalFormatted(json.data.scoreFormatted);
          setPvLines(json.data.lines || []);
          setEngineDepth(json.data.depth);
          setNodesCount(json.data.nodes);
          setTablebaseInfo(json.data.tablebase || null);
        }
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsEvaluating(false);
    }
  }, [isEngineActive]);

  const handleDetectThreat = async () => {
    setIsDetectingThreat(true);
    try {
      const res = await fetch('/api/engine/threat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen: chess.fen() }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.threat) {
          setThreatInfo(json.threat);
        }
      }
    } catch {
      //
    } finally {
      setIsDetectingThreat(false);
    }
  };

  const handleImportSubmit = async () => {
    const raw = importText.trim();
    if (!raw) return;
    setImportError(null);

    // Check if FEN
    const fenTokens = raw.split(/\s+/);
    if (fenTokens.length >= 2 && /[prnbqkPRNBQK1-8\/]+/.test(fenTokens[0])) {
      try {
        const newChess = new Chess(raw);
        setChess(newChess);
        setHistoryFens([newChess.fen()]);
        setSanHistory([]);
        setHistoryIndex(0);
        setLastMove(null);
        setIsImportModalOpen(false);
        setImportText('');
        soundService.playGameStart();
        return;
      } catch {
        // Not a valid FEN, try PGN
      }
    }

    // Try PGN import via API
    try {
      const res = await fetch('/api/pgn/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pgn: raw }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.moves?.length > 0) {
          const runner = new Chess();
          const fens: string[] = [runner.fen()];
          const sans: string[] = [];
          for (const m of json.data.moves) {
            runner.move(m);
            fens.push(runner.fen());
            sans.push(m);
          }
          setChess(runner);
          setHistoryFens(fens);
          setSanHistory(sans);
          setHistoryIndex(fens.length - 1);
          setLastMove(null);
          setIsImportModalOpen(false);
          setImportText('');
          soundService.playGameStart();
          return;
        }
      }
      setImportError('Could not parse valid PGN or FEN');
    } catch (err: any) {
      setImportError(err.message || 'Import failed');
    }
  };

  useEffect(() => {
    fetchEngineEval(chess.fen(), targetDepth);
  }, [chess, targetDepth, fetchEngineEval]);

  const handleMove = (from: Square, to: Square, promotion?: PieceSymbol) => {
    try {
      const move = chess.move({ from, to, promotion: promotion || 'q' });
      if (!move) return;

      const newFen = chess.fen();
      const updatedHistory = historyFens.slice(0, historyIndex + 1).concat(newFen);
      const updatedSan = sanHistory.slice(0, historyIndex).concat(move.san);

      setHistoryFens(updatedHistory);
      setSanHistory(updatedSan);
      setHistoryIndex(updatedHistory.length - 1);
      setLastMove({ from, to });
      soundService.playMove();
      setChess(new Chess(newFen));
    } catch {
      //
    }
  };

  const jumpToMove = (idx: number) => {
    if (idx < 0 || idx >= historyFens.length) return;
    setHistoryIndex(idx);
    const targetFen = historyFens[idx];
    const newChess = new Chess(targetFen);
    setChess(newChess);
    setLastMove(null);
  };

  const handleReset = () => {
    const initial = new Chess();
    setChess(initial);
    setHistoryFens([initial.fen()]);
    setSanHistory([]);
    setHistoryIndex(0);
    setLastMove(null);
    soundService.playGameStart();
  };

  const handleCopyFen = () => {
    navigator.clipboard.writeText(chess.fen());
    setCopiedFen(true);
    setTimeout(() => setCopiedFen(false), 2000);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#161512] text-zinc-100 overflow-hidden select-none">
      {/* Top Navbar */}
      <header className="h-14 border-b border-[#282522] bg-[#1a1916] px-6 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#282622] transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Home</span>
          </button>
          <div className="h-4 w-[1px] bg-[#282522]" />
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-[#81b64c]" />
            <h1 className="text-sm font-black tracking-wide text-white">
              Stockfish 18 NNUE Analysis Studio
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Tablebase indicator if active */}
          {tablebaseInfo?.isTablebase && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1c2e14] border border-[#81b64c]/40 text-[#81b64c] text-xs font-bold">
              <Database className="w-3.5 h-3.5" />
              <span>7-Piece Tablebase Active</span>
            </div>
          )}

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-[#282622] hover:bg-[#33302b] text-zinc-200 hover:text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border border-[#3d3a35]"
          >
            <Upload className="w-4 h-4 text-[#81b64c]" />
            <span>Import PGN / FEN</span>
          </button>

          <button
            onClick={() => router.push('/game/review/demo-game-masterpiece')}
            className="px-3.5 py-1.5 rounded-lg bg-[#81b64c] hover:bg-[#72a342] text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>Game Review Mode</span>
          </button>
        </div>
      </header>

      {/* Main Workspace: Board on Left (65%), Multi-PV Panel on Right (35%) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Board Container */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#161512] relative overflow-auto">
          <div className="flex items-center gap-4">
            <EvalBar score={currentEvalScore} orientation={orientation} />
            <div className="w-[560px] max-w-[85vw] max-h-[85vh] aspect-square">
              <ChessBoard
                chess={chess}
                orientation={orientation}
                boardTheme={boardTheme}
                pieceTheme={pieceTheme}
                onMove={handleMove}
                lastMove={lastMove}
                customArrows={threatInfo?.arrow ? [threatInfo.arrow] : []}
              />
            </div>
          </div>

          {/* Opponent Threat Alert Banner */}
          {threatInfo && (
            <div
              className={`mt-3 w-full max-w-[560px] p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                threatInfo.severity === 'critical'
                  ? 'bg-rose-950/40 border-rose-600/50 text-rose-200'
                  : threatInfo.severity === 'moderate'
                  ? 'bg-amber-950/40 border-amber-600/50 text-amber-200'
                  : 'bg-blue-950/40 border-blue-600/50 text-blue-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle
                  className={`w-4 h-4 shrink-0 ${
                    threatInfo.severity === 'critical'
                      ? 'text-rose-400 animate-pulse'
                      : 'text-amber-400'
                  }`}
                />
                <div>
                  <span className="font-black uppercase tracking-wider text-[10px] block opacity-85">
                    {threatInfo.severity} Threat Detected ({threatInfo.threatMoveSan})
                  </span>
                  <span className="font-semibold text-white text-xs">
                    {threatInfo.description}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setThreatInfo(null)}
                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-black/30 cursor-pointer"
                title="Dismiss threat"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Under-Board Toolbar */}
          <div className="flex items-center gap-2 mt-4 bg-[#211f1c] px-4 py-2 rounded-xl border border-[#2c2925]">
            <button
              onClick={() => jumpToMove(0)}
              disabled={historyIndex === 0}
              className="p-2 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              title="First Move"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => jumpToMove(historyIndex - 1)}
              disabled={historyIndex === 0}
              className="p-2 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              title="Previous Move"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-zinc-300 px-2">
              Ply {historyIndex} / {historyFens.length - 1}
            </span>
            <button
              onClick={() => jumpToMove(historyIndex + 1)}
              disabled={historyIndex >= historyFens.length - 1}
              className="p-2 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              title="Next Move"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => jumpToMove(historyFens.length - 1)}
              disabled={historyIndex >= historyFens.length - 1}
              className="p-2 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              title="Last Move"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>

            <div className="h-4 w-[1px] bg-[#332f2b] mx-1" />

            {/* Threat Detection Button */}
            <button
              onClick={handleDetectThreat}
              disabled={isDetectingThreat}
              className={`px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 text-xs font-bold ${
                threatInfo
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                  : 'text-zinc-400 hover:text-white hover:bg-[#2c2925]'
              }`}
              title="Analyze opponent tactical threats using Null-Move search"
            >
              {isDetectingThreat ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>Threats</span>
            </button>

            <div className="h-4 w-[1px] bg-[#332f2b] mx-1" />

            <button
              onClick={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}
              className="p-2 text-zinc-400 hover:text-white cursor-pointer rounded-lg hover:bg-[#2c2925]"
              title="Flip Board"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="p-2 text-zinc-400 hover:text-white cursor-pointer rounded-lg hover:bg-[#2c2925]"
              title="Reset Board"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleCopyFen}
              className="p-2 text-zinc-400 hover:text-white cursor-pointer rounded-lg hover:bg-[#2c2925]"
              title="Copy FEN"
            >
              {copiedFen ? <Check className="w-4 h-4 text-[#81b64c]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Right Engine Multi-PV & Analysis Tools Panel */}
        <aside className="w-[420px] border-l border-[#282522] bg-[#1a1916] flex flex-col shrink-0">
          {/* Engine Header & Controls */}
          <div className="p-4 border-b border-[#282522] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-[#81b64c]" />
                <span className="text-xs font-black tracking-wider text-white uppercase">
                  Engine Assessment
                </span>
              </div>
              <button
                onClick={() => setIsEngineActive(!isEngineActive)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-colors ${
                  isEngineActive
                    ? 'bg-[#81b64c]/20 text-[#81b64c] border border-[#81b64c]/40'
                    : 'bg-[#282522] text-zinc-400'
                }`}
              >
                {isEngineActive ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3" />}
                <span>{isEngineActive ? 'Engine ON' : 'Engine OFF'}</span>
              </button>
            </div>

            {/* Depth & Speed Indicator Card */}
            <div className="bg-[#211f1c] p-3 rounded-xl border border-[#2b2824] flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-zinc-400">Stockfish 18 NNUE</div>
                <div className="text-lg font-black font-mono text-white flex items-center gap-2">
                  <span className={currentEvalScore >= 0 ? 'text-[#81b64c]' : 'text-rose-400'}>
                    {currentEvalFormatted}
                  </span>
                  {isEvaluating && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />}
                </div>
              </div>

              <div className="text-right">
                <div className="text-[11px] font-mono text-zinc-400">
                  Depth <span className="text-white font-bold">{engineDepth || targetDepth}</span>
                </div>
                <div className="text-[10px] font-mono text-zinc-500">
                  {nodesCount ? `${(nodesCount / 1000).toFixed(0)}k nodes` : 'Instant cache'}
                </div>
              </div>
            </div>

            {/* Depth Selector Pills */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-zinc-400 mr-1">Depth:</span>
              {[10, 14, 18].map((d) => (
                <button
                  key={d}
                  onClick={() => setTargetDepth(d)}
                  className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold cursor-pointer transition-colors ${
                    targetDepth === d
                      ? 'bg-[#81b64c] text-white'
                      : 'bg-[#24221f] text-zinc-400 hover:bg-[#2e2b26]'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* 7-Piece Tablebase Status Card (If active) */}
          {tablebaseInfo?.isTablebase && (
            <div className="m-4 mb-0 p-3 rounded-xl bg-[#142312] border border-[#81b64c]/30 text-xs flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-[#81b64c] font-black uppercase text-[10px] tracking-wider">
                <Database className="w-3.5 h-3.5" />
                <span>Syzygy 7-Piece Endgame Tablebase</span>
              </div>
              <p className="text-zinc-200 font-medium leading-relaxed">
                {tablebaseInfo.humanDescription}
              </p>
              {tablebaseInfo.bestMoveSan && (
                <div className="text-[#81b64c] font-mono font-bold text-[11px]">
                  Optimal Tablebase Move: {tablebaseInfo.bestMoveSan}
                </div>
              )}
            </div>
          )}

          {/* Top Multi-PV Lines */}
          <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
            <span className="text-[11px] font-black tracking-wider text-zinc-400 uppercase">
              Top Alternative Variations (Multi-PV)
            </span>

            {pvLines.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500 font-medium">
                Evaluating position with Stockfish NNUE...
              </div>
            ) : (
              pvLines.map((line) => (
                <div
                  key={line.rank}
                  className="p-3 rounded-xl bg-[#211f1c] border border-[#2b2824] hover:border-[#81b64c]/40 transition-colors flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-[#2b2824] text-[10px] font-black text-zinc-400">
                        PV {line.rank}
                      </span>
                      <span className="text-xs font-bold text-white font-mono">
                        {line.bestMoveSan}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-black font-mono ${
                        line.scoreCp >= 0 ? 'text-[#81b64c]' : 'text-rose-400'
                      }`}
                    >
                      {line.scoreFormatted}
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-zinc-400 line-clamp-2 leading-relaxed">
                    {line.pvSan && line.pvSan.length > 0
                      ? line.pvSan.slice(0, 8).join(' ')
                      : line.bestMoveSan}
                  </div>
                </div>
              ))
            )}

            {/* Move List Log */}
            <div className="mt-4 pt-4 border-t border-[#282522]">
              <span className="text-[11px] font-black tracking-wider text-zinc-400 uppercase block mb-2">
                Move Sequence ({sanHistory.length} plies)
              </span>
              <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto text-xs font-mono">
                {Array.from({ length: Math.ceil(sanHistory.length / 2) }).map((_, moveIdx) => {
                  const whitePly = moveIdx * 2;
                  const blackPly = moveIdx * 2 + 1;
                  return (
                    <React.Fragment key={moveIdx}>
                      <div
                        onClick={() => jumpToMove(whitePly + 1)}
                        className={`p-1.5 rounded cursor-pointer transition-colors ${
                          historyIndex === whitePly + 1
                            ? 'bg-[#81b64c] text-white font-bold'
                            : 'hover:bg-[#282522] text-zinc-300'
                        }`}
                      >
                        {moveIdx + 1}. {sanHistory[whitePly]}
                      </div>
                      {blackPly < sanHistory.length ? (
                        <div
                          onClick={() => jumpToMove(blackPly + 1)}
                          className={`p-1.5 rounded cursor-pointer transition-colors ${
                            historyIndex === blackPly + 1
                              ? 'bg-[#81b64c] text-white font-bold'
                              : 'hover:bg-[#282522] text-zinc-300'
                          }`}
                        >
                          {sanHistory[blackPly]}
                        </div>
                      ) : (
                        <div />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Import PGN / FEN Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1f1e1b] border border-[#33302b] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-[#2d2b27] flex items-center justify-between bg-[#191815]">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#81b64c]" />
                <h2 className="text-sm font-black text-white">Import PGN or FEN</h2>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportError(null);
                }}
                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#2c2925] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-3">
              <p className="text-xs text-zinc-400">
                Paste any standard PGN game notation (with headers or moves) or FEN position string to load it into the Stockfish 18 NNUE Studio.
              </p>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={`1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6...\n\nOR\n\nr1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3`}
                rows={7}
                className="w-full bg-[#141311] border border-[#2c2a26] rounded-xl p-3 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#81b64c] transition-colors resize-none"
              />

              {importError && (
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-600/40 text-rose-300 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                  <span>{importError}</span>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-[#2d2b27] bg-[#191815] flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportError(null);
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-zinc-400 hover:text-white hover:bg-[#282622] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleImportSubmit}
                disabled={!importText.trim()}
                className="px-4 py-1.5 rounded-lg text-xs font-black bg-[#81b64c] hover:bg-[#72a342] text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Load Into Studio</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
