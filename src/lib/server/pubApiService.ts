/**
 * PubAPI Service: Implements Chess.com-compliant public data API specification
 * Reference: A10 PubAPI Parity Specification (chess_platform_replication_spec.md)
 */

export interface PubPlayerProfile {
  '@id': string;
  url: string;
  username: string;
  player_id: number;
  title?: string;
  status: 'basic' | 'premium' | 'staff' | 'closed';
  name?: string;
  avatar?: string;
  location?: string;
  country: string;
  joined: number;
  last_online: number;
  followers: number;
  is_streamer: boolean;
  twitch_url?: string;
  verified: boolean;
}

export interface RatingRecord {
  rating: number;
  date: number;
  rd?: number;
  game?: string;
}

export interface WinLossRecord {
  win: number;
  loss: number;
  draw: number;
}

export interface PubPlayerStats {
  chess_daily?: {
    last: RatingRecord;
    best: RatingRecord;
    record: WinLossRecord;
  };
  chess_rapid?: {
    last: RatingRecord;
    best: RatingRecord;
    record: WinLossRecord;
  };
  chess_blitz?: {
    last: RatingRecord;
    best: RatingRecord;
    record: WinLossRecord;
  };
  chess_bullet?: {
    last: RatingRecord;
    best: RatingRecord;
    record: WinLossRecord;
  };
  tactics?: {
    highest: { rating: number; date: number };
    lowest: { rating: number; date: number };
  };
  puzzle_rush?: {
    best: { total_attempts: number; score: number };
  };
}

export interface PubArchivedGame {
  url: string;
  pgn: string;
  time_control: string;
  end_time: number;
  rated: boolean;
  time_class: 'bullet' | 'blitz' | 'rapid' | 'daily';
  rules: string;
  fen: string;
  white: {
    rating: number;
    result: string;
    '@id': string;
    username: string;
  };
  black: {
    rating: number;
    result: string;
    '@id': string;
    username: string;
  };
  accuracies?: {
    white: number;
    black: number;
  };
}

const REGISTERED_PLAYERS: Record<string, { profile: PubPlayerProfile; stats: PubPlayerStats }> = {
  hikaru: {
    profile: {
      '@id': 'https://chess-platform.internal/pub/player/hikaru',
      url: 'https://chess-platform.internal/member/hikaru',
      username: 'hikaru',
      player_id: 15448422,
      title: 'GM',
      status: 'premium',
      name: 'Hikaru Nakamura',
      avatar: 'https://images.chesscomfiles.com/uploads/v1/user/15448422.0.200x200o.e3b22fb418a9.jpeg',
      location: 'Sunrise, Florida',
      country: 'https://chess-platform.internal/pub/country/US',
      joined: 1388534400,
      last_online: Math.floor(Date.now() / 1000) - 300,
      followers: 1250000,
      is_streamer: true,
      twitch_url: 'https://twitch.tv/gmhikaru',
      verified: true,
    },
    stats: {
      chess_bullet: {
        last: { rating: 3340, date: 1712000000, rd: 28 },
        best: { rating: 3390, date: 1709000000 },
        record: { win: 18450, loss: 2410, draw: 1205 },
      },
      chess_blitz: {
        last: { rating: 3260, date: 1712000000, rd: 25 },
        best: { rating: 3310, date: 1708000000 },
        record: { win: 24500, loss: 3100, draw: 1850 },
      },
      chess_rapid: {
        last: { rating: 2880, date: 1711000000, rd: 38 },
        best: { rating: 2940, date: 1690000000 },
        record: { win: 1420, loss: 110, draw: 180 },
      },
      tactics: {
        highest: { rating: 3580, date: 1700000000 },
        lowest: { rating: 2100, date: 1400000000 },
      },
      puzzle_rush: {
        best: { total_attempts: 65, score: 62 },
      },
    },
  },
  magnuscarlsen: {
    profile: {
      '@id': 'https://chess-platform.internal/pub/player/magnuscarlsen',
      url: 'https://chess-platform.internal/member/magnuscarlsen',
      username: 'magnuscarlsen',
      player_id: 28543210,
      title: 'GM',
      status: 'premium',
      name: 'Magnus Carlsen',
      avatar: 'https://images.chesscomfiles.com/uploads/v1/user/28543210.0.200x200o.e3b22fb418a9.jpeg',
      location: 'Oslo, Norway',
      country: 'https://chess-platform.internal/pub/country/NO',
      joined: 1399534400,
      last_online: Math.floor(Date.now() / 1000) - 1200,
      followers: 1850000,
      is_streamer: true,
      twitch_url: 'https://twitch.tv/maskenissen',
      verified: true,
    },
    stats: {
      chess_bullet: {
        last: { rating: 3365, date: 1712000000, rd: 26 },
        best: { rating: 3415, date: 1708000000 },
        record: { win: 15200, loss: 1850, draw: 940 },
      },
      chess_blitz: {
        last: { rating: 3315, date: 1712000000, rd: 24 },
        best: { rating: 3350, date: 1707000000 },
        record: { win: 21000, loss: 2200, draw: 1400 },
      },
      chess_rapid: {
        last: { rating: 2920, date: 1710000000, rd: 32 },
        best: { rating: 2975, date: 1685000000 },
        record: { win: 980, loss: 60, draw: 110 },
      },
      tactics: {
        highest: { rating: 3620, date: 1705000000 },
        lowest: { rating: 2400, date: 1450000000 },
      },
      puzzle_rush: {
        best: { total_attempts: 70, score: 65 },
      },
    },
  },
  danielnaroditsky: {
    profile: {
      '@id': 'https://chess-platform.internal/pub/player/danielnaroditsky',
      url: 'https://chess-platform.internal/member/danielnaroditsky',
      username: 'danielnaroditsky',
      player_id: 8877665,
      title: 'GM',
      status: 'premium',
      name: 'Daniel Naroditsky',
      avatar: 'https://images.chesscomfiles.com/uploads/v1/user/8877665.0.200x200o.e3b22fb418a9.jpeg',
      location: 'Charlotte, NC',
      country: 'https://chess-platform.internal/pub/country/US',
      joined: 1412534400,
      last_online: Math.floor(Date.now() / 1000) - 1800,
      followers: 820000,
      is_streamer: true,
      twitch_url: 'https://twitch.tv/danielnaroditsky',
      verified: true,
    },
    stats: {
      chess_bullet: {
        last: { rating: 3240, date: 1711000000, rd: 30 },
        best: { rating: 3290, date: 1705000000 },
        record: { win: 14200, loss: 2800, draw: 1100 },
      },
      chess_blitz: {
        last: { rating: 3120, date: 1711000000, rd: 29 },
        best: { rating: 3180, date: 1704000000 },
        record: { win: 18500, loss: 3400, draw: 1600 },
      },
      chess_rapid: {
        last: { rating: 2790, date: 1709000000, rd: 40 },
        best: { rating: 2840, date: 1690000000 },
        record: { win: 850, loss: 95, draw: 120 },
      },
      tactics: {
        highest: { rating: 3450, date: 1695000000 },
        lowest: { rating: 2100, date: 1450000000 },
      },
      puzzle_rush: {
        best: { total_attempts: 62, score: 58 },
      },
    },
  },
};

