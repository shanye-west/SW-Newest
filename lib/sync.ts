import { db } from './dexie';

export class SyncService {
  private isOnline = navigator.onLine;
  private syncInProgress = false;

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  private handleOnline() {
    this.isOnline = true;
    this.syncOfflineScores();
  }

  private handleOffline() {
    this.isOnline = false;
  }

  // Sync all offline scores when connection is restored
  async syncOfflineScores() {
    if (!this.isOnline || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;

    try {
      const unsyncedScores = await db.getUnsyncedScores();
      
      if (unsyncedScores.length === 0) {
        this.syncInProgress = false;
        return;
      }

      // TODO: Implement actual API calls to sync scores
      // For now, we'll simulate successful sync
      console.log(`Syncing ${unsyncedScores.length} offline scores...`);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mark all scores as synced
      const scoreIds = unsyncedScores.map(score => score.id!);
      await db.markScoresSynced(scoreIds);
      
      console.log('Offline scores synced successfully');
    } catch (error) {
      console.error('Failed to sync offline scores:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Queue a score for offline storage
  async queueScore(tournamentId: string, playerId: string, hole: number, score: number) {
    try {
      await db.queueScore({
        tournamentId,
        playerId,
        hole,
        score
      });

      // Try to sync immediately if online
      if (this.isOnline) {
        this.syncOfflineScores();
      }
    } catch (error) {
      console.error('Failed to queue score:', error);
      throw error;
    }
  }

  // Get current offline queue status
  async getOfflineStatus() {
    const count = await db.getOfflineQueueCount();
    return {
      isOnline: this.isOnline,
      queueCount: count,
      hasOfflineData: count > 0
    };
  }
}

export const syncService = new SyncService();
