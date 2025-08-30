
import { Router } from "express";
import { db } from "../../lib/db";
import { entries, holeScores, tournaments, groups, players } from "../../shared/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { nanoid } from 'nanoid';

const router = Router();

// Save or update a single hole score
router.post("/scores", async (req, res) => {
  try {
    const { entryId, hole, strokes, clientUpdatedAt } = req.body;
    
    if (!entryId || !hole || strokes === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Convert hole to number and validate
    const holeNum = parseInt(hole);
    if (isNaN(holeNum) || holeNum < 1 || holeNum > 18) {
      return res.status(400).json({ error: "Invalid hole number" });
    }

    // Convert strokes to number and validate
    const strokesNum = parseInt(strokes);
    if (isNaN(strokesNum) || strokesNum < 0) {
      return res.status(400).json({ error: "Invalid strokes value" });
    }

    // Check if entry exists
    const entry = await db.select().from(entries).where(eq(entries.id, entryId)).limit(1);

    if (entry.length === 0) {
      return res.status(404).json({ error: "Tournament entry not found" });
    }

    const clientTime = clientUpdatedAt ? new Date(clientUpdatedAt) : new Date();

    // Check for existing score for Last-Write-Wins conflict resolution
    const existingScore = await db.select().from(holeScores)
      .where(and(eq(holeScores.entryId, entryId), eq(holeScores.hole, holeNum)))
      .limit(1);

    if (existingScore.length > 0 && existingScore[0].updatedAt > clientTime) {
      // Server has a more recent update, ignore this one
      return res.json({ 
        status: 'ignored', 
        reason: 'stale',
        message: 'Score update ignored due to more recent server data'
      });
    }

    // Upsert the score (insert if not exists, update if exists)
    let savedScore;
    if (existingScore.length > 0) {
      // Update existing score
      savedScore = await db.update(holeScores)
        .set({
          strokes: strokesNum,
          clientUpdatedAt: clientTime,
          updatedAt: new Date()
        })
        .where(and(eq(holeScores.entryId, entryId), eq(holeScores.hole, holeNum)))
        .returning();
    } else {
      // Create new score
      savedScore = await db.insert(holeScores).values({
        id: nanoid(),
        entryId,
        hole: holeNum,
        strokes: strokesNum,
        clientUpdatedAt: clientTime
      }).returning();
    }

    res.json({ 
      status: 'accepted', 
      score: savedScore[0] 
    });

  } catch (error) {
    console.error('Error saving score:', error);
    res.status(500).json({ error: "Failed to save score" });
  }
});

// Get scores for a specific group
router.get("/groups/:groupId/scores", async (req, res) => {
  try {
    const { groupId } = req.params;

    // Get all entries in this group with their players and scores
    const groupEntries = await db.select({
      id: entries.id,
      playerId: entries.playerId,
      playerName: players.name,
      playingCH: entries.playingCH
    }).from(entries)
      .innerJoin(players, eq(entries.playerId, players.id))
      .where(eq(entries.groupId, groupId));

    // Get all scores for these entries
    const entryIds = groupEntries.map(e => e.id);
    const allScores = entryIds.length > 0 ? 
      await db.select().from(holeScores).where(inArray(holeScores.entryId, entryIds)) :
      [];

    // Transform scores into the expected format
    const scoresData: Record<string, Record<number, number>> = {};
    
    for (const entry of groupEntries) {
      scoresData[entry.id] = {};
    }
    
    for (const score of allScores) {
      if (!scoresData[score.entryId]) {
        scoresData[score.entryId] = {};
      }
      scoresData[score.entryId][score.hole] = score.strokes;
    }

    res.json({ scores: scoresData, entries: groupEntries });

  } catch (error) {
    console.error('Error fetching group scores:', error);
    res.status(500).json({ error: "Failed to fetch scores" });
  }
});

export default router;
