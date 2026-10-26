'use client';

import React, { useState, useEffect, use } from 'react';
import { GameSessionStore, parsePgnToMoveRecords, extractTerminationReason } from '@/lib/gameSessionStore';
import { GameReviewSummaryView } from '@/components/analysis/GameReviewSummaryView';
import { GameReviewView } from '@/components/analysis/GameReviewView';
import { GameReviewReport, GameSession, EngineStrengthTier } from '@/types/chess';
import { useRouter } from 'next/navigation';
import { useShell } from '@/context/ShellContext';
import { useAuth } from '@/context/AuthContext';
import { reclassifyReportWithEngine } from '@/lib/server/capsCalculator';
import { Loader2, Cpu, Sparkles, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CHESS_FACTS = [
  "The word 'Checkmate' comes from the Persian 'Shah Mat', meaning 'The King is helpless'.",
  "The longest official tournament game in history lasted 269 moves, between Nikolić and Arsović in 1989.",
  "The shortest possible game ending in checkmate is Fool’s Mate, which takes just 2 moves: 1. f3 e5 2. g4 Qh4#.",
  "There are more possible unique games of chess (~10¹²⁰) than atoms in the observable universe (~10⁸⁰).",
  "The modern folding chessboard was invented in 1125 by a clergyman who hid his board inside two book covers.",
  "The second book ever printed in the English language was about chess, published in 1474.",
  "Garry Kasparov became the youngest undisputed World Chess Champion in history in 1985 at age 22.",
  "The Knight is the only piece that can jump over other pieces, an ancient rule unchanged for over 1,500 years.",
  "In 1997, IBM's Deep Blue became the first computer to defeat a reigning World Champion under match tournament conditions.",
  "The en passant rule was introduced in the 15th century to prevent pawns from avoiding capture on their initial double-step.",
  "A rook and king can force checkmate against a lone king in at most 16 moves from any legal position.",
  "Judit Polgár became a Grandmaster at age 15 years and 4 months, breaking Bobby Fischer's 33-year record.",
  "Magnus Carlsen held an undefeated streak of 125 classical tournament games from 2018 to 2020.",
  "Chess originated in northern India in the 6th century during the Gupta Empire, where it was called 'Chaturanga'.",
  "Bobby Fischer won 20 consecutive games against top Grandmasters in 1970–1971, an unmatched achievement.",
  "The Queen was originally called the 'Vizier' (Advisor) and could only move one square diagonally.",
  "In 1970, Apollo 14 astronauts played the first space-to-ground chess match against Mission Control in Houston.",
  "The mechanical 'Turk' of 1770 fooled Benjamin Franklin and Napoleon, but actually concealed a human master inside.",
  "From the starting board, there are 400 possible board positions after each player moves just once.",
  "Paul Morphy famously played the immortal 'Opera Game' in Paris in 1858 during a performance of The Barber of Seville.",
  "Castling was the last standard rule added to modern chess, standardized across Europe during the 17th century.",
  "A Grandmaster typically recognizes over 100,000 distinct chess patterns from memory in a fraction of a second.",
  "Viswanathan Anand won the World Chess Championship in three different formats: Knockout, Tournament, and Match play.",
  "The longest World Championship game was Game 6 between Carlsen and Nepomniachtchi in 2021 (136 moves, 7 hours 45 minutes).",
  "The 'Knight's Tour' is a mathematical puzzle where a knight visits all 64 squares exactly once, solved over 1,000 years ago.",
  "Grandmaster Timur Gareyev set a world record by playing 48 simultaneous opponents while blindfolded in 2016.",
  "White has a slight first-move advantage, winning roughly 52-54% of decisive games in master tournaments.",
  "The fastest checkmate against 1.e4 is Scholar's Mate, which concludes on move 4 with Qxf7#.",
  "Soviet cosmonauts and Earth ground control played the first Earth-to-Space chess game on June 9, 1970.",
  "The word 'Rook' comes from the Persian 'Rukh', meaning a chariot or fortified tower.",
  "No two games of chess played by grandmasters have ever been identical after 15 moves without deliberate repetition."
];

interface ReviewPageProps {
  params: Promise<{ id: string }>;
}

export default function GameReviewPage({ params }: ReviewPageProps) {
  const router = useRouter();
  const { boardTheme, pieceTheme, analysisEngine, setAnalysisEngine, engineStrength, setEngineStrength } = useShell();
  const { syncedChessCom } = useAuth();
  const resolvedParams = use(params);
  const gameId = resolvedParams.id;

  const [report, setReport] = useState<GameReviewReport | null>(null);
  const [reviewStage, setReviewStage] = useState<'summary' | 'stepper'>('summary');
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadingStep, setLoadingStep] = useState('Evaluating game moves...');
  const [loadingProgress, setLoadingProgress] = useState(18);

  // Rotating random facts (never repeated until entire pool is shown)
  const [shuffledFacts, setShuffledFacts] = useState<string[]>([]);
  const [factIndex, setFactIndex] = useState(0);
  const [reanalyzeNonce, setReanalyzeNonce] = useState(0);

  const handleReanalyze = () => {
    const session = GameSessionStore.getSession(gameId);
    if (session) {
      session.reviewReport = null;
      GameSessionStore.saveSession(session);
    }
    setReport(null);
    setIsLoading(true);
    setLoadingProgress(14);
    setReanalyzeNonce((prev) => prev + 1);
  };

  useEffect(() => {
    // Fisher-Yates shuffle on mount
    const pool = [...CHESS_FACTS];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    setShuffledFacts(pool);
  }, []);

  useEffect(() => {
    if (!isLoading || shuffledFacts.length === 0) return;
    const interval = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % shuffledFacts.length);
    }, 8500);
    return () => clearInterval(interval);
  }, [isLoading, shuffledFacts.length]);

  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 94) return prev;
        const jump = Math.floor(Math.random() * 8) + 4;
        return Math.min(94, prev + jump);
      });
    }, 380);
    return () => clearInterval(interval);
  }, [isLoading]);

  // Instant reactive engine switcher
  const handleEngineChange = (newEngine: 'torch_human' | 'stockfish') => {
    setAnalysisEngine(newEngine);
    if (report) {
      const reclassified = reclassifyReportWithEngine(report, newEngine);
      setReport(reclassified);
      const session = GameSessionStore.getSession(gameId);
      if (session) {
        session.reviewReport = reclassified;
        session.engineMode = newEngine;
        GameSessionStore.saveSession(session);
      }
    }
  };

  // 4-Tier Strength Switcher (Fast, Standard, Deep, Maximum)
  const handleStrengthChange = (newStrength: EngineStrengthTier) => {
    setEngineStrength(newStrength);
    const session = GameSessionStore.getSession(gameId);
    if (session) {
      session.reviewReport = null;
      GameSessionStore.saveSession(session);
    }
    setReport(null);
    setIsLoading(true);
    setLoadingProgress(16);
    setReanalyzeNonce((prev) => prev + 1);
  };

  useEffect(() => {
    let isMounted = true;

    async function loadOrComputeReview() {
      setIsLoading(true);
      setNotFound(false);

      // 1. Try finding in GameSessionStore, localStorage, or Firestore database
      let session: GameSession | null = await GameSessionStore.getSessionAsync(gameId);

      // Auto-parse PGN if session exists but has 0 moves
      if (session && (!session.moves || session.moves.length === 0) && session.pgn) {
        session.moves = parsePgnToMoveRecords(session.pgn);
        session.movesCount = Math.ceil(session.moves.length / 2);
        GameSessionStore.saveSession(session);
      }

      // 2. If not found locally, query Chess.com Sync API for the game
      const storedProfile = typeof window !== 'undefined' ? localStorage.getItem('chess_com_profile') : null;
      const currentSyncedUser = syncedChessCom?.username || (storedProfile ? JSON.parse(storedProfile)?.username : null);

      if ((!session || !session.moves || session.moves.length === 0) && currentSyncedUser) {
        try {
          if (isMounted) setLoadingStep('Syncing game records from Chess.com...');
          const syncRes = await fetch(`/api/sync/chesscom?username=${encodeURIComponent(currentSyncedUser)}`);
          if (syncRes.ok) {
            const syncData = await syncRes.json();
            if (syncData.success && syncData.games) {
              const rawDigits = gameId.replace(/\D/g, '');
              const matchedGame = syncData.games.find((g: any) => {
                if (!g) return false;
                if (g.id === gameId || gameId === g.id) return true;
                if (g.id && (gameId.includes(g.id) || g.id.includes(gameId))) return true;
                if (g.externalUrl && (gameId.includes(g.externalUrl) || g.externalUrl.includes(gameId))) return true;
                if (g.url && (gameId.includes(g.url) || g.url.includes(gameId))) return true;
                if (rawDigits && rawDigits.length >= 6) {
                  if (g.id && g.id.includes(rawDigits)) return true;
                  if (g.externalUrl && g.externalUrl.includes(rawDigits)) return true;
                  if (g.url && g.url.includes(rawDigits)) return true;
                }
                return false;
              });

              if (matchedGame && matchedGame.pgn) {
                const parsedMoves = parsePgnToMoveRecords(matchedGame.pgn);
                  const isUserWin = matchedGame.userResult === 'win';
                  const isUserLoss = matchedGame.userResult === 'loss';
                  const gameResult = matchedGame.gameResult || (isUserWin
                    ? (matchedGame.isUserWhite ? '1-0' : '0-1')
                    : isUserLoss
                    ? (matchedGame.isUserWhite ? '0-1' : '1-0')
                    : '1/2-1/2');
                  const winnerColor: 'w' | 'b' | 'draw' =
                    gameResult === '1-0'
                      ? 'w'
                      : gameResult === '0-1'
                      ? 'b'
                      : 'draw';

                  session = {
                    id: matchedGame.id || gameId,
                    source: 'chesscom',
                    whitePlayer: {
                      id: matchedGame.isUserWhite ? 'user-local' : 'opp',
                      name: matchedGame.isUserWhite
                        ? (matchedGame.userPlayer?.username || currentSyncedUser || 'You')
                        : (matchedGame.opponent?.username || 'Opponent'),
                      rating: matchedGame.isUserWhite ? matchedGame.userPlayer?.rating : matchedGame.opponent?.rating,
                      avatar: matchedGame.isUserWhite ? syncData.profile?.avatar : '',
                      country: matchedGame.isUserWhite ? syncData.profile?.country : '',
                    },
                    blackPlayer: {
                      id: !matchedGame.isUserWhite ? 'user-local' : 'opp',
                      name: !matchedGame.isUserWhite
                        ? (matchedGame.userPlayer?.username || currentSyncedUser || 'You')
                        : (matchedGame.opponent?.username || 'Opponent'),
                      rating: !matchedGame.isUserWhite ? matchedGame.userPlayer?.rating : matchedGame.opponent?.rating,
                      avatar: !matchedGame.isUserWhite ? syncData.profile?.avatar : '',
                      country: !matchedGame.isUserWhite ? syncData.profile?.country : '',
                    },
                    timeControl: parseInt(matchedGame.timeControl) || 600,
                    variant: 'standard',
                    moves: parsedMoves,
                    movesCount: parsedMoves.length > 0 ? Math.ceil(parsedMoves.length / 2) : 0,
                    pgn: matchedGame.pgn,
                    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
                    isGameOver: true,
                    gameResult,
                    resultDetails: {
                      winner: winnerColor,
                      reason: extractTerminationReason(matchedGame),
                      ratingDelta: isUserWin ? 8 : isUserLoss ? -8 : 0,
                      newRating: matchedGame.userPlayer?.rating || 1200,
                      league: 'Elite',
                      trophiesDelta: isUserWin ? 10 : 0,
                    },
                    reviewReport: null,
                    createdAt: matchedGame.playedAt ? new Date(matchedGame.playedAt).getTime() : Date.now(),
                    updatedAt: Date.now(),
                  };
                if (session) {
                  GameSessionStore.saveSession(session);
                }
              }
            }
          }
        } catch (fetchErr) {
          console.warn('Could not auto-fetch game from sync API:', fetchErr);
        }
      }

      // 3. Demo game if requested
      if (gameId === 'demo-game-masterpiece') {
        const demo = GameSessionStore.createDemoGameSession();
        if (isMounted) {
          const formatted = reclassifyReportWithEngine(demo.reviewReport, analysisEngine || 'torch_human');
          setReport(formatted);
          setIsLoading(false);
        }
        return;
      }

const CURRENT_REVIEW_VERSION = 'v3.0';

      // 4. If game has moves: load cached deep review (only if matching current engine version) or compute fresh review
      if (session && session.moves && session.moves.length > 0) {
        if (
          session.reviewReport &&
          session.reviewReport.reviewVersion === CURRENT_REVIEW_VERSION &&
          session.reviewReport.isDeepReview &&
          session.reviewReport.moves.length === session.moves.length
        ) {
          if (isMounted) {
            const aligned = reclassifyReportWithEngine(
              session.reviewReport,
              analysisEngine || session.reviewReport.engineMode || 'torch_human'
            );
            aligned.gameResult = session.gameResult || aligned.gameResult;
            aligned.resultDetails = session.resultDetails || aligned.resultDetails;
            aligned.termination = session.pgn ? session.pgn.match(/\[Termination\s+"([^"]+)"\]/i)?.[1] : undefined;
            setReport(aligned);
            setIsLoading(false);
          }
          return;
        }

        // Compute review via engine API
        try {
          if (isMounted) {
            setLoadingStep('Evaluating moves and game turning points...');
          }
          const controller = new AbortController();
          const timeoutTimer = setTimeout(() => controller.abort(), 8000);

          const res = await fetch('/api/engine/review', {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              gameId,
              moves: session.moves.map((m) => m.san),
              whitePlayer: session.whitePlayer,
              blackPlayer: session.blackPlayer,
              strengthTier: engineStrength || 'fast',
              engineMode: analysisEngine || 'torch_human',
            }),
          });
          clearTimeout(timeoutTimer);

          if (res.ok) {
            const data = await res.json();
            if (data.success && data.report) {
              data.report.isDeepReview = true;
              data.report.reviewVersion = CURRENT_REVIEW_VERSION;
              data.report.gameResult = session.gameResult;
              data.report.resultDetails = session.resultDetails;
              data.report.termination = session.pgn ? session.pgn.match(/\[Termination\s+"([^"]+)"\]/i)?.[1] : undefined;
              session.reviewReport = data.report;
              session.engineMode = analysisEngine || 'torch_human';
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
        const aligned = reclassifyReportWithEngine(generated, analysisEngine || 'torch_human');
        if (isMounted) {
          setReport(aligned);
          setIsLoading(false);
        }
        return;
      }

      // If game could not be found anywhere, show not found
      if (isMounted) {
        setIsLoading(false);
        setNotFound(true);
      }
    }

    loadOrComputeReview();

    return () => {
      isMounted = false;
    };
  }, [gameId, reanalyzeNonce]);

  if (isLoading) {
    return (
      <div className="flex flex-1 w-full h-[100dvh] max-h-[100dvh] overflow-hidden items-center justify-center bg-[#161512] text-zinc-100 p-4 select-none">
        <div className="flex flex-col items-center gap-3.5 max-w-sm w-full bg-[#211f1c] border-2 border-[#35322b] rounded-3xl p-5 shadow-[0_6px_0_0_#141311]">
          {/* Continuously Animated Scanning Checkered Board */}
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-[#38342e] shadow-[0_4px_0_0_#141311]">
            <div className="grid grid-cols-4 grid-rows-4 w-full h-full">
              {Array.from({ length: 16 }).map((_, i) => {
                const row = Math.floor(i / 4);
                const col = i % 4;
                const isLight = (row + col) % 2 === 0;

                return (
                  <div
                    key={i}
                    className={`transition-all duration-300 ${
                      isLight ? 'bg-[#eeeed2]' : 'bg-[#769656]'
                    }`}
                  />
                );
              })}
            </div>

            {/* Continuous Sweeping Radar Scanline (GPU animated) */}
            <div className="absolute inset-x-0 h-5 bg-gradient-to-b from-transparent via-emerald-500/40 to-transparent pointer-events-none animate-pulse" />

            {/* Center Spinning Sparkle Emblem */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-9 h-9 rounded-full bg-[#161512]/95 border-2 border-emerald-500 flex items-center justify-center shadow-[0_2px_0_0_#065f46]">
                <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
              </div>
            </div>
          </div>

          {/* Title & Simple Explanatory Subtitle */}
          <div className="flex flex-col items-center text-center gap-0.5 w-full">
            <h3 className="text-sm font-black text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Analyzing Match</span>
            </h3>
            <p className="text-[11px] text-zinc-400 font-medium">
              Evaluating moves with Stockfish Engine
            </p>
          </div>

          {/* Animated Progress Bar */}
          <div className="w-full flex flex-col gap-1">
            <div className="flex justify-between items-center text-[10px] font-mono font-black">
              <span className="text-zinc-400 truncate max-w-[200px]">{loadingStep}</span>
              <span className="text-emerald-400">{loadingProgress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#141311] p-0.5 border border-[#35322b]">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.2)]"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
          </div>

          {/* Single Clean Chess Fact */}
          {shuffledFacts.length > 0 && (
            <div className="w-full bg-[#181614] border border-[#35322b] rounded-2xl p-3 flex flex-col gap-1 shadow-[0_2px_0_0_#141311]">
              <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                <span>Chess Fact</span>
              </div>
              <p
                key={factIndex}
                className="text-xs text-zinc-300 leading-relaxed italic animate-in fade-in duration-300 min-h-[36px] flex items-center"
              >
                "{shuffledFacts[factIndex]}"
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (notFound || !report) {
    return (
      <div className="flex flex-1 w-full h-[100dvh] max-h-[100dvh] overflow-hidden items-center justify-center bg-[#161512] text-zinc-300 p-4">
        <div className="flex flex-col items-center gap-4 max-w-md text-center bg-[#211f1c] border-2 border-[#35322b] rounded-3xl p-6 shadow-[0_6px_0_0_#141311]">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border-2 border-rose-500/30 flex items-center justify-center text-rose-400 shadow-[0_2px_0_0_#7f1d1d]">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-black text-white">Game Not Found</h3>
            <p className="text-xs text-zinc-400 font-medium mt-1 leading-relaxed">
              Could not locate game record for ID <code className="text-emerald-400 bg-[#161512] px-1.5 py-0.5 rounded font-mono font-bold">{gameId}</code>.
              Sync your Chess.com games on the home screen or choose another match.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => router.push('/')}
            className="rounded-full uppercase tracking-wider gap-2 px-5 py-2.5 text-xs font-black"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Match History</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-[100dvh] xl:h-[100dvh] xl:max-h-[100dvh] bg-[#161512] overflow-y-auto xl:overflow-hidden min-w-0 justify-start pb-16 xl:pb-0">
      {reviewStage === 'summary' ? (
        <GameReviewSummaryView
          report={report}
          boardTheme={boardTheme}
          pieceTheme={pieceTheme}
          engineStrength={engineStrength}
          onStartInteractiveReview={() => setReviewStage('stepper')}
          onBackToGame={() => router.push('/')}
          onEngineChange={handleEngineChange}
          onStrengthChange={handleStrengthChange}
          onReanalyze={handleReanalyze}
        />
      ) : (
        <GameReviewView
          gameId={gameId}
          moves={report.moves}
          whitePlayer={report.whitePlayer}
          blackPlayer={report.blackPlayer}
          whiteAccuracy={report.whiteAccuracy}
          blackAccuracy={report.blackAccuracy}
          keyMoments={report.keyMoments}
          boardTheme={boardTheme}
          pieceTheme={pieceTheme}
          gameResult={report.gameResult}
          resultDetails={report.resultDetails}
          termination={report.termination}
          engineStrength={engineStrength}
          onBackToGame={() => router.push('/')}
          onBackToSummary={() => setReviewStage('summary')}
          onEngineChange={handleEngineChange}
          onStrengthChange={handleStrengthChange}
          onReanalyze={handleReanalyze}
        />
      )}
    </div>
  );
}
