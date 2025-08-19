/**
 * Handicap calculation utilities for SW Monthly Golf
 * Implements USGA handicap rules with proper rounding and capping
 */

/**
 * Custom rounding function: round to nearest integer, with .5 rounding UP
 * Examples: 1.4 -> 1, 1.5 -> 2, 1.6 -> 2, -1.5 -> -1, -1.6 -> -2
 */
export function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5);
}

/**
 * Calculate Course Handicap (CH) from Handicap Index (HI)
 * Formula: CH = round(HI * (Slope/113) + (Rating - Par))
 * Then cap at maximum of 18
 */
export function calculateCourseHandicap(
  handicapIndex: number,
  slope: number,
  rating: number,
  par: number
): number {
  const rawCH = handicapIndex * (slope / 113) + (rating - par);
  const roundedCH = roundHalfUp(rawCH);
  
  // Cap at 18 maximum
  return Math.min(roundedCH, 18);
}

/**
 * Calculate Playing Course Handicap (playingCH) from Course Handicap
 * Formula: playingCH = round(CH * netAllowance/100)
 * Uses same rounding rule as CH calculation
 */
export function calculatePlayingHandicap(
  courseHandicap: number,
  netAllowance: number
): number {
  const rawPlayingCH = courseHandicap * (netAllowance / 100);
  return roundHalfUp(rawPlayingCH);
}

/**
 * Convenience function to calculate both CH and playingCH in one call
 */
export function calculateHandicaps(
  handicapIndex: number,
  slope: number,
  rating: number,
  par: number,
  netAllowance: number = 100
): {
  courseHandicap: number;
  playingCH: number;
} {
  const courseHandicap = calculateCourseHandicap(handicapIndex, slope, rating, par);
  const playingCH = calculatePlayingHandicap(courseHandicap, netAllowance);
  
  return {
    courseHandicap,
    playingCH
  };
}

/**
 * Recompute handicaps for an existing entry when course or allowance changes
 */
export function recomputeEntryHandicaps(
  handicapIndex: number,
  newSlope: number,
  newRating: number,
  newPar: number,
  newNetAllowance: number = 100
): {
  courseHandicap: number;
  playingCH: number;
} {
  return calculateHandicaps(handicapIndex, newSlope, newRating, newPar, newNetAllowance);
}