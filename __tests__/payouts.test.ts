import { describe, it, expect } from 'vitest';
import { roundToCents, calculateSkinsPayouts, formatCurrency } from '../lib/payouts';

describe('Payouts', () => {
  describe('roundToCents', () => {
    it('should round 10/3 to 3.33', () => {
      expect(roundToCents(10 / 3)).toBe(3.33);
    });

    it('should handle 0.1 + 0.2 = 0.3', () => {
      expect(roundToCents(0.1 + 0.2)).toBe(0.3);
    });

    it('should round 0.125 to 0.13', () => {
      expect(roundToCents(0.125)).toBe(0.13);
    });

    it('should round 0.124 to 0.12', () => {
      expect(roundToCents(0.124)).toBe(0.12);
    });
  });

  describe('calculateSkinsPayouts', () => {
    it('should calculate payouts correctly for pot=$180, 9 skins', () => {
      const result = calculateSkinsPayouts({
        potAmount: 18000, // $180 in cents
        totalSkins: 9,
        playerSkinCounts: {
          'entry1': 2,
          'entry2': 3,
          'entry3': 4
        }
      });

      expect(result.payoutPerSkin).toBe(20);
      expect(result.perPlayerPayouts['entry1']).toBe(40);
      expect(result.perPlayerPayouts['entry2']).toBe(60);
      expect(result.perPlayerPayouts['entry3']).toBe(80);
    });

    it('should return zero payouts when no skins', () => {
      const result = calculateSkinsPayouts({
        potAmount: 10000, // $100 in cents
        totalSkins: 0,
        playerSkinCounts: {
          'entry1': 0,
          'entry2': 0
        }
      });

      expect(result.payoutPerSkin).toBe(0);
      expect(result.perPlayerPayouts['entry1']).toBe(0);
      expect(result.perPlayerPayouts['entry2']).toBe(0);
    });

    it('should handle rounding for pot=$100, 6 skins', () => {
      const result = calculateSkinsPayouts({
        potAmount: 10000, // $100 in cents
        totalSkins: 6,
        playerSkinCounts: {
          'entry1': 3,
          'entry2': 2,
          'entry3': 1
        }
      });

      expect(result.payoutPerSkin).toBe(16.67);
      expect(result.perPlayerPayouts['entry1']).toBe(50.01);
      expect(result.perPlayerPayouts['entry2']).toBe(33.34);
      expect(result.perPlayerPayouts['entry3']).toBe(16.67);
    });
  });

  describe('formatCurrency', () => {
    it('should format currency with 2 decimal places', () => {
      expect(formatCurrency(123.456)).toBe('$123.46');
    });

    it('should format zero correctly', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should format small amounts correctly', () => {
      expect(formatCurrency(0.01)).toBe('$0.01');
    });
  });
});