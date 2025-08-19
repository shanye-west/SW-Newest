// client/src/lib/dexie.ts
import Dexie, { Table } from "dexie";

export interface ScoreUpdate {
  entryId: string;
  hole: number; // 1..18
  strokes: number; // >= 1
  clientUpdatedAt: number; // ms since epoch
}

// One DB class, one instance (guarded for Vite HMR)
class ScoreDB extends Dexie {
  scoreQueue!: Table<ScoreUpdate & { id?: number }, number>;
  constructor() {
    super("sw-monthly-golf");
    this.version(1).stores({
      // ++id = autoincrement; indexes help ordering by timestamp
      scoreQueue: "++id, entryId, hole, clientUpdatedAt",
    });
  }
}
const g = globalThis as any;
export const db: ScoreDB = g.__SW_DB ?? (g.__SW_DB = new ScoreDB());

/** Queue a score change to be synced later */
export async function queueScoreUpdate(u: {
  entryId: string;
  hole: number;
  strokes: number;
  clientUpdatedAt?: number;
}) {
  const item: ScoreUpdate = {
    entryId: u.entryId,
    hole: u.hole,
    strokes: u.strokes,
    clientUpdatedAt: u.clientUpdatedAt ?? Date.now(),
  };
  await db.scoreQueue.add(item);
  return item;
}

/** Try to flush queued scores to the server using LWW */
export async function flushScoreQueue() {
  const items = await db.scoreQueue.orderBy("clientUpdatedAt").toArray();
  for (const it of items) {
    try {
      const res = await fetch("/api/hole-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(it),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && (json.status === "accepted" || json.status === "ignored")) {
        // remove this item from the queue (synced or rejected as stale)
        await db.scoreQueue
          .where({ entryId: it.entryId, hole: it.hole, clientUpdatedAt: it.clientUpdatedAt })
          .delete();
      } else {
        // invalid or server error — stop and retry later
        break;
      }
    } catch {
      // offline — stop and retry later
      break;
    }
  }
}

/** Count items waiting to sync */
export async function pendingCount(): Promise<number> {
  return db.scoreQueue.count();
}

/* ---------- Back-compat aliases (fixes “does not provide an export named 'getPendingSyncCount'”) ---------- */

/** Old name used elsewhere in your app */
export async function getPendingSyncCount(): Promise<number> {
  return pendingCount();
}

/** If any code imports `flushQueue`, keep it working */
export async function flushQueue() {
  return flushScoreQueue();
}
