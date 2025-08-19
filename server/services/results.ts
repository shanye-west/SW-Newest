import { prisma } from "../../lib/db";

type EntryCtx = {
  entryId: string;
  playerName: string;
  playingCH: number;
  holes: Record<number, number>; // hole -> strokes
  gross: number; // sum of strokes for holes that have scores
};

const BACK9 = [10, 11, 12, 13, 14, 15, 16, 17, 18];
const LAST6 = [13, 14, 15, 16, 17, 18];
const LAST3 = [16, 17, 18];

function sumSegment(holes: Record<number, number>, seg: number[]) {
  let s = 0;
  for (const h of seg) s += holes[h] ?? 0;
  return s;
}

/** USGA tie-break comparator: back 9, then last 6, then last 3, then 18th. Lower is better. */
function usgaCompare(a: EntryCtx, b: EntryCtx) {
  const segs = [BACK9, LAST6, LAST3, [18]];
  for (const seg of segs) {
    const sa = sumSegment(a.holes, seg);
    const sb = sumSegment(b.holes, seg);
    if (sa !== sb) return sa - sb; // lower wins
  }
  return 0; // still tied
}

function rankWithTies<T extends { score: number; tiebreakKey: string }>(
  rows: T[],
  tieBreakers: (a: T, b: T) => number,
) {
  // Sort by primary score asc; break ties with comparator.
  rows.sort((a, b) => a.score - b.score || tieBreakers(a, b));
  // Assign positions with T- semantics
  let pos = 0;
  let lastScore = Number.NaN;
  let lastTie = 0;
  return rows.map((r, i) => {
    if (i === 0 || r.score !== lastScore) {
      pos = i + 1;
      lastTie = 0;
    } else {
      lastTie += 1;
    }
    lastScore = r.score;
    const label = lastTie > 0 ? `T-${pos}` : `${pos}`;
    return { ...r, position: label };
  });
}

export async function computeResults(tournamentId: string) {
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      course: true,
      entries: { include: { player: true } },
    },
  });
  if (!t || !t.course) throw new Error("Tournament or course not found");

  const entryIds = t.entries.map((e) => e.id);
  const scores = await prisma.holeScore.findMany({
    where: { entryId: { in: entryIds } },
  });

  // Build per-entry context
  const byEntry: Record<string, EntryCtx> = {};
  for (const e of t.entries) {
    byEntry[e.id] = {
      entryId: e.id,
      playerName: e.player?.name ?? "Unknown",
      playingCH: e.playingCH ?? 0,
      holes: {},
      gross: 0,
    };
  }
  for (const s of scores) {
    const ctx = byEntry[s.entryId];
    if (!ctx) continue;
    ctx.holes[s.hole] = s.strokes;
  }
  for (const ctx of Object.values(byEntry)) {
    ctx.gross = Object.values(ctx.holes).reduce((a, b) => a + b, 0);
  }

  // Gross leaderboard
  const grossRows = Object.values(byEntry).map((ctx) => ({
    tiebreakKey: ctx.entryId,
    entryId: ctx.entryId,
    playerName: ctx.playerName,
    gross: ctx.gross,
    toPar: t.course.par ? ctx.gross - t.course.par : null,
    score: ctx.gross,
    holes: ctx.holes,
  }));
  const grossRanked = rankWithTies(grossRows, (a, b) =>
    usgaCompare(byEntry[a.entryId], byEntry[b.entryId]),
  ).map((r) => ({
    position: r.position,
    entryId: r.entryId,
    playerName: r.playerName,
    gross: r.gross,
    toPar: r.toPar,
  }));

  // Net leaderboard (Net = Gross - playingCH); same tiebreak comparator on gross segments for MVP
  const netRows = Object.values(byEntry).map((ctx) => {
    const net = ctx.gross - ctx.playingCH;
    return {
      tiebreakKey: ctx.entryId,
      entryId: ctx.entryId,
      playerName: ctx.playerName,
      gross: ctx.gross,
      playingCH: ctx.playingCH,
      net,
      toPar: t.course.par ? net - t.course.par : null,
      score: net,
      holes: ctx.holes,
    };
  });
  const netRanked = rankWithTies(netRows, (a, b) =>
    usgaCompare(byEntry[a.entryId], byEntry[b.entryId]),
  ).map((r) => ({
    position: r.position,
    entryId: r.entryId,
    playerName: r.playerName,
    gross: r.gross,
    playingCH: r.playingCH,
    net: r.net,
    toPar: r.toPar,
  }));

  // Gross skins (no carry)
  const holes = Array.from({ length: t.holes ?? 18 }, (_, i) => i + 1);
  type SkinsPerHole = {
    hole: number;
    winnerEntryId?: string;
    winnerName?: string;
    push?: { count: number; score: number };
  };
  const perHole: SkinsPerHole[] = [];
  const perPlayer: Record<
    string,
    { playerName: string; count: number; holes: number[] }
  > = {};

  for (const ctx of Object.values(byEntry)) {
    perPlayer[ctx.entryId] = {
      playerName: ctx.playerName,
      count: 0,
      holes: [],
    };
  }

  for (const h of holes) {
    const scoresOnHole: { entryId: string; name: string; strokes: number }[] =
      [];
    for (const ctx of Object.values(byEntry)) {
      const st = ctx.holes[h];
      if (typeof st === "number") {
        scoresOnHole.push({
          entryId: ctx.entryId,
          name: ctx.playerName,
          strokes: st,
        });
      }
    }
    if (scoresOnHole.length === 0) {
      perHole.push({ hole: h });
      continue;
    }
    const min = Math.min(...scoresOnHole.map((s) => s.strokes));
    const winners = scoresOnHole.filter((s) => s.strokes === min);
    if (winners.length === 1) {
      const w = winners[0];
      perHole.push({ hole: h, winnerEntryId: w.entryId, winnerName: w.name });
      perPlayer[w.entryId].count += 1;
      perPlayer[w.entryId].holes.push(h);
    } else {
      perHole.push({ hole: h, push: { count: winners.length, score: min } });
    }
  }

  // Calculate payout information if pot amount is set
  let payout = {
    potAmount: 0,
    participantsForSkins: 0,
    totalSkins: 0,
    payoutPerSkin: 0,
    perPlayerPayouts: {} as Record<string, number>
  };

  if (t.potAmount && t.participantsForSkins) {
    const totalSkins = Object.values(perPlayer).reduce((sum, player) => sum + player.count, 0);
    const potInDollars = t.potAmount / 100; // Convert cents to dollars
    
    let payoutPerSkin = 0;
    const perPlayerPayouts: Record<string, number> = {};
    
    if (totalSkins > 0) {
      payoutPerSkin = Math.round((potInDollars / totalSkins) * 100) / 100; // Round to cents
      
      for (const [entryId, playerData] of Object.entries(perPlayer)) {
        perPlayerPayouts[entryId] = Math.round((playerData.count * payoutPerSkin) * 100) / 100;
      }
    } else {
      // No skins yet, all payouts are zero
      for (const entryId of Object.keys(perPlayer)) {
        perPlayerPayouts[entryId] = 0;
      }
    }

    payout = {
      potAmount: t.potAmount, // Keep as cents in API
      participantsForSkins: t.participantsForSkins,
      totalSkins,
      payoutPerSkin,
      perPlayerPayouts
    };
  }

  return {
    gross: grossRanked,
    net: netRanked,
    skins: {
      perHole,
      perPlayer, // { entryId: { playerName, count, holes[] } }
      payout
    },
    lastUpdatedAt: new Date().toISOString(),
  };
}
