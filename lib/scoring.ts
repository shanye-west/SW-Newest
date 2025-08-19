import type { LeaderboardEntry, SkinsResult, SkinsLeaderboard, HoleScore, EntryWithPlayerAndScores } from '../shared/schema';

/**
 * USGA Tiebreaker for 18-hole tournaments
 * Compare back-9, then last-6, then last-3, then 18th hole
 */
export function resolveUSGATiebreaker(
  entries: LeaderboardEntry[]
): LeaderboardEntry[] {
  if (entries.length <= 1) return entries;

  // Helper to get score for specific holes
  const getHolesTotal = (entry: LeaderboardEntry, holes: number[]) => {
    return holes.reduce((sum, hole) => sum + (entry.holeScores[hole] || 0), 0);
  };

  // Helper to get handicap strokes for holes
  const getHandicapStrokes = (entry: LeaderboardEntry, holes: number[], courseHandicap: number) => {
    // Simplified: distribute handicap strokes across 18 holes based on difficulty
    // In reality, this would use course handicap hole ratings
    const strokesPerHole = Math.floor(courseHandicap / 18);
    const extraStrokes = courseHandicap % 18;
    
    return holes.reduce((sum, hole) => {
      let strokes = strokesPerHole;
      if (hole <= extraStrokes) strokes += 1; // Extra strokes on hardest holes (1-extraStrokes)
      return sum + strokes;
    }, 0);
  };

  // Define hole groups for tiebreakers
  const back9 = [10, 11, 12, 13, 14, 15, 16, 17, 18];
  const last6 = [13, 14, 15, 16, 17, 18];
  const last3 = [16, 17, 18];
  const last1 = [18];

  const tiebreakGroups = [
    { name: 'back9', holes: back9 },
    { name: 'last6', holes: last6 },
    { name: 'last3', holes: last3 },
    { name: 'last1', holes: last1 }
  ];

  // Sort entries and resolve ties
  return entries.sort((a, b) => {
    // First sort by main score (gross or net)
    const mainDiff = a.grossTotal - b.grossTotal;
    if (mainDiff !== 0) return mainDiff;

    // If tied, apply USGA tiebreaker rules
    for (const group of tiebreakGroups) {
      const aScore = getHolesTotal(a, group.holes);
      const bScore = getHolesTotal(b, group.holes);
      
      if (aScore !== bScore) {
        return aScore - bScore;
      }
    }

    // Still tied after all tiebreakers
    return 0;
  });
}

/**
 * Calculate leaderboards with USGA tiebreaking
 */
export function calculateLeaderboards(
  entries: EntryWithPlayerAndScores[],
  coursePar: number
): { gross: LeaderboardEntry[]; net: LeaderboardEntry[] } {
  const leaderboardEntries: LeaderboardEntry[] = entries.map(entry => {
    const holeScoresMap: { [hole: number]: number } = {};
    entry.scores.forEach(score => {
      holeScoresMap[score.hole] = score.strokes;
    });

    const grossTotal = entry.scores.reduce((sum, score) => sum + score.strokes, 0);
    const netTotal = grossTotal - entry.playingCH;

    return {
      entryId: entry.id,
      playerName: entry.player.name,
      courseHandicap: entry.courseHandicap,
      playingCH: entry.playingCH,
      grossTotal,
      netTotal,
      toPar: grossTotal - coursePar,
      netToPar: netTotal - coursePar,
      position: 0, // Will be set after sorting
      tied: false, // Will be set after sorting
      holeScores: holeScoresMap
    };
  }).filter(entry => entry.grossTotal > 0); // Only include entries with scores

  // Sort and assign positions for gross
  const grossSorted = resolveUSGATiebreaker([...leaderboardEntries]);
  let currentPos = 1;
  let tiedGroup: LeaderboardEntry[] = [];

  grossSorted.forEach((entry, index) => {
    if (index === 0 || entry.grossTotal !== grossSorted[index - 1].grossTotal) {
      // Finalize previous tie group
      if (tiedGroup.length > 1) {
        tiedGroup.forEach(tiedEntry => {
          tiedEntry.tied = true;
        });
      }
      
      // Start new group
      currentPos = index + 1;
      tiedGroup = [entry];
    } else {
      tiedGroup.push(entry);
    }
    
    entry.position = currentPos;
  });

  // Finalize last tie group
  if (tiedGroup.length > 1) {
    tiedGroup.forEach(tiedEntry => {
      tiedEntry.tied = true;
    });
  }

  // Sort and assign positions for net (similar process)
  const netSorted = [...leaderboardEntries].sort((a, b) => {
    const netDiff = a.netTotal - b.netTotal;
    if (netDiff !== 0) return netDiff;
    
    // Use same USGA tiebreaker but for net scores
    return resolveUSGATiebreaker([a, b])[0] === a ? -1 : 1;
  });

  currentPos = 1;
  tiedGroup = [];
  netSorted.forEach((entry, index) => {
    if (index === 0 || entry.netTotal !== netSorted[index - 1].netTotal) {
      if (tiedGroup.length > 1) {
        tiedGroup.forEach(tiedEntry => {
          tiedEntry.tied = true;
        });
      }
      currentPos = index + 1;
      tiedGroup = [entry];
    } else {
      tiedGroup.push(entry);
    }
    entry.position = currentPos;
  });

  if (tiedGroup.length > 1) {
    tiedGroup.forEach(tiedEntry => {
      tiedEntry.tied = true;
    });
  }

  return {
    gross: grossSorted,
    net: netSorted
  };
}

