/**
 * Shared handicap and net scoring utilities
 */

/**
 * Calculate strokes received per hole based on playing handicap and stroke index
 * Uses USGA method: distribute handicap strokes by stroke index difficulty
 */
export function strokesReceived(playingCH: number, strokeIndex: number): number {
  if (playingCH <= 0) return 0;
  
  const base = Math.floor(playingCH / 18);
  const extra = (strokeIndex <= (playingCH % 18)) ? 1 : 0;
  return base + extra;
}

/**
 * Format holes data into par array for display
 */
export function formatParRow(holes: { hole: number; par: number }[]): number[] {
  const parArray = Array(18).fill(4); // Default to par 4
  holes.forEach(hole => {
    if (hole.hole >= 1 && hole.hole <= 18) {
      parArray[hole.hole - 1] = hole.par;
    }
  });
  return parArray;
}

/**
 * Format holes data into stroke index array for display
 */
export function formatSIRow(holes: { hole: number; strokeIndex: number }[]): number[] {
  const siArray = Array(18).fill(1); // Default to SI 1
  holes.forEach(hole => {
    if (hole.hole >= 1 && hole.hole <= 18) {
      siArray[hole.hole - 1] = hole.strokeIndex;
    }
  });
  return siArray;
}

/**
 * Validate that stroke indexes form a complete permutation of 1-18
 */
export function isValidSIPermutation(strokeIndexes: number[]): boolean {
  if (strokeIndexes.length !== 18) return false;
  
  const sorted = [...strokeIndexes].sort((a, b) => a - b);
  const expected = Array.from({ length: 18 }, (_, i) => i + 1);
  
  return JSON.stringify(sorted) === JSON.stringify(expected);
}

/**
 * Validate that numbers form a complete permutation of 1-18
 * Helper for Course Holes editor
 */
export function isPermutation1to18(nums: number[]): boolean {
  return isValidSIPermutation(nums);
}