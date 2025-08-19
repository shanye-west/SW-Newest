import { describe, it, expect } from 'vitest';
import {
  roundHalfUp,
  calculateCourseHandicap,
  calculatePlayingHandicap,
  calculateHandicaps,
  recomputeEntryHandicaps
} from '../lib/handicap';

describe('Handicap Calculations', () => {
  describe('roundHalfUp', () => {
    it('should round .5 UP to next integer', () => {
      expect(roundHalfUp(1.5)).toBe(2);
      expect(roundHalfUp(2.5)).toBe(3);
      expect(roundHalfUp(-1.5)).toBe(-1);
    });

    it('should round normally for non-.5 values', () => {
      expect(roundHalfUp(1.4)).toBe(1);
      expect(roundHalfUp(1.6)).toBe(2);
      expect(roundHalfUp(2.3)).toBe(2);
      expect(roundHalfUp(2.7)).toBe(3);
    });

    it('should handle negative values correctly', () => {
      expect(roundHalfUp(-1.4)).toBe(-1);
      expect(roundHalfUp(-1.6)).toBe(-2);
      expect(roundHalfUp(-2.5)).toBe(-2);
    });
  });

  describe('calculateCourseHandicap', () => {
    it('should calculate CH correctly with basic example', () => {
      // HI: 10, Slope: 113, Rating: 72, Par: 72
      // CH = round(10 * (113/113) + (72-72)) = round(10 + 0) = 10
      expect(calculateCourseHandicap(10, 113, 72, 72)).toBe(10);
    });

    it('should handle course rating above par', () => {
      // HI: 10, Slope: 130, Rating: 74.5, Par: 72
      // CH = round(10 * (130/113) + (74.5-72)) = round(11.504 + 2.5) = round(14.004) = 14
      expect(calculateCourseHandicap(10, 130, 74.5, 72)).toBe(14);
    });

    it('should handle course rating below par (easier course)', () => {
      // HI: 10, Slope: 100, Rating: 70, Par: 72
      // CH = round(10 * (100/113) + (70-72)) = round(8.849 - 2) = round(6.849) = 7
      expect(calculateCourseHandicap(10, 100, 70, 72)).toBe(7);
    });

    it('should round at .5 correctly', () => {
      // Create scenario where calculation results in exactly .5
      // HI: 12, Slope: 113, Rating: 72.5, Par: 72
      // CH = round(12 * 1 + 0.5) = round(12.5) = 13
      expect(calculateCourseHandicap(12, 113, 72.5, 72)).toBe(13);
    });

    it('should cap CH at 18 maximum', () => {
      // High handicap scenario that would exceed 18
      // HI: 25, Slope: 140, Rating: 76, Par: 72
      // CH = round(25 * (140/113) + (76-72)) = round(30.973 + 4) = round(34.973) = 35
      // But capped at 18
      expect(calculateCourseHandicap(25, 140, 76, 72)).toBe(18);
    });

    it('should handle negative handicaps', () => {
      // Scratch/plus handicap player
      // HI: -2, Slope: 113, Rating: 72, Par: 72
      // CH = round(-2 * 1 + 0) = -2
      expect(calculateCourseHandicap(-2, 113, 72, 72)).toBe(-2);
    });
  });

  describe('calculatePlayingHandicap', () => {
    it('should calculate playing CH with 100% allowance', () => {
      expect(calculatePlayingHandicap(12, 100)).toBe(12);
    });

    it('should calculate playing CH with 85% allowance', () => {
      // CH: 12, Allowance: 85%
      // playingCH = round(12 * 0.85) = round(10.2) = 10
      expect(calculatePlayingHandicap(12, 85)).toBe(10);
    });

    it('should handle .5 rounding correctly', () => {
      // CH: 13, Allowance: 85%
      // playingCH = round(13 * 0.85) = round(11.05) = 11
      expect(calculatePlayingHandicap(13, 85)).toBe(11);
      
      // CH: 14, Allowance: 85%  
      // playingCH = round(14 * 0.85) = round(11.9) = 12
      expect(calculatePlayingHandicap(14, 85)).toBe(12);
    });

    it('should handle different allowance percentages', () => {
      expect(calculatePlayingHandicap(10, 90)).toBe(9); // round(9.0) = 9
      expect(calculatePlayingHandicap(10, 80)).toBe(8); // round(8.0) = 8
      expect(calculatePlayingHandicap(10, 75)).toBe(8); // round(7.5) = 8
    });
  });

  describe('calculateHandicaps', () => {
    it('should calculate both handicaps correctly', () => {
      const result = calculateHandicaps(12.5, 142, 74.5, 72, 100);
      
      // CH = round(12.5 * (142/113) + (74.5-72)) = round(15.708 + 2.5) = round(18.208) = 18
      // playingCH = round(18 * 1.0) = 18
      expect(result.courseHandicap).toBe(18);
      expect(result.playingCH).toBe(18);
    });

    it('should use default 100% allowance', () => {
      const result = calculateHandicaps(10, 113, 72, 72);
      expect(result.courseHandicap).toBe(10);
      expect(result.playingCH).toBe(10);
    });

    it('should handle complex scenario with 85% allowance', () => {
      const result = calculateHandicaps(15.7, 125, 73.2, 72, 85);
      
      // CH = round(15.7 * (125/113) + (73.2-72)) = round(17.389 + 1.2) = round(18.589) = 19, capped to 18
      // playingCH = round(18 * 0.85) = round(15.3) = 15
      expect(result.courseHandicap).toBe(18);
      expect(result.playingCH).toBe(15);
    });
  });

  describe('recomputeEntryHandicaps', () => {
    it('should recompute when course changes', () => {
      // Original: HI 12, Old course: slope 113, rating 72, par 72, allowance 100
      // New course: slope 130, rating 74, par 72, allowance 100
      
      const result = recomputeEntryHandicaps(12, 130, 74, 72, 100);
      
      // New CH = round(12 * (130/113) + (74-72)) = round(13.805 + 2) = round(15.805) = 16
      // New playingCH = round(16 * 1.0) = 16
      expect(result.courseHandicap).toBe(16);
      expect(result.playingCH).toBe(16);
    });

    it('should recompute when net allowance changes', () => {
      const result = recomputeEntryHandicaps(12, 113, 72, 72, 85);
      
      // CH = round(12 * 1 + 0) = 12
      // playingCH = round(12 * 0.85) = round(10.2) = 10
      expect(result.courseHandicap).toBe(12);
      expect(result.playingCH).toBe(10);
    });
  });
});