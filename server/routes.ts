import type { Express } from "express";
import { createServer, type Server } from "http";
import { prisma } from "../lib/db";
import { calculateLeaderboards, calculateGrossSkins, calculateSkinsPayouts } from "../lib/scoring";

export async function registerRoutes(app: Express): Promise<Server> {
  // Players API routes
  app.get('/api/players', async (req, res) => {
    try {
      const players = await prisma.player.findMany({
        orderBy: { createdAt: 'desc' }
      });
      res.json(players);
    } catch (error) {
      console.error('Error fetching players:', error);
      res.status(500).json({ error: 'Failed to fetch players' });
    }
  });

  app.post('/api/players', async (req, res) => {
    try {
      const { name, email, handicapIndex } = req.body;
      
      if (!name?.trim()) {
        return res.status(400).json({ error: 'Name is required' });
      }

      // Enforce HI requirement
      if (!handicapIndex || handicapIndex < 0 || handicapIndex > 54) {
        return res.status(400).json({ error: 'Valid Handicap Index (0.0 - 54.0) is required' });
      }

      const player = await prisma.player.create({
        data: {
          name: name.trim(),
          email: email?.trim() || null,
          handicapIndex: parseFloat(handicapIndex)
        }
      });
      
      res.status(201).json(player);
    } catch (error) {
      console.error('Error creating player:', error);
      res.status(500).json({ error: 'Failed to create player' });
    }
  });

  app.put('/api/players/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, handicapIndex } = req.body;
      
      if (!name?.trim()) {
        return res.status(400).json({ error: 'Name is required' });
      }

      // Enforce HI requirement
      if (!handicapIndex || handicapIndex < 0 || handicapIndex > 54) {
        return res.status(400).json({ error: 'Valid Handicap Index (0.0 - 54.0) is required' });
      }

      const player = await prisma.player.update({
        where: { id },
        data: {
          name: name.trim(),
          email: email?.trim() || null,
          handicapIndex: parseFloat(handicapIndex)
        }
      });
      
      res.json(player);
    } catch (error) {
      console.error('Error updating player:', error);
      res.status(500).json({ error: 'Failed to update player' });
    }
  });

  app.delete('/api/players/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      await prisma.player.delete({
        where: { id }
      });
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting player:', error);
      res.status(500).json({ error: 'Failed to delete player' });
    }
  });

  // Courses API routes
  app.get('/api/courses', async (req, res) => {
    try {
      const courses = await prisma.course.findMany({
        orderBy: { createdAt: 'desc' }
      });
      res.json(courses);
    } catch (error) {
      console.error('Error fetching courses:', error);
      res.status(500).json({ error: 'Failed to fetch courses' });
    }
  });

  app.post('/api/courses', async (req, res) => {
    try {
      const { name, par, rating, slope } = req.body;
      
      if (!name?.trim() || !par || !rating || !slope) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      const course = await prisma.course.create({
        data: {
          name: name.trim(),
          par: parseInt(par),
          rating: parseFloat(rating),
          slope: parseInt(slope)
        }
      });
      
      res.status(201).json(course);
    } catch (error) {
      console.error('Error creating course:', error);
      res.status(500).json({ error: 'Failed to create course' });
    }
  });

  app.put('/api/courses/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, par, rating, slope } = req.body;
      
      if (!name?.trim() || !par || !rating || !slope) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      const course = await prisma.course.update({
        where: { id },
        data: {
          name: name.trim(),
          par: parseInt(par),
          rating: parseFloat(rating),
          slope: parseInt(slope)
        }
      });
      
      res.json(course);
    } catch (error) {
      console.error('Error updating course:', error);
      res.status(500).json({ error: 'Failed to update course' });
    }
  });

  app.delete('/api/courses/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      await prisma.course.delete({
        where: { id }
      });
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting course:', error);
      res.status(500).json({ error: 'Failed to delete course' });
    }
  });

  // Tournaments API routes
  app.get('/api/tournaments', async (req, res) => {
    try {
      const tournaments = await prisma.tournament.findMany({
        include: { course: { select: { name: true } } },
        orderBy: { date: 'desc' }
      });
      res.json(tournaments);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      res.status(500).json({ error: 'Failed to fetch tournaments' });
    }
  });

  app.post('/api/tournaments', async (req, res) => {
    try {
      const { name, date, courseId, netAllowance, passcode } = req.body;
      
      if (!name?.trim() || !date || !courseId) {
        return res.status(400).json({ error: 'Name, date, and course are required' });
      }

      const tournament = await prisma.tournament.create({
        data: {
          name: name.trim(),
          date: date,
          courseId,
          netAllowance: netAllowance || 100,
          passcode: passcode || `${Math.random().toString(36).substring(2, 8).toUpperCase()}`
        },
        include: { course: { select: { name: true } } }
      });
      
      res.status(201).json(tournament);
    } catch (error) {
      console.error('Error creating tournament:', error);
      res.status(500).json({ error: 'Failed to create tournament' });
    }
  });

  app.put('/api/tournaments/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, date, courseId, netAllowance, status } = req.body;
      
      if (!name?.trim() || !date || !courseId) {
        return res.status(400).json({ error: 'Name, date, and course are required' });
      }

      const tournament = await prisma.tournament.update({
        where: { id },
        data: {
          name: name.trim(),
          date: date,
          courseId,
          netAllowance: netAllowance || 100
        },
        include: { course: { select: { name: true } } }
      });
      
      res.json(tournament);
    } catch (error) {
      console.error('Error updating tournament:', error);
      res.status(500).json({ error: 'Failed to update tournament' });
    }
  });

  app.delete('/api/tournaments/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      await prisma.tournament.delete({
        where: { id }
      });
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting tournament:', error);
      res.status(500).json({ error: 'Failed to delete tournament' });
    }
  });

  // Tournament detail route
  app.get('/api/tournaments/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: { 
          course: { 
            select: { name: true, par: true, slope: true, rating: true } 
          } 
        }
      });
      
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      
      res.json(tournament);
    } catch (error) {
      console.error('Error fetching tournament:', error);
      res.status(500).json({ error: 'Failed to fetch tournament' });
    }
  });

  // Entry routes
  app.get('/api/tournaments/:id/entries', async (req, res) => {
    try {
      const { id } = req.params;
      const entries = await prisma.entry.findMany({
        where: { tournamentId: id },
        include: { 
          player: { 
            select: { id: true, name: true, email: true, handicapIndex: true } 
          },
          group: {
            select: { id: true, name: true }
          }
        },
        orderBy: { player: { name: 'asc' } }
      });
      
      res.json(entries);
    } catch (error) {
      console.error('Error fetching entries:', error);
      res.status(500).json({ error: 'Failed to fetch entries' });
    }
  });

  app.post('/api/tournaments/:id/entries', async (req, res) => {
    try {
      const { id } = req.params;
      const { playerId, courseHandicap, playingCH } = req.body;
      
      if (!playerId || courseHandicap === undefined || playingCH === undefined) {
        return res.status(400).json({ error: 'Player ID and handicaps are required' });
      }

      // Check if player is already entered
      const existingEntry = await prisma.entry.findUnique({
        where: {
          tournamentId_playerId: {
            tournamentId: id,
            playerId
          }
        }
      });

      if (existingEntry) {
        return res.status(400).json({ error: 'Player is already entered in this tournament' });
      }

      const entry = await prisma.entry.create({
        data: {
          tournamentId: id,
          playerId,
          courseHandicap: Math.round(courseHandicap),
          playingCH: Math.round(playingCH)
        },
        include: { 
          player: { 
            select: { id: true, name: true, email: true, handicapIndex: true } 
          }
        }
      });
      
      res.status(201).json(entry);
    } catch (error) {
      console.error('Error creating entry:', error);
      res.status(500).json({ error: 'Failed to create entry' });
    }
  });

  app.delete('/api/entries/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      await prisma.entry.delete({
        where: { id }
      });
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting entry:', error);
      res.status(500).json({ error: 'Failed to delete entry' });
    }
  });

  app.put('/api/entries/:id/assign', async (req, res) => {
    try {
      const { id } = req.params;
      const { groupId } = req.body;
      
      const entry = await prisma.entry.update({
        where: { id },
        data: { groupId: groupId || null },
        include: { 
          player: { 
            select: { id: true, name: true, email: true, handicapIndex: true } 
          },
          group: {
            select: { id: true, name: true }
          }
        }
      });
      
      res.json(entry);
    } catch (error) {
      console.error('Error assigning entry to group:', error);
      res.status(500).json({ error: 'Failed to assign entry to group' });
    }
  });

  // Group routes
  app.get('/api/tournaments/:id/groups', async (req, res) => {
    try {
      const { id } = req.params;
      const groups = await prisma.group.findMany({
        where: { tournamentId: id },
        include: {
          entries: {
            include: {
              player: {
                select: { id: true, name: true, email: true, handicapIndex: true }
              }
            },
            orderBy: { player: { name: 'asc' } }
          }
        },
        orderBy: { name: 'asc' }
      });
      
      res.json(groups);
    } catch (error) {
      console.error('Error fetching groups:', error);
      res.status(500).json({ error: 'Failed to fetch groups' });
    }
  });

  app.post('/api/groups', async (req, res) => {
    try {
      const { tournamentId, name, teeTime } = req.body;
      
      if (!tournamentId || !name?.trim()) {
        return res.status(400).json({ error: 'Tournament ID and name are required' });
      }

      const group = await prisma.group.create({
        data: {
          tournamentId,
          name: name.trim(),
          teeTime: teeTime ? new Date(`1970-01-01T${teeTime}:00.000Z`) : null
        }
      });
      
      res.status(201).json(group);
    } catch (error) {
      console.error('Error creating group:', error);
      res.status(500).json({ error: 'Failed to create group' });
    }
  });

  app.put('/api/groups/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, teeTime } = req.body;
      
      if (!name?.trim()) {
        return res.status(400).json({ error: 'Name is required' });
      }

      const group = await prisma.group.update({
        where: { id },
        data: {
          name: name.trim(),
          teeTime: teeTime ? new Date(`1970-01-01T${teeTime}:00.000Z`) : null
        }
      });
      
      res.json(group);
    } catch (error) {
      console.error('Error updating group:', error);
      res.status(500).json({ error: 'Failed to update group' });
    }
  });

  app.delete('/api/groups/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      // Unassign all entries from this group first
      await prisma.entry.updateMany({
        where: { groupId: id },
        data: { groupId: null }
      });
      
      await prisma.group.delete({
        where: { id }
      });
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting group:', error);
      res.status(500).json({ error: 'Failed to delete group' });
    }
  });

  // HoleScores API routes
  app.post('/api/hole-scores', async (req, res) => {
    try {
      const { entryId, hole, strokes } = req.body;
      
      if (!entryId || !hole || !strokes) {
        return res.status(400).json({ error: 'entryId, hole, and strokes are required' });
      }

      if (hole < 1 || hole > 18 || strokes < 1 || strokes > 15) {
        return res.status(400).json({ error: 'Invalid hole (1-18) or strokes (1-15)' });
      }

      // Use upsert to handle Last-Write-Wins
      const existingScore = await prisma.holeScore.findFirst({
        where: { entryId, hole: parseInt(hole) }
      });

      const now = new Date();
      let wasOverwritten = false;

      if (existingScore) {
        // Check for conflicts based on timing
        const clientUpdatedAt = req.body.updatedAt ? new Date(req.body.updatedAt) : now;
        
        if (existingScore.updatedAt > clientUpdatedAt) {
          // Server is newer, reject client update
          return res.json({
            strokes: existingScore.strokes,
            updatedAt: existingScore.updatedAt,
            wasOverwritten: true
          });
        }
        wasOverwritten = clientUpdatedAt < existingScore.updatedAt;
      }

      const holeScore = await prisma.holeScore.upsert({
        where: {
          entryId_hole: {
            entryId,
            hole: parseInt(hole)
          }
        },
        update: {
          strokes: parseInt(strokes),
          updatedAt: now
        },
        create: {
          entryId,
          hole: parseInt(hole),
          strokes: parseInt(strokes),
          updatedAt: now
        }
      });

      res.json({
        strokes: holeScore.strokes,
        updatedAt: holeScore.updatedAt,
        wasOverwritten
      });
    } catch (error) {
      console.error('Error saving hole score:', error);
      res.status(500).json({ error: 'Failed to save hole score' });
    }
  });

  app.post('/api/hole-scores/batch', async (req, res) => {
    try {
      const { scores } = req.body; // Array of {entryId, hole, strokes, updatedAt}
      
      if (!Array.isArray(scores)) {
        return res.status(400).json({ error: 'scores must be an array' });
      }

      const results = [];
      
      for (const score of scores) {
        const { entryId, hole, strokes } = score;
        
        if (!entryId || !hole || !strokes) continue;
        if (hole < 1 || hole > 18 || strokes < 1 || strokes > 15) continue;

        try {
          const existingScore = await prisma.holeScore.findFirst({
            where: { entryId, hole: parseInt(hole) }
          });

          const now = new Date();
          const clientUpdatedAt = score.updatedAt ? new Date(score.updatedAt) : now;
          let wasOverwritten = false;

          if (existingScore && existingScore.updatedAt > clientUpdatedAt) {
            results.push({
              entryId,
              hole: parseInt(hole),
              strokes: existingScore.strokes,
              updatedAt: existingScore.updatedAt,
              wasOverwritten: true
            });
            continue;
          }

          const holeScore = await prisma.holeScore.upsert({
            where: {
              entryId_hole: {
                entryId,
                hole: parseInt(hole)
              }
            },
            update: {
              strokes: parseInt(strokes),
              updatedAt: now
            },
            create: {
              entryId,
              hole: parseInt(hole),
              strokes: parseInt(strokes),
              updatedAt: now
            }
          });

          results.push({
            entryId,
            hole: parseInt(hole),
            strokes: holeScore.strokes,
            updatedAt: holeScore.updatedAt,
            wasOverwritten
          });
        } catch (err) {
          console.error(`Error processing score for entry ${entryId} hole ${hole}:`, err);
        }
      }

      res.json({ results });
    } catch (error) {
      console.error('Error batch saving hole scores:', error);
      res.status(500).json({ error: 'Failed to batch save hole scores' });
    }
  });

  app.get('/api/tournaments/:id/leaderboards', async (req, res) => {
    try {
      const { id } = req.params;
      
      const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: {
          course: true,
          entries: {
            include: {
              player: true,
              holeScores: true
            }
          }
        }
      });

      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      // Generate hole pars array (simplified - assume par 4 for all holes)
      const holePars = Array(18).fill(4);
      
      // Calculate leaderboards using scoring utility
      const leaderboards = calculateLeaderboards(tournament.entries, tournament.course.par);

      res.json({
        gross: leaderboards.gross,
        net: leaderboards.net,
        coursePar: tournament.course.par,
        updated: new Date()
      });
    } catch (error) {
      console.error('Error fetching leaderboards:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboards' });
    }
  });

  app.get('/api/tournaments/:id/skins', async (req, res) => {
    try {
      const { id } = req.params;
      
      const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: {
          course: true,
          entries: {
            include: {
              player: true,
              holeScores: true
            }
          }
        }
      });

      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      // Generate hole pars array (simplified)
      const holePars = Array(18).fill(4);
      
      // Calculate skins
      const skinsData = calculateGrossSkins(tournament.entries, tournament.course.par, holePars);
      
      // Calculate payouts if pot amount is set
      let leaderboard = skinsData.leaderboard;
      if (tournament.potAmount && tournament.participantsForSkins) {
        leaderboard = calculateSkinsPayouts(
          skinsData.leaderboard, 
          tournament.potAmount, 
          skinsData.totalSkins
        );
      }

      res.json({
        results: skinsData.results,
        leaderboard,
        totalSkins: skinsData.totalSkins,
        potAmount: tournament.potAmount,
        participantsForSkins: tournament.participantsForSkins,
        payoutPerSkin: tournament.potAmount && skinsData.totalSkins > 0 
          ? Math.floor((tournament.potAmount * 100) / skinsData.totalSkins) / 100 
          : 0
      });
    } catch (error) {
      console.error('Error fetching skins:', error);
      res.status(500).json({ error: 'Failed to fetch skins' });
    }
  });

  app.get('/api/tournaments/:id/scores/:groupId', async (req, res) => {
    try {
      const { id, groupId } = req.params;
      
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: {
          tournament: {
            include: { course: true }
          },
          entries: {
            include: {
              player: true,
              holeScores: true
            }
          }
        }
      });

      if (!group || group.tournamentId !== id) {
        return res.status(404).json({ error: 'Group not found in tournament' });
      }

      res.json({
        group: {
          id: group.id,
          name: group.name,
          teeTime: group.teeTime
        },
        tournament: {
          id: group.tournament.id,
          name: group.tournament.name,
          course: {
            name: group.tournament.course.name,
            par: group.tournament.course.par
          }
        },
        entries: group.entries.map(entry => ({
          id: entry.id,
          player: entry.player,
          courseHandicap: entry.courseHandicap,
          playingCH: entry.playingCH,
          holeScores: entry.holeScores.reduce((acc, score) => {
            acc[score.hole] = score.strokes;
            return acc;
          }, {} as { [hole: number]: number })
        }))
      });
    } catch (error) {
      console.error('Error fetching group scores:', error);
      res.status(500).json({ error: 'Failed to fetch group scores' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
