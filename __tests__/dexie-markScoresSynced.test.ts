import { describe, it, expect, vi } from 'vitest';

vi.mock('dexie', () => {
  class Dexie {
    version() {
      return { stores: () => {} };
    }
  }
  return { default: Dexie, Table: class {} };
});

import { GolfDatabase } from '../lib/dexie';

describe('markScoresSynced', () => {
  it('updates synced flag for provided ids', async () => {
    const db = new GolfDatabase();
    db.offlineScores = {
      where: vi.fn().mockReturnThis(),
      anyOf: vi.fn().mockReturnThis(),
      modify: vi.fn().mockResolvedValue(2)
    } as any;

    const result = await db.markScoresSynced([1, 2]);

    expect(db.offlineScores.where).toHaveBeenCalledWith('id');
    expect(db.offlineScores.anyOf).toHaveBeenCalledWith([1, 2]);
    expect(db.offlineScores.modify).toHaveBeenCalledWith({ synced: true });
    expect(result).toBe(2);
  });

  it('returns 0 when no ids provided', async () => {
    const db = new GolfDatabase();
    db.offlineScores = {
      where: vi.fn(),
      anyOf: vi.fn(),
      modify: vi.fn()
    } as any;

    const result = await db.markScoresSynced([]);

    expect(result).toBe(0);
    expect(db.offlineScores.where).not.toHaveBeenCalled();
  });
});
