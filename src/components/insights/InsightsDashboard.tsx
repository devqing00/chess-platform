'use client';

import React, { useState, useMemo } from 'react';
import { Chess, Square } from 'chess.js';
import { ChessBoard } from '../board/ChessBoard';
import {
  DiamondInsightsReport,
  BlunderSquareDensity,
  InsightsService,
} from '@/lib/server/insightsService';
import { BoardTheme, PieceTheme } from '@/types/chess';
import { soundService } from '@/lib/audioService';
import {
  Flame,
  Target,
  Clock,
  ShieldAlert,
  Award,
  Compass,
  TrendingUp,
  Sparkles,
  ChevronRight,
  BarChart2,
  Layers,
  AlertCircle,
  Zap,
  BookOpen,
  Filter,
} from 'lucide-react';

interface InsightsDashboardProps {
  initialReport?: DiamondInsightsReport;
  boardTheme?: BoardTheme;
  pieceTheme?: PieceTheme;
}

export const InsightsDashboard: React.FC<InsightsDashboardProps> = ({
  initialReport,
  boardTheme = 'green',
  pieceTheme = 'neo',
}) => {
  const [timeClass, setTimeClass] = useState<'all' | 'blitz' | 'rapid' | 'bullet'>('blitz');
  const [colorFilter, setColorFilter] = useState<'all' | 'white' | 'black'>('all');
  const [selectedSquare, setSelectedSquare] = useState<Square>('f7');

  // Compute live report based on active filter controls
  const report: DiamondInsightsReport = useMemo(() => {
    return InsightsService.generateInsightsReport('player', timeClass, colorFilter);
  }, [timeClass, colorFilter]);

  // Chess instance for the interactive heatmap board
  const chessInstance = useMemo(() => {
    return new Chess();
  }, []);

  // Compute custom square highlights for the 64-square blunder heatmap
  const heatmapHighlights = useMemo(() => {
    const list: { square: Square; color?: string; label?: string; border?: string }[] = [];

    Object.entries(report.squareHeatmap).forEach(([sq, data]) => {
      const isSelected = sq === selectedSquare;
      const blunders = data.blunders;

      let color = 'transparent';
      let border = isSelected ? 'border-2 border-white ring-2 ring-white shadow-lg' : '';

      if (blunders >= 7) {
        color = 'rgba(239, 68, 68, 0.75)'; // High danger red
      } else if (blunders >= 4) {
        color = 'rgba(249, 115, 22, 0.65)'; // Intense orange
      } else if (blunders >= 2) {
        color = 'rgba(234, 179, 8, 0.45)'; // Amber warning
      } else if (blunders === 1) {
        color = 'rgba(234, 179, 8, 0.2)'; // Faint yellow
      }

      list.push({
        square: sq as Square,
        color,
        border,
        label: blunders > 0 ? `${blunders}` : undefined,
      });
    });

    return list;
  }, [report, selectedSquare]);

  const selectedSquareData: BlunderSquareDensity =
    report.squareHeatmap[selectedSquare] || report.squareHeatmap.f7;

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-2 sm:p-4 select-none text-zinc-100">
      {/* Top Diamond Insights Header & Filter Toolbar */}
      <div className="bg-[#1a1815] border border-[#2b2824] rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Diamond Insights & Weakness Engine
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                Tier: Diamond
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Longitudinal analysis across {report.gamesAnalyzedCount} rated games (
              {report.totalMovesAnalyzed.toLocaleString()} moves evaluated)
            </p>
          </div>
        </div>

        {/* Global Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Class Filter */}
          <div className="flex items-center bg-black/40 border border-zinc-800 rounded-xl p-1">
            {(['all', 'blitz', 'rapid', 'bullet'] as const).map((tc) => (
              <button
                key={tc}
                onClick={() => {
                  setTimeClass(tc);
                  soundService.playMove();
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                  timeClass === tc
                    ? 'bg-[#81b64c] text-black shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tc}
              </button>
            ))}
          </div>

          {/* Color Filter */}
          <div className="flex items-center bg-black/40 border border-zinc-800 rounded-xl p-1">
            {(['all', 'white', 'black'] as const).map((cf) => (
              <button
                key={cf}
                onClick={() => {
                  setColorFilter(cf);
                  soundService.playMove();
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                  colorFilter === cf
                    ? 'bg-[#81b64c] text-black shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {cf === 'all' ? 'Both Colors' : cf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Primary KPI Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#1a1815] border border-[#2b2824] rounded-2xl p-4 flex flex-col gap-1 shadow-lg">
          <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
            Estimated Rating (EPR)
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">{report.estimatedElo}</span>
            <span className="text-xs font-bold text-emerald-400">+42 this month</span>
          </div>
          <span className="text-[10px] text-zinc-500">Based on CAPS 2.0 evaluation</span>
        </div>

        <div className="bg-[#1a1815] border border-[#2b2824] rounded-2xl p-4 flex flex-col gap-1 shadow-lg">
          <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
            Average Accuracy
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-cyan-400">
              {report.overallAccuracy}%
            </span>
            <span className="text-xs font-bold text-zinc-400">Top 18%</span>
          </div>
          <span className="text-[10px] text-zinc-500">Peer group average: 74.2%</span>
        </div>

        <div className="bg-[#1a1815] border border-[#2b2824] rounded-2xl p-4 flex flex-col gap-1 shadow-lg">
          <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
            Avg Centipawn Loss (ACPL)
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-400">
              {report.overallAcpl} cp
            </span>
            <span className="text-xs font-bold text-emerald-400">Strong</span>
          </div>
          <span className="text-[10px] text-zinc-500">Lower is better (&lt;30 is Master)</span>
        </div>

        <div className="bg-[#1a1815] border border-[#2b2824] rounded-2xl p-4 flex flex-col gap-1 shadow-lg">
          <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
            Time Scramble Panic Index
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-rose-400">
              {report.timePressureCurve.panicIndex} / 100
            </span>
            <span className="text-xs font-bold text-rose-400">High</span>
          </div>
          <span className="text-[10px] text-zinc-500">{report.timePressureCurve.panicRating}</span>
        </div>
      </div>

      {/* Main Row: 64-Square Blunder Heatmap Board & Square Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Interactive 64-Square Heatmap Board */}
        <div className="lg:col-span-7 bg-[#1a1815] border border-[#2b2824] rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col items-center gap-4">
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-rose-500 animate-pulse" />
              <h2 className="text-base font-black text-white">
                64-Square Blunder Density Heatmap
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-400 text-[11px]">Intensity:</span>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-zinc-800 border border-zinc-700" title="0" />
                <span className="w-3 h-3 rounded bg-amber-400/50" title="1-3" />
                <span className="w-3 h-3 rounded bg-orange-500/70" title="4-6" />
                <span className="w-3 h-3 rounded bg-red-600/90 shadow" title="7+" />
              </div>
            </div>
          </div>

          <div className="relative w-full max-w-[480px]">
            <ChessBoard
              chess={chessInstance}
              orientation="w"
              boardTheme={boardTheme}
              pieceTheme={pieceTheme}
              customSquareHighlights={heatmapHighlights}
              onCustomSquareClick={(sq) => {
                setSelectedSquare(sq);
                soundService.playMove();
                return true;
              }}
            />
          </div>

          <p className="text-xs text-zinc-400 text-center">
            Click any square on the board to inspect specific tactical vulnerabilities and blunders.
          </p>
        </div>

        {/* Selected Square Weakness Profile Inspector Card */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-[#1a1815] border border-[#2b2824] rounded-2xl p-5 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2b2824]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center font-mono font-black text-rose-400 text-lg">
                  {selectedSquare}
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Square Weakness Profile</h3>
                  <span className="text-[11px] text-zinc-400">
                    {selectedSquareData.blunders > 0 ? 'Critical Hotspot' : 'Low Blunder Frequency'}
                  </span>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-black uppercase ${
                  selectedSquareData.blunders >= 6
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                    : selectedSquareData.blunders >= 2
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                }`}
              >
                {selectedSquareData.blunderRatePct}% Blunder Rate
              </span>
            </div>

            {/* Tactical stats breakdown on selected square */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 bg-black/40 rounded-xl border border-zinc-800 flex flex-col items-center">
                <span className="text-lg font-black text-red-400">
                  {selectedSquareData.blunders}
                </span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Blunders</span>
              </div>
              <div className="p-2.5 bg-black/40 rounded-xl border border-zinc-800 flex flex-col items-center">
                <span className="text-lg font-black text-amber-400">
                  {selectedSquareData.mistakes}
                </span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Mistakes</span>
              </div>
              <div className="p-2.5 bg-black/40 rounded-xl border border-zinc-800 flex flex-col items-center">
                <span className="text-lg font-black text-zinc-200">
                  {selectedSquareData.totalMoves}
                </span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Moves Played</span>
              </div>
            </div>

            {/* Tactical Theme on this square */}
            <div className="p-3 bg-[#24211d] rounded-xl border border-zinc-700/60 flex flex-col gap-1">
              <span className="text-[11px] font-black uppercase text-zinc-400">
                Primary Tactical Theme:
              </span>
              <p className="text-xs text-zinc-200 leading-relaxed font-medium">
                {selectedSquareData.keyTacticalTheme}
              </p>
            </div>

            {/* Quick Select Worst Hotspots */}
            <div className="flex flex-col gap-2 pt-2 border-t border-[#2b2824]">
              <span className="text-[11px] font-bold text-zinc-400">Top Blunder Squares:</span>
              <div className="flex items-center gap-2">
                {report.worstThreeSquares.map((sqData) => (
                  <button
                    key={sqData.square}
                    onClick={() => {
                      setSelectedSquare(sqData.square);
                      soundService.playMove();
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                      selectedSquare === sqData.square
                        ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                        : 'bg-black/30 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="font-mono font-black">{sqData.square}</span>
                    <span className="text-[10px] font-black text-red-400">
                      {sqData.blunders} blunders
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Piece Vulnerability Breakdown Card */}
          <div className="bg-[#1a1815] border border-[#2b2824] rounded-2xl p-5 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300">
                  Piece Tactical Vulnerability
                </h3>
              </div>
              <span className="text-[10px] text-zinc-500">Unforced Losses</span>
            </div>

            <div className="flex flex-col gap-2">
              {report.pieceVulnerabilities.map((pv) => (
                <div
                  key={pv.piece}
                  className="p-2 bg-black/30 rounded-xl border border-zinc-800 flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-zinc-200">{pv.name}</span>
                    <span className="text-[10px] text-zinc-400">{pv.primaryMistakePattern}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-black text-amber-400">{pv.lostToTacticsPct}%</span>
                    <span className="text-[10px] text-zinc-500">{pv.lostToTacticsCount} lost</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Game Phase Strength & Time Pressure Scramble Panic Curve */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Game Phase Strength (Opening, Middlegame, Endgame) */}
        <div className="lg:col-span-6 bg-[#1a1815] border border-[#2b2824] rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-black text-white">Game Phase Strength Radar</h2>
            </div>
            <span className="text-[11px] font-bold text-[#81b64c]">Peer Percentiles</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(
              [
                { phase: 'Opening', data: report.phaseMetrics.opening, color: 'text-emerald-400' },
                { phase: 'Middlegame', data: report.phaseMetrics.middlegame, color: 'text-amber-400' },
                { phase: 'Endgame', data: report.phaseMetrics.endgame, color: 'text-cyan-400' },
              ] as const
            ).map((p) => (
              <div
                key={p.phase}
                className="bg-black/40 rounded-xl p-3 border border-zinc-800 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300">{p.phase}</span>
                  <span className={`text-[10px] font-black uppercase ${p.color}`}>
                    {p.data.ratingGrade}
                  </span>
                </div>
                <div className="text-xl font-black text-white">{p.data.accuracy}%</div>
                <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-[#81b64c] h-full rounded-full"
                    style={{ width: `${p.data.peerPercentile}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1">
                  <span>ACPL: {p.data.acpl}</span>
                  <span>{p.data.peerPercentile}th %tile</span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Your endgame technique ({report.phaseMetrics.endgame.accuracy}%) is currently your strongest asset (75th percentile). Your middlegame conversion ({report.phaseMetrics.middlegame.accuracy}%) has the highest blunder density and offers the fastest route to rating improvement.
          </p>
        </div>

        {/* Time Pressure & Clock Scramble Panic Curve */}
        <div className="lg:col-span-6 bg-[#1a1815] border border-[#2b2824] rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-rose-400" />
              <h2 className="text-base font-black text-white">Time Trouble Panic Curve</h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/40">
              Panic Score: {report.timePressureCurve.panicIndex}/100
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {report.timePressureCurve.bands.map((band, idx) => (
              <div
                key={band.label}
                className="p-3 bg-black/40 rounded-xl border border-zinc-800 flex items-center justify-between"
              >
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-zinc-200">{band.label}</span>
                  <span className="text-[10px] text-zinc-400">{band.clockRange}</span>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-zinc-300">Accuracy</span>
                    <span
                      className={`text-sm font-black ${
                        band.avgAccuracy >= 80
                          ? 'text-emerald-400'
                          : band.avgAccuracy >= 65
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {band.avgAccuracy}%
                    </span>
                  </div>

                  <div className="flex flex-col items-end min-w-[70px]">
                    <span className="text-xs font-bold text-zinc-300">Blunder Rate</span>
                    <span className="text-sm font-black text-rose-400">
                      {band.blundersPer10Moves} / 10 moves
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-rose-300/90 leading-relaxed font-medium">
            ⚠️ Critical Finding: Your accuracy drops precipitously from 86.4% down to 51.0% when your clock drops below 30 seconds.
          </p>
        </div>
      </div>

      {/* Row 3: Opening Repertoire Matrix */}
      <div className="bg-[#1a1815] border border-[#2b2824] rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-black text-white">Opening Repertoire Matrix</h2>
          </div>
          <span className="text-xs text-zinc-400">
            Sorted by frequency of games played
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-[11px] font-black uppercase text-zinc-400">
                <th className="py-2.5 px-3">Opening</th>
                <th className="py-2.5 px-3">ECO</th>
                <th className="py-2.5 px-3">Color</th>
                <th className="py-2.5 px-3">Games</th>
                <th className="py-2.5 px-3">Win / Draw / Loss</th>
                <th className="py-2.5 px-3">Accuracy</th>
                <th className="py-2.5 px-3">ACPL</th>
                <th className="py-2.5 px-3">Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {report.openingRepertoire.map((op) => (
                <tr key={`${op.eco}-${op.name}`} className="hover:bg-white/[0.02] transition">
                  <td className="py-3 px-3 font-bold text-white">{op.name}</td>
                  <td className="py-3 px-3 font-mono text-zinc-400">{op.eco}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                        op.asColor === 'white'
                          ? 'bg-zinc-200 text-black'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {op.asColor}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-bold text-zinc-300">{op.games}</td>
                  <td className="py-3 px-3 min-w-[140px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-400 font-bold">{op.winRatePct}%</span>
                      <span className="text-zinc-500">/</span>
                      <span className="text-zinc-400">{op.drawRatePct}%</span>
                      <span className="text-zinc-500">/</span>
                      <span className="text-rose-400">{op.lossRatePct}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-black text-cyan-400">{op.avgAccuracy}%</td>
                  <td className="py-3 px-3 font-bold text-amber-400">{op.acpl} cp</td>
                  <td className="py-3 px-3 font-black text-white">{op.performanceRating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 4: Diamond AI Coach Prescriptions Deck (Danny Rensch style) */}
      <div className="bg-[#1a1815] border border-[#2b2824] rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-black text-white">
              Diamond AI Coach Actionable Training Prescriptions
            </h2>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-amber-500/20 text-amber-400 border border-amber-500/40">
            Personalized Curriculum
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {report.prescriptions.map((rx) => (
            <div
              key={rx.id}
              className="p-4 bg-black/40 rounded-2xl border border-zinc-800 flex flex-col justify-between gap-3 hover:border-zinc-700 transition"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      rx.severity === 'critical'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : rx.severity === 'warning'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {rx.category} • {rx.severity}
                  </span>
                  <span className="text-xs font-black text-emerald-400">
                    Gain: {rx.expectedRatingGain}
                  </span>
                </div>
                <h3 className="text-sm font-black text-white">{rx.title}</h3>
                <p className="text-xs text-zinc-300 leading-relaxed">{rx.finding}</p>
              </div>

              <div className="p-3 bg-[#24211d] rounded-xl border border-zinc-700/60 flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase text-[#81b64c]">
                  Recommended Drill:
                </span>
                <p className="text-xs text-zinc-200 font-medium">{rx.actionableDrill}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
