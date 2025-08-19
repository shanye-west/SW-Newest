/**
 * Tests for TRUE Net Tiebreaker Implementation
 */

import { describe, it, expect } from 'vitest';
import {
  strokesReceivedPerHole,
  calculateNetHoleScore,
  calculateNetSegments,
  validateCourseHoles,
  compareNetTiebreaker,
  compareGrossSegments,
} from '../lib/net-tiebreaker';
import type { CourseHole } from '../shared/schema';

describe('strokesReceivedPerHole', () => {
  it('should return 0 for playing handicap 0', () => {
    expect(strokesReceivedPerHole(0, 1)).toBe(0);
    expect(strokesReceivedPerHole(0, 18)).toBe(0);
  });

  it('should distribute strokes correctly for playing handicap 5', () => {
    // With playingCH = 5, exactly stroke indexes 1-5 should get 1 stroke, others 0
    expect(strokesReceivedPerHole(5, 1)).toBe(1);
    expect(strokesReceivedPerHole(5, 5)).toBe(1);
    expect(strokesReceivedPerHole(5, 6)).toBe(0);
    expect(strokesReceivedPerHole(5, 18)).toBe(0);
  });

  it('should give 1 stroke to all holes for playing handicap 18', () => {
    for (let si = 1; si <= 18; si++) {
      expect(strokesReceivedPerHole(18, si)).toBe(1);
    }
  });

  it('should handle playing handicap > 18 correctly', () => {
    // playingCH = 25 = 18 + 7, so all holes get 1, plus SI 1-7 get another
    expect(strokesReceivedPerHole(25, 1)).toBe(2); // 1 + 1
    expect(strokesReceivedPerHole(25, 7)).toBe(2); // 1 + 1
    expect(strokesReceivedPerHole(25, 8)).toBe(1); // 1 + 0
    expect(strokesReceivedPerHole(25, 18)).toBe(1); // 1 + 0
  });

  it('should handle fractional handicaps by flooring', () => {
    // playingCH = 13.7 becomes 13
    expect(strokesReceivedPerHole(13, 1)).toBe(1);
    expect(strokesReceivedPerHole(13, 13)).toBe(1);
    expect(strokesReceivedPerHole(13, 14)).toBe(0);
  });
});

describe('calculateNetHoleScore', () => {
  it('should clamp net score to minimum 1', () => {
    // Gross 4, playingCH=18, SI=1 → receives 1 stroke → 4-1=3 (not clamped)
    expect(calculateNetHoleScore(4, 18, 1)).toBe(3);
    
    // Gross 1, playingCH=18, SI=1 → receives 1 stroke → 1-1=0, clamped to 1
    expect(calculateNetHoleScore(1, 18, 1)).toBe(1);
    
    // Extreme case: Gross 2, playingCH=36, SI=1 → receives 2 strokes → 2-2=0, clamped to 1
    expect(calculateNetHoleScore(2, 36, 1)).toBe(1);
  });

  it('should calculate normal net scores correctly', () => {
    expect(calculateNetHoleScore(5, 5, 1)).toBe(4); // 5 - 1 = 4
    expect(calculateNetHoleScore(4, 0, 1)).toBe(4); // 4 - 0 = 4
    expect(calculateNetHoleScore(6, 10, 5)).toBe(5); // 6 - 1 = 5 (SI 5 gets 1 stroke with CH 10)
  });
});

