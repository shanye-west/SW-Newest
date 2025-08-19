/**
 * TRUE Net Tiebreaker Implementation
 * Uses per-hole Stroke Index (SI) and per-hole Par for accurate Net calculations
 */

import type { CourseHole, HoleScore } from '../shared/schema';

/**
 * Calculate strokes received per hole based on playing handicap and stroke index
 */
export function strokesReceivedPerHole(playingCH: number, strokeIndex: number): number {
  if (playingCH <= 0) return 0;
  
  const base = Math.floor(playingCH / 18);
  const extra = (strokeIndex <= (playingCH % 18)) ? 1 : 0;
  return base + extra;
}

/**
 * Calculate net score for a specific hole
 */
export function calculateNetHoleScore(
  grossStrokes: number,
  playingCH: number,
  strokeIndex: number
): number {
  const received = strokesReceivedPerHole(playingCH, strokeIndex);
  return Math.max(1, grossStrokes - received); // Clamp to minimum 1
}

/**
 * Calculate net segment totals for tiebreaking
 * Returns net stroke totals for back 9, last 6, last 3, and 18th hole
 */
export function calculateNetSegments(
  holeScores: { [hole: number]: number },
  playingCH: number,
  courseHoles: CourseHole[]
): {
  back9: number;
  last6: number;
  last3: number;
  hole18: number;
} {
  // Create stroke index map
  const strokeIndexMap: { [hole: number]: number } = {};
  courseHoles.forEach(ch => {
    strokeIndexMap[ch.hole] = ch.strokeIndex;
  });

  // Calculate net scores for each segment
  const back9Holes = [10, 11, 12, 13, 14, 15, 16, 17, 18];
  const last6Holes = [13, 14, 15, 16, 17, 18];
  const last3Holes = [16, 17, 18];

  const calculateSegmentNet = (holes: number[]): number => {
    return holes.reduce((sum, hole) => {
      const grossStrokes = holeScores[hole] || 0;
      if (grossStrokes === 0) return sum; // No score recorded
      
      const strokeIndex = strokeIndexMap[hole];
      if (strokeIndex === undefined) return sum; // No stroke index available
      
      const netStrokes = calculateNetHoleScore(grossStrokes, playingCH, strokeIndex);
      return sum + netStrokes;
    }, 0);
  };

  return {
    back9: calculateSegmentNet(back9Holes),
    last6: calculateSegmentNet(last6Holes),
    last3: calculateSegmentNet(last3Holes),
    hole18: calculateSegmentNet([18]),
  };
}

/**
 * Check if course holes are complete and valid for net tiebreaking
 */
export function validateCourseHoles(courseHoles: CourseHole[]): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  
  // Must have exactly 18 holes
  if (courseHoles.length !== 18) {
    warnings.push('course_holes_incomplete');
    return { isValid: false, warnings };
  }

  // Check hole numbers are 1-18
  const holes = courseHoles.map(ch => ch.hole).sort((a, b) => a - b);
  const expectedHoles = Array.from({ length: 18 }, (_, i) => i + 1);
  if (JSON.stringify(holes) !== JSON.stringify(expectedHoles)) {
    warnings.push('course_holes_incomplete');
    return { isValid: false, warnings };
  }

  // Check stroke indexes are a valid 1-18 permutation
  const strokeIndexes = courseHoles.map(ch => ch.strokeIndex).sort((a, b) => a - b);
  if (JSON.stringify(strokeIndexes) !== JSON.stringify(expectedHoles)) {
    warnings.push('course_holes_incomplete');
    return { isValid: false, warnings };
  }

  // Check par values are reasonable (3-6)
  const invalidPars = courseHoles.filter(ch => ch.par < 3 || ch.par > 6);
  if (invalidPars.length > 0) {
    warnings.push('course_holes_incomplete');
    return { isValid: false, warnings };
  }

  return { isValid: true, warnings: [] };
}

/**
 * Net tiebreaker comparator using TRUE net segments
 */
export function compareNetTiebreaker(
  a: { holeScores: { [hole: number]: number }, playingCH: number },
  b: { holeScores: { [hole: number]: number }, playingCH: number },
  courseHoles: CourseHole[]
): number {
  const { isValid } = validateCourseHoles(courseHoles);
  
  // Fallback to gross segments if course holes are invalid
  if (!isValid) {
    return compareGrossSegments(a.holeScores, b.holeScores);
  }

  // Calculate net segments for both entries
  const aSegments = calculateNetSegments(a.holeScores, a.playingCH, courseHoles);
  const bSegments = calculateNetSegments(b.holeScores, b.playingCH, courseHoles);

  // Compare segments in order: back9, last6, last3, hole18
  const comparisons = [
    aSegments.back9 - bSegments.back9,
    aSegments.last6 - bSegments.last6,
    aSegments.last3 - bSegments.last3,
    aSegments.hole18 - bSegments.hole18,
  ];

  for (const diff of comparisons) {
    if (diff !== 0) return diff;
  }

  return 0; // Still tied
}

/**
 * Gross segment comparator (fallback and for gross leaderboards)
 */
export function compareGrossSegments(
  aHoleScores: { [hole: number]: number },
  bHoleScores: { [hole: number]: number }
): number {
  const back9Holes = [10, 11, 12, 13, 14, 15, 16, 17, 18];
  const last6Holes = [13, 14, 15, 16, 17, 18];
  const last3Holes = [16, 17, 18];

  const getSegmentTotal = (holes: number[], scores: { [hole: number]: number }) => {
    return holes.reduce((sum, hole) => sum + (scores[hole] || 0), 0);
  };

  const segments = [
    { a: getSegmentTotal(back9Holes, aHoleScores), b: getSegmentTotal(back9Holes, bHoleScores) },
    { a: getSegmentTotal(last6Holes, aHoleScores), b: getSegmentTotal(last6Holes, bHoleScores) },
    { a: getSegmentTotal(last3Holes, aHoleScores), b: getSegmentTotal(last3Holes, bHoleScores) },
    { a: aHoleScores[18] || 0, b: bHoleScores[18] || 0 },
  ];

  for (const segment of segments) {
    const diff = segment.a - segment.b;
    if (diff !== 0) return diff;
  }

  return 0;
}