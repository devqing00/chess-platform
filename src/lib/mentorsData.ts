import { explainChessMove } from '@/lib/chessMoveExplainer';
export { explainChessMove } from '@/lib/chessMoveExplainer';

export interface MentorProfile {
  id: string;
  name: string;
  title: string;
  avatarEmoji: string;
  avatarBg: string;
  accentColor: string;
  tagline: string;
  bio: string;
}

export const MENTORS: MentorProfile[] = [
  {
    id: 'coach-danny',
    name: 'Coach Danny',
    title: 'Master Instructor',
    avatarEmoji: '🧔‍♂️',
    avatarBg: 'bg-emerald-600',
    accentColor: '#10b981',
    tagline: 'Always keep learning and having fun!',
    bio: 'Friendly, accessible instructor who breaks down complex concepts into engaging, digestible lessons.',
  },
  {
    id: 'gm-magnus',
    name: 'GM Magnus',
    title: 'World Champion',
    avatarEmoji: '👑',
    avatarBg: 'bg-amber-600',
    accentColor: '#f59e0b',
    tagline: "I don't believe in luck. Only better moves.",
    bio: 'Witty, blunt, and uncompromising. Demands clinical endgame precision and despises lazy blunders.',
  },
  {
    id: 'mikhail-tal',
    name: 'Mikhail Tal',
    title: 'The Magician from Riga',
    avatarEmoji: '🧙‍♂️',
    avatarBg: 'bg-rose-600',
    accentColor: '#f43f5e',
    tagline: 'You must take your opponent into a deep dark forest.',
    bio: 'Romantic and fiery. Believes chess is an art of imagination, wild sacrifices, and relentless King attacks.',
  },
  {
    id: 'master-fischer',
    name: 'Master Fischer',
    title: 'The Principle Purist',
    avatarEmoji: '🎯',
    avatarBg: 'bg-indigo-600',
    accentColor: '#6366f1',
    tagline: 'The object is to crush the opponent’s mind.',
    bio: 'Relentless, razor-sharp fundamentalist. Strictly enforces pawn structure integrity and concrete calculation.',
  },
  {
    id: 'coach-anna',
    name: 'Coach Anna',
    title: 'Tactical Grandmaster',
    avatarEmoji: '⚡',
    avatarBg: 'bg-cyan-600',
    accentColor: '#06b6d4',
    tagline: 'Every piece tells a story. Make yours sing!',
    bio: 'Dynamic modern tactician with an upbeat, encouraging attitude focused on piece harmony and momentum.',
  },
];

export function getMentorById(id: string): MentorProfile {
  return MENTORS.find((m) => m.id === id) || MENTORS[0];
}

/**
 * Transferable Pedagogical Principles (Section 5.2 of Spec)
 * Maps tactical motifs and critical classifications to memorable rules of thumb.
 */
export const TAKEAWAYS: Record<string, string> = {
  poisoned: 'When an opponent offers free material, calculate which defender abandoned their post.',
  overload: 'Find the defender doing two jobs, then hand it a third.',
  deflection: 'Ask what each defender is guarding, then force one of them to move.',
  zwischenzug: 'Before you recapture, look for an in-between check that improves your position first.',
  desperado: 'If a piece is lost anyway, make it take something on the way out.',
  fork: 'Look for the square where one piece attacks two loose targets at once.',
  pin: 'A pinned piece cannot move without exposing something more valuable behind it.',
  skewer: 'Force the more valuable piece to step aside to win the target behind it.',
  'discovered-attack': 'When moving a piece with tempo, check which lines of fire it unmasks.',
  'passed-pawn': 'Passed pawns must be pushed—advance them to tie down enemy defenders.',
  outpost: 'An advanced square supported by a pawn is a permanent thorn in the enemy camp.',
  'seventh-rank': "A rook on the 7th rank paralyzes the opponent's defense and devours base pawns.",
  luft: 'Always create a flight square before your rooks leave the back rank.',
  castling: 'King safety and piece activation are essential in the opening.',
  simplification: 'When ahead in material, trade pieces—not pawns—to seal the endgame.',
  'hanging-piece': 'Before committing to a move, check every check, capture, and threat your opponent has.',
  general: 'Check what each of your pieces is protecting before you move it.',
  blunder: 'Always calculate your opponent’s most forcing responses before committing.',
  mistake: 'When under pressure, focus on keeping your defensive coordination intact.',
  miss: 'Look for forcing checks and captures whenever your opponent errs.',
};

