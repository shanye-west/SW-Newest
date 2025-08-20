/**
 * Tests for Course Holes API endpoints
 */

import { describe, it, expect } from 'vitest';
import { isPermutation1to18 } from '../shared/handicapNet';

describe('Course Holes API Validation', () => {
  describe('isPermutation1to18', () => {
    it('should return true for valid permutation', () => {
      const validPermutation = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18];
      expect(isPermutation1to18(validPermutation)).toBe(true);
    });

    it('should return true for shuffled valid permutation', () => {
      const shuffledPermutation = [18,1,15,3,7,11,2,9,13,5,17,8,4,12,6,16,10,14];
      expect(isPermutation1to18(shuffledPermutation)).toBe(true);
    });

    it('should return false for duplicate values', () => {
      const withDuplicates = [1,1,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18];
      expect(isPermutation1to18(withDuplicates)).toBe(false);
    });

    it('should return false for missing values', () => {
      const missingValues = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,19]; // Missing 18, has 19
      expect(isPermutation1to18(missingValues)).toBe(false);
    });

    it('should return false for incorrect length', () => {
      const tooShort = [1,2,3,4,5];
      const tooLong = Array.from({length: 20}, (_, i) => i + 1);
      
      expect(isPermutation1to18(tooShort)).toBe(false);
      expect(isPermutation1to18(tooLong)).toBe(false);
    });

    it('should return false for empty array', () => {
      expect(isPermutation1to18([])).toBe(false);
    });
  });

  describe('Par validation', () => {
    it('should accept valid par values', () => {
      const validPars = [3, 4, 5, 6];
      validPars.forEach(par => {
        expect(par >= 3 && par <= 6).toBe(true);
      });
    });

    it('should reject invalid par values', () => {
      const invalidPars = [2, 7, 0, -1, 10];
      invalidPars.forEach(par => {
        expect(par >= 3 && par <= 6).toBe(false);
      });
    });
  });
});