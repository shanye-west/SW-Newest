import Dexie, { Table } from 'dexie';

export interface OfflineScore {
  id?: number;
  tournamentId: string;
  playerId: string;
  hole: number;
  score: number;
  timestamp: number;
  synced: boolean;
}

export interface Tournament {
  id?: number;
  passcode: string;
  name: string;
  course: string;
  date: string;
  playerCount: number;
  isActive: boolean;
}

export interface Player {
  id?: number;
  name: string;
  handicapIndex: number;
  courseHandicap?: number;
}

export class GolfDatabase extends Dexie {
  offlineScores!: Table<OfflineScore>;
  tournaments!: Table<Tournament>;
  players!: Table<Player>;

  constructor() {
    super('SWMonthlyGolf');
    
    this.version(1).stores({
      offlineScores: '++id, tournamentId, playerId, hole, timestamp, synced',
      tournaments: '++id, passcode, name, isActive',
      players: '++id, name, handicapIndex'
    });
  }

  // Queue a score for offline storage
  async queueScore(score: Omit<OfflineScore, 'id' | 'timestamp' | 'synced'>) {
    return await this.offlineScores.add({
      ...score,
      timestamp: Date.now(),
      synced: false
    });
  }

  // Get all unsynced scores
  async getUnsyncedScores() {
    return await this.offlineScores.where('synced').equals(false).toArray();
  }

  // Mark scores as synced
  async markScoresSynced(scoreIds: number[]) {
    if (scoreIds.length === 0) {
      return 0;
    }
    return await this.offlineScores
      .where('id')
      .anyOf(scoreIds)
      .modify({ synced: true });
  }

  // Get offline queue count
  async getOfflineQueueCount() {
    return await this.offlineScores.where('synced').equals(false).count();
  }

  // Store tournament data
  async storeTournament(tournament: Omit<Tournament, 'id'>) {
    return await this.tournaments.add(tournament);
  }

  // Get tournament by passcode
  async getTournamentByPasscode(passcode: string) {
    return await this.tournaments.where('passcode').equals(passcode).first();
  }
}

export const db = new GolfDatabase();
