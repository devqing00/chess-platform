'use client';

import React, { useState, useEffect, use } from 'react';
import { GameSessionStore } from '@/lib/gameSessionStore';
import { GameReviewSummaryView } from '@/components/analysis/GameReviewSummaryView';
import { GameReviewView } from '@/components/analysis/GameReviewView';
import { GameReviewReport, BoardTheme, PieceTheme } from '@/types/chess';
import { useRouter } from 'next/navigation';
import { useShell } from '@/context/ShellContext';
import { Loader2, Cpu, Sparkles } from 'lucide-react';

interface ReviewPageProps {
  params: Promise<{ id: string }>;
}

export default function GameReviewPage({ params }: ReviewPageProps) {
  const router = useRouter();
  const { boardTheme, pieceTheme } = useShell();
  const resolvedParams = use(params);
  const gameId = resolvedParams.id;

  const [report, setReport] = useState<GameReviewReport | null>(null);
  const [reviewStage, setReviewStage] = useState<'summary' | 'stepper'>('summary');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState('Initializing Engine Fleet...');

  useEffect(() => {
    let isMounted = true;

    async function loadOrComputeReview() {
      const session = GameSessionStore.getSession(gameId);

      // If already has review report cached with high-accuracy moves
      if (session && session.reviewReport) {
        if (isMounted) {
          setReport(session.reviewReport);
          setIsLoading(false);
        }
        return;
      }

      // If game has moves, trigger backend Stockfish 18 NNUE Review API
      if (session && session.moves.length > 0) {
        try {
          if (isMounted) setLoadingStep('Stockfish 18 NNUE Evaluating Positions...');
          const res = await fetch('/api/engine/review', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              gameId,
              moves: session.moves.map((m) => m.san),
              whitePlayer: session.whitePlayer,
              blackPlayer: session.blackPlayer,
              depth: 10,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success && data.report) {
              // Cache generated report in store
              session.reviewReport = data.report;
              GameSessionStore.saveSession(session);
              if (isMounted) {
                setReport(data.report);
                setIsLoading(false);
              }
              return;
            }
          }
        } catch (err) {
          console.warn('Backend engine review failed, using local fallback:', err);
        }

        // Local fallback if API unavailable
        const generated = GameSessionStore.completeGame(
          gameId,
          session.moves,
          session.gameResult || 'Game Concluded',
          session.resultDetails || {
            winner: 'w',
            reason: 'resignation',
            ratingDelta: 10,
            newRating: 1260,
            league: 'Silver League',
            trophiesDelta: 10,
          }
        );
        if (isMounted) {
          setReport(generated);
          setIsLoading(false);
        }
        return;
      }

      // Fallback to Masterpiece Demo game
      const demo = GameSessionStore.createDemoGameSession();
      if (isMounted) {
        setReport(demo.reviewReport);
        setIsLoading(false);
      }
    }

    loadOrComputeReview();

    return () => {
      isMounted = false;
    };
  }, [gameId]);

  if (isLoading || !report) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#161512] text-zinc-300">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <div className="relative">
            <Loader2 className="w-10 h-10 animate-spin text-[#81b64c]" />
            <Cpu className="w-4 h-4 text-white absolute inset-0 m-auto" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#81b64c]" />
              <span>Synthesizing Game Review</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1 font-mono">{loadingStep}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#161512] overflow-hidden min-w-0">
      {reviewStage === 'summary' ? (
        <GameReviewSummaryView
          report={report}
          boardTheme={boardTheme}
          pieceTheme={pieceTheme}
          onStartInteractiveReview={() => setReviewStage('stepper')}
          onBackToGame={() => router.push('/')}
        />
      ) : (
        <GameReviewView
          moves={report.moves}
          whitePlayer={report.whitePlayer}
          blackPlayer={report.blackPlayer}
          boardTheme={boardTheme}
          pieceTheme={pieceTheme}
          onBackToGame={() => router.push('/')}
          onBackToSummary={() => setReviewStage('summary')}
        />
      )}
    </div>
  );
}
