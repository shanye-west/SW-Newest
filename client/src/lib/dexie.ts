import Dexie, { type EntityTable } from 'dexie';

// Score queue item for offline storage
interface ScoreQueueItem {
  id?: number;
  entryId: string;
  hole: number;
  strokes: number;
  timestamp: Date;
  synced?: boolean;
}

interface SyncedScore {
  id?: number;
  entryId: string;
  hole: number;
  strokes: number;
  updatedAt: Date;
  serverUpdatedAt: Date;
}

class GolfDatabase extends Dexie {
  scoreQueue!: EntityTable<ScoreQueueItem, 'id'>;
  syncedScores!: EntityTable<SyncedScore, 'id'>;

  constructor() {
    super('GolfPWA');
    
    this.version(1).stores({
      scoreQueue: '++id, entryId, hole, timestamp, synced',
      syncedScores: '++id, [entryId+hole], entryId, hole, updatedAt'
    });
  }
}

export const db = new GolfDatabase();

export type { ScoreQueueItem, SyncedScore };