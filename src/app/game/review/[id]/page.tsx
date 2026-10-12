'use client';

import React, { useState, useEffect, use } from 'react';
import { GameSessionStore } from '@/lib/gameSessionStore';
import { GameReviewSummaryView } from '@/components/analysis/GameReviewSummaryView';
import { GameReviewView } from '@/components/analysis/GameReviewView';
import { GameReviewReport, BoardTheme, PieceTheme } from '@/types/chess';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface ReviewPageProps {
  params: Promise<{ id: string }>;
}

export default function GameReviewPage({ params }: ReviewPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const gameId = resolvedParams.id;

  const [report, setReport] = useState<GameReviewReport | null>(null);
  const [reviewStage, setReviewStage] = useState<'summary' | 'stepper'>('summary');
  const [boardTheme, setBoardTheme] = useState<BoardTheme>('green');
  const [pieceTheme, setPieceTheme] = useState<PieceTheme>('neo');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const session = GameSessionStore.getSession(gameId);
    if (session && session.reviewReport) {
      setReport(session.reviewReport);
    } else if (session && session.moves.length > 0) {
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
      setReport(generated);
    } else {
      // Fallback to Masterpiece Demo review
      const demo = GameSessionStore.createDemoGameSession();
      setReport(demo.reviewReport);
    }
    setIsLoading(false);
  }, [gameId]);

  if (isLoading || !report) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#161512] text-zinc-300">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#81b64c]" />
          <span className="text-sm font-bold tracking-wide">
            Synthesizing Engine Analysis & Review...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#161512] overflow-hidden">
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
