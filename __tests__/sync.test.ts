import { describe, it, expect } from 'vitest';
import { deriveSyncStatus, getSyncStatusText, getSyncStatusClasses } from '../client/src/lib/sync';

describe('Sync Status Utilities', () => {
  describe('deriveSyncStatus', () => {
    it('should return "synced" when online with empty queue and not flushing', () => {
      const result = deriveSyncStatus({
        online: true,
        queueLength: 0,
        isFlushing: false
      });
      expect(result).toBe('synced');
    });

    it('should return "offline" when offline regardless of queue or flushing state', () => {
      const result1 = deriveSyncStatus({
        online: false,
        queueLength: 0,
        isFlushing: false
      });
      const result2 = deriveSyncStatus({
        online: false,
        queueLength: 5,
        isFlushing: true
      });
      expect(result1).toBe('offline');
      expect(result2).toBe('offline');
    });

    it('should return "syncing" when online and flushing', () => {
      const result = deriveSyncStatus({
        online: true,
        queueLength: 0,
        isFlushing: true
      });
      expect(result).toBe('syncing');
    });

    it('should return "syncing" when online with pending queue items', () => {
      const result = deriveSyncStatus({
        online: true,
        queueLength: 3,
        isFlushing: false
      });
      expect(result).toBe('syncing');
    });

    it('should return "syncing" when online with queue items and flushing', () => {
      const result = deriveSyncStatus({
        online: true,
        queueLength: 2,
        isFlushing: true
      });
      expect(result).toBe('syncing');
    });
  });

  describe('getSyncStatusText', () => {
    it('should return correct text for each status', () => {
      expect(getSyncStatusText('synced')).toBe('All changes synced');
      expect(getSyncStatusText('syncing')).toBe('Syncing…');
      expect(getSyncStatusText('offline')).toBe('Offline – will sync');
    });
  });

  describe('getSyncStatusClasses', () => {
    it('should return correct CSS classes for each status', () => {
      const syncedClasses = getSyncStatusClasses('synced');
      const syncingClasses = getSyncStatusClasses('syncing');
      const offlineClasses = getSyncStatusClasses('offline');

      expect(syncedClasses).toContain('bg-green-100');
      expect(syncedClasses).toContain('text-green-800');
      
      expect(syncingClasses).toContain('bg-blue-100');
      expect(syncingClasses).toContain('text-blue-800');
      
      expect(offlineClasses).toContain('bg-orange-100');
      expect(offlineClasses).toContain('text-orange-800');
    });

    it('should include base classes for all status types', () => {
      const baseClassPattern = /inline-flex items-center px-2 py-1 rounded-full text-xs font-medium/;
      
      expect(getSyncStatusClasses('synced')).toMatch(baseClassPattern);
      expect(getSyncStatusClasses('syncing')).toMatch(baseClassPattern);
      expect(getSyncStatusClasses('offline')).toMatch(baseClassPattern);
    });
  });
});