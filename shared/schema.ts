// Drizzle schema for SW Monthly Golf PWA

import { text, integer, real, pgTable, unique, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Player table
export const players = pgTable("players", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  handicapIndex: real("handicap_index"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Course table
export const courses = pgTable("courses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  par: integer("par").notNull(),
  slope: integer("slope").notNull(),
  rating: real("rating").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// CourseHole table
export const courseHoles = pgTable("course_holes", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull(),
  hole: integer("hole").notNull(), // 1..18
  par: integer("par").notNull(), // 3..6
  strokeIndex: integer("stroke_index").notNull(), // 1..18 (unique within course)
}, (table) => ({
  courseHoleUnique: unique("course_hole_unique").on(table.courseId, table.hole),
  courseStrokeIndexUnique: unique("course_stroke_index_unique").on(table.courseId, table.strokeIndex),
}));

// Tournament table
export const tournaments = pgTable("tournaments", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  date: text("date").notNull(),
  courseId: text("course_id").notNull(),
  holes: integer("holes").notNull().default(18),
  netAllowance: integer("net_allowance").notNull().default(100),
  passcode: text("passcode").notNull(),
  potAmount: integer("pot_amount"),
  participantsForSkins: integer("participants_for_skins"),
  skinsCarry: boolean("skins_carry").notNull().default(false),
  grossPrize: integer("gross_prize"),
  netPrize: integer("net_prize"),
  isFinal: boolean("is_final").notNull().default(false),
  finalizedAt: timestamp("finalized_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Audit Events table
export const auditEvents = pgTable("audit_events", {
  id: text("id").primaryKey(),
  tournamentId: text("tournament_id").notNull(),
  type: text("type").notNull(), // "finalize" | "unlock"
  message: text("message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Group table
export const groups = pgTable("groups", {
  id: text("id").primaryKey(),
  tournamentId: text("tournament_id").notNull(),
  name: text("name").notNull(),
  teeTime: timestamp("tee_time"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Entry table
export const entries = pgTable("entries", {
  id: text("id").primaryKey(),
  tournamentId: text("tournament_id").notNull(),
  playerId: text("player_id").notNull(),
  courseHandicap: integer("course_handicap").notNull(),
  playingCH: integer("playing_ch").notNull(),
  groupId: text("group_id"),
  hasPaid: boolean("has_paid").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// HoleScore table
export const holeScores = pgTable("hole_scores", {
  id: text("id").primaryKey(),
  entryId: text("entry_id").notNull(),
  hole: integer("hole").notNull(), // 1-18
  strokes: integer("strokes").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas
export const insertPlayerSchema = createInsertSchema(players, {
  name: z.string().min(1, "Player name is required"),
  email: z.string().email().optional().or(z.literal("")),
  handicapIndex: z.number().min(0).max(54).optional(),
});

export const insertCourseSchema = createInsertSchema(courses, {
  name: z.string().min(1, "Course name is required"),
  par: z.number().int().min(60).max(80),
  slope: z.number().int().min(55).max(155),
  rating: z.number().min(60).max(80),
});

export const insertTournamentSchema = createInsertSchema(tournaments, {
  name: z.string().min(1, "Tournament name is required"),
  date: z.string().min(1, "Date is required"),
  courseId: z.string().min(1, "Course selection is required"),
  netAllowance: z.number().int().min(0).max(100),
  passcode: z.string().min(4, "Passcode must be at least 4 characters"),
  potAmount: z.number().int().min(0).optional(),
  participantsForSkins: z.number().int().min(1).optional(),
  grossPrize: z.number().int().min(0).optional(),
  netPrize: z.number().int().min(0).optional(),
});

export const insertGroupSchema = createInsertSchema(groups, {
  name: z.string().min(1, "Group name is required"),
  tournamentId: z.string().min(1, "Tournament ID is required"),
});

export const insertEntrySchema = createInsertSchema(entries, {
  tournamentId: z.string().min(1, "Tournament ID is required"),
  playerId: z.string().min(1, "Player ID is required"),
  courseHandicap: z.number().int().min(0).max(18),
  playingCH: z.number().int().min(0).max(18),
  hasPaid: z.boolean().optional(),
});

export const insertHoleScoreSchema = createInsertSchema(holeScores, {
  entryId: z.string().min(1, "Entry ID is required"),
  hole: z.number().int().min(1).max(18),
  strokes: z.number().int().min(1).max(15),
});

export const insertAuditEventSchema = createInsertSchema(auditEvents, {
  tournamentId: z.string().min(1, "Tournament ID is required"),
  type: z.enum(["finalize", "unlock"]),
  message: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export const insertCourseHoleSchema = createInsertSchema(courseHoles, {
  courseId: z.string().min(1, "Course ID is required"),
  hole: z.number().int().min(1).max(18),
  par: z.number().int().min(3).max(6),
  strokeIndex: z.number().int().min(1).max(18),
}).omit({
  id: true,
});

// Select schemas
export const selectPlayerSchema = createSelectSchema(players);
export const selectCourseSchema = createSelectSchema(courses);
export const selectTournamentSchema = createSelectSchema(tournaments);
export const selectGroupSchema = createSelectSchema(groups);
export const selectEntrySchema = createSelectSchema(entries);
export const selectHoleScoreSchema = createSelectSchema(holeScores);
export const selectAuditEventSchema = createSelectSchema(auditEvents);
export const selectCourseHoleSchema = createSelectSchema(courseHoles);

// Types
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type InsertEntry = z.infer<typeof insertEntrySchema>;
export type InsertHoleScore = z.infer<typeof insertHoleScoreSchema>;
export type InsertAuditEvent = z.infer<typeof insertAuditEventSchema>;
export type InsertCourseHole = z.infer<typeof insertCourseHoleSchema>;

export type Player = z.infer<typeof selectPlayerSchema>;
export type Course = z.infer<typeof selectCourseSchema>;
export type Tournament = z.infer<typeof selectTournamentSchema>;
export type Group = z.infer<typeof selectGroupSchema>;
export type Entry = z.infer<typeof selectEntrySchema>;
export type HoleScore = z.infer<typeof selectHoleScoreSchema>;
export type AuditEvent = z.infer<typeof selectAuditEventSchema>;
export type CourseHole = z.infer<typeof selectCourseHoleSchema>;

// Extended types for UI
export type TournamentWithCourse = Tournament & {
  course: Course;
};

export type CourseWithHoles = Course & {
  holes: CourseHole[];
};

export type EntryWithPlayer = Entry & {
  player: Player;
};

export type GroupWithEntries = Group & {
  entries: EntryWithPlayer[];
};

export type EntryWithPlayerAndScores = EntryWithPlayer & {
  scores: HoleScore[];
};

export type LeaderboardEntry = {
  entryId: string;
  playerName: string;
  courseHandicap: number;
  playingCH: number;
  grossTotal: number;
  netTotal: number;
  toPar: number;
  netToPar: number;
  position: number;
  tied: boolean;
  holeScores: { [hole: number]: number };
  groupId?: string | null;
};

export type SkinsResult = {
  hole: number;
  par: number;
  winner: string | null;
  winnerScore: number | null;
  isPush: boolean;
  pushCount?: number;
  pushScore?: number;
};

export type SkinsLeaderboard = {
  playerName: string;
  entryId: string;
  skins: number;
  payout: number;
};