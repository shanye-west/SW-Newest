/**
 * Handicap calculations following USGA standards
 * CH = round(HI * (Slope/113) + (Rating - Par))
 * Capped at maximum of 18 per rules
 */

export function calculateCourseHandicap(
  handicapIndex: number,
  slope: number,
  rating: number,
  par: number
): number {
  // CH = round(HI * (Slope/113) + (Rating - Par))
  const courseHandicap = Math.round(
    handicapIndex * (slope / 113) + (rating - par)
  );
  
  // Cap at 18 maximum
  return Math.min(courseHandicap, 18);
}

export function calculatePlayingHandicap(
  courseHandicap: number,
  netAllowance: number
): number {
  // Playing CH = Course Handicap * (Net Allowance / 100)
  const playingCH = Math.round(courseHandicap * (netAllowance / 100));
  
  // Ensure minimum of 0
  return Math.max(playingCH, 0);
}

export function calculateNetScore(grossScore: number, playingHandicap: number): number {
  return grossScore - playingHandicap;
}

/**
 * USGA tiebreaker: Last 9, 6, 3, 1 holes
 * Returns negative if player1 wins, positive if player2 wins, 0 if tied
 */
export function tiebreaker(
  player1Scores: number[],
  player2Scores: number[],
  player1Handicap: number,
  player2Handicap: number
): number {
  if (player1Scores.length !== 18 || player2Scores.length !== 18) {
    return 0; // Can't break tie without full 18 holes
  }

  // Calculate handicap strokes per hole (simplified - actual allocation would use hole handicap ratings)
  const p1StrokesPerHole = Math.floor(player1Handicap / 18);
  const p1ExtraStrokes = player1Handicap % 18;
  const p2StrokesPerHole = Math.floor(player2Handicap / 18);
  const p2ExtraStrokes = player2Handicap % 18;

  const tiebreakHoles = [
    [9, 17], // Last 9 holes (holes 10-18)
    [6, 17], // Last 6 holes (holes 13-18) 
    [3, 17], // Last 3 holes (holes 16-18)
    [1, 17]  // Last hole (hole 18)
  ];

  for (const [count, endIndex] of tiebreakHoles) {
    let p1Total = 0;
    let p2Total = 0;

    for (let i = endIndex - count + 1; i <= endIndex; i++) {
      // Apply handicap strokes
      let p1Net = player1Scores[i] - p1StrokesPerHole;
      let p2Net = player2Scores[i] - p2StrokesPerHole;
      
      // Apply extra strokes to lowest handicap holes (simplified)
      if (i < p1ExtraStrokes) p1Net -= 1;
      if (i < p2ExtraStrokes) p2Net -= 1;
      
      p1Total += p1Net;
      p2Total += p2Net;
    }

    if (p1Total !== p2Total) {
      return p1Total - p2Total;
    }
  }

  return 0; // Still tied after all tiebreakers
}