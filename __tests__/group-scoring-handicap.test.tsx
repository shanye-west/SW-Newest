/**
 * Tests for Group Scoring page handicap dots display
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import { strokesReceived, formatParRow, formatSIRow, isValidSIPermutation } from '../shared/handicapNet';

describe('Group Scoring Handicap Utilities', () => {
  it('should show correct number of dots for playingCH 5', () => {
    // Test 5 holes should get dots (SI 1-5)
    const testHoles = Array.from({ length: 18 }, (_, i) => ({
      hole: i + 1,
      par: 4,
      strokeIndex: i + 1, // SI 1-18 in order
    }));

    let dotsCount = 0;
    for (let i = 0; i < 18; i++) {
      const received = strokesReceived(5, testHoles[i].strokeIndex);
      if (received > 0) dotsCount++;
    }

    expect(dotsCount).toBe(5);
  });

  it('should format par row correctly', () => {
    const holes = [
      { hole: 1, par: 4 },
      { hole: 2, par: 5 },
      { hole: 3, par: 3 },
    ];

    const parRow = formatParRow(holes);
    expect(parRow[0]).toBe(4);
    expect(parRow[1]).toBe(5);
    expect(parRow[2]).toBe(3);
    expect(parRow[3]).toBe(4); // Default
  });

  it('should validate SI permutation correctly', () => {
    const validSI = Array.from({ length: 18 }, (_, i) => i + 1);
    const invalidSI = Array.from({ length: 18 }, () => 1); // All 1s

    expect(isValidSIPermutation(validSI)).toBe(true);
    expect(isValidSIPermutation(invalidSI)).toBe(false);
  });

  it('should handle invalid course holes gracefully', () => {
    const incompleteCourseHoles: any[] = []; // Empty array
    
    // Should not crash when course holes are incomplete
    expect(() => formatParRow(incompleteCourseHoles)).not.toThrow();
    expect(() => formatSIRow(incompleteCourseHoles)).not.toThrow();
    expect(() => isValidSIPermutation([])).not.toThrow();
  });
});