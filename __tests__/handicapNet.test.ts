/**
 * Tests for handicap and net scoring utilities
 */

import { describe, it, expect } from 'vitest';
import {
  strokesReceived,
  formatParRow,
  formatSIRow,
  isValidSIPermutation,
} from '../shared/handicapNet';

describe('strokesReceived', () => {
  it('should return 0 for playing handicap 0', () => {
    expect(strokesReceived(0, 1)).toBe(0);
    expect(strokesReceived(0, 18)).toBe(0);
  });

  it('should distribute strokes correctly for playing handicap 5', () => {
    // With playingCH = 5, stroke indexes 1-5 should get 1 stroke, others 0
    for (let si = 1; si <= 5; si++) {
      expect(strokesReceived(5, si)).toBe(1);
    }
    for (let si = 6; si <= 18; si++) {
      expect(strokesReceived(5, si)).toBe(0);
    }
  });

  it('should give 1 stroke to all holes for playing handicap 18', () => {
    for (let si = 1; si <= 18; si++) {
      expect(strokesReceived(18, si)).toBe(1);
    }
  });

  it('should handle playing handicap > 18 correctly', () => {
    // playingCH = 22 = 18 + 4, so all holes get 1, plus SI 1-4 get another
    for (let si = 1; si <= 4; si++) {
      expect(strokesReceived(22, si)).toBe(2); // 1 + 1
    }
    for (let si = 5; si <= 18; si++) {
      expect(strokesReceived(22, si)).toBe(1); // 1 + 0
    }
  });
});

describe('formatParRow', () => {
  it('should format holes into par array', () => {
    const holes = [
      { hole: 1, par: 4 },
      { hole: 2, par: 5 },
      { hole: 3, par: 3 },
      { hole: 18, par: 4 }
    ];
    
    const result = formatParRow(holes);
    expect(result[0]).toBe(4); // Hole 1
    expect(result[1]).toBe(5); // Hole 2
    expect(result[2]).toBe(3); // Hole 3
    expect(result[17]).toBe(4); // Hole 18
    expect(result[3]).toBe(4); // Default for holes 4-17
  });

  it('should handle empty holes array', () => {
    const result = formatParRow([]);
    expect(result).toEqual(Array(18).fill(4));
  });
});

describe('formatSIRow', () => {
  it('should format holes into stroke index array', () => {
    const holes = [
      { hole: 1, strokeIndex: 7 },
      { hole: 2, strokeIndex: 15 },
      { hole: 18, strokeIndex: 1 }
    ];
    
    const result = formatSIRow(holes);
    expect(result[0]).toBe(7); // Hole 1
    expect(result[1]).toBe(15); // Hole 2
    expect(result[17]).toBe(1); // Hole 18
    expect(result[2]).toBe(1); // Default for other holes
  });
});

describe('isValidSIPermutation', () => {
  it('should validate correct permutation', () => {
    const validSI = Array.from({ length: 18 }, (_, i) => i + 1);
    expect(isValidSIPermutation(validSI)).toBe(true);
  });

  it('should reject incomplete arrays', () => {
    expect(isValidSIPermutation([1, 2, 3])).toBe(false);
    expect(isValidSIPermutation(Array(17).fill(1))).toBe(false);
  });

  it('should reject duplicate values', () => {
    const invalidSI = Array(18).fill(1);
    expect(isValidSIPermutation(invalidSI)).toBe(false);
  });

  it('should reject missing values', () => {
    const invalidSI = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19]; // Missing 18, has 19
    expect(isValidSIPermutation(invalidSI)).toBe(false);
  });
});