/**
 * Calculate gross skins (NO carry)
 */
export function calculateGrossSkins(
  entries: EntryWithPlayerAndScores[],
  coursePar: number,
  holePars: number[] // Array of par for each hole (1-18)
): { results: SkinsResult[]; leaderboard: SkinsLeaderboard[]; totalSkins: number } {
  const results: SkinsResult[] = [];
  const skinsCounts: { [entryId: string]: number } = {};
  let totalSkins = 0;

  // Initialize skins counts
  entries.forEach(entry => {
    skinsCounts[entry.id] = 0;
  });

  // Calculate skins for each hole
  for (let hole = 1; hole <= 18; hole++) {
    const par = holePars[hole - 1] || 4; // Default to par 4 if not specified
    const holeScores: Array<{ entryId: string; playerName: string; strokes: number }> = [];

    entries.forEach(entry => {
      const holeScore = entry.scores.find(hs => hs.hole === hole);
      if (holeScore) {
        holeScores.push({
          entryId: entry.id,
          playerName: entry.player.name,
          strokes: holeScore.strokes
        });
      }
    });

    if (holeScores.length === 0) {
      results.push({
        hole,
        par,
        winner: null,
        winnerScore: null,
        isPush: true,
        pushCount: 0,
        pushScore: 0
      });
      continue;
    }

    // Find lowest score
    const lowestScore = Math.min(...holeScores.map(hs => hs.strokes));
    const lowestScorers = holeScores.filter(hs => hs.strokes === lowestScore);

    if (lowestScorers.length === 1) {
      // Single winner
      const winner = lowestScorers[0];
      skinsCounts[winner.entryId]++;
      totalSkins++;

      results.push({
        hole,
        par,
        winner: winner.playerName,
        winnerScore: winner.strokes,
        isPush: false
      });
    } else {
      // Push (tie) - NO carry, skin is lost
      results.push({
        hole,
        par,
        winner: null,
        winnerScore: null,
        isPush: true,
        pushCount: lowestScorers.length,
        pushScore: lowestScore
      });
    }
  }

  // Calculate payouts
  const leaderboard: SkinsLeaderboard[] = entries.map(entry => ({
    playerName: entry.player.name,
    entryId: entry.id,
    skins: skinsCounts[entry.id],
    payout: 0 // Will be calculated next
  })).filter(entry => entry.skins > 0)
    .sort((a, b) => b.skins - a.skins);

  return {
    results,
    leaderboard,
    totalSkins
  };
}

/**
 * Calculate skins payouts
 */
export function calculateSkinsPayouts(
  skinsLeaderboard: SkinsLeaderboard[],
  potAmount: number,
  totalSkins: number
): SkinsLeaderboard[] {
  if (totalSkins === 0 || potAmount <= 0) {
    return skinsLeaderboard.map(entry => ({ ...entry, payout: 0 }));
  }

  const payoutPerSkin = Math.floor((potAmount * 100) / totalSkins) / 100; // Round to cents

  return skinsLeaderboard.map(entry => ({
    ...entry,
    payout: entry.skins * payoutPerSkin
  }));
}

/**
 * Last-Write-Wins conflict resolution
 */
export function resolveScoreConflict(
  localScore: { strokes: number; updatedAt: Date },
  serverScore: { strokes: number; updatedAt: Date }
): { strokes: number; updatedAt: Date; wasOverwritten: boolean } {
  const localTime = localScore.updatedAt.getTime();
  const serverTime = serverScore.updatedAt.getTime();

  if (serverTime > localTime) {
    // Server wins
    return {
      strokes: serverScore.strokes,
      updatedAt: serverScore.updatedAt,
      wasOverwritten: true
    };
  } else {
    // Local wins
    return {
      strokes: localScore.strokes,
      updatedAt: localScore.updatedAt,
      wasOverwritten: false
    };
  }
}