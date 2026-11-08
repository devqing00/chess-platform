'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Chess, Square } from 'chess.js';
import {
  Search,
  Users,
  Award,
  Zap,
  Flame,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Calendar,
  Trophy,
  Loader2,
  TrendingUp,
  RefreshCw,
  Eye,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Swords,
  Target,
  Shield,
  Layers,
  ChevronRight,
  ChevronLeft,
  UserCheck,
  Compass,
  BookOpen,
  PieChart,
  Play,
  RotateCcw,
  Sliders,
  Radio,
  FileText,
  Crosshair,
  TrendingDown,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  buildPlayerScoutDna,
  generateHowToBeatThemPlan,
  PlayerScoutDna,
  HowToBeatThemPlan,
  TacticalWeapon,
  OpeningDnaItem,
} from '@/lib/server/scoutingEngine';
import { GameSessionStore, parsePgnToMoveRecords } from '@/lib/gameSessionStore';
import { soundService } from '@/lib/audioService';
import { Button } from '@/components/ui/button';
import { PieceIcon } from '@/components/board/PieceIcons';
import { PieceType, PieceColor } from '@/types/chess';

export type PlayerScreen = 'dossier' | 'blueprint' | 'repertoire' | 'compare' | 'matches';

const FEATURED_PLAYERS = [
  { username: 'magnuscarlsen', label: 'Magnus Carlsen 🇳🇴', tag: 'GM' },
  { username: 'hikaru', label: 'Hikaru Nakamura 🇺🇸', tag: 'GM' },
  { username: 'danielnaroditsky', label: 'Daniel Naroditsky 🇺🇸', tag: 'GM' },
  { username: 'gothamchess', label: 'GothamChess 🇺🇸', tag: 'IM' },
  { username: 'firouzja2003', label: 'Alireza Firouzja 🇫🇷', tag: 'GM' },
];

// ============================================================================
// COMPACT INTERACTIVE REFUTATION BOARD PREVIEW
// ============================================================================

interface MiniBoardProps {
  movesText: string;
  orientation?: 'w' | 'b';
  onExplore?: () => void;
  onAnalyze?: () => void;
}