export class PubApiService {
  public static getPlayer(username: string): PubPlayerProfile | null {
    const key = username.toLowerCase();
    if (REGISTERED_PLAYERS[key]) {
      return REGISTERED_PLAYERS[key].profile;
    }
    // Default simulated guest profile
    return {
      '@id': `https://chess-platform.internal/pub/player/${key}`,
      url: `https://chess-platform.internal/member/${key}`,
      username: key,
      player_id: Math.abs(key.split('').reduce((acc, c) => acc * 31 + c.charCodeAt(0), 7)) % 1000000,
      status: 'basic',
      country: 'https://chess-platform.internal/pub/country/US',
      joined: 1672531199,
      last_online: Math.floor(Date.now() / 1000) - 600,
      followers: 12,
      is_streamer: false,
      verified: false,
    };
  }

  public static getPlayerStats(username: string): PubPlayerStats {
    const key = username.toLowerCase();
    if (REGISTERED_PLAYERS[key]) {
      return REGISTERED_PLAYERS[key].stats;
    }
    return {
      chess_rapid: {
        last: { rating: 1500, date: Math.floor(Date.now() / 1000), rd: 75 },
        best: { rating: 1540, date: Math.floor(Date.now() / 1000) - 86400 * 10 },
        record: { win: 45, loss: 38, draw: 12 },
      },
      chess_blitz: {
        last: { rating: 1480, date: Math.floor(Date.now() / 1000), rd: 80 },
        best: { rating: 1510, date: Math.floor(Date.now() / 1000) - 86400 * 15 },
        record: { win: 85, loss: 82, draw: 18 },
      },
      tactics: {
        highest: { rating: 1650, date: Math.floor(Date.now() / 1000) - 86400 * 5 },
        lowest: { rating: 1200, date: Math.floor(Date.now() / 1000) - 86400 * 100 },
      },
      puzzle_rush: {
        best: { total_attempts: 25, score: 28 },
      },
    };
  }

  public static getArchives(username: string): { archives: string[] } {
    const key = username.toLowerCase();
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const archives: string[] = [];

    for (let y = currentYear - 1; y <= currentYear; y++) {
      const maxM = y === currentYear ? currentMonth : 12;
      for (let m = 1; m <= maxM; m++) {
        const mm = m < 10 ? `0${m}` : `${m}`;
        archives.push(`https://chess-platform.internal/pub/player/${key}/games/${y}/${mm}`);
      }
    }

    return { archives };
  }

