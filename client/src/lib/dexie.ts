import Dexie, { type EntityTable } from 'dexie';

// Score queue item for offline storage
interface ScoreQueueItem {
  id?: number;
  entryId: string;
  hole: number;
  strokes: number;
  clientUpdatedAt: Date; // Local timestamp when user made change
  synced?: boolean;
}

interface SyncedScore {
  id?: number;
  entryId: string;
  hole: number;
  strokes: number;
  clientUpdatedAt: Date;
  serverUpdatedAt: Date;
}

class GolfDatabase extends Dexie {
  scoreQueue!: EntityTable<ScoreQueueItem, 'id'>;
  syncedScores!: EntityTable<SyncedScore, 'id'>;

  constructor() {
    super('GolfPWA');
    
    this.version(2).stores({
      scoreQueue: '++id, entryId, hole, clientUpdatedAt, synced',
      syncedScores: '++id, [entryId+hole], entryId, hole, clientUpdatedAt'
    }).upgrade(async trans => {
      // Handle schema migration if needed
      await trans.table('scoreQueue').toCollection().modify((item: any) => {
        if (item.timestamp && !item.clientUpdatedAt) {
          item.clientUpdatedAt = item.timestamp;
          delete item.timestamp;
        }
      });
    });
  }
}

export const db = new GolfDatabase();

let isFlushingQueue = false;

/**
 * Queue a score update for offline-first scoring
 */
export async function queueScoreUpdate(params: { entryId: string; hole: number; strokes: number }) {
  const { entryId, hole, strokes } = params;
  const now = new Date();
  
  // Remove any existing queue item for this entry/hole to avoid duplicates
  await db.scoreQueue.where({ entryId, hole }).delete();
  
  // Add new queue item
  await db.scoreQueue.add({
    entryId,
    hole,
    strokes,
    clientUpdatedAt: now,
    synced: false
  });
  
  console.log(`Queued score: entry ${entryId}, hole ${hole}, strokes ${strokes}`);
}

/**
 * Get count of pending sync items
 */
export async function getPendingSyncCount(): Promise<number> {
  return await db.scoreQueue.where('synced').equals(0).count();
}

/**
 * Check if queue flush is currently in progress
 */
export function isFlushInProgress(): boolean {
  return isFlushingQueue;
}

/**
 * Flush pending score updates to server
 */
export async function flushScoreQueue(onRefetchNeeded?: () => Promise<void>): Promise<void> {
  if (isFlushingQueue || !navigator.onLine) {
    return;
  }
  
  isFlushingQueue = true;
  console.log('Starting queue flush...');
  
  try {
    const pendingItems = await db.scoreQueue.where('synced').equals(0).toArray();
    
    if (pendingItems.length === 0) {
      console.log('No pending items to sync');
      return;
    }
    
    console.log(`Flushing ${pendingItems.length} pending score updates`);
    let refetchNeeded = false;
    
    // Process items individually to handle Last-Write-Wins properly
    for (const item of pendingItems) {
      try {
        const response = await fetch('/api/scores', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            entryId: item.entryId,
            hole: item.hole,
            strokes: item.strokes,
            clientUpdatedAt: item.clientUpdatedAt.toISOString()
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          
          if (result.status === 'accepted') {
            console.log(`Score accepted: entry ${item.entryId}, hole ${item.hole}`);
            // Remove from queue
            await db.scoreQueue.delete(item.id!);
          } else if (result.status === 'ignored') {
            console.log(`Score ignored (stale): entry ${item.entryId}, hole ${item.hole}`);
            // Remove from queue and mark for refetch
            await db.scoreQueue.delete(item.id!);
            refetchNeeded = true;
          }
        } else {
          console.error(`Failed to sync score for entry ${item.entryId}, hole ${item.hole}:`, response.status);
          // Keep in queue for retry
        }
      } catch (error) {
        console.error(`Error syncing score for entry ${item.entryId}, hole ${item.hole}:`, error);
        // Keep in queue for retry
      }
    }
    
    // If any scores were ignored due to staleness, trigger refetch
    if (refetchNeeded && onRefetchNeeded) {
      console.log('Triggering refetch due to stale scores');
      await onRefetchNeeded();
    }
    
  } catch (error) {
    console.error('Error during queue flush:', error);
  } finally {
    isFlushingQueue = false;
    console.log('Queue flush completed');
  }
}

export type { ScoreQueueItem, SyncedScore };