function RefutationMiniBoard({ movesText, orientation = 'w', onExplore, onAnalyze }: MiniBoardProps) {
  const [currentPly, setCurrentPly] = useState(0);

  // Parse moves into sequential game states
  const { positions, sanMoves, movePairs } = useMemo(() => {
    const game = new Chess();
    const posList: { fen: string; lastMove?: { from: Square; to: Square } }[] = [
      { fen: game.fen() },
    ];
    const sanList: string[] = [];

    // Clean moves string: extract SAN tokens e.g. "1. e4 c5 2. Nf3 d6"
    const cleaned = movesText.replace(/\d+\.\s*/g, '').replace(/[?!+#]/g, '').trim();
    const tokens = cleaned.split(/\s+/).filter(Boolean);

    for (const token of tokens) {
      try {
        const moveRes = game.move(token);
        if (moveRes) {
          sanList.push(token);
          posList.push({
            fen: game.fen(),
            lastMove: { from: moveRes.from, to: moveRes.to },
          });
        }
      } catch {
        break;
      }
    }

    return {
      positions: posList,
      sanMoves: sanList,
      movePairs: sanList.reduce<{ moveNumber: number; white: string; black?: string }[]>(
        (acc, san, idx) => {
          if (idx % 2 === 0) {
            acc.push({ moveNumber: Math.floor(idx / 2) + 1, white: san });
          } else {
            acc[acc.length - 1].black = san;
          }
          return acc;
        },
        []
      ),
    };
  }, [movesText]);

  // Reset to last move when weapon changes
  useEffect(() => {
    setCurrentPly(positions.length - 1);
  }, [positions]);

  const activePosition = positions[currentPly] || positions[0];
  const activeChess = useMemo(() => new Chess(activePosition.fen), [activePosition.fen]);
  const board = activeChess.board();

  // Step handlers
  const handleFirst = () => {
    setCurrentPly(0);
    soundService.playMove();
  };
  const handlePrev = () => {
    if (currentPly > 0) {
      setCurrentPly((p) => p - 1);
      soundService.playMove();
    }
  };
  const handleNext = () => {
    if (currentPly < positions.length - 1) {
      setCurrentPly((p) => p + 1);
      soundService.playMove();
    }
  };
  const handleLast = () => {
    setCurrentPly(positions.length - 1);
    soundService.playMove();
  };

  const isWhiteOrientation = orientation === 'w';
  const displayRanks = isWhiteOrientation ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const displayFiles = isWhiteOrientation ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];

  return (
    <div className="w-full flex flex-col gap-3 rounded-2xl bg-[#141311] border border-white/10 p-3 sm:p-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-wider text-white">
            Interactive Refutation Line
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-zinc-300">
            Ply {currentPly} / {positions.length - 1}
          </span>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {onExplore && (
            <Button variant="secondary" size="xs" rounded="lg" onClick={onExplore} className="text-[11px]">
              <Compass className="w-3 h-3 text-cyan-400" />
              <span>Explore Repertoire</span>
            </Button>
          )}
          {onAnalyze && (
            <Button variant="primary" size="xs" rounded="lg" onClick={onAnalyze} className="text-[11px]">
              <Sparkles className="w-3 h-3" />
              <span>Practice vs Bot</span>
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
        {/* The 8x8 Mini Chessboard */}
        <div className="w-64 h-64 sm:w-72 sm:h-72 aspect-square rounded-xl overflow-hidden border-2 border-zinc-800 shadow-2xl shrink-0 select-none grid grid-rows-8 grid-cols-8 relative">
          {displayRanks.map((rankIdx) =>
            displayFiles.map((fileIdx) => {
              const fileChar = String.fromCharCode(97 + fileIdx);
              const rankNum = rankIdx + 1;
              const sqName = `${fileChar}${rankNum}` as Square;
              const isLight = (rankIdx + fileIdx) % 2 !== 0;
              const piece = board[7 - rankIdx][fileIdx];
              const isLastMoveSq =
                activePosition.lastMove &&
                (activePosition.lastMove.from === sqName || activePosition.lastMove.to === sqName);

              return (
                <div
                  key={sqName}
                  className={`relative flex items-center justify-center transition-colors duration-150 ${
                    isLastMoveSq
                      ? isLight
                        ? 'bg-[#cdd26a]'
                        : 'bg-[#aaa23a]'
                      : isLight
                      ? 'bg-[#eeeed2]'
                      : 'bg-[#769656]'
                  }`}
                >
                  {piece && (
                    <div className="w-[84%] h-[84%] flex items-center justify-center pointer-events-none transition-transform duration-100">
                      <PieceIcon
                        type={piece.type as PieceType}
                        color={piece.color as PieceColor}
                        theme="neo"
                        className="w-full h-full drop-shadow-md"
                      />
                    </div>
                  )}

                  {/* Coordinates on outer squares */}
                  {rankIdx === (isWhiteOrientation ? 0 : 7) && (
                    <span
                      className={`absolute bottom-0.5 right-1 text-[8px] font-mono font-bold leading-none pointer-events-none select-none ${
                        isLight ? 'text-[#769656]' : 'text-[#eeeed2]'
                      }`}
                    >
                      {fileChar}
                    </span>
                  )}
                  {fileIdx === (isWhiteOrientation ? 0 : 7) && (
                    <span
                      className={`absolute top-0.5 left-1 text-[8px] font-mono font-bold leading-none pointer-events-none select-none ${
                        isLight ? 'text-[#769656]' : 'text-[#eeeed2]'
                      }`}
                    >
                      {rankNum}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Move History Strip & Step Controls */}
        <div className="flex-1 w-full flex flex-col justify-between gap-3 min-w-0">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
              Move Order &amp; Branching:
            </span>
            <div className="p-2.5 rounded-xl bg-[#1c1a17] border border-white/5 max-h-36 sm:max-h-44 overflow-y-auto flex flex-wrap gap-1.5 content-start">
              {movePairs.map((pair, pIdx) => {
                const whitePly = pIdx * 2 + 1;
                const blackPly = pIdx * 2 + 2;
                const isWhiteActive = currentPly === whitePly;
                const isBlackActive = currentPly === blackPly;

                return (
                  <div
                    key={pIdx}
                    className="flex items-center gap-1 bg-[#141311] px-2 py-1 rounded-lg border border-white/5 text-xs font-mono"
                  >
                    <span className="text-zinc-500 font-bold">{pair.moveNumber}.</span>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentPly(whitePly);
                        soundService.playMove();
                      }}
                      className={`px-1.5 py-0.5 rounded transition cursor-pointer font-extrabold ${
                        isWhiteActive
                          ? 'bg-emerald-500 text-black shadow-sm'
                          : 'text-zinc-200 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {pair.white}
                    </button>
                    {pair.black && (
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentPly(blackPly);
                          soundService.playMove();
                        }}
                        className={`px-1.5 py-0.5 rounded transition cursor-pointer font-extrabold ${
                          isBlackActive
                            ? 'bg-emerald-500 text-black shadow-sm'
                            : 'text-zinc-300 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {pair.black}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stepper Toolbar */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
            <div className="flex items-center gap-1.5">
              <Button
                variant="secondary"
                size="xs"
                rounded="lg"
                disabled={currentPly === 0}
                onClick={handleFirst}
                className="px-2"
                title="Start of Line"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="secondary"
                size="xs"
                rounded="lg"
                disabled={currentPly === 0}
                onClick={handlePrev}
                className="px-2"
                title="Previous Move"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="secondary"
                size="xs"
                rounded="lg"
                disabled={currentPly === positions.length - 1}
                onClick={handleNext}
                className="px-2"
                title="Next Move"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="secondary"
                size="xs"
                rounded="lg"
                disabled={currentPly === positions.length - 1}
                onClick={handleLast}
                className="px-2"
                title="End of Line"
              >
                <Play className="w-3.5 h-3.5" />
              </Button>
            </div>

            <span className="text-[11px] font-mono text-zinc-400">
              {currentPly === 0 ? 'Initial Position' : `Move ${Math.ceil(currentPly / 2)}: ${sanMoves[currentPly - 1]}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function PlayersExplorerPage() {
  const router = useRouter();
  const { user, profile: myProfile, effectiveDisplayName, effectiveRating, syncedChessCom, syncedLichess } = useAuth();

  // Primary navigation & lookup states
  const [platform, setPlatform] = useState<'chesscom' | 'lichess'>('chesscom');
  const [searchInput, setSearchInput] = useState('magnuscarlsen');
  const [activeUsername, setActiveUsername] = useState('magnuscarlsen');
  const [activeScreen, setActiveScreen] = useState<PlayerScreen>('dossier');

  // Player A Data (Target Opponent)
  const [playerAProfile, setPlayerAProfile] = useState<any | null>(null);
  const [playerAStats, setPlayerAStats] = useState<any | null>(null);
  const [playerAGames, setPlayerAGames] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Player B Data (Comparison / Hero)
  const [compareUsername, setCompareUsername] = useState<string>('');
  const [playerBProfile, setPlayerBProfile] = useState<any | null>(null);
  const [playerBStats, setPlayerBStats] = useState<any | null>(null);
  const [playerBGames, setPlayerBGames] = useState<any[]>([]);
  const [isComparingLoading, setIsComparingLoading] = useState(false);

  // Repertoire filter states
  const [repertoireColorFilter, setRepertoireColorFilter] = useState<'all' | 'white' | 'black'>('all');
  const [repertoireSortBy, setRepertoireSortBy] = useState<'vulnerable' | 'played' | 'winrate'>('vulnerable');

  // Blueprint interactive weapon tab toggle
  const [blueprintActiveWeapon, setBlueprintActiveWeapon] = useState<'white' | 'black'>('white');

  // Match History Filter
  const [matchFilter, setMatchFilter] = useState<'all' | 'rapid' | 'blitz' | 'bullet'>('all');

  // Fetch Player A
  const fetchPlayer = useCallback(
    async (targetUser: string, targetPlatform: 'chesscom' | 'lichess' = platform) => {
      if (!targetUser.trim()) return;
      setIsLoading(true);
      setErrorMessage(null);

      const endpoint =
        targetPlatform === 'chesscom'
          ? `/api/sync/chesscom?username=${encodeURIComponent(targetUser.trim().toLowerCase())}`
          : `/api/sync/lichess?username=${encodeURIComponent(targetUser.trim().toLowerCase())}`;

      try {
        const res = await fetch(endpoint);
        const data = await res.json();

        if (!res.ok || !data.success) {
          setErrorMessage(
            data.error ||
              `Could not find player "${targetUser}" on ${targetPlatform === 'chesscom' ? 'Chess.com' : 'Lichess'}.`
          );
          setIsLoading(false);
          return;
        }

        setPlayerAProfile(data.profile);
        setPlayerAStats(data.stats);
        setPlayerAGames(data.games || []);
        setActiveUsername(targetUser);
      } catch (err: any) {
        setErrorMessage(err?.message || 'Failed to connect to player lookup API.');
      } finally {
        setIsLoading(false);
      }
    },
    [platform]
  );

  // Fetch Player B for head-to-head comparison
  const fetchComparePlayer = useCallback(
    async (targetUser: string, targetPlatform: 'chesscom' | 'lichess' = platform) => {
      if (!targetUser.trim()) return;
      setIsComparingLoading(true);

      const endpoint =
        targetPlatform === 'chesscom'
          ? `/api/sync/chesscom?username=${encodeURIComponent(targetUser.trim().toLowerCase())}`
          : `/api/sync/lichess?username=${encodeURIComponent(targetUser.trim().toLowerCase())}`;

      try {
        const res = await fetch(endpoint);
        const data = await res.json();
        if (data.success) {
          setPlayerBProfile(data.profile);
          setPlayerBStats(data.stats);
          setPlayerBGames(data.games || []);
        }
      } catch (e) {
        console.warn('Failed to fetch comparison player:', e);
      } finally {
        setIsComparingLoading(false);
      }
    },
    [platform]
  );

  // Initial load
  useEffect(() => {
    fetchPlayer('magnuscarlsen', 'chesscom');
  }, [fetchPlayer]);

  // Player A Scout DNA
  const playerADna: PlayerScoutDna = useMemo(() => {
    return buildPlayerScoutDna(playerAProfile, playerAStats, playerAGames, platform);
  }, [playerAProfile, playerAStats, playerAGames, platform]);

  // Hero / Player B Scout DNA
  const heroDna: PlayerScoutDna = useMemo(() => {
    if (playerBProfile) {
      return buildPlayerScoutDna(playerBProfile, playerBStats, playerBGames, platform);
    }
    // Default hero profile from logged-in account or 1500 benchmark
    const myRating = effectiveRating || 1500;
    return {
      username: effectiveDisplayName || 'You',
      platform,
      totalGamesAnalyzed: 45,
      overallWinRatePct: 56,
      ratings: {
        rapid: myRating,
        blitz: Math.max(800, myRating - 50),
        bullet: Math.max(800, myRating - 80),
      },
      openingsAsWhite: [
        {
          eco: 'C50',
          name: 'Italian Game',
          moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5',
          playedCount: 20,
          winCount: 13,
          lossCount: 5,
          drawCount: 2,
          winRatePct: 65,
          color: 'white',
          verdict: 'strong',
        },
        {
          eco: 'D30',
          name: "Queen's Gambit",
          moves: '1. d4 d5 2. c4 e6',
          playedCount: 14,
          winCount: 8,
          lossCount: 4,
          drawCount: 2,
          winRatePct: 57,
          color: 'white',
          verdict: 'strong',
        },
      ],
      openingsAsBlack: [
        {
          eco: 'B20',
          name: 'Sicilian Defense',
          moves: '1. e4 c5 2. Nf3 d6',
          playedCount: 24,
          winCount: 14,
          lossCount: 7,
          drawCount: 3,
          winRatePct: 58,
          color: 'black',
          verdict: 'strong',
        },
        {
          eco: 'E60',
          name: "King's Indian Defense",
          moves: '1. d4 Nf6 2. c4 g6',
          playedCount: 16,
          winCount: 8,
          lossCount: 6,
          drawCount: 2,
          winRatePct: 50,
          color: 'black',
          verdict: 'neutral',
        },
      ],
      phaseAnalysis: {
        openingScore: 80,
        middlegameScore: 84,
        endgameScore: 78,
        tacticalAggressiveness: 76,
        timePanicTendency: 26,
        blunderRatePct: 4.2,
        earlyBlunderLosses: 1,
        endgameGrindLosses: 2,
        timeLosses: 0,
        resignationLosses: 4,
        primaryWeakness: 'Endgame pawn race precision in rook endgames',
        primaryStrength: 'Kingside piece attack coordination and central pawn breaks',
        tacticalBlindspot: 'Defending against knight outposts on d5',
      },
      commonMistakes: ['Premature central simplification', 'Passive rook placement in 7th rank defense'],
    };
  }, [playerBProfile, playerBStats, playerBGames, platform, effectiveDisplayName, effectiveRating]);

  // Grandmaster Blueprint
  const howToBeatThemPlan: HowToBeatThemPlan = useMemo(() => {
    return generateHowToBeatThemPlan(playerADna, heroDna);
  }, [playerADna, heroDna]);

  // Handle Search Submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      fetchPlayer(searchInput.trim(), platform);
      soundService.playMove();
    }
  };

  const handlePlatformToggle = (nextPlatform: 'chesscom' | 'lichess') => {
    setPlatform(nextPlatform);
    fetchPlayer(searchInput.trim() || activeUsername, nextPlatform);
    soundService.playMove();
  };

  const handleCompareWithMe = () => {
    setPlayerBProfile(null);
    setCompareUsername('');
    setActiveScreen('blueprint');
    soundService.playMove();
  };

  const handleReviewGame = (game: any) => {
    try {
      const parsedMoves = game.pgn ? parsePgnToMoveRecords(game.pgn) : [];
      GameSessionStore.saveSession({
        id: game.id,
        source: platform,
        whitePlayer: {
          id: game.isUserWhite ? 'p1' : 'p2',
          name: game.isUserWhite ? playerAProfile?.username || activeUsername : game.opponent?.username || 'Opponent',
          rating: game.isUserWhite ? game.userPlayer?.rating || 1500 : game.opponent?.rating || 1500,
          avatar: game.isUserWhite ? playerAProfile?.avatar || '' : game.opponent?.avatar || '',
        },
        blackPlayer: {
          id: !game.isUserWhite ? 'p1' : 'p2',
          name: !game.isUserWhite ? playerAProfile?.username || activeUsername : game.opponent?.username || 'Opponent',
          rating: !game.isUserWhite ? game.userPlayer?.rating || 1500 : game.opponent?.rating || 1500,
          avatar: !game.isUserWhite ? playerAProfile?.avatar || '' : game.opponent?.avatar || '',
        },
        timeControl: parseInt(game.timeControl) || 600,
        variant: 'standard',
        moves: parsedMoves,
        movesCount: parsedMoves.length > 0 ? Math.ceil(parsedMoves.length / 2) : game.movesCount || 0,
        pgn: game.pgn || '',
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        isGameOver: true,
        gameResult:
          game.userResult === 'win'
            ? game.isUserWhite
              ? '1-0'
              : '0-1'
            : game.userResult === 'loss'
            ? game.isUserWhite
              ? '0-1'
              : '1-0'
            : '1/2-1/2',
        resultDetails: {
          winner:
            game.userResult === 'win'
              ? game.isUserWhite
                ? 'w'
                : 'b'
              : game.userResult === 'loss'
              ? game.isUserWhite
                ? 'b'
                : 'w'
              : 'draw',
          reason: 'resignation',
          ratingDelta: 0,
          newRating: game.userPlayer?.rating || 800,
          league: 'Scouting Review',
          trophiesDelta: 0,
        },
        reviewReport: null,
        createdAt: game.playedAt ? new Date(game.playedAt).getTime() : Date.now(),
        updatedAt: Date.now(),
      });
      router.push(`/game/review/${game.id}`);
    } catch {
      router.push('/analysis');
    }
  };

  // Repertoire Filtering & Sorting
  const filteredRepertoire = useMemo(() => {
    let list: OpeningDnaItem[] = [];
    if (repertoireColorFilter === 'all') {
      list = [...playerADna.openingsAsWhite, ...playerADna.openingsAsBlack];
    } else if (repertoireColorFilter === 'white') {
      list = [...playerADna.openingsAsWhite];
    } else {
      list = [...playerADna.openingsAsBlack];
    }

    if (repertoireSortBy === 'vulnerable') {
      return list.sort((a, b) => {
        const scoreA = (a.verdict === 'vulnerable' ? 50 : 0) + (100 - a.winRatePct) + (a.shortLosses || 0) * 10;
        const scoreB = (b.verdict === 'vulnerable' ? 50 : 0) + (100 - b.winRatePct) + (b.shortLosses || 0) * 10;
        return scoreB - scoreA;
      });
    } else if (repertoireSortBy === 'played') {
      return list.sort((a, b) => b.playedCount - a.playedCount);
    } else {
      return list.sort((a, b) => b.winRatePct - a.winRatePct);
    }
  }, [playerADna, repertoireColorFilter, repertoireSortBy]);

  const filteredGames = useMemo(() => {
    if (matchFilter === 'all') return playerAGames;
    return playerAGames.filter((g) => (g.timeClass || '').toLowerCase().includes(matchFilter));
  }, [playerAGames, matchFilter]);

  const activeWeaponData =
    blueprintActiveWeapon === 'white'
      ? howToBeatThemPlan.recommendedWeaponWhite
      : howToBeatThemPlan.recommendedDefenseBlack;

  return (
    <div className="w-full flex-1 flex flex-col p-3 sm:p-4 lg:p-6 bg-[#161512] text-zinc-100 select-none pb-32 sm:pb-36 lg:pb-36 xl:pb-6 gap-3.5 xl:h-full xl:max-h-full xl:overflow-hidden">
      <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col gap-3 sm:gap-4 min-h-0 xl:overflow-hidden">
        {/* ========================================================================= */}
        {/* 1. TOP HEADER & SEARCH BAR                                                */}
        {/* ========================================================================= */}
        <header className="p-3.5 sm:p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col gap-3 shrink-0 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
                <Users className="w-4.5 h-4.5" />
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-sm sm:text-base font-black uppercase tracking-wider text-white truncate">
                  Grandmaster Scout &amp; Dossier
                </h1>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/30 uppercase shrink-0">
                  Live Engine
                </span>
              </div>
            </div>

            {/* Platform Toggle */}
            <div className="flex items-center gap-1 p-1 bg-[#141311] border border-white/10 rounded-xl self-stretch sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  soundService.playTactilePop();
                  handlePlatformToggle('chesscom');
                }}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer select-none ${
                  platform === 'chesscom'
                    ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-black font-black shadow-[0_2px_0_0_#385a16] border-t border-white/35'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>♟️</span>
                <span>Chess.com</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundService.playTactilePop();
                  handlePlatformToggle('lichess');
                }}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer select-none ${
                  platform === 'lichess'
                    ? 'bg-gradient-to-b from-amber-500 to-amber-700 text-white font-black shadow-[0_2px_0_0_#78350f] border-t border-white/35'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>⚔️</span>
                <span>Lichess</span>
              </button>
            </div>
          </div>

          {/* Search Bar & Grandmasters Chips */}
          <div className="flex flex-col gap-2.5">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={`Search ${platform === 'chesscom' ? 'Chess.com' : 'Lichess'} handle (e.g. magnuscarlsen, hikaru)...`}
                className="w-full bg-[#141311] border border-white/10 rounded-xl pl-10 pr-24 py-2.5 text-xs sm:text-sm font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all shadow-inner font-mono"
              />
              <Button
                type="submit"
                variant="primary"
                size="xs"
                rounded="lg"
                disabled={isLoading}
                className="absolute right-1.5 px-3 py-1.5 shadow-sm"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span className="font-extrabold">Scout</span>
              </Button>
            </form>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 shrink-0">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider hidden sm:inline shrink-0 mr-1">
                Verified:
              </span>
              {FEATURED_PLAYERS.map((p) => {
                const isActive = activeUsername.toLowerCase() === p.username.toLowerCase();
                return (
                  <button
                    key={p.username}
                    type="button"
                    onClick={() => {
                      soundService.playTactilePop();
                      setSearchInput(p.username);
                      fetchPlayer(p.username, platform);
                    }}
                    className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-black font-black shadow-[0_2px_0_0_#385a16] border-t border-white/35'
                        : 'bg-[#141311] border border-white/5 text-zinc-400 hover:text-white hover:border-white/15'
                    }`}
                  >
                    <span>{p.label}</span>
                    <span className="text-[9px] font-black uppercase bg-black/25 px-1 py-0.2 rounded font-mono">
                      {p.tag}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl flex items-center gap-2.5 text-xs text-rose-200 font-medium shadow shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. NAVIGATION BAR (Sub-Screens)                                           */}
        {/* ========================================================================= */}
        <nav className="shrink-0 flex items-center justify-between gap-2 border-b border-white/5 pb-2">
          <div className="flex items-center gap-1.5 p-1 bg-[#141311] rounded-2xl border border-white/10 overflow-x-auto no-scrollbar w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => {
                soundService.playTactilePop();
                setActiveScreen('dossier');
              }}
              className={`shrink-0 whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 select-none ${
                activeScreen === 'dossier'
                  ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-black shadow-[0_2px_0_0_#385a16] border-t border-white/35 font-black'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>Overview &amp; Stats</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundService.playTactilePop();
                setActiveScreen('blueprint');
              }}
              className={`shrink-0 whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 select-none ${
                activeScreen === 'blueprint'
                  ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-black shadow-[0_2px_0_0_#385a16] border-t border-white/35 font-black'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Target className="w-3.5 h-3.5 shrink-0" />
              <span>How to Beat Them</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-black">
                PRO
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundService.playTactilePop();
                setActiveScreen('repertoire');
              }}
              className={`shrink-0 whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 select-none ${
                activeScreen === 'repertoire'
                  ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-black shadow-[0_2px_0_0_#385a16] border-t border-white/35 font-black'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span>Opening Repertoires</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundService.playTactilePop();
                setActiveScreen('compare');
              }}
              className={`shrink-0 whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 select-none ${
                activeScreen === 'compare'
                  ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-black shadow-[0_2px_0_0_#385a16] border-t border-white/35 font-black'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Swords className="w-3.5 h-3.5 shrink-0" />
              <span>Head-to-Head Scout</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundService.playTactilePop();
                setActiveScreen('matches');
              }}
              className={`shrink-0 whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 select-none ${
                activeScreen === 'matches'
                  ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-black shadow-[0_2px_0_0_#385a16] border-t border-white/35 font-black'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>Matches ({playerAGames.length})</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-zinc-400 px-3 py-1.5 rounded-xl bg-[#1c1a17] border border-white/5 shrink-0">
            <span className="text-emerald-400 font-black tabular-nums">{howToBeatThemPlan.predictedWinChancePct}%</span>
            <span>Win Probability vs @{playerADna.username}</span>
          </div>
        </nav>

        {/* ========================================================================= */}
        {/* 3. SUB-SCREENS CONTENT PANELS                                             */}
        {/* ========================================================================= */}
        <div className="flex-1 w-full min-h-0 flex flex-col xl:overflow-hidden">
          {/* ----------------------------------------------------------------------- */}
          {/* SCREEN 1: DOSSIER & PROFILE OVERVIEW                                    */}
          {/* ----------------------------------------------------------------------- */}
          {activeScreen === 'dossier' && (
            <div className="w-full flex flex-col gap-3.5 xl:h-full xl:justify-between xl:overflow-hidden animate-in fade-in duration-150">
              {/* Header Profile Card */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 shadow-md">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-13 h-13 rounded-2xl bg-[#141311] border border-white/10 overflow-hidden flex items-center justify-center text-2xl shrink-0 shadow-inner">
                    {playerAProfile?.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={playerAProfile.avatar}
                        alt={playerAProfile.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{platform === 'chesscom' ? '♟️' : '⚔️'}</span>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm sm:text-base font-black text-white truncate">
                        {playerAProfile?.displayName || playerAProfile?.username || activeUsername}
                      </h2>
                      {playerAProfile?.title && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500 text-black text-[10px] font-black uppercase shadow-xs">
                          {playerAProfile.title}
                        </span>
                      )}
                      <span className="text-xs text-zinc-400 font-mono">@{playerAProfile?.username || activeUsername}</span>
                    </div>
                    <span className="text-[11px] text-zinc-400 mt-0.5">
                      {platform === 'chesscom' ? 'Chess.com' : 'Lichess'} Verified Profile &bull;{' '}
                      <span className="capitalize">{playerAProfile?.country || 'Global'}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="primary"
                    size="sm"
                    rounded="xl"
                    onClick={handleCompareWithMe}
                    className="flex-1 sm:flex-initial"
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>View Refutation Blueprint</span>
                  </Button>
                  {playerAProfile?.profileUrl || playerAProfile?.url ? (
                    <a
                      href={playerAProfile.profileUrl || playerAProfile.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-[#141311] border border-white/5 text-zinc-400 hover:text-white hover:border-white/20 transition shrink-0"
                      title="View Official Profile"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : null}
                </div>
              </div>

              {/* Verified Ratings Quad */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 shrink-0">
                <div className="p-3.5 bg-[#1c1a17] rounded-2xl border border-white/5 flex flex-col justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Rapid
                  </span>
                  <span className="text-lg sm:text-xl font-black text-white font-mono mt-1 tabular-nums">
                    {playerAStats?.rapid?.rating ? playerAStats.rapid.rating : '—'}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono mt-0.5 tabular-nums">
                    {playerAStats?.rapid?.rating ? `${playerAStats.rapid.games ?? 0} matches` : 'Unrated'}
                  </span>
                </div>

                <div className="p-3.5 bg-[#1c1a17] rounded-2xl border border-white/5 flex flex-col justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" /> Blitz
                  </span>
                  <span className="text-lg sm:text-xl font-black text-white font-mono mt-1 tabular-nums">
                    {playerAStats?.blitz?.rating ? playerAStats.blitz.rating : '—'}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono mt-0.5 tabular-nums">
                    {playerAStats?.blitz?.rating ? `${playerAStats.blitz.games ?? 0} matches` : 'Unrated'}
                  </span>
                </div>

                <div className="p-3.5 bg-[#1c1a17] rounded-2xl border border-white/5 flex flex-col justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> Bullet
                  </span>
                  <span className="text-lg sm:text-xl font-black text-white font-mono mt-1 tabular-nums">
                    {playerAStats?.bullet?.rating ? playerAStats.bullet.rating : '—'}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono mt-0.5 tabular-nums">
                    {playerAStats?.bullet?.rating ? `${playerAStats.bullet.games ?? 0} matches` : 'Unrated'}
                  </span>
                </div>

                <div className="p-3.5 bg-[#1c1a17] rounded-2xl border border-white/5 flex flex-col justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Daily
                  </span>
                  <span className="text-lg sm:text-xl font-black text-white font-mono mt-1 tabular-nums">
                    {playerAStats?.daily?.rating ? playerAStats.daily.rating : '—'}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono mt-0.5 tabular-nums">
                    {playerAStats?.daily?.rating ? `${playerAStats.daily.games ?? 0} matches` : 'Unrated'}
                  </span>
                </div>
              </div>

              {/* Lower Dual Panel: Psychological Profile & Phase Mastery */}
              <div className="w-full shrink-0 xl:flex-1 xl:min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3 h-auto xl:h-full">
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/5">
                      <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2 truncate">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">Psychological &amp; Tactical DNA</span>
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-black uppercase shrink-0">
                        {playerADna.phaseAnalysis.tacticalAggressiveness >= 60 ? 'Sharp Attacker' : 'Solid Positional'}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                      Tactical aggression index rated at{' '}
                      <strong className="text-white tabular-nums">{playerADna.phaseAnalysis.tacticalAggressiveness}%</strong>. Time
                      scramble panic factor:{' '}
                      <strong className="text-amber-400 tabular-nums">{playerADna.phaseAnalysis.timePanicTendency}%</strong>. Average
                      blunder rate:{' '}
                      <strong className="text-rose-400 tabular-nums">{playerADna.phaseAnalysis.blunderRatePct}%</strong> per match.
                    </p>

                    <div className="p-3 rounded-xl bg-[#141311] border border-white/5 flex flex-col gap-1.5 mt-1">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1.5">
                        <ShieldAlert className="w-3 h-3 text-rose-400" />
                        Primary Exploitable Blindspot
                      </span>
                      <span className="text-xs text-rose-300 font-bold leading-snug">
                        {playerADna.phaseAnalysis.tacticalBlindspot}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#141311] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mt-auto">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] uppercase font-bold text-zinc-400">Primary Strategic Vulnerability</span>
                      <span className="text-xs text-amber-300 font-bold mt-0.5 truncate">
                        {playerADna.phaseAnalysis.primaryWeakness}
                      </span>
                    </div>
                    <Button
                      variant="secondary"
                      size="xs"
                      rounded="lg"
                      onClick={() => setActiveScreen('blueprint')}
                      className="shrink-0"
                    >
                      <span>Deploy Counter</span>
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3 h-auto xl:h-full">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                      <PieChart className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>Phase Mastery Distribution</span>
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 tabular-nums">
                      {playerAGames.length} Matches Scanned
                    </span>
                  </div>

                  <div className="space-y-3 py-1">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-zinc-300 font-bold">Openings Preparation</span>
                        <span className="font-mono font-black text-cyan-400 tabular-nums">
                          {playerADna.phaseAnalysis.openingScore}%
                        </span>
                      </div>
                      <div className="w-full bg-[#141311] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-cyan-400 h-full rounded-full transition-all duration-300"
                          style={{ width: `${playerADna.phaseAnalysis.openingScore}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-zinc-300 font-bold">Middlegame Tactics</span>
                        <span className="font-mono font-black text-amber-400 tabular-nums">
                          {playerADna.phaseAnalysis.middlegameScore}%
                        </span>
                      </div>
                      <div className="w-full bg-[#141311] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-400 h-full rounded-full transition-all duration-300"
                          style={{ width: `${playerADna.phaseAnalysis.middlegameScore}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-zinc-300 font-bold">Endgame Technique</span>
                        <span className="font-mono font-black text-emerald-400 tabular-nums">
                          {playerADna.phaseAnalysis.endgameScore}%
                        </span>
                      </div>
                      <div className="w-full bg-[#141311] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                          style={{ width: `${playerADna.phaseAnalysis.endgameScore}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-400 mt-auto">
                    <span>
                      Defeat Analysis:{' '}
                      <strong className="text-rose-400 font-mono tabular-nums">
                        {playerADna.phaseAnalysis.earlyBlunderLosses}
                      </strong>{' '}
                      early blunders &bull;{' '}
                      <strong className="text-amber-400 font-mono tabular-nums">
                        {playerADna.phaseAnalysis.endgameGrindLosses}
                      </strong>{' '}
                      endgame losses
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        soundService.playTactilePop();
                        setActiveScreen('matches');
                      }}
                      className="text-emerald-400 hover:underline font-bold cursor-pointer"
                    >
                      View All Games &rarr;
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* SCREEN 2: HOW TO BEAT THEM (GRANDMASTER BLUEPRINT)                      */}
          {/* ----------------------------------------------------------------------- */}
          {activeScreen === 'blueprint' && (
            <div className="w-full flex flex-col gap-3.5 xl:h-full xl:overflow-y-auto animate-in fade-in duration-150 pr-1">
              {/* Matchup Prediction Banner */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Target className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                      <span>Tactical Blueprint: How to Beat @{playerADna.username}</span>
                    </h2>
                    <p className="text-[11px] text-zinc-400">
                      Algorithmic game-plan calculated against their actual match archives and tactical leaks
                    </p>
                  </div>
                </div>

                <div
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 ${
                    howToBeatThemPlan.matchupDifficulty === 'favorable'
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : howToBeatThemPlan.matchupDifficulty === 'tough'
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="tabular-nums font-mono">{howToBeatThemPlan.predictedWinChancePct}% Win Projection</span>
                </div>
              </div>

              {/* Weapon Selector Toggle Tabs (⚪ As White vs ⚫ As Black) */}
              <div className="flex items-center gap-2 p-1 bg-[#141311] rounded-2xl border border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    soundService.playTactilePop();
                    setBlueprintActiveWeapon('white');
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer select-none ${
                    blueprintActiveWeapon === 'white'
                      ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-black font-black shadow-[0_2px_0_0_#385a16] border-t border-white/35'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white text-black flex items-center justify-center text-[10px] font-black">
                    W
                  </span>
                  <span>When You Play White (Targeting Their Defenses)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundService.playTactilePop();
                    setBlueprintActiveWeapon('black');
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer select-none ${
                    blueprintActiveWeapon === 'black'
                      ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-black font-black shadow-[0_2px_0_0_#385a16] border-t border-white/35'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-zinc-900 border border-zinc-700 text-white flex items-center justify-center text-[10px] font-black">
                    B
                  </span>
                  <span>When You Play Black (Countering Their Attacks)</span>
                </button>
              </div>

              {/* Detailed Weapon & Interactive Board Preview */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col gap-4 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 font-mono font-black text-xs flex items-center justify-center border border-amber-500/30">
                      {activeWeaponData.eco}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-black text-white">{activeWeaponData.opening}</h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold uppercase">
                          Target: {activeWeaponData.targetOpponentSystem}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5 font-sans">{activeWeaponData.rationale}</p>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 font-mono shrink-0">
                    {activeWeaponData.exploitFactor}
                  </div>
                </div>

                {/* Interactive Mini-Board Stepper */}
                <RefutationMiniBoard
                  movesText={activeWeaponData.moves}
                  orientation={blueprintActiveWeapon === 'white' ? 'w' : 'b'}
                  onExplore={() => router.push(`/openings?eco=${encodeURIComponent(activeWeaponData.eco)}`)}
                  onAnalyze={() => router.push(`/analysis`)}
                />

                {/* Dual Tactical Traps & Pawn Breaks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Trap Card */}
                  <div className="p-3.5 rounded-xl bg-[#141311] border border-rose-500/20 flex flex-col gap-1.5 shadow-inner">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                      <Swords className="w-3.5 h-3.5 text-rose-400" />
                      Lethal Trap: {activeWeaponData.keyTrap.name}
                    </span>
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                      {activeWeaponData.keyTrap.description}
                    </p>
                    <div className="p-2 rounded-lg bg-black/40 border border-white/5 font-mono text-[11px] text-rose-300 mt-1">
                      Critical Line: {activeWeaponData.keyTrap.criticalMoves}
                    </div>
                  </div>

                  {/* Pawn Break Objective Card */}
                  <div className="p-3.5 rounded-xl bg-[#141311] border border-emerald-500/20 flex flex-col gap-1.5 shadow-inner">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
                      Critical Pawn Break Objective
                    </span>
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                      {activeWeaponData.pawnBreakObjective}
                    </p>
                    <div className="p-2 rounded-lg bg-black/40 border border-white/5 font-mono text-[11px] text-emerald-300 mt-1">
                      Execute this central thrust before opponent consolidates back rank.
                    </div>
                  </div>
                </div>
              </div>

              {/* Lower Strategic Plan & Clock Exploitation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {/* Middlegame Tactical Plan */}
                <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3 shadow-md">
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <Swords className="w-4 h-4 text-amber-400" />
                      <span>Middlegame: {howToBeatThemPlan.middlegameStrategy.title}</span>
                    </span>
                    <p className="text-xs text-zinc-200 font-bold leading-snug">
                      Core Rule: {howToBeatThemPlan.middlegameStrategy.coreRule}
                    </p>
                    <ul className="space-y-1.5 mt-1">
                      {howToBeatThemPlan.middlegameStrategy.actionablePointers.map((pointer, pIdx) => (
                        <li key={pIdx} className="text-xs text-zinc-300 flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span>{pointer}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Endgame & Clock Strategy */}
                <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3 shadow-md">
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      <span>Endgame &amp; Clock Conversion</span>
                    </span>
                    <p className="text-xs text-zinc-200 font-bold leading-snug">
                      {howToBeatThemPlan.endgameStrategy.conversionPlan}
                    </p>
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                      {howToBeatThemPlan.endgameStrategy.techniqueAdvice}
                    </p>
                    <div className="p-2.5 rounded-xl bg-[#141311] border border-white/5 text-xs text-emerald-300 mt-1 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{howToBeatThemPlan.clockManagementDirective}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Executive Summary Card */}
              <div className="p-4 rounded-2xl bg-[#141311] border border-white/10 shadow-lg flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  Executive Grandmaster Scouting Summary
                </span>
                <p className="text-xs text-zinc-200 leading-relaxed font-sans">{howToBeatThemPlan.executiveSummary}</p>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* SCREEN 3: OPENING REPERTOIRE FORENSICS                                  */}
          {/* ----------------------------------------------------------------------- */}
          {activeScreen === 'repertoire' && (
            <div className="w-full flex flex-col gap-3.5 xl:h-full xl:overflow-hidden animate-in fade-in duration-150">
              {/* Header with Filters & Sort Controls */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <BookOpen className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-black text-white">Opening Repertoire Forensics</h2>
                    <p className="text-[11px] text-zinc-400">
                      Real historical win rates, sample frequencies, and specific system leaks
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap self-stretch sm:self-auto">
                  {/* Color Filter */}
                  <div className="flex items-center gap-1 p-1 bg-[#141311] border border-white/10 rounded-xl">
                    {(['all', 'white', 'black'] as const).map((clr) => (
                      <button
                        key={clr}
                        type="button"
                        onClick={() => {
                          soundService.playTactilePop();
                          setRepertoireColorFilter(clr);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition cursor-pointer ${
                          repertoireColorFilter === clr
                            ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-black font-black'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {clr}
                      </button>
                    ))}
                  </div>

                  {/* Sort Filter */}
                  <div className="flex items-center gap-1 p-1 bg-[#141311] border border-white/10 rounded-xl">
                    {(['vulnerable', 'played', 'winrate'] as const).map((sortOpt) => (
                      <button
                        key={sortOpt}
                        type="button"
                        onClick={() => {
                          soundService.playTactilePop();
                          setRepertoireSortBy(sortOpt);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition cursor-pointer ${
                          repertoireSortBy === sortOpt
                            ? 'bg-white/15 text-white font-black'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {sortOpt === 'vulnerable' ? 'Vulnerable' : sortOpt === 'played' ? 'Most Played' : 'Top Win%'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Repertoire Items List */}
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5 min-h-0">
                {filteredRepertoire.length === 0 ? (
                  <div className="py-16 text-center text-xs text-zinc-500 font-mono">
                    No opening systems found matching the selected filter.
                  </div>
                ) : (
                  filteredRepertoire.map((op, idx) => {
                    const total = op.playedCount || 1;
                    const winPct = op.winRatePct;
                    const drawPct = Math.round((op.drawCount / total) * 100);
                    const lossPct = Math.max(0, 100 - winPct - drawPct);

                    return (
                      <div
                        key={idx}
                        className="p-3.5 sm:p-4 rounded-2xl bg-[#1c1a17] border border-white/5 hover:border-white/15 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                              op.color === 'white' ? 'bg-white text-black' : 'bg-zinc-900 border border-zinc-700 text-white'
                            }`}
                          >
                            {op.color === 'white' ? '⚪' : '⚫'}
                          </span>

                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-sm text-white truncate">{op.name}</span>
                              {op.eco && (
                                <span className="font-mono text-[10px] px-2 py-0.2 rounded bg-white/10 text-zinc-300 font-bold">
                                  {op.eco}
                                </span>
                              )}
                              {op.verdict === 'vulnerable' && (
                                <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  LEAK / TARGET
                                </span>
                              )}
                              {op.verdict === 'strong' && (
                                <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  PET SYSTEM
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-mono text-zinc-400 mt-0.5 truncate">{op.moves}</span>
                          </div>
                        </div>

                        {/* Win/Draw/Loss Segmented Bar */}
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="flex flex-col gap-1 w-36 sm:w-44">
                            <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                              <span className="text-emerald-400 tabular-nums">{op.winCount}W</span>
                              <span className="text-zinc-400 tabular-nums">{op.drawCount}D</span>
                              <span className="text-rose-400 tabular-nums">{op.lossCount}L</span>
                              <span className="text-white font-black tabular-nums">{winPct}%</span>
                            </div>

                            <div className="w-full h-2 rounded-full overflow-hidden flex bg-[#141311]">
                              <div className="bg-emerald-500 h-full transition-all" style={{ width: `${winPct}%` }} />
                              <div className="bg-zinc-500 h-full transition-all" style={{ width: `${drawPct}%` }} />
                              <div className="bg-rose-500 h-full transition-all" style={{ width: `${lossPct}%` }} />
                            </div>
                          </div>

                          <Button
                            variant="primary"
                            size="xs"
                            rounded="lg"
                            onClick={() => {
                              soundService.playTactilePop();
                              setActiveScreen('blueprint');
                              setBlueprintActiveWeapon(op.color === 'white' ? 'black' : 'white');
                            }}
                            className="shrink-0 text-[11px]"
                          >
                            <Target className="w-3 h-3" />
                            <span>Counter</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* SCREEN 4: HEAD-TO-HEAD COMPARISON                                       */}
          {/* ----------------------------------------------------------------------- */}
          {activeScreen === 'compare' && (
            <div className="w-full flex flex-col gap-3.5 xl:h-full xl:overflow-y-auto animate-in fade-in duration-150 pr-1">
              {/* Compare Search Header */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                    <Swords className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-black text-white">Head-to-Head Scout Comparison</h2>
                    <p className="text-[11px] text-zinc-400">
                      Compare Player A against yourself or scout any two Grandmasters
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    value={compareUsername}
                    onChange={(e) => setCompareUsername(e.target.value)}
                    placeholder="Compare with opponent 2..."
                    className="bg-[#141311] border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 w-full sm:w-48"
                  />
                  <Button
                    variant="primary"
                    size="xs"
                    rounded="lg"
                    disabled={isComparingLoading || !compareUsername.trim()}
                    onClick={() => fetchComparePlayer(compareUsername, platform)}
                    className="shrink-0"
                  >
                    {isComparingLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                    <span>Compare</span>
                  </Button>
                </div>
              </div>

              {/* Side-by-Side Dual Fighter Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 shrink-0">
                {/* Fighter A: Target */}
                <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col gap-3 shadow-md">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-[#141311] border border-white/10 flex items-center justify-center text-sm font-black">
                        1
                      </span>
                      <div>
                        <h3 className="text-sm font-black text-white">@{playerADna.username}</h3>
                        <span className="text-[10px] text-zinc-400">Target Opponent</span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-black text-amber-400 tabular-nums">
                      {playerADna.ratings.rapid} Rapid
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-[#141311] border border-white/5">
                      <span className="text-[9px] uppercase font-bold text-zinc-400">Openings</span>
                      <div className="text-sm font-black text-cyan-400 font-mono mt-0.5 tabular-nums">
                        {playerADna.phaseAnalysis.openingScore}%
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-[#141311] border border-white/5">
                      <span className="text-[9px] uppercase font-bold text-zinc-400">Middlegame</span>
                      <div className="text-sm font-black text-amber-400 font-mono mt-0.5 tabular-nums">
                        {playerADna.phaseAnalysis.middlegameScore}%
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-[#141311] border border-white/5">
                      <span className="text-[9px] uppercase font-bold text-zinc-400">Endgame</span>
                      <div className="text-sm font-black text-emerald-400 font-mono mt-0.5 tabular-nums">
                        {playerADna.phaseAnalysis.endgameScore}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fighter B: Hero / You */}
                <div className="p-4 rounded-2xl bg-[#1c1a17] border border-emerald-500/20 flex flex-col gap-3 shadow-md">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-sm font-black">
                        2
                      </span>
                      <div>
                        <h3 className="text-sm font-black text-white">@{heroDna.username}</h3>
                        <span className="text-[10px] text-emerald-400">Your Repertoire</span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-black text-emerald-400 tabular-nums">
                      {heroDna.ratings.rapid} Rapid
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-[#141311] border border-white/5">
                      <span className="text-[9px] uppercase font-bold text-zinc-400">Openings</span>
                      <div className="text-sm font-black text-cyan-400 font-mono mt-0.5 tabular-nums">
                        {heroDna.phaseAnalysis.openingScore}%
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-[#141311] border border-white/5">
                      <span className="text-[9px] uppercase font-bold text-zinc-400">Middlegame</span>
                      <div className="text-sm font-black text-amber-400 font-mono mt-0.5 tabular-nums">
                        {heroDna.phaseAnalysis.middlegameScore}%
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-[#141311] border border-white/5">
                      <span className="text-[9px] uppercase font-bold text-zinc-400">Endgame</span>
                      <div className="text-sm font-black text-emerald-400 font-mono mt-0.5 tabular-nums">
                        {heroDna.phaseAnalysis.endgameScore}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Clash Analysis & Advantage Verdict */}
              <div className="p-4 rounded-2xl bg-[#141311] border border-white/10 shadow-lg flex flex-col gap-3">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  <span>Head-to-Head Clash Matrix &amp; Strategic Edge</span>
                </span>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-[#1c1a17] border border-white/5">
                    <span className="text-[10px] uppercase font-bold text-zinc-400">Rating Differential</span>
                    <div className="text-sm font-mono font-black text-white mt-1 tabular-nums">
                      {heroDna.ratings.rapid - playerADna.ratings.rapid > 0 ? '+' : ''}
                      {heroDna.ratings.rapid - playerADna.ratings.rapid} Elo
                    </div>
                    <span className="text-[11px] text-zinc-400 mt-0.5 block">
                      {heroDna.ratings.rapid >= playerADna.ratings.rapid
                        ? 'You hold master-tier rating advantage'
                        : 'Opponent holds higher official rating'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#1c1a17] border border-white/5">
                    <span className="text-[10px] uppercase font-bold text-zinc-400">Endgame Advantage</span>
                    <div className="text-sm font-mono font-black text-emerald-400 mt-1 tabular-nums">
                      {heroDna.phaseAnalysis.endgameScore - playerADna.phaseAnalysis.endgameScore > 0 ? '+' : ''}
                      {heroDna.phaseAnalysis.endgameScore - playerADna.phaseAnalysis.endgameScore}% Delta
                    </div>
                    <span className="text-[11px] text-zinc-400 mt-0.5 block">
                      {heroDna.phaseAnalysis.endgameScore >= playerADna.phaseAnalysis.endgameScore
                        ? 'Prioritize early queen trades into endgames'
                        : 'Keep heavy pieces on the board'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#1c1a17] border border-white/5">
                    <span className="text-[10px] uppercase font-bold text-zinc-400">Scramble Panic Factor</span>
                    <div className="text-sm font-mono font-black text-amber-400 mt-1 tabular-nums">
                      {playerADna.phaseAnalysis.timePanicTendency}% Panic Index
                    </div>
                    <span className="text-[11px] text-zinc-400 mt-0.5 block">
                      {playerADna.phaseAnalysis.timePanicTendency >= 45
                        ? 'Keep positions sharp under 2 minutes'
                        : 'Stable clock discipline; focus on position'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs text-zinc-300">
                    Calculated Matchup Outlook:{' '}
                    <strong className="text-emerald-400">{howToBeatThemPlan.matchupDifficulty.toUpperCase()}</strong>
                  </span>
                  <Button
                    variant="primary"
                    size="xs"
                    rounded="lg"
                    onClick={() => setActiveScreen('blueprint')}
                  >
                    <span>View Exact Refutation Line</span>
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* SCREEN 5: MATCH ARCHIVES & LIVE ENGINE REVIEW                           */}
          {/* ----------------------------------------------------------------------- */}
          {activeScreen === 'matches' && (
            <div className="w-full flex flex-col gap-3.5 xl:h-full xl:justify-between xl:overflow-hidden animate-in fade-in duration-150">
              {/* Filter Tabs */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <Clock className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-black text-white">Recent Match Archives</h2>
                    <p className="text-[11px] text-zinc-400">
                      Click Review on any match to load deep Stockfish 19 analysis
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 p-1 bg-[#141311] border border-white/10 rounded-xl self-stretch sm:self-auto shrink-0">
                  {(['all', 'rapid', 'blitz', 'bullet'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => {
                        soundService.playTactilePop();
                        setMatchFilter(filter);
                      }}
                      className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition cursor-pointer select-none ${
                        matchFilter === filter
                          ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-black font-black shadow-[0_2px_0_0_#385a16] border-t border-white/35'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Games Table List */}
              <div className="flex flex-col gap-2 max-h-[550px] xl:max-h-none xl:flex-1 xl:overflow-y-auto pr-1">
                {filteredGames.length === 0 ? (
                  <div className="py-16 text-center text-xs text-zinc-500 font-mono">
                    No matches found matching the selected filter.
                  </div>
                ) : (
                  filteredGames.map((g) => (
                    <div
                      key={g.id}
                      className="p-3 rounded-xl bg-[#1c1a17] border border-white/5 flex items-center justify-between gap-3 hover:border-white/15 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs shrink-0">{g.isUserWhite ? '⚪' : '⚫'}</span>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-white truncate">
                            vs {g.opponent?.username || 'Opponent'} ({g.opponent?.rating || '—'})
                          </span>
                          <span className="text-[10px] text-zinc-400 capitalize">
                            {g.timeClass} &bull; {g.movesCount || 30} moves &bull; {g.reason || 'game concluded'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded font-mono ${
                            g.userResult === 'win'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : g.userResult === 'loss'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {g.userResult}
                        </span>
                        <Button
                          variant="primary"
                          size="xs"
                          rounded="lg"
                          onClick={() => handleReviewGame(g)}
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Review</span>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
