import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "../lib/db";
import { 
  players, 
  courses, 
  tournaments, 
  groups, 
  entries, 
  holeScores, 
  courseHoles, 
  auditEvents 
} from "../shared/schema";
import { eq, and, desc, asc, count } from "drizzle-orm";
import { nanoid } from 'nanoid';
import {
  calculateLeaderboards,
  calculateGrossSkins,
  calculateSkinsPayouts,
} from "../lib/scoring";
import { resultsCache } from "./cache";
import { makeShareToken } from "../scripts/backfillShareTokens";

// Middleware to check if tournament is finalized
async function checkTournamentNotFinalized(req: any, res: any, next: any) {
  try {
    let tournamentId =
      req.body.tournamentId || req.params.tournamentId || req.params.id;

    // For hole-scores endpoints, get tournament from entryId
    if (!tournamentId && req.body.entryId) {
      const entry = await db.select({ tournamentId: entries.tournamentId })
        .from(entries)
        .where(eq(entries.id, req.body.entryId))
        .limit(1);
      tournamentId = entry[0]?.tournamentId;
    }

    // For batch hole-scores, check the first entry
    if (
      !tournamentId &&
      Array.isArray(req.body.scores) &&
      req.body.scores[0]?.entryId
    ) {
      const entry = await db.select({ tournamentId: entries.tournamentId })
        .from(entries)
        .where(eq(entries.id, req.body.scores[0].entryId))
        .limit(1);
      tournamentId = entry[0]?.tournamentId;
    }

    if (!tournamentId) {
      return next(); // Let other validation handle missing tournamentId
    }

    const tournament = await db.select({ isFinal: tournaments.isFinal })
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .limit(1);

    if (tournament[0]?.isFinal) {
      return res.status(403).json({ error: "tournament_finalized" });
    }

    next();
  } catch (error) {
    console.error("Error checking tournament finalization:", error);
    next(); // Continue if check fails
  }
}

