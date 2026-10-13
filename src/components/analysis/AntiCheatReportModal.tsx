'use client';

import React from 'react';
import { AntiCheatReport } from '@/types/chess';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  X,
  Activity,
  Eye,
  MousePointer,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface AntiCheatReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: AntiCheatReport | null;
  telemetry?: {
    tabBlurCount: number;
    totalBlurTimeMs: number;
    mouseLinearityScore: number;
  };
}

export const AntiCheatReportModal: React.FC<AntiCheatReportModalProps> = ({
  isOpen,
  onClose,
  report,
  telemetry,
}) => {
  if (!isOpen || !report) return null;

  const getVerdictBadge = (verdict: AntiCheatReport['verdict']) => {
    switch (verdict) {
      case 'CLEAN':
        return (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Fair Play Verified (Clean)</span>
          </div>
        );
      case 'NORMAL_VARIANCE':
        return (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-black uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" />
            <span>Normal Human Variance</span>
          </div>
        );
      case 'SUSPICIOUS':
        return (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-black uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            <span>Suspicious Outlier</span>
          </div>
        );
      case 'FLAGGED_HIGH_CORRELATION':
        return (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-black uppercase tracking-wider animate-pulse">
            <ShieldAlert className="w-4 h-4" />
            <span>High Correlation Flagged (Z &gt; 4.5)</span>
          </div>
        );
    }
  };

  const zScore = report.metrics.zScore || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-2xl bg-[#1e1c18] border border-[#38342c] rounded-3xl p-6 sm:p-8 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[#2b2823] transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-2xl text-purple-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-white">
                Fair-Play & Anti-Cheat Audit
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Ken Regan Intrinsic Performance Rating (IPR) & Telemetry Screening
              </p>
            </div>
          </div>
          <div>{getVerdictBadge(report.verdict)}</div>
        </div>

        {/* Summary Card */}
        <div className="p-4 rounded-2xl bg-[#26241f] border border-[#38342c] text-xs text-zinc-300 leading-relaxed mb-6">
          {report.summary}
        </div>

        {/* Statistical Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {/* Z-Score */}
          <div className="p-3.5 rounded-2xl bg-[#171613] border border-[#2e2a23] flex flex-col">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
              Regan Z-Score
            </span>
            <span
              className={`text-xl font-black font-mono mt-1 ${
                zScore > 4.5 ? 'text-rose-400' : zScore > 2.0 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {zScore.toFixed(2)}σ
            </span>
            <span className="text-[10px] text-zinc-400 mt-0.5">Threshold: 4.50</span>
          </div>

          {/* Engine Match % */}
          <div className="p-3.5 rounded-2xl bg-[#171613] border border-[#2e2a23] flex flex-col">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
              Rank 1 Match
            </span>
            <span className="text-xl font-black font-mono text-white mt-1">
              {report.metrics.engineCorrelationPct.toFixed(1)}%
            </span>
            <span className="text-[10px] text-zinc-400 mt-0.5">
              {report.metrics.rank1MoveCount} / {report.metrics.totalEvaluatedMoves} moves
            </span>
          </div>

          {/* ACPL */}
          <div className="p-3.5 rounded-2xl bg-[#171613] border border-[#2e2a23] flex flex-col">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
              Average ACPL
            </span>
            <span className="text-xl font-black font-mono text-cyan-400 mt-1">
              {report.metrics.acpl.toFixed(1)}
            </span>
            <span className="text-[10px] text-zinc-400 mt-0.5">
              Exp: {report.metrics.expectedAcplForRating.toFixed(1)}
            </span>
          </div>

          {/* Timing Entropy */}
          <div className="p-3.5 rounded-2xl bg-[#171613] border border-[#2e2a23] flex flex-col">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
              Move Timing CV
            </span>
            <span className="text-xl font-black font-mono text-amber-400 mt-1">
              {report.metrics.timingCoefficientOfVariation.toFixed(2)}
            </span>
            <span className="text-[10px] text-zinc-400 mt-0.5">Human: &gt; 0.35</span>
          </div>
        </div>

        {/* Client Telemetry Panel */}
        <div className="p-4 rounded-2xl bg-[#171613] border border-[#2e2a23] mb-6">
          <h3 className="text-xs font-black text-white uppercase tracking-wider mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" />
            <span>Real-Time Client Telemetry Signals</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#23201b] border border-[#332f26]">
              <Eye className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-white">
                  {telemetry?.tabBlurCount ?? 0} Window Blurs
                </span>
                <span className="text-[10px] text-zinc-400">
                  {telemetry?.totalBlurTimeMs ? `${(telemetry.totalBlurTimeMs / 1000).toFixed(1)}s away` : '0s away'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#23201b] border border-[#332f26]">
              <MousePointer className="w-4 h-4 text-cyan-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-white">
                  Linearity: {telemetry?.mouseLinearityScore ?? 0.15}
                </span>
                <span className="text-[10px] text-zinc-400">
                  {(telemetry?.mouseLinearityScore ?? 0.15) > 0.85 ? 'Bot-like straight' : 'Natural human curves'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#23201b] border border-[#332f26]">
              <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-white">
                  Avg Time: {(report.metrics.moveTimeMeanMs / 1000).toFixed(1)}s
                </span>
                <span className="text-[10px] text-zinc-400">
                  StdDev: {(report.metrics.moveTimeStdDevMs / 1000).toFixed(1)}s
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Flagged Move Anomalies */}
        {report.moveAnomalies.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Flagged Engine Correlations ({report.moveAnomalies.length})</span>
            </h3>
            <div className="divide-y divide-[#2a2620] bg-[#171613] border border-[#2e2a23] rounded-2xl max-h-48 overflow-y-auto">
              {report.moveAnomalies.map((a, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-400">
                      Ply {a.ply} ({a.san})
                    </span>
                    <span className="text-[11px] text-zinc-400">{a.description}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                    Rank #{a.engineRank}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
