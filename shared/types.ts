// Golf tournament management types

export interface Tournament {
  id: string;
  name: string;
  course: string;
  date: string;
  passcode: string;
  organizerId: string;
  playerCount: number;
  isActive: boolean;
  netAllowance: number; // Default 100%
  createdAt: Date;
  updatedAt: Date;
}

export interface Player {
  id: string;
  name: string;
  handicapIndex: number; // HI only - CH computed later
  email?: string;
  createdAt: Date;
}

export interface Course {
  id: string;
  name: string;
  par: number;
  rating: number;
  slope: number;
  holes: Hole[];
  tees?: CourseTee[];
  createdAt: Date;
}

export interface CourseTee {
  id: string;
  courseId: string;
  name: string;
  rating: number;
  slope: number;
}

export interface Hole {
  number: number;
  par: number;
  yards: number;
  handicap: number;
}

export interface TournamentPlayer {
  tournamentId: string;
  playerId: string;
  courseHandicap: number; // Computed from HI
  isOrganizer: boolean;
  joinedAt: Date;
}

export interface Group {
  id: string;
  tournamentId: string;
  name: string;
  teeTime: Date;
  playerIds: string[];
  createdAt: Date;
}

export interface Score {
  id: string;
  tournamentId: string;
  playerId: string;
  hole: number;
  strokes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GameResult {
  type: 'gross_total' | 'net_total' | 'gross_skins';
  tournamentId: string;
  playerId: string;
  score: number;
  position: number;
  prize?: number;
}

// Handicap calculation utilities
export interface HandicapCalculation {
  handicapIndex: number;
  courseHandicap: number; // round(HI * (Slope/113) + (Rating - Par)), capped at 18
  playingHandicap: number; // CH * netAllowance
}

// Offline scoring queue
export interface OfflineScore {
  id: string;
  tournamentId: string;
  playerId: string;
  hole: number;
  strokes: number;
  timestamp: number;
  synced: boolean;
}

// Tiebreaker data for USGA last 9/6/3/1
export interface TiebreakerScores {
  playerId: string;
  total: number;
  last9: number;
  last6: number;
  last3: number;
  last1: number;
}

// Skins game result
export interface SkinResult {
  hole: number;
  winnerId?: string; // undefined if push
  winningScore: number;
  playersAtScore: string[]; // for displaying pushes
}

export type InsertTournament = Omit<Tournament, 'id' | 'createdAt' | 'updatedAt'>;
export type InsertPlayer = Omit<Player, 'id' | 'createdAt'>;
export type InsertCourse = Omit<Course, 'id' | 'createdAt'>;
export type InsertScore = Omit<Score, 'id' | 'createdAt' | 'updatedAt'>;
export type InsertGroup = Omit<Group, 'id' | 'createdAt'>;
