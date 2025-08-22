// Utility functions for kiosk mode

export interface PlayerResult {
  playerName: string;
  grossTotal?: number;
  netTotal?: number;
  skinsCount?: number;
  skinsPayout?: number;
  position?: number;
  tiebreaker?: string;
}

export type SectionType = 'gross' | 'net' | 'skins';

export interface RowChange {
  type: 'up' | 'down' | 'none';
  fadeOut?: boolean;
}

/**
 * Compare two arrays of player results and determine position changes
 * @param prev Previous player results array
 * @param next Current player results array
 * @returns Map of player names to their change indicators
 */
export function diffRows(prev: PlayerResult[], next: PlayerResult[]): Map<string, RowChange> {
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

/**
 * Calculate the next section index for rotation
 * @param currentIndex Current section index
 * @param enabledSections Array of enabled section types
 * @returns Next section index
 */
export function rotate(currentIndex: number, enabledSections: SectionType[]): number {
  const length = enabledSections.length;
  if (length === 0) return 0;
  // Normalize the current index to ensure it's within bounds before rotating
  const normalized = ((currentIndex % length) + length) % length;
  return (normalized + 1) % length;
}

/**
 * Format a section type into a display title
 * @param section Section type
 * @returns Formatted display title
 */
export function getSectionTitle(section: SectionType): string {
  switch (section) {
    case 'gross': return 'Gross Total';
    case 'net': return 'Net Total';
    case 'skins': return 'Skins';
    default: return section;
  }
}

/**
 * Default kiosk settings
 */
export const DEFAULT_KIOSK_SETTINGS = {
  sections: { gross: true, net: true, skins: true },
  rotationInterval: 8,
  rowsPerPage: 10,
  theme: 'auto' as const
};