  public static getMonthlyGames(
    username: string,
    year: string,
    month: string
  ): { games: PubArchivedGame[] } {
    const key = username.toLowerCase();
    const games: PubArchivedGame[] = [
      {
        url: `https://chess-platform.internal/game/live/${key}-${year}${month}-01`,
        pgn: `[Event "Live Chess"]\n[Site "Chess Platform"]\n[Date "${year}.${month}.01"]\n[White "${key}"]\n[Black "OpponentMaster"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 1-0`,
        time_control: '600',
        end_time: Math.floor(Date.now() / 1000) - 86400 * 2,
        rated: true,
        time_class: 'rapid',
        rules: 'chess',
        fen: 'r1bq1rk1/1ppnbppp/p2p1n2/4p3/3PP3/1BP2N1P/PP3PP1/RNBQR1K1 b - - 1 10',
        white: {
          username: key,
          rating: 2820,
          result: 'win',
          '@id': `https://chess-platform.internal/pub/player/${key}`,
        },
        black: {
          username: 'OpponentMaster',
          rating: 2795,
          result: 'resigned',
          '@id': 'https://chess-platform.internal/pub/player/opponentmaster',
        },
        accuracies: {
          white: 94.6,
          black: 87.2,
        },
      },
      {
        url: `https://chess-platform.internal/game/live/${key}-${year}${month}-02`,
        pgn: `[Event "Live Chess Blitz"]\n[Site "Chess Platform"]\n[Date "${year}.${month}.03"]\n[White "SuperGM"]\n[Black "${key}"]\n[Result "0-1"]\n\n1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Nf3 O-O 6. Be2 e5 7. O-O Nc6 8. d5 Ne7 0-1`,
        time_control: '180+2',
        end_time: Math.floor(Date.now() / 1000) - 86400 * 4,
        rated: true,
        time_class: 'blitz',
        rules: 'chess',
        fen: 'r1bq1rk1/ppp1npbp/3p1np1/3Pp3/2P1P3/2N2N2/PP2BPPP/R1BQ1RK1 w - - 3 9',
        white: {
          username: 'SuperGM',
          rating: 2810,
          result: 'resigned',
          '@id': 'https://chess-platform.internal/pub/player/supergm',
        },
        black: {
          username: key,
          rating: 2835,
          result: 'win',
          '@id': `https://chess-platform.internal/pub/player/${key}`,
        },
        accuracies: {
          white: 82.4,
          black: 96.1,
        },
      },
    ];

    return { games };
  }

  public static getTitledPlayers(title: string): { players: string[] } {
    const valid = ['GM', 'WGM', 'IM', 'WIM', 'FM', 'WFM', 'CM', 'WCM', 'NM', 'WNM'];
    const norm = title.toUpperCase();
    if (!valid.includes(norm)) {
      return { players: [] };
    }
    if (norm === 'GM') {
      return {
        players: ['hikaru', 'magnuscarlsen', 'danielnaroditsky', 'alireza2003', 'fabianocaruana', 'dingliren'],
      };
    }
    return { players: ['titled_player_1', 'titled_player_2'] };
  }

  public static getLeaderboards() {
    return {
      daily: [
        { username: 'hikaru', score: 2840, rank: 1 },
        { username: 'magnuscarlsen', score: 2825, rank: 2 },
      ],
      live_rapid: [
        { username: 'magnuscarlsen', score: 2920, rank: 1 },
        { username: 'hikaru', score: 2880, rank: 2 },
      ],
      live_blitz: [
        { username: 'magnuscarlsen', score: 3315, rank: 1 },
        { username: 'hikaru', score: 3260, rank: 2 },
      ],
      live_bullet: [
        { username: 'magnuscarlsen', score: 3365, rank: 1 },
        { username: 'hikaru', score: 3340, rank: 2 },
      ],
      tactics: [
        { username: 'magnuscarlsen', score: 3620, rank: 1 },
        { username: 'hikaru', score: 3580, rank: 2 },
      ],
    };
  }

  public static getStreamers() {
    return {
      streamers: [
        {
          username: 'hikaru',
          avatar: 'https://images.chesscomfiles.com/uploads/v1/user/15448422.0.200x200o.e3b22fb418a9.jpeg',
          twitch_url: 'https://twitch.tv/gmhikaru',
          url: 'https://chess-platform.internal/member/hikaru',
          is_live: true,
        },
        {
          username: 'danielnaroditsky',
          avatar: 'https://images.chesscomfiles.com/uploads/v1/user/8877665.0.200x200o.e3b22fb418a9.jpeg',
          twitch_url: 'https://twitch.tv/danielnaroditsky',
          url: 'https://chess-platform.internal/member/danielnaroditsky',
          is_live: false,
        },
      ],
    };
  }
}
