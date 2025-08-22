import { describe, it, expect } from 'vitest';

// Define the utility functions here for testing
// In a real implementation, these would be imported from a utilities file

interface PlayerResult {
  playerName: string;
  grossTotal?: number;
  netTotal?: number;
  skinsCount?: number;
  skinsPayout?: number;
  position?: number;
  tiebreaker?: string;
}

type SectionType = 'gross' | 'net' | 'skins';

interface RowChange {
  type: 'up' | 'down' | 'none';
  fadeOut?: boolean;
}

function diffRows(prev: PlayerResult[], next: PlayerResult[]): Map<string, RowChange> {
  const changes = new Map<string, RowChange>();
  
  if (!prev.length) {
    next.forEach(player => changes.set(player.playerName, { type: 'none' }));
    return changes;
  }
  
  const prevMap = new Map(prev.map((p, idx) => [p.playerName, idx]));
  
  next.forEach((player, currentIdx) => {
    const previousIdx = prevMap.get(player.playerName);
    if (previousIdx === undefined) {
      changes.set(player.playerName, { type: 'none' });
    } else if (previousIdx > currentIdx) {
      changes.set(player.playerName, { type: 'up' });
    } else if (previousIdx < currentIdx) {
      changes.set(player.playerName, { type: 'down' });
    } else {
      changes.set(player.playerName, { type: 'none' });
    }
  });
  
  return changes;
}

function rotate(currentIndex: number, enabledSections: SectionType[]): number {
  if (enabledSections.length === 0) return 0;
  return (currentIndex + 1) % enabledSections.length;
}

describe('Kiosk Utility Functions', () => {
  describe('rotate', () => {
    it('should return 0 for empty enabled sections', () => {
      expect(rotate(0, [])).toBe(0);
      expect(rotate(5, [])).toBe(0);
    });

    it('should rotate through single section', () => {
      expect(rotate(0, ['gross'])).toBe(0);
      expect(rotate(5, ['gross'])).toBe(0);
    });

    it('should rotate through multiple sections', () => {
      const sections: SectionType[] = ['gross', 'net', 'skins'];
      expect(rotate(0, sections)).toBe(1);
      expect(rotate(1, sections)).toBe(2);
      expect(rotate(2, sections)).toBe(0);
    });

    it('should handle two sections', () => {
      const sections: SectionType[] = ['gross', 'net'];
      expect(rotate(0, sections)).toBe(1);
      expect(rotate(1, sections)).toBe(0);
    });

    it('should normalize negative indices', () => {
      const sections: SectionType[] = ['gross', 'net'];
      const nextIndex = rotate(-1, sections);
      expect(nextIndex).toBeGreaterThanOrEqual(0);
      expect(nextIndex).toBeLessThan(sections.length);
    });
  });

  describe('diffRows', () => {
    it('should mark all players as none for empty previous array', () => {
      const prev: PlayerResult[] = [];
      const next: PlayerResult[] = [
        { playerName: 'Alice', grossTotal: 72 },
        { playerName: 'Bob', grossTotal: 75 }
      ];

      const changes = diffRows(prev, next);
      
      expect(changes.get('Alice')).toEqual({ type: 'none' });
      expect(changes.get('Bob')).toEqual({ type: 'none' });
    });

    it('should detect position improvements (up)', () => {
      const prev: PlayerResult[] = [
        { playerName: 'Alice', grossTotal: 72 },
        { playerName: 'Bob', grossTotal: 75 },
        { playerName: 'Charlie', grossTotal: 78 }
      ];
      const next: PlayerResult[] = [
        { playerName: 'Bob', grossTotal: 74 },    // moved from index 1 to 0 (up)
        { playerName: 'Alice', grossTotal: 72 },  // moved from index 0 to 1 (down)
        { playerName: 'Charlie', grossTotal: 78 } // stayed at index 2 (none)
      ];

      const changes = diffRows(prev, next);
      
      expect(changes.get('Bob')).toEqual({ type: 'up' });
      expect(changes.get('Alice')).toEqual({ type: 'down' });
      expect(changes.get('Charlie')).toEqual({ type: 'none' });
    });

    it('should detect position declines (down)', () => {
      const prev: PlayerResult[] = [
        { playerName: 'Alice', grossTotal: 72 },
        { playerName: 'Bob', grossTotal: 75 }
      ];
      const next: PlayerResult[] = [
        { playerName: 'Bob', grossTotal: 74 },
        { playerName: 'Alice', grossTotal: 76 }
      ];

      const changes = diffRows(prev, next);
      
      expect(changes.get('Bob')).toEqual({ type: 'up' });
      expect(changes.get('Alice')).toEqual({ type: 'down' });
    });

    it('should handle new players not in previous array', () => {
      const prev: PlayerResult[] = [
        { playerName: 'Alice', grossTotal: 72 }
      ];
      const next: PlayerResult[] = [
        { playerName: 'Alice', grossTotal: 72 },
        { playerName: 'Bob', grossTotal: 75 }
      ];

      const changes = diffRows(prev, next);
      
      expect(changes.get('Alice')).toEqual({ type: 'none' });
      expect(changes.get('Bob')).toEqual({ type: 'none' });
    });

    it('should handle no changes', () => {
      const prev: PlayerResult[] = [
        { playerName: 'Alice', grossTotal: 72 },
        { playerName: 'Bob', grossTotal: 75 }
      ];
      const next: PlayerResult[] = [
        { playerName: 'Alice', grossTotal: 72 },
        { playerName: 'Bob', grossTotal: 75 }
      ];

      const changes = diffRows(prev, next);
      
      expect(changes.get('Alice')).toEqual({ type: 'none' });
      expect(changes.get('Bob')).toEqual({ type: 'none' });
    });

    it('should handle complex position shuffles', () => {
      const prev: PlayerResult[] = [
        { playerName: 'Alice', grossTotal: 72 },   // index 0
        { playerName: 'Bob', grossTotal: 75 },     // index 1
        { playerName: 'Charlie', grossTotal: 78 }, // index 2
        { playerName: 'Dave', grossTotal: 80 }     // index 3
      ];
      const next: PlayerResult[] = [
        { playerName: 'Charlie', grossTotal: 76 }, // moved from index 2 to 0 (up)
        { playerName: 'Alice', grossTotal: 72 },   // moved from index 0 to 1 (down)
        { playerName: 'Dave', grossTotal: 79 },    // moved from index 3 to 2 (up)
        { playerName: 'Bob', grossTotal: 81 }      // moved from index 1 to 3 (down)
      ];

      const changes = diffRows(prev, next);
      
      expect(changes.get('Charlie')).toEqual({ type: 'up' });
      expect(changes.get('Alice')).toEqual({ type: 'down' });
      expect(changes.get('Dave')).toEqual({ type: 'up' });
      expect(changes.get('Bob')).toEqual({ type: 'down' });
    });
  });
});