// Admin authentication middleware
function requireAdminAuth(req: any, res: any, next: any) {
  const tournamentId = req.headers["x-tournament-id"];
  const adminPasscode = req.headers["x-admin-passcode"];

  if (!tournamentId || !adminPasscode) {
    return res
      .status(401)
      .json({ error: "Missing x-tournament-id or x-admin-passcode headers" });
  }

  // Store for use in route handlers
  req.tournamentId = tournamentId;
  req.adminPasscode = adminPasscode;
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Players API routes
  app.get("/api/players", async (req, res) => {
    try {
      const allPlayers = await db.select().from(players).orderBy(desc(players.createdAt));
      res.json(allPlayers);
    } catch (error) {
      console.error("Error fetching players:", error);
      res.status(500).json({ error: "Failed to fetch players" });
    }
  });

  app.post("/api/players", async (req, res) => {
    try {
      const { name, email, handicapIndex } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({ error: "Name is required" });
      }

      // Enforce HI requirement
      if (!handicapIndex || handicapIndex < 0 || handicapIndex > 54) {
        return res
          .status(400)
          .json({ error: "Valid Handicap Index (0.0 - 54.0) is required" });
      }

      const newPlayer = await db.insert(players).values({
        id: nanoid(),
        name: name.trim(),
        email: email?.trim() || null,
        handicapIndex: parseFloat(handicapIndex),
      }).returning();

      res.status(201).json(newPlayer[0]);
    } catch (error) {
      console.error("Error creating player:", error);
      res.status(500).json({ error: "Failed to create player" });
    }
  });

  app.put("/api/players/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, handicapIndex } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({ error: "Name is required" });
      }

      // Enforce HI requirement
      if (!handicapIndex || handicapIndex < 0 || handicapIndex > 54) {
        return res
          .status(400)
          .json({ error: "Valid Handicap Index (0.0 - 54.0) is required" });
      }

      const updatedPlayer = await db.update(players)
        .set({
          name: name.trim(),
          email: email?.trim() || null,
          handicapIndex: parseFloat(handicapIndex),
        })
        .where(eq(players.id, id))
        .returning();

      if (updatedPlayer.length === 0) {
        return res.status(404).json({ error: 'Player not found' });
      }

      res.json(updatedPlayer[0]);
    } catch (error) {
      console.error("Error updating player:", error);
      res.status(500).json({ error: "Failed to update player" });
    }
  });

  app.delete("/api/players/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // Check if player has entries in any tournaments
      const entryCountResult = await db.select({ count: count() })
        .from(entries)
        .where(eq(entries.playerId, id));
      
      const entryCount = entryCountResult[0]?.count || 0;

      if (entryCount > 0) {
        return res.status(400).json({ 
          error: `Cannot delete player. They are entered in ${entryCount} tournament(s). Remove them from tournaments first.` 
        });
      }

      const deletedPlayer = await db.delete(players)
        .where(eq(players.id, id))
        .returning();
        
      if (deletedPlayer.length === 0) {
        return res.status(404).json({ error: 'Player not found' });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting player:", error);
      res.status(500).json({ error: "Failed to delete player" });
    }
  });

  // Courses API routes
  app.get("/api/courses", async (req, res) => {
    try {
      const allCourses = await db.select().from(courses).orderBy(desc(courses.createdAt));
      res.json(allCourses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ error: "Failed to fetch courses" });
    }
  });

  app.post("/api/courses", async (req, res) => {
    try {
      const { name, par, rating, slope } = req.body;

      if (!name?.trim() || !par || !rating || !slope) {
        return res.status(400).json({ error: "All fields are required" });
      }

      const newCourse = await db.insert(courses).values({
        id: nanoid(),
        name: name.trim(),
        par: parseInt(par),
        rating: parseFloat(rating),
        slope: parseInt(slope),
      }).returning();

      res.status(201).json(newCourse[0]);
    } catch (error) {
      console.error("Error creating course:", error);
      res.status(500).json({ error: "Failed to create course" });
    }
  });

  app.put("/api/courses/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, par, rating, slope } = req.body;

      if (!name?.trim() || !par || !rating || !slope) {
        return res.status(400).json({ error: "All fields are required" });
      }

      const updatedCourse = await db.update(courses)
        .set({
          name: name.trim(),
          par: parseInt(par),
          rating: parseFloat(rating),
          slope: parseInt(slope),
        })
        .where(eq(courses.id, id))
        .returning();
      
      if (updatedCourse.length === 0) {
        return res.status(404).json({ error: 'Course not found' });
      }

      res.json(updatedCourse[0]);
    } catch (error) {
      console.error("Error updating course:", error);
      res.status(500).json({ error: "Failed to update course" });
    }
  });

  app.delete("/api/courses/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // Check if course is used by any tournaments
      const tournamentCountResult = await db.select({ count: count() })
        .from(tournaments)
        .where(eq(tournaments.courseId, id));
      
      const tournamentCount = tournamentCountResult[0]?.count || 0;

      if (tournamentCount > 0) {
        return res.status(400).json({ 
          error: `Cannot delete course. It is being used by ${tournamentCount} tournament(s). Delete those tournaments first.` 
        });
      }

      // Delete course holes first (they reference the course)
      await db.delete(courseHoles)
        .where(eq(courseHoles.courseId, id));

      // Then delete the course
      const deletedCourse = await db.delete(courses)
        .where(eq(courses.id, id))
        .returning();
        
      if (deletedCourse.length === 0) {
        return res.status(404).json({ error: 'Course not found' });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting course:", error);
      res.status(500).json({ error: "Failed to delete course" });
    }
  });

  // Course holes routes
  // In-memory cache for course holes (30s TTL)
  const courseHolesCache = new Map<string, { data: any; expiry: number }>();
  const COURSE_HOLES_CACHE_TTL = 30 * 1000; // 30 seconds

  app.get("/api/courses/:id/holes", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check cache first
      const cached = courseHolesCache.get(id);
      const now = Date.now();
      
      if (cached && cached.expiry > now) {
        return res.json(cached.data);
      }

      // Verify course exists
      const course = await db.select({ id: courses.id })
        .from(courses)
        .where(eq(courses.id, id))
        .limit(1);

      if (course.length === 0) {
        return res.status(404).json({ error: "Course not found" });
      }

      const holes = await db.select({
          hole: courseHoles.hole,
          par: courseHoles.par,
          strokeIndex: courseHoles.strokeIndex
        })
        .from(courseHoles)
        .where(eq(courseHoles.courseId, id))
        .orderBy(asc(courseHoles.hole));

      const response = { holes };
      
      // Cache the response
      courseHolesCache.set(id, {
        data: response,
        expiry: now + COURSE_HOLES_CACHE_TTL,
      });

      res.json(response);
    } catch (error) {
      console.error("Error fetching course holes:", error);
      res.status(500).json({ error: "Failed to fetch course holes" });
    }
  });

  app.patch("/api/courses/:id/holes", async (req, res) => {
    try {
      const { id } = req.params;
      const { holes } = req.body;

      // Validate input
      if (!Array.isArray(holes) || holes.length !== 18) {
        return res.status(400).json({ error: "Must provide exactly 18 holes" });
      }

      // Validate hole numbers and stroke indexes
      const holeNumbers = holes.map(h => h.hole).sort((a, b) => a - b);
      const strokeIndexes = holes.map(h => h.strokeIndex).sort((a, b) => a - b);
      const expected = Array.from({ length: 18 }, (_, i) => i + 1);

      if (JSON.stringify(holeNumbers) !== JSON.stringify(expected)) {
        return res.status(400).json({ error: "Hole numbers must be exactly 1-18" });
      }

      if (JSON.stringify(strokeIndexes) !== JSON.stringify(expected)) {
        return res.status(400).json({ error: "Stroke indexes must be a unique permutation of 1-18" });
      }

      // Validate par values
      const invalidPars = holes.filter(h => h.par < 3 || h.par > 6);
      if (invalidPars.length > 0) {
        return res.status(400).json({ error: "Par values must be between 3 and 6" });
      }

      // Delete existing holes first
      await db.delete(courseHoles)
        .where(eq(courseHoles.courseId, id));

      // Create new holes
      const newHoles = holes.map(hole => ({
        id: nanoid(),
        courseId: id,
        hole: hole.hole,
        par: hole.par,
        strokeIndex: hole.strokeIndex,
      }));

      await db.insert(courseHoles).values(newHoles);

      // Clear cache for this course
      courseHolesCache.delete(id);

      // Return updated holes
      const updatedHoles = await db.select({
          id: courseHoles.id,
          hole: courseHoles.hole,
          par: courseHoles.par,
          strokeIndex: courseHoles.strokeIndex
        })
        .from(courseHoles)
        .where(eq(courseHoles.courseId, id))
        .orderBy(asc(courseHoles.hole));

      res.json({ holes: updatedHoles });
    } catch (error) {
      console.error("Error updating course holes:", error);
      res.status(500).json({ error: "Failed to update course holes" });
    }
  });

  // Tournaments API routes
  app.get("/api/tournaments", async (req, res) => {
    try {
      const allTournaments = await db.select({
          id: tournaments.id,
          name: tournaments.name,
          date: tournaments.date,
          courseId: tournaments.courseId,
          holes: tournaments.holes,
          netAllowance: tournaments.netAllowance,
          passcode: tournaments.passcode,
          potAmount: tournaments.potAmount,
          participantsForSkins: tournaments.participantsForSkins,
          skinsCarry: tournaments.skinsCarry,
          grossPrize: tournaments.grossPrize,
          netPrize: tournaments.netPrize,
          isFinal: tournaments.isFinal,
          finalizedAt: tournaments.finalizedAt,
          createdAt: tournaments.createdAt,
          updatedAt: tournaments.updatedAt,
          courseName: courses.name
        })
        .from(tournaments)
        .innerJoin(courses, eq(tournaments.courseId, courses.id))
        .orderBy(desc(tournaments.date));
      res.json(allTournaments);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
      res.status(500).json({ error: "Failed to fetch tournaments" });
    }
  });

  app.post(
    "/api/tournaments",
    checkTournamentNotFinalized,
    async (req, res) => {
      try {
        const { name, date, courseId, netAllowance, passcode } = req.body;

        if (!name?.trim() || !date || !courseId) {
          return res
            .status(400)
            .json({ error: "Name, date, and course are required" });
        }

        const newTournament = await db.insert(tournaments).values({
          id: nanoid(),
          name: name.trim(),
          date: date,
          courseId,
          netAllowance: netAllowance || 100,
          passcode:
            passcode ||
            `${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        }).returning();

        // Get tournament with course name
        const tournamentWithCourse = await db.select({
            id: tournaments.id,
            name: tournaments.name,
            date: tournaments.date,
            courseId: tournaments.courseId,
            holes: tournaments.holes,
            netAllowance: tournaments.netAllowance,
            passcode: tournaments.passcode,
            potAmount: tournaments.potAmount,
            participantsForSkins: tournaments.participantsForSkins,
            skinsCarry: tournaments.skinsCarry,
            grossPrize: tournaments.grossPrize,
            netPrize: tournaments.netPrize,
            isFinal: tournaments.isFinal,
            finalizedAt: tournaments.finalizedAt,
            createdAt: tournaments.createdAt,
            updatedAt: tournaments.updatedAt,
            course: { name: courses.name }
          })
          .from(tournaments)
          .innerJoin(courses, eq(tournaments.courseId, courses.id))
          .where(eq(tournaments.id, newTournament[0].id))
          .limit(1);

        res.status(201).json(tournamentWithCourse[0]);
      } catch (error) {
        console.error("Error creating tournament:", error);
        res.status(500).json({ error: "Failed to create tournament" });
      }
    },
  );

  app.put(
    "/api/tournaments/:id",
    checkTournamentNotFinalized,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { name, date, courseId, netAllowance, status } = req.body;

        if (!name?.trim() || !date || !courseId) {
          return res
            .status(400)
            .json({ error: "Name, date, and course are required" });
        }

        const updatedTournament = await db.update(tournaments)
          .set({
            name: name.trim(),
            date: date,
            courseId,
            netAllowance: netAllowance || 100,
            updatedAt: new Date(),
          })
          .where(eq(tournaments.id, id))
          .returning();

        if (updatedTournament.length === 0) {
          return res.status(404).json({ error: 'Tournament not found' });
        }

        // Get tournament with course name
        const tournamentWithCourse = await db.select({
            id: tournaments.id,
            name: tournaments.name,
            date: tournaments.date,
            courseId: tournaments.courseId,
            holes: tournaments.holes,
            netAllowance: tournaments.netAllowance,
            passcode: tournaments.passcode,
            potAmount: tournaments.potAmount,
            participantsForSkins: tournaments.participantsForSkins,
            skinsCarry: tournaments.skinsCarry,
            grossPrize: tournaments.grossPrize,
            netPrize: tournaments.netPrize,
            isFinal: tournaments.isFinal,
            finalizedAt: tournaments.finalizedAt,
            createdAt: tournaments.createdAt,
            updatedAt: tournaments.updatedAt,
            course: { name: courses.name }
          })
          .from(tournaments)
          .innerJoin(courses, eq(tournaments.courseId, courses.id))
          .where(eq(tournaments.id, id))
          .limit(1);

        res.json(tournamentWithCourse[0]);
      } catch (error) {
        console.error("Error updating tournament:", error);
        res.status(500).json({ error: "Failed to update tournament" });
      }
    },
  );

  app.patch("/api/tournaments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { potAmount, participantsForSkins, grossPrize, netPrize } = req.body;

      const updateData: any = { updatedAt: new Date() };
      if (potAmount !== undefined) updateData.potAmount = potAmount;
      if (participantsForSkins !== undefined) updateData.participantsForSkins = participantsForSkins;
      if (grossPrize !== undefined) updateData.grossPrize = grossPrize;
      if (netPrize !== undefined) updateData.netPrize = netPrize;

      const updatedTournament = await db.update(tournaments)
        .set(updateData)
        .where(eq(tournaments.id, id))
        .returning();

      if (updatedTournament.length === 0) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      // Get tournament with course details
      const tournamentWithCourse = await db.select({
          id: tournaments.id,
          name: tournaments.name,
          date: tournaments.date,
          courseId: tournaments.courseId,
          holes: tournaments.holes,
          netAllowance: tournaments.netAllowance,
          passcode: tournaments.passcode,
          potAmount: tournaments.potAmount,
          participantsForSkins: tournaments.participantsForSkins,
          skinsCarry: tournaments.skinsCarry,
          grossPrize: tournaments.grossPrize,
          netPrize: tournaments.netPrize,
          isFinal: tournaments.isFinal,
          finalizedAt: tournaments.finalizedAt,
          createdAt: tournaments.createdAt,
          updatedAt: tournaments.updatedAt,
          course: {
            name: courses.name,
            par: courses.par,
            slope: courses.slope,
            rating: courses.rating
          }
        })
        .from(tournaments)
        .innerJoin(courses, eq(tournaments.courseId, courses.id))
        .where(eq(tournaments.id, id))
        .limit(1);

      res.json(tournamentWithCourse[0]);
    } catch (error) {
      console.error("Error updating tournament settings:", error);
      res.status(500).json({ error: "Failed to update tournament settings" });
    }
  });

  app.delete("/api/tournaments/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // Use transaction to delete all related data
      await prisma.$transaction(async (tx) => {
        // Delete all hole scores for this tournament
        await tx.holeScore.deleteMany({
          where: {
            entry: {
              tournamentId: id,
            },
          },
        });

        // Delete all entries (this will cascade to audit events)
        await tx.entry.deleteMany({
          where: { tournamentId: id },
        });

        // Delete all groups
        await tx.group.deleteMany({
          where: { tournamentId: id },
        });

        // Delete all audit events
        await tx.auditEvent.deleteMany({
          where: { tournamentId: id },
        });

        // Finally delete the tournament
        await tx.tournament.delete({
          where: { id },
        });
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting tournament:", error);
      res.status(500).json({ error: "Failed to delete tournament" });
    }
  });

  // Tournament detail route
  app.get("/api/tournaments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const tournament = await db.select({
          id: tournaments.id,
          name: tournaments.name,
          date: tournaments.date,
          courseId: tournaments.courseId,
          holes: tournaments.holes,
          netAllowance: tournaments.netAllowance,
          passcode: tournaments.passcode,
          potAmount: tournaments.potAmount,
          participantsForSkins: tournaments.participantsForSkins,
          skinsCarry: tournaments.skinsCarry,
          grossPrize: tournaments.grossPrize,
          netPrize: tournaments.netPrize,
          isFinal: tournaments.isFinal,
          finalizedAt: tournaments.finalizedAt,
          createdAt: tournaments.createdAt,
          updatedAt: tournaments.updatedAt,
          course: {
            name: courses.name,
            par: courses.par,
            slope: courses.slope,
            rating: courses.rating
          }
        })
        .from(tournaments)
        .innerJoin(courses, eq(tournaments.courseId, courses.id))
        .where(eq(tournaments.id, id))
        .limit(1);

      if (tournament.length === 0) {
        return res.status(404).json({ error: "Tournament not found" });
      }

      res.json(tournament[0]);
    } catch (error) {
      console.error("Error fetching tournament:", error);
      res.status(500).json({ error: "Failed to fetch tournament" });
    }
  });

  // Entry routes
  app.get("/api/tournaments/:id/entries", async (req, res) => {
    try {
      const { id } = req.params;
      const entries = await prisma.entry.findMany({
        where: { tournamentId: id },
        include: {
          player: {
            select: { id: true, name: true, email: true, handicapIndex: true },
          },
          group: {
            select: { id: true, name: true },
          },
        },
        orderBy: { player: { name: "asc" } },
      });

      res.json(entries);
    } catch (error) {
      console.error("Error fetching entries:", error);
      res.status(500).json({ error: "Failed to fetch entries" });
    }
  });

  app.post(
    "/api/tournaments/:id/entries",
    checkTournamentNotFinalized,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { playerId, courseHandicap, playingCH } = req.body;

        if (
          !playerId ||
          courseHandicap === undefined ||
          playingCH === undefined
        ) {
          return res
            .status(400)
            .json({ error: "Player ID and handicaps are required" });
        }

        // Check if player is already entered
        const existingEntry = await prisma.entry.findUnique({
          where: {
            tournamentId_playerId: {
              tournamentId: id,
              playerId,
            },
          },
        });

        if (existingEntry) {
          return res
            .status(400)
            .json({ error: "Player is already entered in this tournament" });
        }

        const entry = await prisma.entry.create({
          data: {
            tournamentId: id,
            playerId,
            courseHandicap: Math.round(courseHandicap),
            playingCH: Math.round(playingCH),
          },
          include: {
            player: {
              select: {
                id: true,
                name: true,
                email: true,
                handicapIndex: true,
              },
            },
          },
        });

        res.status(201).json(entry);
      } catch (error) {
        console.error("Error creating entry:", error);
        res.status(500).json({ error: "Failed to create entry" });
      }
    },
  );

  app.delete(
    "/api/entries/:id",
    checkTournamentNotFinalized,
    async (req, res) => {
      try {
        const { id } = req.params;

        await prisma.entry.delete({
          where: { id },
        });

        res.status(204).send();
      } catch (error) {
        console.error("Error deleting entry:", error);
        res.status(500).json({ error: "Failed to delete entry" });
      }
    },
  );

  app.put("/api/entries/:id/assign", async (req, res) => {
    try {
      const { id } = req.params;
      const { groupId } = req.body;

      const entry = await prisma.entry.update({
        where: { id },
        data: { groupId: groupId || null },
        include: {
          player: {
            select: { id: true, name: true, email: true, handicapIndex: true },
          },
          group: {
            select: { id: true, name: true },
          },
        },
      });

      res.json(entry);
    } catch (error) {
      console.error("Error assigning entry to group:", error);
      res.status(500).json({ error: "Failed to assign entry to group" });
    }
  });

  // Group routes
  app.get("/api/tournaments/:id/groups", async (req, res) => {
    try {
      const { id } = req.params;
      const groups = await prisma.group.findMany({
        where: { tournamentId: id },
        include: {
          entries: {
            include: {
              player: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  handicapIndex: true,
                },
              },
            },
            orderBy: { player: { name: "asc" } },
          },
        },
        orderBy: { name: "asc" },
      });

      res.json(groups);
    } catch (error) {
      console.error("Error fetching groups:", error);
      res.status(500).json({ error: "Failed to fetch groups" });
    }
  });

  app.post("/api/groups", checkTournamentNotFinalized, async (req, res) => {
    try {
      const { tournamentId, name, teeTime } = req.body;

      if (!tournamentId || !name?.trim()) {
        return res
          .status(400)
          .json({ error: "Tournament ID and name are required" });
      }

      const group = await prisma.group.create({
        data: {
          tournamentId,
          name: name.trim(),
          teeTime: teeTime ? new Date(`1970-01-01T${teeTime}:00.000Z`) : null,
        },
      });

      res.status(201).json(group);
    } catch (error) {
      console.error("Error creating group:", error);
      res.status(500).json({ error: "Failed to create group" });
    }
  });

  app.put("/api/groups/:id", checkTournamentNotFinalized, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, teeTime } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({ error: "Name is required" });
      }

      const group = await prisma.group.update({
        where: { id },
        data: {
          name: name.trim(),
          teeTime: teeTime ? new Date(`1970-01-01T${teeTime}:00.000Z`) : null,
        },
      });

      res.json(group);
    } catch (error) {
      console.error("Error updating group:", error);
      res.status(500).json({ error: "Failed to update group" });
    }
  });

  app.delete(
    "/api/groups/:id",
    checkTournamentNotFinalized,
    async (req, res) => {
      try {
        const { id } = req.params;

        // Unassign all entries from this group first
        await prisma.entry.updateMany({
          where: { groupId: id },
          data: { groupId: null },
        });

        await prisma.group.delete({
          where: { id },
        });

        res.status(204).send();
      } catch (error) {
        console.error("Error deleting group:", error);
        res.status(500).json({ error: "Failed to delete group" });
      }
    },
  );

  // HoleScores API routes
  app.post(
    "/api/hole-scores",
    checkTournamentNotFinalized,
    async (req, res) => {
      try {
        const { entryId, hole, strokes } = req.body;

        if (!entryId || !hole || !strokes) {
          return res
            .status(400)
            .json({ error: "entryId, hole, and strokes are required" });
        }

        if (hole < 1 || hole > 18 || strokes < 1 || strokes > 15) {
          return res
            .status(400)
            .json({ error: "Invalid hole (1-18) or strokes (1-15)" });
        }

        // Use upsert to handle Last-Write-Wins
        const existingScore = await prisma.holeScore.findFirst({
          where: { entryId, hole: parseInt(hole) },
        });

        const now = new Date();
        let wasOverwritten = false;

        if (existingScore) {
          // Check for conflicts based on timing
          const clientUpdatedAt = req.body.updatedAt
            ? new Date(req.body.updatedAt)
            : now;

          if (existingScore.updatedAt > clientUpdatedAt) {
            // Server is newer, reject client update
            return res.json({
              strokes: existingScore.strokes,
              updatedAt: existingScore.updatedAt,
              wasOverwritten: true,
            });
          }
          wasOverwritten = clientUpdatedAt < existingScore.updatedAt;
        }

        const holeScore = await prisma.holeScore.upsert({
          where: {
            entryId_hole: {
              entryId,
              hole: parseInt(hole),
            },
          },
          update: {
            strokes: parseInt(strokes),
            updatedAt: now,
          },
          create: {
            entryId,
            hole: parseInt(hole),
            strokes: parseInt(strokes),
            updatedAt: now,
          },
        });

        res.json({
          status: wasOverwritten ? "ignored" : "accepted",
          strokes: holeScore.strokes,
          updatedAt: holeScore.updatedAt,
          wasOverwritten,
        });
      } catch (error) {
        console.error("Error saving hole score:", error);
        res.status(500).json({ error: "Failed to save hole score" });
      }
    },
  );

  app.post(
    "/api/hole-scores/batch",
    checkTournamentNotFinalized,
    async (req, res) => {
      try {
        const { scores } = req.body; // Array of {entryId, hole, strokes, updatedAt}

        if (!Array.isArray(scores)) {
          return res.status(400).json({ error: "scores must be an array" });
        }

        const results = [];

        for (const score of scores) {
          const { entryId, hole, strokes } = score;

          if (!entryId || !hole || !strokes) continue;
          if (hole < 1 || hole > 18 || strokes < 1 || strokes > 15) continue;

          try {
            const existingScore = await prisma.holeScore.findFirst({
              where: { entryId, hole: parseInt(hole) },
            });

            const now = new Date();
            const clientUpdatedAt = score.updatedAt
              ? new Date(score.updatedAt)
              : now;
            let wasOverwritten = false;

            if (existingScore && existingScore.updatedAt > clientUpdatedAt) {
              results.push({
                entryId,
                hole: parseInt(hole),
                strokes: existingScore.strokes,
                updatedAt: existingScore.updatedAt,
                wasOverwritten: true,
              });
              continue;
            }

            const holeScore = await prisma.holeScore.upsert({
              where: {
                entryId_hole: {
                  entryId,
                  hole: parseInt(hole),
                },
              },
              update: {
                strokes: parseInt(strokes),
                updatedAt: now,
              },
              create: {
                entryId,
                hole: parseInt(hole),
                strokes: parseInt(strokes),
                updatedAt: now,
              },
            });

            results.push({
              entryId,
              hole: parseInt(hole),
              strokes: holeScore.strokes,
              updatedAt: holeScore.updatedAt,
              wasOverwritten,
            });
          } catch (err) {
            console.error(
              `Error processing score for entry ${entryId} hole ${hole}:`,
              err,
            );
          }
        }

        res.json({ results });
      } catch (error) {
        console.error("Error batch saving hole scores:", error);
        res.status(500).json({ error: "Failed to batch save hole scores" });
      }
    },
  );

  app.get("/api/tournaments/:id/leaderboards", async (req, res) => {
    try {
      const { id } = req.params;

      const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: {
          course: {
            include: {
              holes: {
                orderBy: { hole: "asc" },
              },
            },
          },
          entries: {
            include: {
              player: true,
              scores: true,
            },
          },
        },
      });

      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }

      // Generate hole pars array (simplified - assume par 4 for all holes)
      const holePars = Array(18).fill(4);

      // Add hasPaid field to entries if missing for backwards compatibility
      const entriesWithPayment = tournament.entries.map(entry => ({
        ...entry,
        hasPaid: entry.hasPaid || false
      }));

      // Calculate leaderboards using scoring utility with course holes for TRUE Net tiebreaking
      const leaderboards = calculateLeaderboards(
        entriesWithPayment,
        tournament.course.par,
        tournament.course.holes,
      );

      res.json({
        gross: leaderboards.gross,
        net: leaderboards.net,
        coursePar: tournament.course.par,
        updated: new Date(),
        ...(leaderboards.warnings && { warnings: leaderboards.warnings }),
      });
    } catch (error) {
      console.error("Error fetching leaderboards:", error);
      res.status(500).json({ error: "Failed to fetch leaderboards" });
    }
  });

  app.get("/api/tournaments/:id/skins", async (req, res) => {
    try {
      const { id } = req.params;

      const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: {
          course: true,
          entries: {
            include: {
              player: true,
              scores: true,
            },
          },
        },
      });

      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }

      // Get actual hole pars from course holes or default to par 4
      let holePars = Array(18).fill(4);
      try {
        const courseHoles = await prisma.courseHole.findMany({
          where: { courseId: tournament.courseId },
          orderBy: { hole: 'asc' }
        });
        if (courseHoles.length === 18) {
          holePars = courseHoles.map(ch => ch.par);
        }
      } catch (error) {
        console.error('Error fetching course holes for skins:', error);
      }

      // Add hasPaid field to entries if missing for backwards compatibility
      const entriesWithPayment = tournament.entries.map(entry => ({
        ...entry,
        hasPaid: entry.hasPaid || false
      }));

      // Calculate skins
      const skinsData = calculateGrossSkins(
        entriesWithPayment,
        tournament.course.par,
        holePars,
      );

      // Calculate payouts if pot amount is set
      let leaderboard = skinsData.leaderboard;
      if (tournament.potAmount && tournament.participantsForSkins) {
        leaderboard = calculateSkinsPayouts(
          skinsData.leaderboard,
          tournament.potAmount,
          skinsData.totalSkins,
        );
      }

      res.json({
        results: skinsData.results,
        leaderboard,
        totalSkins: skinsData.totalSkins,
        potAmount: tournament.potAmount,
        participantsForSkins: tournament.participantsForSkins,
        payoutPerSkin:
          tournament.potAmount && skinsData.totalSkins > 0
            ? Math.floor((tournament.potAmount * 100) / skinsData.totalSkins) /
              100
            : 0,
      });
    } catch (error) {
      console.error("Error fetching skins:", error);
      res.status(500).json({ error: "Failed to fetch skins" });
    }
  });

  app.get("/api/tournaments/:id/scores/:groupId", async (req, res) => {
    try {
      const { id, groupId } = req.params;

      const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: {
          tournament: {
            include: { course: true },
          },
          entries: {
            include: {
              player: true,
              scores: true,
            },
          },
        },
      });

      if (!group || group.tournamentId !== id) {
        return res.status(404).json({ error: "Group not found in tournament" });
      }

      res.json({
        group: {
          id: group.id,
          name: group.name,
          teeTime: group.teeTime,
        },
        tournament: {
          id: group.tournament.id,
          name: group.tournament.name,
          courseId: group.tournament.courseId,
          course: {
            name: group.tournament.course.name,
            par: group.tournament.course.par,
          },
        },
        entries: group.entries.map((entry) => ({
          id: entry.id,
          player: entry.player,
          courseHandicap: entry.courseHandicap,
          playingCH: entry.playingCH,
          holeScores: entry.scores.reduce(
            (acc, score) => {
              acc[score.hole] = score.strokes;
              return acc;
            },
            {} as { [hole: number]: number },
          ),
        })),
      });
    } catch (error) {
      console.error("Error fetching group scores:", error);
      res.status(500).json({ error: "Failed to fetch group scores" });
    }
  });

  // Get scores for a specific group (for refetch after conflicts)
  app.get("/api/groups/:groupId/scores", async (req, res) => {
    try {
      const { groupId } = req.params;

      const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: {
          entries: {
            include: {
              scores: true,
            },
          },
        },
      });

      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }

      // Return scores in the format expected by client
      const scores: { [entryId: string]: { [hole: number]: number } } = {};
      group.entries.forEach((entry) => {
        scores[entry.id] = entry.scores.reduce(
          (acc, score) => {
            acc[score.hole] = score.strokes;
            return acc;
          },
          {} as { [hole: number]: number },
        );
      });

      res.json({ scores });
    } catch (error) {
      console.error("Error fetching group scores:", error);
      res.status(500).json({ error: "Failed to fetch group scores" });
    }
  });

  // Helper function to compute tournament results
  async function computeResults(tournamentId: string) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        course: true,
        entries: {
          include: {
            player: true,
            scores: true,
          },
        },
      },
    });

    if (!tournament) {
      return null;
    }

    // Get actual hole pars from course holes or default to par 4
    let holePars = Array(18).fill(4);
    try {
      const courseHoles = await prisma.courseHole.findMany({
        where: { courseId: tournament.courseId },
        orderBy: { hole: 'asc' }
      });
      if (courseHoles.length === 18) {
        holePars = courseHoles.map(ch => ch.par);
      }
    } catch (error) {
      console.error('Error fetching course holes for results:', error);
    }

    // Add hasPaid field to entries if missing for backwards compatibility
    const entriesWithPayment = tournament.entries.map(entry => ({
      ...entry,
      hasPaid: entry.hasPaid || false
    }));

    // Calculate leaderboards using scoring utility
    const leaderboards = calculateLeaderboards(
      entriesWithPayment,
      tournament.course.par,
      tournament.course.holes,
    );

    // Calculate skins
    const skinsData = calculateGrossSkins(
      entriesWithPayment,
      tournament.course.par,
      holePars,
    );

    // Calculate payouts if pot amount is set
    let skinsLeaderboard = skinsData.leaderboard;
    if (tournament.potAmount && tournament.participantsForSkins) {
      skinsLeaderboard = calculateSkinsPayouts(
        skinsData.leaderboard,
        tournament.potAmount,
        skinsData.totalSkins,
      );
    }

    return {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        date: tournament.date,
        course: {
          name: tournament.course.name,
          par: tournament.course.par,
        },
      },
      gross: leaderboards.gross,
      net: leaderboards.net,
      skins: {
        perHole: skinsData.results,
        perPlayer: skinsData.leaderboard.reduce((acc: any, player: any) => {
          acc[player.entryId] = {
            playerName: player.playerName,
            count: player.skins
          };
          return acc;
        }, {}),
        payout: {
          totalSkins: skinsData.totalSkins,
          potAmount: tournament.potAmount,
          payoutPerSkin: tournament.potAmount && skinsData.totalSkins > 0
            ? Math.floor((tournament.potAmount * 100) / skinsData.totalSkins) / 100
            : 0,
          perPlayerPayouts: skinsLeaderboard.reduce((acc: any, player: any) => {
            acc[player.entryId] = player.payout || 0;
            return acc;
          }, {})
        }
      },
      coursePar: tournament.course.par,
      updated: new Date(),
    };
  }

  // Public results API with cache
  app.get("/api/public/:token/results", async (req, res) => {
    try {
      const { token } = req.params;

      if (!token || token.length !== 12) {
        return res.status(400).json({ error: "Invalid share token format" });
      }

      // Find tournament by share token
      const tournament = await prisma.tournament.findUnique({
        where: { shareToken: token },
        select: { id: true },
      });

      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }

      // Check cache first
      const cacheKey = tournament.id;
      let results = resultsCache.get(cacheKey);

      if (!results) {
        // Cache miss - compute results
        results = await computeResults(tournament.id);

        if (!results) {
          return res.status(404).json({ error: "Tournament not found" });
        }

        // Cache the results
        resultsCache.set(cacheKey, results);
      }

      res.json(results);
    } catch (error) {
      console.error("Error fetching public results:", error);
      res.status(500).json({ error: "Failed to fetch results" });
    }
  });

  // Generate or regenerate share token for tournament
  app.post("/api/tournaments/:id/share-token", async (req, res) => {
    try {
      const { id } = req.params;

      // Verify tournament exists
      const tournament = await prisma.tournament.findUnique({
        where: { id },
        select: { id: true, shareToken: true },
      });

      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }

      // Generate new unique token
      let newToken: string;
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!isUnique && attempts < maxAttempts) {
        newToken = makeShareToken(12);

        const existing = await prisma.tournament.findUnique({
          where: { shareToken: newToken },
        });

        if (!existing) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        return res
          .status(500)
          .json({ error: "Failed to generate unique token" });
      }

      // Update tournament with new token
      const updatedTournament = await prisma.tournament.update({
        where: { id },
        data: { shareToken: newToken! },
        select: { shareToken: true },
      });

      // Clear cache for this tournament since we're regenerating the token
      resultsCache.clear();

      res.json({ shareToken: updatedTournament.shareToken });
    } catch (error) {
      console.error("Error generating share token:", error);
      res.status(500).json({ error: "Failed to generate share token" });
    }
  });

  // Conflict tracking (in-memory ring buffer) - Enhanced for Admin Review
  const CONFLICT_BUFFER_SIZE = 200;
  interface ConflictEntry {
    id: string;
    tournamentId: string;
    tournamentName: string;
    groupId?: string;
    groupName?: string;
    entryId: string;
    playerName: string;
    hole: number;
    incomingStrokes: number;
    incomingAt: Date;
    storedStrokes: number;
    storedAt: Date;
    resolved?: boolean;
    resolvedAt?: Date;
  }

  const conflictBuffer: ConflictEntry[] = [];

  async function addConflict(conflict: {
    entryId: string;
    hole: number;
    incomingStrokes: number;
    incomingAt: Date;
    storedStrokes: number;
    storedAt: Date;
  }) {
    try {
      // Enrich with tournament and player info
      const entry = await prisma.entry.findUnique({
        where: { id: conflict.entryId },
        include: {
          player: { select: { name: true } },
          tournament: { select: { id: true, name: true } },
          group: { select: { id: true, name: true } },
        },
      });

      if (entry) {
        const enrichedConflict: ConflictEntry = {
          id: `${conflict.entryId}-${conflict.hole}-${Date.now()}`,
          tournamentId: entry.tournament.id,
          tournamentName: entry.tournament.name,
          groupId: entry.group?.id,
          groupName: entry.group?.name,
          entryId: conflict.entryId,
          playerName: entry.player.name,
          hole: conflict.hole,
          incomingStrokes: conflict.incomingStrokes,
          incomingAt: conflict.incomingAt,
          storedStrokes: conflict.storedStrokes,
          storedAt: conflict.storedAt,
          resolved: false,
        };

        conflictBuffer.push(enrichedConflict);
        if (conflictBuffer.length > CONFLICT_BUFFER_SIZE) {
          conflictBuffer.shift(); // Remove oldest
        }
      }
    } catch (error) {
      console.error("Error enriching conflict:", error);
      // Fallback: store basic conflict
      conflictBuffer.push({
        id: `${conflict.entryId}-${conflict.hole}-${Date.now()}`,
        tournamentId: "unknown",
        tournamentName: "Unknown Tournament",
        entryId: conflict.entryId,
        playerName: "Unknown Player",
        hole: conflict.hole,
        incomingStrokes: conflict.incomingStrokes,
        incomingAt: conflict.incomingAt,
        storedStrokes: conflict.storedStrokes,
        storedAt: conflict.storedAt,
        resolved: false,
      });
    }
  }

  // Auth middleware for admin conflicts endpoints
  async function validateAdminAccess(req: any, res: any, next: any) {
    const tournamentId = req.headers["x-tournament-id"] as string;
    const passcode = req.headers["x-admin-passcode"] as string;

    if (!tournamentId || !passcode) {
      return res
        .status(401)
        .json({ error: "Missing x-tournament-id or x-admin-passcode headers" });
    }

    try {
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { passcode: true },
      });

      if (!tournament || tournament.passcode !== passcode) {
        return res
          .status(401)
          .json({ error: "Invalid tournament ID or passcode" });
      }

      (req as any).validatedTournamentId = tournamentId;
      next();
    } catch (error) {
      console.error("Error validating admin access:", error);
      res.status(500).json({ error: "Authentication failed" });
    }
  }

  // Single score endpoint with Last-Write-Wins
  app.post("/api/scores", checkTournamentNotFinalized, async (req, res) => {
    try {
      const { entryId, hole, strokes, clientUpdatedAt } = req.body ?? {};

      // 1) Coerce + validate
      const holeNum = Number(hole);
      const strokeNum = Number(strokes);
      const ts = new Date(clientUpdatedAt);

      if (
        !entryId ||
        !Number.isInteger(holeNum) ||
        holeNum < 1 ||
        holeNum > 18 ||
        !Number.isFinite(strokeNum) ||
        strokeNum < 1 ||
        Number.isNaN(ts.getTime())
      ) {
        return res.status(400).json({ error: "Missing or invalid fields" });
      }

      // (Optional safety) Ensure entry exists and tournament not final here as well
      // in case your checkTournamentNotFinalized middleware relies on headers.
      // If your middleware already covers this by entryId, you can remove this block.
      const entry = await prisma.entry.findUnique({
        where: { id: entryId },
        select: {
          tournamentId: true,
          tournament: { select: { isFinal: true } },
        },
      });
      if (!entry) return res.status(404).json({ error: "entry_not_found" });
      if (entry.tournament?.isFinal)
        return res.status(403).json({ error: "tournament_finalized" });

      // 2) Fetch existing
      const existing = await prisma.holeScore.findUnique({
        where: { entryId_hole: { entryId, hole: holeNum } },
      });

      // 3) LWW check — use >= for idempotency on equal timestamps
      if (
        existing &&
        existing.clientUpdatedAt &&
        existing.clientUpdatedAt >= ts
      ) {
        // log conflict (your helper)
        await addConflict({
          entryId,
          hole: holeNum,
          incomingStrokes: strokeNum,
          incomingAt: ts,
          storedStrokes: existing.strokes,
          storedAt: existing.clientUpdatedAt,
        });

        console.log(
          `Score ignored (stale): entry ${entryId}, hole ${holeNum}, incoming: ${strokeNum}@${ts.toISOString()}, stored: ${existing.strokes}@${existing.clientUpdatedAt.toISOString()}`,
        );

        return res.json({
          status: "ignored",
          reason: "stale",
          storedScore: {
            strokes: existing.strokes,
            clientUpdatedAt: existing.clientUpdatedAt, // ✅ correct field name
          },
        });
      }

      // 4) Upsert the newer value
      const saved = await prisma.holeScore.upsert({
        where: { entryId_hole: { entryId, hole: holeNum } },
        update: { strokes: strokeNum, clientUpdatedAt: ts }, // let @updatedAt handle updatedAt
        create: {
          entryId,
          hole: holeNum,
          strokes: strokeNum,
          clientUpdatedAt: ts,
        },
      });

      console.log(
        `Score accepted: entry ${entryId}, hole ${holeNum}, strokes: ${strokeNum}`,
      );

      return res.json({
        status: "accepted",
        score: {
          strokes: saved.strokes,
          clientUpdatedAt: saved.clientUpdatedAt,
          updatedAt: saved.updatedAt, // from Prisma @updatedAt
        },
      });
    } catch (error) {
      console.error("Error saving score:", error);
      return res.status(500).json({ error: "Failed to save score" });
    }
  });

  // Get recent conflicts for admin review
  // Admin Conflicts Review API - Protected by tournament passcode
  app.get(
    "/api/admin/conflicts/recent",
    validateAdminAccess,
    async (req, res) => {
      try {
        const { tournamentId } = req.query;
        const validatedTournamentId = (req as any).validatedTournamentId;

        // Filter conflicts by tournament ID if provided
        let conflicts = conflictBuffer;
        if (tournamentId && tournamentId === validatedTournamentId) {
          conflicts = conflictBuffer.filter(
            (c) => c.tournamentId === tournamentId,
          );
        } else if (validatedTournamentId) {
          conflicts = conflictBuffer.filter(
            (c) => c.tournamentId === validatedTournamentId,
          );
        }

        // Return newest first, limit to 200
        const recentConflicts = conflicts
          .filter((c) => !c.resolved)
          .sort((a, b) => b.incomingAt.getTime() - a.incomingAt.getTime())
          .slice(0, 200);

        res.json({ conflicts: recentConflicts });
      } catch (error) {
        console.error("Error fetching conflicts:", error);
        res.status(500).json({ error: "Failed to fetch conflicts" });
      }
    },
  );

  app.post(
    "/api/admin/conflicts/resolve",
    validateAdminAccess,
    async (req, res) => {
      try {
        const { tournamentId, entryId, hole, action, forceValue } = req.body;
        const validatedTournamentId = (req as any).validatedTournamentId;

        if (tournamentId !== validatedTournamentId) {
          return res.status(403).json({ error: "Tournament ID mismatch" });
        }

        if (!entryId || !hole || !action) {
          return res
            .status(400)
            .json({ error: "Missing required fields: entryId, hole, action" });
        }

        if (!["apply-server", "force-local"].includes(action)) {
          return res.status(400).json({
            error: "Invalid action. Must be apply-server or force-local",
          });
        }

        // Find and mark the conflict as resolved
        const conflictIndex = conflictBuffer.findIndex(
          (c) =>
            c.entryId === entryId &&
            c.hole === hole &&
            c.tournamentId === tournamentId &&
            !c.resolved,
        );

        if (conflictIndex >= 0) {
          conflictBuffer[conflictIndex].resolved = true;
          conflictBuffer[conflictIndex].resolvedAt = new Date();
        }

        if (action === "force-local") {
          const conflict = conflictBuffer[conflictIndex];
          const strokesToForce =
            forceValue !== undefined ? forceValue : conflict?.incomingStrokes;

          if (strokesToForce === undefined) {
            return res.status(400).json({
              error:
                "forceValue required for force-local action when conflict not found",
            });
          }

          // Force the local value by creating a new score with timestamp ahead of current
          const forceTimestamp = new Date(Date.now() + 1);

          await prisma.holeScore.upsert({
            where: {
              entryId_hole: {
                entryId,
                hole: parseInt(hole),
              },
            },
            update: {
              strokes: strokesToForce,
              clientUpdatedAt: forceTimestamp,
              updatedAt: new Date(),
            },
            create: {
              entryId,
              hole: parseInt(hole),
              strokes: strokesToForce,
              clientUpdatedAt: forceTimestamp,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });

          console.log(
            `Forced local value: entry ${entryId}, hole ${hole}, strokes ${strokesToForce}, timestamp ${forceTimestamp}`,
          );
        }

        res.json({
          success: true,
          action,
          resolved: conflictIndex >= 0,
          ...(action === "force-local" && {
            forcedValue:
              forceValue !== undefined
                ? forceValue
                : conflictBuffer[conflictIndex]?.incomingStrokes,
          }),
        });
      } catch (error) {
        console.error("Error resolving conflict:", error);
        res.status(500).json({ error: "Failed to resolve conflict" });
      }
    },
  );

  app.delete(
    "/api/admin/conflicts/clear",
    validateAdminAccess,
    async (req, res) => {
      try {
        const { tournamentId } = req.query;
        const validatedTournamentId = (req as any).validatedTournamentId;

        if (tournamentId && tournamentId !== validatedTournamentId) {
          return res.status(403).json({ error: "Tournament ID mismatch" });
        }

        let clearedCount = 0;
        if (tournamentId === validatedTournamentId) {
          // Clear conflicts for specific tournament
          const originalLength = conflictBuffer.length;
          for (let i = conflictBuffer.length - 1; i >= 0; i--) {
            if (conflictBuffer[i].tournamentId === tournamentId) {
              conflictBuffer.splice(i, 1);
              clearedCount++;
            }
          }
        } else {
          // Clear all conflicts for validated tournament
          const originalLength = conflictBuffer.length;
          for (let i = conflictBuffer.length - 1; i >= 0; i--) {
            if (conflictBuffer[i].tournamentId === validatedTournamentId) {
              conflictBuffer.splice(i, 1);
              clearedCount++;
            }
          }
        }

        res.json({ success: true, clearedCount });
      } catch (error) {
        console.error("Error clearing conflicts:", error);
        res.status(500).json({ error: "Failed to clear conflicts" });
      }
    },
  );

  // Admin endpoints for tournament finalization
  app.post(
    "/api/admin/tournaments/:id/finalize",
    requireAdminAuth,
    async (req, res) => {
      try {
        const { id } = req.params;

        // Verify admin passcode
        const tournament = await prisma.tournament.findUnique({
          where: { id },
          select: { passcode: true, isFinal: true, name: true },
        });

        if (!tournament) {
          return res.status(404).json({ error: "Tournament not found" });
        }

        if ((req as any).adminPasscode !== tournament.passcode) {
          return res.status(403).json({ error: "Invalid admin passcode" });
        }

        if (tournament.isFinal) {
          return res
            .status(400)
            .json({ error: "Tournament is already finalized" });
        }

        // Finalize tournament and create audit log
        const now = new Date();
        await prisma.$transaction([
          prisma.tournament.update({
            where: { id },
            data: {
              isFinal: true,
              finalizedAt: now,
            },
          }),
          prisma.auditEvent.create({
            data: {
              tournamentId: id,
              type: "finalize",
              message: `Tournament "${tournament.name}" finalized via admin panel`,
            },
          }),
        ]);

        res.json({ success: true, finalizedAt: now });
      } catch (error) {
        console.error("Error finalizing tournament:", error);
        res.status(500).json({ error: "Failed to finalize tournament" });
      }
    },
  );

  app.post(
    "/api/admin/tournaments/:id/unlock",
    requireAdminAuth,
    async (req, res) => {
      try {
        const { id } = req.params;

        // Verify admin passcode
        const tournament = await prisma.tournament.findUnique({
          where: { id },
          select: { passcode: true, isFinal: true, name: true },
        });

        if (!tournament) {
          return res.status(404).json({ error: "Tournament not found" });
        }

        if ((req as any).adminPasscode !== tournament.passcode) {
          return res.status(403).json({ error: "Invalid admin passcode" });
        }

        if (!tournament.isFinal) {
          return res.status(400).json({ error: "Tournament is not finalized" });
        }

        // Unlock tournament and create audit log
        await prisma.$transaction([
          prisma.tournament.update({
            where: { id },
            data: {
              isFinal: false,
              finalizedAt: null,
            },
          }),
          prisma.auditEvent.create({
            data: {
              tournamentId: id,
              type: "unlock",
              message: `Tournament "${tournament.name}" unlocked via admin panel`,
            },
          }),
        ]);

        res.json({ success: true });
      } catch (error) {
        console.error("Error unlocking tournament:", error);
        res.status(500).json({ error: "Failed to unlock tournament" });
      }
    },
  );

  app.get(
    "/api/admin/tournaments/:id/audit",
    requireAdminAuth,
    async (req, res) => {
      try {
        const { id } = req.params;

        // Verify admin passcode
        const tournament = await prisma.tournament.findUnique({
          where: { id },
          select: { passcode: true },
        });

        if (!tournament) {
          return res.status(404).json({ error: "Tournament not found" });
        }

        if ((req as any).adminPasscode !== tournament.passcode) {
          return res.status(403).json({ error: "Invalid admin passcode" });
        }

        const auditEvents = await prisma.auditEvent.findMany({
          where: { tournamentId: id },
          orderBy: { createdAt: "desc" },
        });

        res.json(auditEvents);
      } catch (error) {
        console.error("Error fetching audit events:", error);
        res.status(500).json({ error: "Failed to fetch audit events" });
      }
    },
  );

  // Update entry payment status endpoint
  app.patch("/api/tournaments/:tournamentId/entries/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { hasPaid } = req.body;

      const entry = await prisma.entry.update({
        where: { id },
        data: { hasPaid: !!hasPaid },
        include: {
          player: true,
        },
      });

      res.json(entry);
    } catch (error) {
      console.error("Error updating entry payment status:", error);
      res.status(500).json({ error: "Failed to update payment status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