export function getTakeawayForMove(motifType?: string, classification?: string): string {
  if (motifType) {
    const key = motifType.toLowerCase().replace(/\s+/g, '-');
    for (const [k, v] of Object.entries(TAKEAWAYS)) {
      if (key.includes(k) || k.includes(key)) return v;
    }
  }
  const cls = (classification || '').toLowerCase();
  if (cls === 'blunder') return TAKEAWAYS.blunder;
  if (cls === 'mistake') return TAKEAWAYS.mistake;
  if (cls === 'miss') return TAKEAWAYS.miss;
  if (cls === 'brilliant') return 'A well-timed piece sacrifice blows open the position when tactical refutations favor you.';
  if (cls === 'great') return 'When only one move holds the position, concrete calculation is required over general principles.';
  return TAKEAWAYS.general;
}

/**
 * Dynamically generates personalized commentary for any move in the voice of the selected mentor.
 * Correctly distinguishes between moves played by the user vs opponent.
 */
export function generateMentorComment(
  mentorId: string,
  classification: string,
  san: string,
  bestMoveSan?: string,
  evalAfter?: number,
  playerName?: string,
  isUserMove: boolean = true,
  motif?: { type: string; description: string; name?: string },
  fenBefore?: string,
  refutations?: {
    accepted?: { replySan: string; lineSan: string; material: string; mateIn?: number };
    declined?: { replySan: string; lineSan: string; material: string; mateIn?: number };
    acceptIsBest?: boolean;
  }
): string {
  const normClass = classification.toLowerCase();
  const player = playerName || (isUserMove ? 'You' : 'Opponent');
  const betterMoveText = bestMoveSan ? explainChessMove(bestMoveSan, fenBefore) : '';

  // Checkmate handling
  if (san.includes('#')) {
    if (motif?.type === 'smothered-mate') {
      if (isUserMove) {
        return `Smothered Mate! An extraordinary tactical finish—the enemy king is completely trapped by its own pieces!`;
      }
      return `${player} delivered a smothered mate with ${san}! Your king was suffocated with no escape squares.`;
    }
    if (motif?.type === 'back-rank') {
      if (isUserMove) {
        return `Back-Rank Checkmate! You punished the defenseless back rank with surgical precision!`;
      }
      return `${player} delivered a back-rank checkmate with ${san}! Always ensure your king has luft.`;
    }
    if (motif?.type === 'scholar-mate') {
      if (isUserMove) {
        return `Scholar's Mate strike! Rapid coordination takes down the vulnerable f-pawn and ends the game!`;
      }
      return `${player} executed the Scholar's Mate pattern with ${san}! Watch out for early Queen & Bishop alignments on f7.`;
    }
    if (isUserMove) {
      return `Checkmate! Outstanding finish. You found the decisive mating blow!`;
    }
    return `${player} delivered checkmate with ${san}. A decisive tactical conclusion.`;
  }

  // OPPONENT'S MOVE PERSPECTIVE
  if (!isUserMove) {
    if (motif) {
      if (motif.type === 'fork') {
        return `${player} launched a tactical fork with ${san}! Guard your attacked pieces immediately!`;
      }
      if (motif.type === 'pin') {
        return `${player} pinned your piece with ${san}. Look to break the pin or add defensive support.`;
      }
      if (motif.type === 'skewer') {
        return `${player} skewered your pieces with ${san}! Your heavy piece must step aside, exposing the prize behind!`;
      }
      if (motif.type === 'discovered-attack') {
        return `${player} unmasked a discovered attack with ${san}! Beware of hidden lines of fire.`;
      }
      if (motif.type === 'seventh-rank') {
        return `${player} invaded your 7th rank with ${san}! Their rook is targeting your base pawns and boxing in your king.`;
      }
      if (motif.type === 'passed-pawn') {
        return `${player} pushed a dangerous passed pawn with ${san}! You must blockade it before it queens.`;
      }
      if (motif.type === 'outpost') {
        return `${player} established a strong knight outpost on ${san}! Control over the center has shifted.`;
      }
      if (motif.type === 'simplification') {
        return `${player} forced a major piece trade with ${san} to simplify the game in their favor.`;
      }
      if (motif.type === 'sacrifice') {
        return `${player} played a tactical sacrifice with ${san}! Calculate carefully before accepting.`;
      }
      if (motif.type === 'battery') {
        return `${player} aligned a heavy artillery battery with ${san}! Beware of crushing penetration along this vector.`;
      }
      if (motif.type === 'intermezzo') {
        return `${player} hit you with an intermezzo (${san})! An in-between tempo move that interrupts your plans.`;
      }
      if (motif.type === 'deflection') {
        return `${player} executed a deflection tactic with ${san}! Your defensive formation is being pulled apart.`;
      }
      if (motif.type === 'hanging-piece' && ['blunder', 'mistake'].includes(normClass)) {
        return `${player} left a piece hanging with ${san}! You have a golden opportunity to win material!`;
      }
      if (motif.type === 'luft') {
        return `${player} made breathing room on ${san}, eliminating baseline checkmate tricks.`;
      }
      if (motif.type === 'castling') {
        return `${player} castled with ${san}, bringing their king to safety and mobilizing the rook.`;
      }
    }

    switch (normClass) {
      case 'brilliant':
        return `${player} played a brilliant sacrifice with ${san}! Be careful, they have dangerous attacking momentum.`;
      case 'great':
        return `${player} found a great move (${san}) that holds their position together under pressure.`;
      case 'best':
        return `${player} found the engine's best move (${san}). Stay alert and calculate your response.`;
      case 'excellent':
      case 'good':
        return `${player} made a solid, natural move with ${san}.`;
      case 'book':
        return `${player} played standard opening theory with ${san}.`;
      case 'inaccuracy':
        return `${player} played an inaccuracy (${san}). This gives you a clear window to seize the initiative!`;
      case 'mistake':
        return `${player} made a mistake with ${san}! You now have a tangible advantage—look for the most forcing response.`;
      case 'miss':
        return `${player} missed a tactical opportunity! You dodged a bullet and can now consolidate.`;
      case 'blunder':
        return `${player} blundered with ${san}! This severely compromises their position and gives you a winning chance!`;
      default:
        return `${player} played ${san}.`;
    }
  }

  // Checkmate blunder override across all mentors
  const isMateBlunder =
    ['blunder', 'mistake'].includes(normClass) &&
    (motif?.type === 'mate-threat' || motif?.type === 'king-safety' || Math.abs(evalAfter ?? 0) >= 20000);

  if (isMateBlunder) {
    const mateDetail = motif?.description ? motif.description : 'allows forced checkmate';
    return isUserMove
      ? `Blunder! ${san} ${mateDetail}! ${betterMoveText ? `${betterMoveText} was essential to defend.` : 'Look out for your king\'s safety.'}`
      : `${player} blundered with ${san}! ${mateDetail}.`;
  }

  // USER'S MOVE PERSPECTIVE
  switch (mentorId) {
    case 'gm-magnus': {
      if (motif?.type === 'fork') {
        return `Clean tactical fork (${san}). Double attack winning material or shattering their pawn structure.`;
      }
      if (motif?.type === 'pin') {
        return `Pinning that piece with ${san} is ruthless. When a piece is pinned, you slowly squeeze them off the board.`;
      }
      if (motif?.type === 'skewer') {
        return `Clean skewer. The Queen has to step aside, and the Rook falls behind it. Basic, brutal calculation.`;
      }
      if (motif?.type === 'discovered-attack') {
        return `Discovered attack. Unmasking lines of fire with decisive tempo.`;
      }
      if (motif?.type === 'seventh-rank') {
        return `Rook on the seventh. Nimzowitsch called it the absolute key to winning endgames, and you executed it cleanly.`;
      }
      if (motif?.type === 'passed-pawn') {
        return `Connected passed pawns in the endgame—they march themselves. Technique looks effortless.`;
      }
      if (motif?.type === 'outpost') {
        return `Knight on an outpost like that is worth more than a rook. Total spatial clamp.`;
      }
      if (motif?.type === 'battery') {
        return `Doubling artillery on the file/diagonal (${san}). That's how you convert spatial control into penetrating threats.`;
      }
      if (motif?.type === 'intermezzo') {
        return `Sharp intermezzo (${san}). An in-between move that destabilizes their calculation completely.`;
      }
      if (motif?.type === 'deflection') {
        return `Clinical deflection (${san}). You remove the key defender and the entire house of cards falls.`;
      }
      if (motif?.type === 'simplification') {
        return `Trading queens here is completely clinical. Don't give them chances; convert the endgame.`;
      }
      if (motif?.type === 'piece-defense') {
        return `Calm retreat. Don't panic when attacked—find the square that holds.`;
      }
      if (motif?.type === 'luft') {
        return `Creating luft on time. Prevents cheap back-rank tricks so you can focus on pressing the attack.`;
      }
      if (motif?.type === 'castling') {
        return `King to safety, rook connects. Standard fundamental hygiene.`;
      }
      if (motif?.type === 'hanging-piece' && ['blunder', 'mistake'].includes(normClass)) {
        return `Careless oversight—${san} leaves a piece hanging. At master level, that's game over immediately.`;
      }
      if (normClass === 'brilliant') {
        return `Brilliant move! Even in rapid I'd applaud that sacrifice. Decisive and uncompromising calculation.`;
      }
      if (normClass === 'great') {
        return `Great find. The only continuation that preserves your advantage. Anything else and the evaluation evaporates.`;
      }
      if (normClass === 'best') {
        return `Best move. Clean, principled, and exactly what the engine demands. Keep up this level of precision.`;
      }
      if (normClass === 'excellent' || normClass === 'good') {
        return `Sound move. Maybe not the absolute engine top pick, but completely practical over the board.`;
      }
      if (normClass === 'book') {
        return `Standard theoretical book move. Now let's see how deeply you understand the middlegame plans.`;
      }
      if (normClass === 'inaccuracy') {
        return `Slight inaccuracy. You let off the pressure a bit. ${betterMoveText ? `Playing ${betterMoveText} was sharper.` : ''}`;
      }
      if (normClass === 'mistake') {
        return `Careless mistake. You surrendered an easy advantage without making your opponent break a sweat. ${betterMoveText ? `Finding ${betterMoveText} was required.` : 'Look for better squares.'}`;
      }
      if (normClass === 'miss') {
        return `You missed a clear tactical knockout. In tournament play, opportunities like that don't knock twice!`;
      }
      if (normClass === 'blunder') {
        return `Honestly, that's just a terrible blunder. You gave away the position for free. ${betterMoveText ? `${betterMoveText} was required.` : 'Take your time before moving.'}`;
      }
      return `${san} was played. Stay focused on piece coordination.`;
    }

    case 'mikhail-tal': {
      if (motif?.type === 'sacrifice' || normClass === 'brilliant') {
        return `A true tactical masterpiece! The board is ablaze with poetry! That sacrifice with ${san} belongs in the textbooks!`;
      }
      if (motif?.type === 'fork') {
        return `A vicious fork! Your pieces strike like lightning in two directions simultaneously!`;
      }
      if (motif?.type === 'skewer') {
        return `A spear right through their heart! The King is forced to flee, leaving the prize behind!`;
      }
      if (motif?.type === 'discovered-attack') {
        return `A stealth strike! ${san} steps aside, and the hidden artillery opens fire on the enemy king!`;
      }
      if (motif?.type === 'seventh-rank') {
        return `The Rook has invaded the seventh rank! Now we tear down their walls and unleash chaos!`;
      }
      if (motif?.type === 'outpost') {
        return `An aggressive knight outpost! From this forward post, our steed breathes fire into their camp!`;
      }
      if (motif?.type === 'passed-pawn') {
        return `March on, brave foot soldier! A pawn on the 7th rank is more terrifying than a queen!`;
      }
      if (motif?.type === 'pin') {
        return `The piece is nailed to the board! Now we pile on the pressure until their defense collapses!`;
      }
      if (motif?.type === 'battery') {
        return `An awesome artillery battery! Fire and thunder along the file ready to blow their defenses to ashes!`;
      }
      if (motif?.type === 'intermezzo') {
        return `Zwischenzug! A sudden lightning bolt in between moves that turns the board upside down!`;
      }
      if (motif?.type === 'deflection') {
        return `A mesmerizing deflection strike! Luring the defender away into the abyss!`;
      }
      if (motif?.type === 'simplification') {
        return `Trading queens? Well, if it forces immediate surrender, even I must applaud the cold finish!`;
      }
      if (motif?.type === 'piece-defense') {
        return `A tactical duck and weave! The piece retreats only to strike back with double the fury!`;
      }
      if (motif?.type === 'luft') {
        return `Breathing room for our king! Now that our home is secure, we can burn down theirs!`;
      }
      if (motif?.type === 'castling') {
        return `The king retreats into the fortress while the siege rook marches to the front!`;
      }
      if (motif?.type === 'hanging-piece' && ['blunder', 'mistake'].includes(normClass)) {
        return `If you're giving away a piece, make it a terrifying attack! Here, you just left it for the taking!`;
      }
      if (normClass === 'great') {
        return `Magnificent move! You smelled the opponent's hesitation and drove the dagger right into their defenses!`;
      }
      if (normClass === 'best') {
        return `Best move! Keeps the initiative coiled like a spring, ready to strike at the enemy monarch!`;
      }
      if (normClass === 'excellent' || normClass === 'good') {
        return `A healthy, active move. Every piece must be ready to join the final assault!`;
      }
      if (normClass === 'book') {
        return `Opening theory! The calm before the coming storm. Prepare your tactical fireworks!`;
      }
      if (normClass === 'inaccuracy') {
        return `A bit gentle. When you see a ghost, you retreat—attack the ghost instead! ${betterMoveText ? `${betterMoveText} was more aggressive.` : ''}`;
      }
      if (normClass === 'mistake') {
        return `A timid mistake! You gave your opponent room to breathe. ${betterMoveText ? `Unleashing ${betterMoveText} was much more dangerous!` : 'Chess is war, not a peaceful stroll!'}`;
      }
      if (normClass === 'miss') {
        return `You missed a fiery tactical storm! The opponent's king was ripe for demolition, but you let them escape!`;
      }
      if (normClass === 'blunder') {
        return `A blunder! If you're going to lose a piece, at least make it look like a terrifying sacrifice! ${betterMoveText ? `${betterMoveText} was needed to fight back.` : 'Here, they just took it for free!'}`;
      }
      return `The position remains chaotic. Seek tactical complexity!`;
    }

    case 'master-fischer': {
      if (motif?.type === 'fork') {
        return `Accurate fork (${san}). Total tactical exploitation of their loose squares. No guesswork, pure precision.`;
      }
      if (motif?.type === 'pin') {
        return `Absolute pin. Paralyzing the defense and winning the initiative. That is how chess is meant to be played.`;
      }
      if (motif?.type === 'skewer') {
        return `Linear skewer. The king moves, the piece behind dies. Objective chess.`;
      }
      if (motif?.type === 'seventh-rank') {
        return `Rook on the 7th rank. Two rooks on the 7th is called the blind swine for a reason—it ravages everything.`;
      }
      if (motif?.type === 'outpost') {
        return `Knight outpost on an outpost square. It cannot be evicted by enemy pawns. Capablanca would approve.`;
      }
      if (motif?.type === 'passed-pawn') {
        return `Passed pawn advance. Fast, forcing, and winning on the clock and on the board.`;
      }
      if (motif?.type === 'battery') {
        return `Artillery battery. Doubled power on the critical file. Direct and unstoppable.`;
      }
      if (motif?.type === 'intermezzo') {
        return `Intermezzo. Forcing, accurate tempo move before taking the recapture. Objective master play.`;
      }
      if (motif?.type === 'deflection') {
        return `Deflection. The defending piece is pulled away, breaking their defensive coordination.`;
      }
      if (motif?.type === 'simplification') {
        return `Simplification into a winning endgame. When you have material, you trade down. No nonsense.`;
      }
      if (motif?.type === 'piece-defense') {
        return `Defensive retreat. Always keep every piece tactically justified.`;
      }
      if (motif?.type === 'luft') {
        return `Luft. Eliminating weaknesses before launching the counterattack.`;
      }
      if (motif?.type === 'castling') {
        return `Castling. King safety is not optional in master chess.`;
      }
      if (motif?.type === 'discovered-attack') {
        return `Discovered attack. Forcing and impossible to defend cleanly. Direct and lethal.`;
      }
      if (motif?.type === 'sacrifice' || normClass === 'brilliant') {
        return `Brilliant. Concrete, mathematically sound demolition of the defense. No luck, pure calculation.`;
      }
      if (motif?.type === 'hanging-piece' && ['blunder', 'mistake'].includes(normClass)) {
        return `Gross blunder. Violates fundamental piece safety—hanging material loses games instantly.`;
      }
      if (normClass === 'great') {
        return `Great move! Total dominance of the critical square. The opponent's structure is doomed.`;
      }
      if (normClass === 'best') {
        return `Best move. Accurate chess at its purest. Play the board, not the person.`;
      }
      if (normClass === 'excellent' || normClass === 'good') {
        return `Solid piece development. Respect the fundamental laws of space and time.`;
      }
      if (normClass === 'book') {
        return `Textbook theory. Played by every great world champion for a reason.`;
      }
      if (normClass === 'inaccuracy') {
        return `Inaccuracy. You compromised your piece harmony. ${betterMoveText ? `Control the board with ${betterMoveText}.` : ''}`;
      }
      if (normClass === 'mistake') {
        return `Positional mistake. You handed over the initiative. ${betterMoveText ? `${betterMoveText} was the principled choice.` : 'In master chess, that error costs the point.'}`;
      }
      if (normClass === 'miss') {
        return `Missed tactic. The win was right on the board. You must calculate every forcing variation to the end.`;
      }
      if (normClass === 'blunder') {
        return `Gross blunder. Violates fundamental piece safety. ${betterMoveText ? `${betterMoveText} was required to survive.` : 'Hanging material loses games.'}`;
      }
      return `${san} played. Calculate candidate moves before touching a piece.`;
    }

    case 'coach-anna': {
      if (motif?.type === 'fork') {
        return `Double trouble! A fantastic fork with ${san} attacking multiple targets at once!`;
      }
      if (motif?.type === 'pin') {
        return `Pinned down! That piece can't move without losing something much bigger! Excellent pressure!`;
      }
      if (motif?.type === 'skewer') {
        return `Skewered! It's like a shish kebab on the board—front piece moves, back piece is captured!`;
      }
      if (motif?.type === 'seventh-rank') {
        return `Rook on the seventh! Party on the 7th rank—gobbling up pawns and locking down the opponent!`;
      }
      if (motif?.type === 'outpost') {
        return `What an awesome knight outpost! Sitting right in the center like a boss, controlling everything!`;
      }
      if (motif?.type === 'passed-pawn') {
        return `Go pawn go! That passed pawn is unstoppable on its way to getting a crown!`;
      }
      if (motif?.type === 'battery') {
        return `Heavy battery power! Stacking your pieces together to blast right through their lines!`;
      }
      if (motif?.type === 'intermezzo') {
        return `Sneaky in-between move! An awesome intermezzo that catches the opponent completely by surprise!`;
      }
      if (motif?.type === 'deflection') {
        return `Super clever deflection! You pulled their defender away from its post!`;
      }
      if (motif?.type === 'simplification') {
        return `Trading queens! Taking the heavy pieces off makes winning the endgame so much easier and stress-free!`;
      }
      if (motif?.type === 'piece-defense') {
        return `Whew, nice save! Dodging the attack and keeping your pieces safe and sound!`;
      }
      if (motif?.type === 'luft') {
        return `Gave your king a little window to breathe! Now you're safe from any back-rank surprises!`;
      }
      if (motif?.type === 'castling') {
        return `Castled! The king is cozy and your rook is ready to jump into the action!`;
      }
      if (motif?.type === 'discovered-attack') {
        return `Surprise attack! Moving ${san} uncovered a powerful assault on their lines!`;
      }
      if (motif?.type === 'sacrifice' || normClass === 'brilliant') {
        return `Spectacular find! That sacrifice is exactly how grandmasters turn pressure into an unstoppable avalanche!`;
      }
      if (motif?.type === 'hanging-piece' && ['blunder', 'mistake'].includes(normClass)) {
        return `Ouch, that piece was undefended! Don't worry—always remember to double check if your pieces have a bodyguard before moving!`;
      }
      if (normClass === 'great') {
        return `Amazing move! You spotted the only key resource that holds everything together!`;
      }
      if (normClass === 'best') {
        return `Best move! The coach agrees 100%. Beautifully coordinated pieces!`;
      }
      if (normClass === 'excellent' || normClass === 'good') {
        return `Good, sensible chess. Keep building your active piece harmony!`;
      }
      if (normClass === 'book') {
        return `Opening book knowledge! Great foundation, now let's transition smoothly into your middlegame plan.`;
      }
      if (normClass === 'inaccuracy') {
        return `Slight inaccuracy, but nothing catastrophic. Next time consider ${betterMoveText || 'more active central squares'}.`;
      }
      if (normClass === 'mistake') {
        return `That slips a bit of an advantage. ${betterMoveText ? `Finding ${betterMoveText} would have kept the momentum on your side!` : 'Keep your head up and focus on regaining piece control!'}`;
      }
      if (normClass === 'miss') {
        return `You missed an opportunity to break through! Remember to look at every check, capture, and threat!`;
      }
      if (normClass === 'blunder') {
        return `Ouch, that's a tough blunder! Don't get discouraged though—review why ${san} ran into trouble and look for ${betterMoveText || 'safer alternatives'}.`;
      }
      return `Stay sharp! Every move teaches you something valuable.`;
    }

    case 'coach-danny':
    default: {
      const motifText = motif ? ` ${motif.description}` : '';

      if (normClass === 'brilliant') {
        let refutationText = '';
        if (refutations?.accepted && refutations?.declined) {
          refutationText = ` If ${refutations.accepted.replySan}, then ${refutations.accepted.lineSan}${refutations.accepted.material ? ` (${refutations.accepted.material})` : ''}. If ${refutations.declined.replySan}, then ${refutations.declined.lineSan}${refutations.declined.material ? ` (${refutations.declined.material})` : ''}.`;
        } else if (refutations?.accepted) {
          refutationText = ` If ${refutations.accepted.replySan}, then ${refutations.accepted.lineSan}${refutations.accepted.material ? ` (${refutations.accepted.material})` : ''}.`;
        }
        return `Brilliant move!${motifText || ' You offered a stunning piece sacrifice that blows open the defense!'}${refutationText}`;
      }

      if (normClass === 'great') {
        let refutationText = '';
        if (refutations?.accepted && refutations.acceptIsBest === false) {
          refutationText = ` Accepting with ${refutations.accepted.replySan} runs into ${refutations.accepted.lineSan}${refutations.accepted.material ? ` (${refutations.accepted.material})` : ''}.`;
        }
        return `Great move! ${san} was the ONLY move on the board that preserves your advantage.${refutationText}`;
      }

      if (normClass === 'best') {
        if (motif?.type === 'fork') {
          return `Best move! Tactical Fork! ${motif.description || `Attacks two loose targets at once.`}`;
        }
        if (motif?.type === 'pin') {
          return `Best move! Absolute Pin! Ties down their defenses completely.`;
        }
        if (motif?.type === 'skewer') {
          return `Best move! Textbook Skewer! Forces the high-value piece away to win material behind it.`;
        }
        return `Best move!${motifText} Clean, principled, and matches the engine's top calculation.`;
      }

      if (normClass === 'excellent') {
        return `Excellent move!${motifText} Maintains maximum pressure and solid positional control.`;
      }

      if (normClass === 'good') {
        return `Good move. A sound and playable continuation that preserves the balance.`;
      }

      if (normClass === 'book') {
        return `${san} is standard opening book theory, establishing classical control over the center.`;
      }

      if (normClass === 'inaccuracy') {
        return `Inaccuracy. ${betterMoveText ? `Playing ${betterMoveText} was sharper.` : 'This allows the opponent slight counterplay.'}`;
      }

      if (normClass === 'mistake') {
        return `Mistake! This surrenders momentum. ${betterMoveText ? `A much stronger continuation was ${betterMoveText}.` : 'A more defensive setup was required.'}`;
      }

      if (normClass === 'miss') {
        return `Miss! You missed a decisive tactical advantage! ${betterMoveText ? `Finding ${betterMoveText} was winning on the spot.` : 'A winning sequence was overlooked.'}`;
      }

      if (normClass === 'blunder') {
        return `Blunder! ${betterMoveText ? `Playing ${betterMoveText} was needed to hold the position.` : 'This severely compromises your position or hangs material.'}`;
      }

      return `${san} was played. Stay sharp and calculate forcing moves!`;
    }
  }
}