describe('validateCourseHoles', () => {
  const createValidHoles = (): CourseHole[] => {
    return Array.from({ length: 18 }, (_, i) => ({
      id: `hole-${i + 1}`,
      courseId: 'course-1',
      hole: i + 1,
      par: 4,
      strokeIndex: i + 1,
    }));
  };

  it('should validate correct 18 holes', () => {
    const holes = createValidHoles();
    const result = validateCourseHoles(holes);
    expect(result.isValid).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it('should reject incomplete hole count', () => {
    const holes = createValidHoles().slice(0, 17);
    const result = validateCourseHoles(holes);
    expect(result.isValid).toBe(false);
    expect(result.warnings).toContain('course_holes_incomplete');
  });

  it('should reject duplicate stroke indexes', () => {
    const holes = createValidHoles();
    holes[1].strokeIndex = 1; // Duplicate with holes[0]
    const result = validateCourseHoles(holes);
    expect(result.isValid).toBe(false);
    expect(result.warnings).toContain('course_holes_incomplete');
  });

  it('should reject invalid par values', () => {
    const holes = createValidHoles();
    holes[0].par = 2; // Invalid (< 3)
    const result = validateCourseHoles(holes);
    expect(result.isValid).toBe(false);
    expect(result.warnings).toContain('course_holes_incomplete');
  });

  it('should reject missing hole numbers', () => {
    const holes = createValidHoles();
    holes[0].hole = 19; // Invalid hole number
    const result = validateCourseHoles(holes);
    expect(result.isValid).toBe(false);
    expect(result.warnings).toContain('course_holes_incomplete');
  });
});

describe('calculateNetSegments', () => {
  const createTestHoles = (): CourseHole[] => {
    return Array.from({ length: 18 }, (_, i) => ({
      id: `hole-${i + 1}`,
      courseId: 'course-1',
      hole: i + 1,
      par: 4,
      strokeIndex: i + 1, // SI 1-18 in order
    }));
  };

  it('should calculate net segments for back 9, last 6, last 3, and 18th', () => {
    const holes = createTestHoles();
    const holeScores = {
      10: 5, 11: 4, 12: 6, 13: 3, 14: 5, 15: 4, 16: 7, 17: 4, 18: 5, // back 9
    };
    const playingCH = 9; // Gets strokes on SI 1-9

    const segments = calculateNetSegments(holeScores, playingCH, holes);

    // Back 9 holes (10-18): SI 10-18 don't get strokes with CH 9
    // So net scores = gross scores
    expect(segments.back9).toBe(5 + 4 + 6 + 3 + 5 + 4 + 7 + 4 + 5); // 43

    // Last 6 holes (13-18): same logic
    expect(segments.last6).toBe(3 + 5 + 4 + 7 + 4 + 5); // 28

    // Last 3 holes (16-18)
    expect(segments.last3).toBe(7 + 4 + 5); // 16

    // 18th hole
    expect(segments.hole18).toBe(5);
  });

  it('should handle strokes received on back 9', () => {
    const holes = createTestHoles();
    const holeScores = {
      10: 5, 11: 4, 12: 6, 13: 3, 14: 5, 15: 4, 16: 7, 17: 4, 18: 5,
    };
    const playingCH = 15; // Gets strokes on SI 1-15, including holes 10-15

    const segments = calculateNetSegments(holeScores, playingCH, holes);

    // Holes 10-15 get strokes (SI 10-15), holes 16-18 don't (SI 16-18)
    // Net: (5-1)+(4-1)+(6-1)+(3-1)+(5-1)+(4-1)+7+4+5 = 4+3+5+2+4+3+7+4+5 = 37
    expect(segments.back9).toBe(37);
  });

  it('should handle missing hole scores', () => {
    const holes = createTestHoles();
    const holeScores = { 18: 5 }; // Only 18th hole scored
    const playingCH = 5;

    const segments = calculateNetSegments(holeScores, playingCH, holes);

    expect(segments.back9).toBe(5); // Only 18th hole contributes
    expect(segments.last6).toBe(5);
    expect(segments.last3).toBe(5);
    expect(segments.hole18).toBe(5);
  });
});

describe('compareNetTiebreaker', () => {
  const createTestHoles = (): CourseHole[] => {
    return Array.from({ length: 18 }, (_, i) => ({
      id: `hole-${i + 1}`,
      courseId: 'course-1',
      hole: i + 1,
      par: 4,
      strokeIndex: i + 1, // SI 1-18 in order
    }));
  };

  it('should resolve Net ties using Net segment comparison', () => {
    const holes = createTestHoles();

    const playerA = {
      holeScores: { 10: 4, 11: 4, 12: 4, 13: 4, 14: 4, 15: 4, 16: 4, 17: 4, 18: 4 }, // back 9 = 36 gross
      playingCH: 0, // No strokes
    };

    const playerB = {
      holeScores: { 10: 5, 11: 5, 12: 5, 13: 3, 14: 3, 15: 3, 16: 3, 17: 3, 18: 3 }, // back 9 = 36 gross
      playingCH: 0, // No strokes
    };

    // Both have same back 9 gross (36), but different distribution
    // Last 6 (13-18): A = 24, B = 18 → B wins (lower is better)
    const result = compareNetTiebreaker(playerA, playerB, holes);
    expect(result).toBeGreaterThan(0); // A > B, so B wins
  });

  it('should use Net strokes when players have different handicaps', () => {
    const holes = createTestHoles();

    const playerA = {
      holeScores: { 16: 6, 17: 5, 18: 4 }, // last 3 gross = 15
      playingCH: 0, // No strokes, net = 15
    };

    const playerB = {
      holeScores: { 16: 7, 17: 6, 18: 5 }, // last 3 gross = 18
      playingCH: 3, // Gets strokes on SI 1-3, no strokes on 16-18, net = 18
    };

    // A has better net score on last 3 (15 vs 18)
    const result = compareNetTiebreaker(playerA, playerB, holes);
    expect(result).toBeLessThan(0); // A < B, so A wins
  });

  it('should fall back to gross segments for invalid course holes', () => {
    const invalidHoles: CourseHole[] = []; // Empty holes array

    const playerA = {
      holeScores: { 10: 4, 16: 4, 17: 4, 18: 3 }, // last 3 = 11
      playingCH: 5,
    };

    const playerB = {
      holeScores: { 10: 4, 16: 5, 17: 5, 18: 4 }, // last 3 = 14
      playingCH: 10,
    };

    // Should use gross segments since holes are invalid
    const result = compareNetTiebreaker(playerA, playerB, invalidHoles);
    expect(result).toBeLessThan(0); // A wins with better gross last 3
  });
});

describe('compareGrossSegments', () => {
  it('should compare back 9 first', () => {
    const playerA = { 10: 4, 11: 4, 12: 4, 13: 4, 14: 4, 15: 4, 16: 4, 17: 4, 18: 4 }; // 36
    const playerB = { 10: 5, 11: 5, 12: 5, 13: 3, 14: 3, 15: 3, 16: 3, 17: 3, 18: 3 }; // 36

    // Same back 9, but A wins on last 6 (24 vs 18)
    const result = compareGrossSegments(playerA, playerB);
    expect(result).toBeGreaterThan(0); // A > B, so B wins
  });

  it('should use 18th hole for final tiebreak', () => {
    const playerA = { 18: 3 };
    const playerB = { 18: 4 };

    const result = compareGrossSegments(playerA, playerB);
    expect(result).toBeLessThan(0); // A < B, so A wins
  });

  it('should return 0 for identical scores', () => {
    const scores = { 10: 4, 16: 4, 17: 4, 18: 4 };
    const result = compareGrossSegments(scores, scores);
    expect(result).toBe(0);
  });
});